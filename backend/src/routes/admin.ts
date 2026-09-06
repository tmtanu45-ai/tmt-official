import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSupabaseClients } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { encryptRoomCredentials } from '../encryption/credentials.js';
import { sendEmail } from '../services/email.js';

const matchCreateSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().max(2000).optional(),
  game_mode: z.enum(['CLASSIC', 'RANKED', 'CUSTOM']).default('CLASSIC'),
  map: z.enum(['BERMUDA', 'PURGATORY', 'KALAHARI', 'ALPINE', 'NEOX']),
  team_size: z.enum(['SOLO', 'DUO', 'SQUAD']).default('SQUAD'),
  max_teams: z.number().int().positive().max(100).optional(),
  max_players: z.number().int().positive().max(400).optional(),
  scheduled_at: z.string().datetime(),
  registration_opens_at: z.string().datetime(),
  registration_closes_at: z.string().datetime(),
  checkin_opens_at: z.string().datetime().optional(),
  checkin_closes_at: z.string().datetime().optional(),
  credential_release_at: z.string().datetime(),
  credential_expires_at: z.string().datetime(),
});

const matchUpdateSchema = matchCreateSchema.partial();

const playerActionSchema = z.object({
  confirm: z.string(), // Require typing confirmation for high-risk actions
});

export const adminRoutes = Router();

// Dashboard metrics
adminRoutes.get('/dashboard/metrics', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    { count: regsToday },
    { count: regsWeek },
    { count: activeMatches },
    { count: upcomingMatches },
    { count: securityEvents },
    { count: bannedPlayers },
  ] = await Promise.all([
    supabase.match.from('registrations').select('id', { count: 'exact', head: true }).gte('registered_at', dayAgo.toISOString()),
    supabase.match.from('registrations').select('id', { count: 'exact', head: true }).gte('registered_at', weekAgo.toISOString()),
    supabase.match.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'LIVE'),
    supabase.match.from('matches').select('id', { count: 'exact', head: true }).in('status', ['OPEN', 'FULL', 'CLOSED']).gte('scheduled_at', now.toISOString()),
    supabase.audit.from('security_events').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo.toISOString()),
    supabase.auth.from('profiles').select('id', { count: 'exact', head: true }).eq('account_status', 'BANNED'),
  ]);

  // Get chart data
  const { data: regs7d } = await supabase.match
    .from('registrations')
    .select('registered_at')
    .gte('registered_at', weekAgo.toISOString());

  const regsByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().split('T')[0];
    regsByDay[key] = 0;
  }

  regs7d?.forEach(r => {
    const key = new Date(r.registered_at).toISOString().split('T')[0];
    if (regsByDay[key] !== undefined) regsByDay[key]++;
  });

  res.json({
    registrations_today: regsToday || 0,
    registrations_this_week: regsWeek || 0,
    active_matches: activeMatches || 0,
    upcoming_matches: upcomingMatches || 0,
    security_events_24h: securityEvents || 0,
    banned_players: bannedPlayers || 0,
    charts: {
      registrations_7d: Object.entries(regsByDay).map(([date, count]) => ({ date, count })),
    },
  });
});

// Match management
adminRoutes.get('/matches', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const status = req.query.status as string;
  const offset = (page - 1) * limit;

  let qb = supabase.match
    .from('matches')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status) qb = qb.eq('status', status);

  qb = qb.range(offset, offset + limit - 1);

  const { data: matches, count, error } = await qb;

  if (error) throw new AppError('FETCH_FAILED', error.message, 500);

  res.json({
    data: matches || [],
    pagination: { page, limit, total: count || 0, total_pages: Math.ceil((count || 0) / limit) },
  });
});

adminRoutes.post('/matches', async (req: Request, res: Response) => {
  const data = matchCreateSchema.parse(req.body);
  const supabase = getSupabaseClients();
  const adminId = req.user!.id;

  const { data: match, error } = await supabase.match
    .from('matches')
    .insert({ ...data, created_by: adminId, status: 'DRAFT' })
    .select()
    .single();

  if (error) throw new AppError('CREATE_FAILED', error.message, 500);

  await supabase.audit.from('audit_logs').insert({
    admin_id: adminId,
    action: 'match.create',
    entity_type: 'match',
    entity_id: match.id,
    metadata: data,
  });

  logger.info('Match created by admin', { adminId, matchId: match.id });

  res.status(201).json(match);
});

