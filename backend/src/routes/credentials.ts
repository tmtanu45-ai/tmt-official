import { Router, Request, Response } from 'express';
import { getSupabaseClients } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { decryptRoomCredentials } from '../encryption/credentials.js';
import { sendEmail } from '../services/email.js';

// Extend Router type to include custom properties
interface ExtendedRouter extends Router {
  room: Router;
}

export const credentialRoutes = Router() as Router & { room: Router };

// Get credential status (no decryption)
credentialRoutes.get('/:matchId/status', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const userId = req.user!.id;
  const { matchId } = req.params;

  // Check registration
  const { data: registration } = await supabase.match
    .from('registrations')
    .select('id, status')
    .eq('match_id', matchId)
    .eq('user_id', userId)
    .single();

  if (!registration) {
    return res.json({
      credential: { status: 'NOT_REGISTERED' },
      eligible: false,
      eligibility_reason: 'NOT_REGISTERED',
    });
  }

  if (registration.status !== 'CONFIRMED') {
    return res.json({
      credential: { status: 'CANCELLED' },
      eligible: false,
      eligibility_reason: 'REGISTRATION_CANCELLED',
    });
  }

  // Check check-in status
  const { data: checkin } = await supabase.match
    .from('checkins')
    .select('status')
    .eq('registration_id', registration.id)
    .single();

  if (!checkin || checkin.status !== 'CHECKED_IN') {
    return res.json({
      credential: { status: 'NOT_CHECKED_IN' },
      eligible: false,
      eligibility_reason: 'NOT_CHECKED_IN',
    });
  }

  // Get credential status
  const { data: credential } = await supabase.cred
    .from('credentials')
    .select('status, released_at, expires_at')
    .eq('match_id', matchId)
    .single();

  if (!credential) {
    return res.json({
      credential: { status: 'NOT_CREATED' },
      eligible: false,
      eligibility_reason: 'CREDENTIAL_NOT_CREATED',
    });
  }

  const now = new Date();
  const releasedAt = credential.released_at ? new Date(credential.released_at) : null;
  const expiresAt = credential.expires_at ? new Date(credential.expires_at) : null;

  let effectiveStatus = credential.status;
  if (releasedAt && now >= releasedAt && credential.status === 'LOCKED') {
    effectiveStatus = 'AVAILABLE';
  }
  if (expiresAt && now >= expiresAt && credential.status === 'AVAILABLE') {
    effectiveStatus = 'EXPIRED';
  }

  let eligible = false;
  let eligibilityReason = '';

  if (effectiveStatus === 'AVAILABLE') {
    eligible = true;
  } else if (effectiveStatus === 'LOCKED') {
    eligibilityReason = 'RELEASE_TIME_NOT_REACHED';
  } else if (effectiveStatus === 'EXPIRED') {
    eligibilityReason = 'EXPIRED';
  } else {
    eligibilityReason = 'UNKNOWN';
  }

  // Check user ban status
  const { data: profile } = await supabase.auth
    .from('profiles')
    .select('account_status')
    .eq('user_id', userId)
    .single();

  if (profile?.account_status !== 'ACTIVE') {
    eligible = false;
    eligibilityReason = 'ACCOUNT_BANNED';
  }

  res.json({
    credential: {
      status: effectiveStatus,
      released_at: credential.released_at,
      expires_at: credential.expires_at,
      server_time: now.toISOString(),
    },
    eligible,
    eligibility_reason: eligibilityReason,
  });
});

