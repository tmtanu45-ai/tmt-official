import { Router, Request, Response } from 'express';
import { getSupabaseClients } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { sendEmail } from '../services/email.js';

export const registrationRoutes = Router();

registrationRoutes.post('/:matchId/register', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const userId = req.user!.id;
  const { matchId } = req.params;
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    throw new AppError('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header required', 400);
  }

  // Check if already registered (idempotency)
  const { data: existing } = await supabase.match
    .from('registrations')
    .select('id')
    .eq('match_id', matchId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    throw new AppError('ALREADY_REGISTERED', 'Already registered for this match', 409);
  }

  // Verify match eligibility
  const { data: match, error: matchError } = await supabase.match
    .from('matches')
    .select('id, status, max_players, registration_opens_at, registration_closes_at, team_size')
    .eq('id', matchId)
    .single();

  if (matchError || !match) {
    throw new AppError('MATCH_NOT_FOUND', 'Match not found', 404);
  }

  const now = new Date();
  if (match.status !== 'OPEN') {
    throw new AppError('MATCH_NOT_OPEN', 'Match is not open for registration', 422);
  }

  if (now < new Date(match.registration_opens_at)) {
    throw new AppError('REGISTRATION_NOT_OPEN', 'Registration has not opened yet', 422);
  }

  if (now > new Date(match.registration_closes_at)) {
    throw new AppError('REGISTRATION_CLOSED', 'Registration has closed', 422);
  }

  // Check capacity
  const { count } = await supabase.match
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', matchId)
    .eq('status', 'CONFIRMED');

  if (match.max_players && count && count >= match.max_players) {
    // Update match status to FULL
    await supabase.match
      .from('matches')
      .update({ status: 'FULL' })
      .eq('id', matchId);
    throw new AppError('MATCH_FULL', 'Match has reached maximum capacity', 422);
  }

  // Check user eligibility
  const { data: profile } = await supabase.auth
    .from('profiles')
    .select('account_status')
    .eq('user_id', userId)
    .single();

  if (!profile || profile.account_status !== 'ACTIVE') {
    throw new AppError('ACCOUNT_INELIGIBLE', 'Account is not eligible for registration', 422);
  }

  // Create registration
  const { data: registration, error: regError } = await supabase.match
    .from('registrations')
    .insert({
      match_id: matchId,
      user_id: userId,
      status: 'CONFIRMED',
    })
    .select()
    .single();

  if (regError) {
    if (regError.code === '23505') { // unique violation
      throw new AppError('ALREADY_REGISTERED', 'Already registered for this match', 409);
    }
    throw new AppError('REGISTRATION_FAILED', regError.message, 500);
  }

  // Create check-in record
  await supabase.match.from('checkins').insert({
    registration_id: registration.id,
    status: 'NOT_OPEN',
  });

  // Audit log
  await supabase.audit.from('audit_logs').insert({
    user_id: userId,
    action: 'registration.create',
    entity_type: 'registration',
    entity_id: registration.id,
    metadata: { match_id: matchId },
  });

  // Send confirmation email
  await sendEmail({
    to: req.user!.email,
    subject: `Registration Confirmed: ${match.title}`,
    template: 'registration_confirmed',
    data: {
      match_title: match.title,
      scheduled_at: match.scheduled_at,
      checkin_opens_at: match.checkin_opens_at,
    },
  });

  logger.info('Registration created', { userId, matchId, registrationId: registration.id });

  res.status(201).json({
    registration: {
      ...registration,
      match: {
        title: match.title,
        scheduled_at: match.scheduled_at,
        checkin_opens_at: match.checkin_opens_at,
      },
    },
  });
});

registrationRoutes.delete('/:matchId/register', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const userId = req.user!.id;
  const { matchId } = req.params;

  const { data: registration } = await supabase.match
    .from('registrations')
    .select('id, status')
    .eq('match_id', matchId)
    .eq('user_id', userId)
    .single();

  if (!registration) {
    throw new AppError('NOT_REGISTERED', 'Not registered for this match', 404);
  }

  if (registration.status !== 'CONFIRMED') {
    throw new AppError('CANNOT_CANCEL', 'Cannot cancel registration in current state', 422);
  }

  // Check if check-in has started
  const { data: match } = await supabase.match
    .from('matches')
    .select('checkin_opens_at')
    .eq('id', matchId)
    .single();

  if (match && new Date() >= new Date(match.checkin_opens_at)) {
    throw new AppError('CHECKIN_STARTED', 'Cannot cancel after check-in has started', 422);
  }

  const { error } = await supabase.match
    .from('registrations')
    .update({ status: 'CANCELLED', cancelled_at: new Date().toISOString() })
    .eq('id', registration.id);

  if (error) {
    throw new AppError('CANCELLATION_FAILED', error.message, 500);
  }

  // Audit log
  await supabase.audit.from('audit_logs').insert({
    user_id: userId,
    action: 'registration.cancel',
    entity_type: 'registration',
    entity_id: registration.id,
    metadata: { match_id: matchId },
  });

  logger.info('Registration cancelled', { userId, matchId, registrationId: registration.id });

  res.json({ message: 'Registration cancelled successfully' });
});

registrationRoutes.get('/me', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const userId = req.user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const status = req.query.status as string;
  const offset = (page - 1) * limit;

  let qb = supabase.match
    .from('registrations')
    .select(`
      *,
      matches!inner (
        id, title, game_mode, map, team_size, scheduled_at, status,
        checkin_opens_at, checkin_closes_at, credential_release_at, credential_expires_at
      ),
      checkins ( status, checked_in_at )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('registered_at', { ascending: false });

  if (status) qb = qb.eq('status', status);

  qb = qb.range(offset, offset + limit - 1);

  const { data: registrations, count, error } = await qb;

  if (error) {
    throw new AppError('FETCH_FAILED', error.message, 500);
  }

  res.json({
    data: registrations || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
      has_next: offset + limit < (count || 0),
      has_prev: page > 1,
    },
  });
});