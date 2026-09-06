import { Router, Request, Response } from 'express';
import { getSupabaseClients } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export const webhookRoutes = Router();

// Supabase Auth webhook
webhookRoutes.post('/supabase-auth', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const { type, record } = req.body;

  logger.info('Supabase auth webhook received', { type });

  try {
    switch (type) {
      case 'user.created': {
        // User signed up - create profile and admin_users entry
        const userId = record.id;
        const email = record.email;
        const username = record.user_metadata?.username || email.split('@')[0];
        const displayName = record.user_metadata?.display_name || username;

        await supabase.auth.from('profiles').insert({
          user_id: userId,
          username,
          display_name: displayName,
          account_status: 'ACTIVE',
        }).onConflict('user_id').ignore();

        await supabase.auth.from('admin_users').insert({
          user_id: userId,
          role: 'PLAYER',
        }).onConflict('user_id').ignore();

        break;
      }

      case 'user.updated': {
        // User updated - sync profile if needed
        if (record.user_metadata?.username) {
          await supabase.auth.from('profiles').update({
            username: record.user_metadata.username,
          }).eq('user_id', record.id);
        }
        if (record.user_metadata?.display_name) {
          await supabase.auth.from('profiles').update({
            display_name: record.user_metadata.display_name,
          }).eq('user_id', record.id);
        }
        break;
      }

      case 'user.deleted': {
        // User deleted - soft delete profile
        await supabase.auth.from('profiles').update({
          account_status: 'DELETED',
          username: `deleted_${record.id.slice(0, 8)}`,
          display_name: 'Deleted User',
          ff_uid: null,
          in_game_name: null,
          avatar_url: null,
        }).eq('user_id', record.id);

        await supabase.auth.from('admin_users').delete().eq('user_id', record.id);
        break;
      }
    }

    res.json({ success: true });
  } catch (err) {
    logger.error('Auth webhook processing failed', { error: err instanceof Error ? err.message : 'Unknown' });
    throw new AppError('WEBHOOK_FAILED', 'Webhook processing failed', 500);
  }
});

// Stripe/webhook placeholder (not used - no payments)
// webhookRoutes.post('/stripe', async (req, res) => { ... });

// Generic webhook for external services
webhookRoutes.post('/generic', async (req: Request, res: Response) => {
  logger.info('Generic webhook received', { body: req.body });
  res.json({ success: true });
});