// Access credentials (DECRYPTION - CRITICAL SECURITY)
credentialRoutes.post('/:matchId/access', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const userId = req.user!.id;
  const { matchId } = req.params;
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    throw new AppError('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header required', 400);
  }

  // Prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Verify registration
  const { data: registration } = await supabase.match
    .from('registrations')
    .select('id, status')
    .eq('match_id', matchId)
    .eq('user_id', userId)
    .single();

  if (!registration || registration.status !== 'CONFIRMED') {
    await logCredentialAccess(supabase, matchId, userId, 'DENY', 'NOT_REGISTERED', req);
    return res.json({
      granted: false,
      reason: 'NOT_REGISTERED',
      message: 'You are not registered for this match.',
    });
  }

  // Verify check-in
  const { data: checkin } = await supabase.match
    .from('checkins')
    .select('status')
    .eq('registration_id', registration.id)
    .single();

  if (!checkin || checkin.status !== 'CHECKED_IN') {
    await logCredentialAccess(supabase, matchId, userId, 'DENY', 'NOT_CHECKED_IN', req);
    return res.json({
      granted: false,
      reason: 'NOT_CHECKED_IN',
      message: 'You must check in before accessing room credentials.',
    });
  }

  // Check user status
  const { data: profile } = await supabase.auth
    .from('profiles')
    .select('account_status')
    .eq('user_id', userId)
    .single();

  if (profile?.account_status !== 'ACTIVE') {
    await logCredentialAccess(supabase, matchId, userId, 'DENY', 'ACCOUNT_BANNED', req);
    return res.json({
      granted: false,
      reason: 'ACCOUNT_BANNED',
      message: 'Your account is not active.',
    });
  }

  // Get credential
  const { data: credential } = await supabase.cred
    .from('credentials')
    .select('*')
    .eq('match_id', matchId)
    .single();

  if (!credential) {
    await logCredentialAccess(supabase, matchId, userId, 'DENY', 'CREDENTIAL_NOT_FOUND', req);
    return res.json({
      granted: false,
      reason: 'CREDENTIAL_NOT_FOUND',
      message: 'Room credentials not available.',
    });
  }

  const now = new Date();
  const releasedAt = credential.released_at ? new Date(credential.released_at) : null;
  const expiresAt = credential.expires_at ? new Date(credential.expires_at) : null;

  // Check release time
  if (!releasedAt || now < releasedAt) {
    await logCredentialAccess(supabase, matchId, userId, 'DENY', 'RELEASE_TIME_NOT_REACHED', req);
    return res.json({
      granted: false,
      reason: 'RELEASE_TIME_NOT_REACHED',
      message: 'Room credentials have not been released yet.',
    });
  }

  // Check expiry
  if (expiresAt && now >= expiresAt) {
    // Auto-expire
    await supabase.cred
      .from('credentials')
      .update({ status: 'EXPIRED', updated_at: now.toISOString() })
      .eq('match_id', matchId);
    
    await logCredentialAccess(supabase, matchId, userId, 'DENY', 'EXPIRED', req);
    return res.json({
      granted: false,
      reason: 'EXPIRED',
      message: 'Room credentials have expired.',
    });
  }

  // Check match status
  const { data: match } = await supabase.match
    .from('matches')
    .select('status')
    .eq('id', matchId)
    .single();

  if (!match || !['LIVE', 'COMPLETED'].includes(match.status)) {
    await logCredentialAccess(supabase, matchId, userId, 'DENY', 'MATCH_NOT_LIVE', req);
    return res.json({
      granted: false,
      reason: 'MATCH_NOT_LIVE',
      message: 'Match is not live yet.',
    });
  }

  // All checks passed - DECRYPT and return
  try {
    const decrypted = decryptRoomCredentials(
      credential.room_id_encrypted as any,
      credential.password_encrypted as any
    );

    // Log successful access
    await logCredentialAccess(supabase, matchId, userId, 'GRANT', null, req);

    // Update credential status to AVAILABLE if still LOCKED
    if (credential.status === 'LOCKED') {
      await supabase.cred
        .from('credentials')
        .update({ status: 'AVAILABLE', released_at: now.toISOString() })
        .eq('match_id', matchId);
    }

    logger.info('Credential access granted', { userId, matchId });

    return res.json({
      granted: true,
      credential: {
        room_id: decrypted.roomId,
        password: decrypted.password,
        expires_at: credential.expires_at,
        warning: 'DO NOT SHARE. Sharing credentials may result in disqualification and account suspension.',
      },
    });
  } catch (err) {
    logger.error('Credential decryption failed', { userId, matchId, error: err instanceof Error ? err.message : 'Unknown' });
    await logCredentialAccess(supabase, matchId, userId, 'DENY', 'DECRYPTION_FAILED', req);
    throw new AppError('DECRYPTION_FAILED', 'Failed to decrypt credentials', 500);
  }
});