adminRoutes.patch('/matches/:id', async (req: Request, res: Response) => {
  const data = matchUpdateSchema.parse(req.body);
  const supabase = getSupabaseClients();
  const adminId = req.user!.id;
  const { id } = req.params;

  const { data: match, error } = await supabase.match
    .from('matches')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new AppError('UPDATE_FAILED', error.message, 500);

  await supabase.audit.from('audit_logs').insert({
    admin_id: adminId,
    action: 'match.update',
    entity_type: 'match',
    entity_id: id,
    metadata: data,
  });

  res.json(match);
});

adminRoutes.delete('/matches/:id', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const adminId = req.user!.id;
  const { id } = req.params;
  const { reason, notify_registrants } = req.body;

  const { data: match } = await supabase.match
    .from('matches')
    .select('title')
    .eq('id', id)
    .single();

  const { error } = await supabase.match
    .from('matches')
    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new AppError('CANCEL_FAILED', error.message, 500);

  await supabase.audit.from('audit_logs').insert({
    admin_id: adminId,
    action: 'match.cancel',
    entity_type: 'match',
    entity_id: id,
    metadata: { reason },
  });

  if (notify_registrants) {
    // Get registrants and send notification
    const { data: regs } = await supabase.match
      .from('registrations')
      .select('user_id')
      .eq('match_id', id)
      .eq('status', 'CONFIRMED');

    for (const reg of regs || []) {
      await supabase.notif.from('notifications').insert({
        user_id: reg.user_id,
        type: 'MATCH_CANCELLED',
        title: 'Match Cancelled',
        message: `The match "${match?.title}" has been cancelled. Reason: ${reason}`,
        match_id: id,
      });
    }
  }

  res.json({ message: 'Match cancelled' });
});

adminRoutes.post('/matches/:id/status', async (req: Request, res: Response) => {
  const { status, confirm } = req.body;
  const supabase = getSupabaseClients();
  const adminId = req.user!.id;
  const { id } = req.params;

  const validStatuses = ['DRAFT', 'OPEN', 'CLOSED', 'LIVE', 'COMPLETED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    throw new AppError('INVALID_STATUS', 'Invalid status', 400);
  }

  // High-risk action: require confirmation
  if (confirm !== status) {
    throw new AppError('CONFIRMATION_REQUIRED', `Type "${status}" to confirm`, 422);
  }

  const { data: match, error } = await supabase.match
    .from('matches')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new AppError('UPDATE_FAILED', error.message, 500);

  await supabase.audit.from('audit_logs').insert({
    admin_id: adminId,
    action: 'match.status_change',
    entity_type: 'match',
    entity_id: id,
    metadata: { new_status: status },
  });

  res.json(match);
});

// Registration management
adminRoutes.get('/matches/:matchId/registrations', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const { matchId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const status = req.query.status as string;
  const offset = (page - 1) * limit;

  let qb = supabase.match
    .from('registrations')
    .select(`
      *,
      profiles!inner (username, display_name, ff_uid, in_game_name),
      checkins (status, checked_in_at)
    `, { count: 'exact' })
    .eq('match_id', matchId)
    .order('registered_at', { ascending: false });

  if (status) qb = qb.eq('status', status);

  qb = qb.range(offset, offset + limit - 1);

  const { data, count, error } = await qb;

  if (error) throw new AppError('FETCH_FAILED', error.message, 500);

  res.json({
    data: data || [],
    pagination: { page, limit, total: count || 0, total_pages: Math.ceil((count || 0) / limit) },
  });
});

adminRoutes.post('/registrations/:id/cancel', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const adminId = req.user!.id;
  const { id } = req.params;
  const { confirm } = req.body;

  if (confirm !== 'CANCEL') {
    throw new AppError('CONFIRMATION_REQUIRED', 'Type "CANCEL" to confirm', 422);
  }

  const { error } = await supabase.match
    .from('registrations')
    .update({ status: 'CANCELLED', cancelled_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new AppError('CANCEL_FAILED', error.message, 500);

  await supabase.audit.from('audit_logs').insert({
    admin_id: adminId,
    action: 'registration.admin_cancel',
    entity_type: 'registration',
    entity_id: id,
  });

  res.json({ message: 'Registration cancelled' });
});

adminRoutes.post('/registrations/:id/force-checkin', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const adminId = req.user!.id;
  const { id } = req.params;

  const { error } = await supabase.match
    .from('checkins')
    .update({
      status: 'CHECKED_IN',
      checked_in_at: new Date().toISOString(),
      checked_in_by: adminId,
    })
    .eq('registration_id', id);

  if (error) throw new AppError('CHECKIN_FAILED', error.message, 500);

  await supabase.audit.from('audit_logs').insert({
    admin_id: adminId,
    action: 'checkin.force',
    entity_type: 'checkin',
    entity_id: id,
  });

  res.json({ message: 'Force check-in successful' });
});

