import { Router, Request, Response } from 'express';
import { getSupabaseClients } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export const checkinRoutes = Router();

checkinRoutes.get('/:matchId', async (req: Request, res: Response) => {
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

  const { data: checkin } = await supabase.match
    .from('checkins')
    .select('status, checked_in_at')
    .eq('registration_id', registration.id)
    .single();

  const { data: match } = await supabase.match
    .from('matches')
    .select('checkin_opens_at, checkin_closes_at, status')
    .eq('id', matchId)
    .single();

  if (!match) {
    throw new AppError('MATCH_NOT_FOUND', 'Match not found', 404);
  }

  const now = new Date();
  const checkinOpens = match.checkin_opens_at ? new Date(match.checkin_opens_at) : null;
  const checkinCloses = match.checkin_closes_at ? new Date(match.checkin_closes_at) : null;

  let effectiveStatus = checkin?.status || 'NOT_OPEN';
  
  if (checkinOpens && now >= checkinOpens && (!checkin || checkin.status === 'NOT_OPEN')) {
    effectiveStatus = 'OPEN';
  }
  
  if (checkinCloses && now > checkinCloses && (!checkin || checkin.status === 'OPEN')) {
    effectiveStatus = 'MISSED';
  }

  res.json({
    checkin: {
      status: effectiveStatus,
      opens_at: match.checkin_opens_at,
      closes_at: match.checkin_closes_at,
      server_time: now.toISOString(),
      checked_in_at: checkin?.checked_in_at,
    },
    registration: {
      id: registration.id,
      status: registration.status,
    },
  });
});

checkinRoutes.post('/:matchId', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const userId = req.user!.id;
  const { matchId } = req.params;
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    throw new AppError('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header required', 400);
  }

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
    throw new AppError('REGISTRATION_CANCELLED', 'Registration is cancelled', 422);
  }

  const { data: checkin } = await supabase.match
    .from('checkins')
    .select('status')
    .eq('registration_id', registration.id)
    .single();

  if (!checkin) {
    throw new AppError('CHECKIN_NOT_FOUND', 'Check-in record not found', 404);
  }

  const { data: match } = await supabase.match
    .from('matches')
    .select('checkin_opens_at, checkin_closes_at, status')
    .eq('id', matchId)
    .single();

  if (!match) {
    throw new AppError('MATCH_NOT_FOUND', 'Match not found', 404);
  }

  const now = new Date();
  const checkinOpens = match.checkin_opens_at ? new Date(match.checkin_opens_at) : null;
  const checkinCloses = match.checkin_closes_at ? new Date(match.checkin_closes_at) : null;

  if (!checkinOpens || now < checkinOpens) {
    throw new AppError('CHECKIN_NOT_OPEN', 'Check-in has not opened yet', 422);
  }

  if (checkinCloses && now > checkinCloses) {
    throw new AppError('CHECKIN_CLOSED', 'Check-in window has closed', 422);
  }

  if (checkin.status === 'CHECKED_IN') {
    throw new AppError('ALREADY_CHECKED_IN', 'Already checked in', 422);
  }

  if (checkin.status === 'MISSED' || checkin.status === 'CANCELLED') {
    throw new AppError('CHECKIN_INVALID', 'Check-in is no longer possible', 422);
  }

  const { error } = await supabase.match
    .from('checkins')
    .update({
      status: 'CHECKED_IN',
      checked_in_at: now.toISOString(),
      checked_in_by: userId,
    })
    .eq('registration_id', registration.id);

  if (error) {
    throw new AppError('CHECKIN_FAILED', error.message, 500);
  }

  // Audit log
  await supabase.audit.from('audit_logs').insert({
    user_id: userId,
    action: 'checkin.create',
    entity_type: 'checkin',
    entity_id: registration.id,
    metadata: { match_id: matchId },
  });

  logger.info('Check-in completed', { userId, matchId, registrationId: registration.id });

  res.json({
    checkin: {
      status: 'CHECKED_IN',
      checked_in_at: now.toISOString(),
    },
  });
});

// Admin force check-in
checkinRoutes.post('/:matchId/admin-force', async (req: Request, res: Response) => {
  // This route should be protected by admin middleware
  const supabase = getSupabaseClients();
  const adminId = req.user!.id;
  const { matchId } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    throw new AppError('USER_ID_REQUIRED', 'user_id is required', 400);
  }

  const { data: registration } = await supabase.match
    .from('registrations')
    .select('id, status')
    .eq('match_id', matchId)
    .eq('user_id', user_id)
    .single();

  if (!registration) {
    throw new AppError('NOT_REGISTERED', 'User not registered for this match', 404);
  }

  const { data: checkin } = await supabase.match
    .from('checkins')
    .select('status')
    .eq('registration_id', registration.id)
    .single();

  const { error } = await supabase.match
    .from('checkins')
    .update({
      status: 'CHECKED_IN',
      checked_in_at: new Date().toISOString(),
      checked_in_by: adminId,
    })
    .eq('registration_id', registration.id);

  if (error) {
    throw new AppError('CHECKIN_FAILED', error.message, 500);
  }

  // Audit log
  await supabase.audit.from('audit_logs').insert({
    admin_id: adminId,
    action: 'checkin.force',
    entity_type: 'checkin',
    entity_id: registration.id,
    metadata: { match_id: matchId, target_user_id: user_id },
  });

  logger.info('Admin force check-in', { adminId, matchId, targetUserId: user_id });

  res.json({ message: 'Force check-in successful' });
});