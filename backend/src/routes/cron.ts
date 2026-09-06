import { Router, Request, Response } from 'express';
import { getSupabaseClients } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export const cronRoutes = Router();

// Verify cron secret
function verifyCronSecret(req: Request, res: Response, next: Function) {
  const secret = req.headers['x-cron-secret'] || req.query.cron_secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } });
  }
  next();
}

cronRoutes.use(verifyCronSecret);

// Update match statuses based on time
cronRoutes.post('/match-status-update', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const now = new Date();

  try {
    // DRAFT -> OPEN (registration_opens_at reached)
    const { data: toOpen } = await supabase.match
      .from('matches')
      .select('id')
      .eq('status', 'DRAFT')
      .lte('registration_opens_at', now.toISOString());

    for (const match of toOpen || []) {
      await supabase.match
        .from('matches')
        .update({ status: 'OPEN', updated_at: now.toISOString() })
        .eq('id', match.id);
      
      await supabase.audit.from('audit_logs').insert({
        action: 'match.auto_open',
        entity_type: 'match',
        entity_id: match.id,
        metadata: { trigger: 'cron' },
      });
    }

    // OPEN -> FULL (capacity reached)
    const { data: openMatches } = await supabase.match
      .from('matches')
      .select('id, max_players')
      .eq('status', 'OPEN');

    for (const match of openMatches || []) {
      if (!match.max_players) continue;
      
      const { count } = await supabase.match
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .eq('match_id', match.id)
        .eq('status', 'CONFIRMED');

      if (count && count >= match.max_players) {
        await supabase.match
          .from('matches')
          .update({ status: 'FULL', updated_at: now.toISOString() })
          .eq('id', match.id);
      }
    }

    // Registration closed -> CLOSED
    const { data: toClose } = await supabase.match
      .from('matches')
      .select('id')
      .eq('status', 'OPEN')
      .lt('registration_closes_at', now.toISOString());

    for (const match of toClose || []) {
      await supabase.match
        .from('matches')
        .update({ status: 'CLOSED', updated_at: now.toISOString() })
        .eq('id', match.id);
      
      await supabase.audit.from('audit_logs').insert({
        action: 'match.auto_close',
        entity_type: 'match',
        entity_id: match.id,
        metadata: { trigger: 'cron' },
      });
    }

    // Scheduled time reached -> LIVE
    const { data: toLive } = await supabase.match
      .from('matches')
      .select('id')
      .in('status', ['OPEN', 'FULL', 'CLOSED'])
      .lte('scheduled_at', now.toISOString());

    for (const match of toLive || []) {
      await supabase.match
        .from('matches')
        .update({ status: 'LIVE', updated_at: now.toISOString() })
        .eq('id', match.id);
      
      await supabase.audit.from('audit_logs').insert({
        action: 'match.auto_live',
        entity_type: 'match',
        entity_id: match.id,
        metadata: { trigger: 'cron' },
      });
    }

    // Past scheduled time + duration -> COMPLETED (assume 3 hours)
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const { data: toComplete } = await supabase.match
      .from('matches')
      .select('id')
      .eq('status', 'LIVE')
      .lt('scheduled_at', threeHoursAgo.toISOString());

    for (const match of toComplete || []) {
      await supabase.match
        .from('matches')
        .update({ status: 'COMPLETED', updated_at: now.toISOString() })
        .eq('id', match.id);
      
      await supabase.audit.from('audit_logs').insert({
        action: 'match.auto_complete',
        entity_type: 'match',
        entity_id: match.id,
        metadata: { trigger: 'cron' },
      });
    }

    // Expired -> EXPIRED (credential_expires_at passed and not completed)
    const { data: toExpire } = await supabase.match
      .from('matches')
      .select('id')
      .in('status', ['LIVE', 'COMPLETED'])
      .lt('credential_expires_at', now.toISOString());

    for (const match of toExpire || []) {
      if (match.status === 'COMPLETED') continue;
      
      await supabase.match
        .from('matches')
        .update({ status: 'EXPIRED', updated_at: now.toISOString() })
        .eq('id', match.id);
    }

    logger.info('Match status update completed', { 
      opened: toOpen?.length || 0,
      closed: toClose?.length || 0,
      live: toLive?.length || 0,
      completed: toComplete?.length || 0,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('Match status update failed', { error: err instanceof Error ? err.message : 'Unknown' });
    throw new AppError('CRON_FAILED', 'Match status update failed', 500);
  }
});

// Release credentials
cronRoutes.post('/credential-release', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const now = new Date();

  try {
    // Find credentials ready for release
    const { data: toRelease } = await supabase.cred
      .from('credentials')
      .select('id, match_id')
      .eq('status', 'LOCKED')
      .lte('released_at', now.toISOString());

    for (const cred of toRelease || []) {
      // Verify match is LIVE
      const { data: match } = await supabase.match
        .from('matches')
        .select('status')
        .eq('id', cred.match_id)
        .single();

      if (match && ['LIVE', 'COMPLETED'].includes(match.status)) {
        await supabase.cred
          .from('credentials')
          .update({ status: 'AVAILABLE', released_at: now.toISOString() })
          .eq('id', cred.id);

        // Notify registered & checked-in players
        const { data: regs } = await supabase.match
          .from('registrations')
          .select('user_id')
          .eq('match_id', cred.match_id)
          .eq('status', 'CONFIRMED');

        for (const reg of regs || []) {
          const { data: checkin } = await supabase.match
            .from('checkins')
            .select('status')
            .eq('registration_id', reg.id)
            .single();

          if (checkin?.status === 'CHECKED_IN') {
            await supabase.notif.from('notifications').insert({
              user_id: reg.user_id,
              type: 'CREDENTIAL_RELEASED',
              title: 'Room Credentials Released',
              message: `Room credentials for match ${cred.match_id} are now available.`,
              match_id: cred.match_id,
            });
          }
        }

        await supabase.audit.from('audit_logs').insert({
          action: 'credential.auto_release',
          entity_type: 'credential',
          entity_id: cred.id,
          metadata: { trigger: 'cron' },
        });
      }
    }

    logger.info('Credential release completed', { released: toRelease?.length || 0 });
    res.json({ success: true, released: toRelease?.length || 0 });
  } catch (err) {
    logger.error('Credential release failed', { error: err instanceof Error ? err.message : 'Unknown' });
    throw new AppError('CRON_FAILED', 'Credential release failed', 500);
  }
});