// Player management
adminRoutes.get('/players', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const search = req.query.search as string;
  const status = req.query.status as string;
  const offset = (page - 1) * limit;

  let qb = supabase.auth
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) {
    qb = qb.or(`username.ilike.%${search}%,display_name.ilike.%${search}%,ff_uid.ilike.%${search}%`);
  }
  if (status) qb = qb.eq('account_status', status);

  qb = qb.range(offset, offset + limit - 1);

  const { data, count, error } = await qb;

  if (error) throw new AppError('FETCH_FAILED', error.message, 500);

  res.json({
    data: data || [],
    pagination: { page, limit, total: count || 0, total_pages: Math.ceil((count || 0) / limit) },
  });
});

adminRoutes.post('/players/:id/suspend', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const adminId = req.user!.id;
  const { id } = req.params;

  const { error } = await supabase.auth
    .from('profiles')
    .update({ account_status: 'SUSPENDED' })
    .eq('id', id);

  if (error) throw new AppError('SUSPEND_FAILED', error.message, 500);

  await supabase.audit.from('audit_logs').insert({
    admin_id: adminId,
    action: 'player.suspend',
    entity_type: 'player',
    entity_id: id,
  });

  res.json({ message: 'Player suspended' });
});

adminRoutes.post('/players/:id/ban', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const adminId = req.user!.id;
  const { id } = req.params;
  const { confirm } = req.body;

  if (confirm !== 'BAN') {
    throw new AppError('CONFIRMATION_REQUIRED', 'Type "BAN" to confirm', 422);
  }

  const { error } = await supabase.auth
    .from('profiles')
    .update({ account_status: 'BANNED' })
    .eq('id', id);

  if (error) throw new AppError('BAN_FAILED', error.message, 500);

  await supabase.audit.from('audit_logs').insert({
    admin_id: adminId,
    action: 'player.ban',
    entity_type: 'player',
    entity_id: id,
  });

  res.json({ message: 'Player banned' });
});

// Credential management
adminRoutes.get('/credentials', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const status = req.query.status as string;
  const offset = (page - 1) * limit;

  let qb = supabase.cred
    .from('credentials')
    .select(`
      *,
      matches!inner (title, scheduled_at, status)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status) qb = qb.eq('status', status);

  qb = qb.range(offset, offset + limit - 1);

  const { data, count, error } = await qb;

  if (error) throw new AppError('FETCH_FAILED', error.message, 500);

  res.json({
    data: data || [],
    pagination: { page, limit, total: count || 0, total_pages: Math.ceil((count || 0) / limit) },
  });
});

adminRoutes.post('/credentials/:matchId/release', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const adminId = req.user!.id;
  const { matchId } = req.params;
  const { confirm } = req.body;

  if (confirm !== 'RELEASE') {
    throw new AppError('CONFIRMATION_REQUIRED', 'Type "RELEASE" to confirm', 422);
  }

  const { error } = await supabase.cred
    .from('credentials')
    .update({ status: 'AVAILABLE', released_at: new Date().toISOString() })
    .eq('match_id', matchId);

  if (error) throw new AppError('RELEASE_FAILED', error.message, 500);

  await supabase.audit.from('audit_logs').insert({
    admin_id: adminId,
    action: 'credential.release',
    entity_type: 'credential',
    entity_id: matchId,
  });

  res.json({ message: 'Credentials released' });
});

adminRoutes.post('/credentials/:matchId/expire', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const adminId = req.user!.id;
  const { matchId } = req.params;
  const { confirm } = req.body;

  if (confirm !== 'EXPIRE') {
    throw new AppError('CONFIRMATION_REQUIRED', 'Type "EXPIRE" to confirm', 422);
  }

  const { error } = await supabase.cred
    .from('credentials')
    .update({ status: 'EXPIRED', updated_at: new Date().toISOString() })
    .eq('match_id', matchId);

  if (error) throw new AppError('EXPIRE_FAILED', error.message, 500);

  await supabase.audit.from('audit_logs').insert({
    admin_id: adminId,
    action: 'credential.expire',
    entity_type: 'credential',
    entity_id: matchId,
  });

  res.json({ message: 'Credentials expired' });
});

adminRoutes.get('/credentials/:matchId/access-logs', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const { matchId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
  const offset = (page - 1) * limit;

  const { data: credential } = await supabase.cred
    .from('credentials')
    .select('id')
    .eq('match_id', matchId)
    .single();

  if (!credential) {
    throw new AppError('CREDENTIAL_NOT_FOUND', 'Credential not found', 404);
  }

  let qb = supabase.cred
    .from('credential_access_logs')
    .select(`
      *,
      profiles!inner (username, display_name)
    `, { count: 'exact' })
    .eq('credential_id', credential.id)
    .order('requested_at', { ascending: false });

  qb = qb.range(offset, offset + limit - 1);

  const { data, count, error } = await qb;

  if (error) throw new AppError('FETCH_FAILED', error.message, 500);

  res.json({
    data: data || [],
    pagination: { page, limit, total: count || 0, total_pages: Math.ceil((count || 0) / limit) },
  });
});

// Audit logs
adminRoutes.get('/audit-logs', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
  const action = req.query.action as string;
  const entityType = req.query.entity_type as string;
  const offset = (page - 1) * limit;

  let qb = supabase.audit
    .from('audit_logs')
    .select(`
      *,
      admin_users!left (user_id, profiles!inner (username))
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (action) qb = qb.ilike('action', `%${action}%`);
  if (entityType) qb = qb.eq('entity_type', entityType);

  qb = qb.range(offset, offset + limit - 1);

  const { data, count, error } = await qb;

  if (error) throw new AppError('FETCH_FAILED', error.message, 500);

  res.json({
    data: data || [],
    pagination: { page, limit, total: count || 0, total_pages: Math.ceil((count || 0) / limit) },
  });
});

