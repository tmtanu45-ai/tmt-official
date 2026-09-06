import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSupabaseClients } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';

const updatePreferencesSchema = z.object({
  in_app: z.boolean().optional(),
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  registration_alerts: z.boolean().optional(),
  match_alerts: z.boolean().optional(),
  checkin_reminders: z.boolean().optional(),
  credential_alerts: z.boolean().optional(),
  security_alerts: z.boolean().optional(),
});

export const notificationRoutes = Router();

notificationRoutes.get('/', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const userId = req.user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const unreadOnly = req.query.unread_only === 'true';
  const offset = (page - 1) * limit;

  let qb = supabase.notif
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (unreadOnly) qb = qb.eq('read', false);

  qb = qb.range(offset, offset + limit - 1);

  const { data: notifications, count, error } = await qb;

  if (error) {
    throw new AppError('FETCH_FAILED', error.message, 500);
  }

  // Get unread count
  const { count: unreadCount } = await supabase.notif
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  res.json({
    data: notifications || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
      has_next: offset + limit < (count || 0),
      has_prev: page > 1,
    },
    unread_count: unreadCount || 0,
  });
});

notificationRoutes.patch('/:id/read', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const userId = req.user!.id;
  const { id } = req.params;

  const { error } = await supabase.notif
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new AppError('UPDATE_FAILED', error.message, 500);
  }

  res.json({ message: 'Notification marked as read' });
});

notificationRoutes.patch('/read-all', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const userId = req.user!.id;

  const { error } = await supabase.notif
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    throw new AppError('UPDATE_FAILED', error.message, 500);
  }

  res.json({ message: 'All notifications marked as read' });
});

notificationRoutes.get('/preferences', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const userId = req.user!.id;

  const { data: prefs, error } = await supabase.notif
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new AppError('FETCH_FAILED', error.message, 500);
  }

  // Return defaults if not found
  res.json(prefs || {
    in_app: true,
    email: true,
    push: false,
    registration_alerts: true,
    match_alerts: true,
    checkin_reminders: true,
    credential_alerts: true,
    security_alerts: true,
  });
});

notificationRoutes.patch('/preferences', async (req: Request, res: Response) => {
  const data = updatePreferencesSchema.parse(req.body);
  const supabase = getSupabaseClients();
  const userId = req.user!.id;

  const { data: prefs, error } = await supabase.notif
    .from('notification_preferences')
    .upsert({ user_id: userId, ...data })
    .select()
    .single();

  if (error) {
    throw new AppError('UPDATE_FAILED', error.message, 500);
  }

  res.json(prefs);
});