// Auto-miss check-ins
cronRoutes.post('/checkin-auto-miss', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const now = new Date();

  try {
    const { data: toMiss } = await supabase.match
      .from('checkins')
      .select('id, registration_id')
      .eq('status', 'OPEN')
      .lte('registration_id', ''); // Placeholder - we need to join with matches

    // Better approach: find checkins where match checkin_closes_at has passed
    const { data: matches } = await supabase.match
      .from('matches')
      .select('id')
      .lt('checkin_closes_at', now.toISOString())
      .not('checkin_closes_at', 'is', null);

    let missedCount = 0;

    for (const match of matches || []) {
      const { data: regs } = await supabase.match
        .from('registrations')
        .select('id')
        .eq('match_id', match.id)
        .eq('status', 'CONFIRMED');

      for (const reg of regs || []) {
        const { data: checkin } = await supabase.match
          .from('checkins')
          .select('id, status')
          .eq('registration_id', reg.id)
          .single();

        if (checkin && checkin.status === 'OPEN') {
          await supabase.match
            .from('checkins')
            .update({ status: 'MISSED' })
            .eq('id', checkin.id);

          await supabase.notif.from('notifications').insert({
            user_id: (await supabase.match.from('registrations').select('user_id').eq('id', reg.id).single()).data?.user_id,
            type: 'CHECKIN_MISSED',
            title: 'Check-in Missed',
            message: `You missed the check-in window for match ${match.id}.`,
            match_id: match.id,
          });

          await supabase.audit.from('audit_logs').insert({
            action: 'checkin.auto_miss',
            entity_type: 'checkin',
            entity_id: checkin.id,
            metadata: { trigger: 'cron' },
          });

          missedCount++;
        }
      }
    }

    logger.info('Check-in auto-miss completed', { missed: missedCount });
    res.json({ success: true, missed: missedCount });
  } catch (err) {
    logger.error('Check-in auto-miss failed', { error: err instanceof Error ? err.message : 'Unknown' });
    throw new AppError('CRON_FAILED', 'Check-in auto-miss failed', 500);
  }
});