// Security events
adminRoutes.get('/security/events', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const severity = req.query.severity as string;
  const resolved = req.query.resolved === 'true';
  const offset = (page - 1) * limit;

  let qb = supabase.audit
    .from('security_events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (severity) qb = qb.eq('severity', severity);
  if (resolved !== undefined) qb = qb.eq('resolved', resolved);

  qb = qb.range(offset, offset + limit - 1);

  const { data, count, error } = await qb;

  if (error) throw new AppError('FETCH_FAILED', error.message, 500);

  res.json({
    data: data || [],
    pagination: { page, limit, total: count || 0, total_pages: Math.ceil((count || 0) / limit) },
  });
});

adminRoutes.post('/security/events/:id/resolve', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const adminId = req.user!.id;
  const { id } = req.params;

  const { error } = await supabase.audit
    .from('security_events')
    .update({ resolved: true, resolved_by: adminId, resolved_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new AppError('RESOLVE_FAILED', error.message, 500);

  res.json({ message: 'Security event resolved' });
});

// Admin user management (SUPER_ADMIN only)
adminRoutes.get('/users', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();

  const { data, error } = await supabase.auth
    .from('admin_users')
    .select(`
      *,
      profiles!inner (username, display_name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new AppError('FETCH_FAILED', error.message, 500);

  res.json(data || []);
});

adminRoutes.post('/users/invite', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const adminId = req.user!.id;
  const { email, role } = req.body;

  if (!['MODERATOR', 'ADMIN'].includes(role)) {
    throw new AppError('INVALID_ROLE', 'Invalid role', 400);
  }

  // Check if user exists
  const { data: user } = await supabase.auth.auth.admin.getUserByEmail(email);
  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }

  const { data: adminUser, error } = await supabase.auth
    .from('admin_users')
    .upsert({ user_id: user.id, role })
    .select()
    .single();

  if (error) throw new AppError('INVITE_FAILED', error.message, 500);

  await supabase.audit.from('audit_logs').insert({
    admin_id: adminId,
    action: 'admin.invite',
    entity_type: 'admin_user',
    entity_id: adminUser.id,
    metadata: { role, invited_email: email },
  });

  res.status(201).json(adminUser);
});

adminRoutes.patch('/users/:id', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const adminId = req.user!.id;
  const { id } = req.params;
  const { role, permissions } = req.body;

  if (role && !['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    throw new AppError('INVALID_ROLE', 'Invalid role', 400);
  }

  const { data: adminUser, error } = await supabase.auth
    .from('admin_users')
    .update({ role, permissions })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new AppError('UPDATE_FAILED', error.message, 500);

  await supabase.audit.from('audit_logs').insert({
    admin_id: adminId,
    action: 'admin.update',
    entity_type: 'admin_user',
    entity_id: id,
    metadata: { role, permissions },
  });

  res.json(adminUser);
});