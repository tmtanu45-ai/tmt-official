import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSupabaseClients } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  in_game_name: z.string().min(1).max(30).optional(),
  bio: z.string().max(500).optional(),
});

export const profileRoutes = Router();

profileRoutes.get('/me', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const userId = req.user!.id;

  const { data: profile, error } = await supabase.auth
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !profile) {
    throw new AppError('PROFILE_NOT_FOUND', 'Profile not found', 404);
  }

  // Get match statistics
  const { data: stats } = await supabase.match.rpc('get_player_stats', { p_user_id: userId });

  res.json({
    ...profile,
    stats: stats || {
      matches_played: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      kd_ratio: 0,
      avg_placement: 0,
      win_rate: 0,
    },
  });
});

profileRoutes.patch('/me', async (req: Request, res: Response) => {
  const data = updateProfileSchema.parse(req.body);
  const supabase = getSupabaseClients();
  const userId = req.user!.id;

  const { data: profile, error } = await supabase.auth
    .from('profiles')
    .update(data)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new AppError('UPDATE_FAILED', error.message, 400);
  }

  logger.info('Profile updated', { userId, fields: Object.keys(data) });

  res.json(profile);
});

profileRoutes.get('/:username', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const { username } = req.params;

  const { data: profile, error } = await supabase.auth
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, created_at')
    .eq('username', username)
    .single();

  if (error || !profile) {
    throw new AppError('PROFILE_NOT_FOUND', 'Profile not found', 404);
  }

  // Get public match history
  const { data: matches } = await supabase.match
    .from('registrations')
    .select(`
      match_id,
      status,
      created_at,
      matches!inner (
        title,
        scheduled_at,
        status,
        game_mode,
        map
      )
    `)
    .eq('user_id', profile.id)
    .eq('status', 'CONFIRMED')
    .order('created_at', { ascending: false })
    .limit(10);

  res.json({
    ...profile,
    recent_matches: matches || [],
  });
});

profileRoutes.get('/me/matches', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const userId = req.user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const offset = (page - 1) * limit;

  const { data: registrations, count, error } = await supabase.match
    .from('registrations')
    .select(`
      *,
      matches!inner (
        id, title, game_mode, map, scheduled_at, status,
        team_size, max_teams, max_players
      ),
      checkins ( status, checked_in_at )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('registered_at', { ascending: false })
    .range(offset, offset + limit - 1);

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