// Expire credentials
cronRoutes.post('/credential-expiry', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const now = new Date();

  try {
    const { data: toExpire } = await supabase.cred
      .from('credentials')
      .select('id')
      .eq('status', 'AVAILABLE')
      .lte('expires_at', now.toISOString());

    for (const cred of toExpire || []) {
      await supabase.cred
        .from('credentials')
        .update({ status: 'EXPIRED', updated_at: now.toISOString() })
        .eq('id', cred.id);

      await supabase.audit.from('audit_logs').insert({
        action: 'credential.auto_expire',
        entity_type: 'credential',
        entity_id: cred.id,
        metadata: { trigger: 'cron' },
      });
    }

    logger.info('Credential expiry completed', { expired: toExpire?.length || 0 });
    res.json({ success: true, expired: toExpire?.length || 0 });
  } catch (err) {
    logger.error('Credential expiry failed', { error: err instanceof Error ? err.message : 'Unknown' });
    throw new AppError('CRON_FAILED', 'Credential expiry failed', 500);
  }
});

// Process email queue
cronRoutes.post('/email-queue-process', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();

  try {
    const { data: emails } = await supabase.notif
      .from('email_queue')
      .select('*')
      .eq('status', 'PENDING')
      .lte('scheduled_at', new Date().toISOString())
      .lt('attempts', 3)
      .order('scheduled_at', { ascending: true })
      .limit(50);

    let sent = 0;
    let failed = 0;

    for (const email of emails || []) {
      await supabase.notif
        .from('email_queue')
        .update({ status: 'SENDING', attempts: email.attempts + 1 })
        .eq('id', email.id);

      try {
        // Call email worker
        const response = await fetch(process.env.EMAIL_WORKER_URL!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EMAIL_API_TOKEN}`,
          },
          body: JSON.stringify({
            to: email.to_email,
            subject: email.subject,
            html: email.html_body,
            text: email.text_body,
          }),
        });

        if (response.ok) {
          await supabase.notif
            .from('email_queue')
            .update({ status: 'SENT', sent_at: new Date().toISOString() })
            .eq('id', email.id);
          sent++;
        } else {
          const errorText = await response.text();
          await supabase.notif
            .from('email_queue')
            .update({ 
              status: email.attempts + 1 >= 3 ? 'FAILED' : 'PENDING',
              error_message: errorText,
              failed_at: new Date().toISOString(),
            })
            .eq('id', email.id);
          failed++;
        }
      } catch (err) {
        await supabase.notif
          .from('email_queue')
          .update({ 
            status: email.attempts + 1 >= 3 ? 'FAILED' : 'PENDING',
            error_message: err instanceof Error ? err.message : 'Unknown error',
            failed_at: new Date().toISOString(),
          })
          .eq('id', email.id);
        failed++;
      }
    }

    res.json({ success: true, sent, failed });
  } catch (err) {
    logger.error('Email queue processing failed', { error: err instanceof Error ? err.message : 'Unknown' });
    throw new AppError('CRON_FAILED', 'Email queue processing failed', 500);
  }
});

// Cleanup expired sessions
cronRoutes.post('/cleanup-expired-sessions', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const now = new Date();

  try {
    const { error } = await supabase.auth
      .from('user_sessions')
      .update({ revoked_at: now.toISOString() })
      .lt('expires_at', now.toISOString())
      .is('revoked_at', null);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    logger.error('Session cleanup failed', { error: err instanceof Error ? err.message : 'Unknown' });
    throw new AppError('CRON_FAILED', 'Session cleanup failed', 500);
  }
});