// Room page data endpoint
credentialRoutes.room = Router();

credentialRoutes.room.get('/:matchId', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const userId = req.user!.id;
  const { matchId } = req.params;

  // Get match
  const { data: match } = await supabase.match
    .from('matches')
    .select('id, title, scheduled_at, status, credential_release_at, credential_expires_at')
    .eq('id', matchId)
    .single();

  if (!match) {
    throw new AppError('MATCH_NOT_FOUND', 'Match not found', 404);
  }

  // Check registration
  const { data: registration } = await supabase.match
    .from('registrations')
    .select('id, status')
    .eq('match_id', matchId)
    .eq('user_id', userId)
    .single();

  let roomState = 'NOT_REGISTERED';
  let credential = null;

  if (registration) {
    if (registration.status !== 'CONFIRMED') {
      roomState = 'CANCELLED';
    } else {
      // Check check-in
      const { data: checkin } = await supabase.match
        .from('checkins')
        .select('status')
        .eq('registration_id', registration.id)
        .single();

      // Get credential
      const { data: cred } = await supabase.cred
        .from('credentials')
        .select('status, released_at, expires_at, room_id_encrypted, password_encrypted')
        .eq('match_id', matchId)
        .single();

      const now = new Date();
      const releasedAt = cred?.released_at ? new Date(cred.released_at) : null;
      const expiresAt = cred?.expires_at ? new Date(cred.expires_at) : null;

      let effectiveStatus = cred?.status || 'LOCKED';
      if (releasedAt && now >= releasedAt && cred?.status === 'LOCKED') effectiveStatus = 'AVAILABLE';
      if (expiresAt && now >= expiresAt && cred?.status === 'AVAILABLE') effectiveStatus = 'EXPIRED';

      if (checkin?.status !== 'CHECKED_IN') {
        roomState = 'WAITING_FOR_CHECKIN';
      } else if (effectiveStatus === 'LOCKED') {
        roomState = 'WAITING_FOR_RELEASE';
      } else if (effectiveStatus === 'AVAILABLE') {
        roomState = 'AVAILABLE';
        // Decrypt for display
        try {
          const decrypted = decryptRoomCredentials(
            cred!.room_id_encrypted as any,
            cred!.password_encrypted as any
          );
          credential = {
            room_id: decrypted.roomId,
            password: decrypted.password,
            expires_at: cred.expires_at,
          };
        } catch (e) {
          logger.error('Room page decryption failed', { userId, matchId });
        }
      } else if (effectiveStatus === 'EXPIRED') {
        roomState = 'EXPIRED';
      }
    }
  }

  res.json({
    match: {
      id: match.id,
      title: match.title,
      scheduled_at: match.scheduled_at,
    },
    registration: registration ? { id: registration.id, status: registration.status } : null,
    credential: {
      state: roomState,
      ...credential,
      countdown_seconds: roomState === 'WAITING_FOR_RELEASE' 
        ? Math.max(0, Math.floor((new Date(match.credential_release_at).getTime() - Date.now()) / 1000))
        : null,
    },
  });
});

async function logCredentialAccess(
  supabase: any,
  matchId: string,
  userId: string,
  action: string,
  failureReason: string | null,
  req: Request
) {
  try {
    const { data: cred } = await supabase.cred
      .from('credentials')
      .select('id')
      .eq('match_id', matchId)
      .single();

    await supabase.cred.from('credential_access_logs').insert({
      credential_id: cred?.id,
      user_id: userId,
      match_id: matchId,
      action,
      result: failureReason ? 'FAILURE' : 'SUCCESS',
      failure_reason: failureReason,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      requested_at: new Date().toISOString(),
      granted_at: failureReason ? null : new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Failed to log credential access', { error: err instanceof Error ? err.message : 'Unknown' });
  }
}