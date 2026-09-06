import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSupabaseClients } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const matchListQuerySchema = z.object({
  status: z.enum(['DRAFT', 'OPEN', 'FULL', 'CLOSED', 'LIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED']).optional(),
  game_mode: z.enum(['CLASSIC', 'RANKED', 'CUSTOM']).optional(),
  team_size: z.enum(['SOLO', 'DUO', 'SQUAD']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

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

export const matchRoutes = Router();

// Public routes
matchRoutes.public = Router();

matchRoutes.public.get('/', async (req: Request, res: Response) => {
  const query = matchListQuerySchema.parse(req.query);
  const supabase = getSupabaseClients();
  const { page, limit, status, game_mode, team_size } = query;

  let qb = supabase.match
    .from('matches')
    .select(`
      id, title, description, game_mode, map, team_size,
      max_teams, max_players, scheduled_at,
      registration_opens_at, registration_closes_at,
      checkin_opens_at, checkin_closes_at,
      credential_release_at, credential_expires_at,
      status, created_at
    `, { count: 'exact' })
    .order('scheduled_at', { ascending: true });

  if (status) qb = qb.eq('status', status);
  if (game_mode) qb = qb.eq('game_mode', game_mode);
  if (team_size) qb = qb.eq('team_size', team_size);

  const offset = (page - 1) * limit;
  qb = qb.range(offset, offset + limit - 1);

  const { data: matches, count, error } = await qb;

  if (error) {
    throw new AppError('FETCH_FAILED', error.message, 500);
  }

  // Add registration counts
  const matchIds = matches?.map(m => m.id) || [];
  let regCounts: Record<string, number> = {};
  
  if (matchIds.length > 0) {
    const { data: regs } = await supabase.match
      .from('registrations')
      .select('match_id')
      .in('match_id', matchIds)
      .eq('status', 'CONFIRMED');
    
    for (const r of regs || []) {
      regCounts[r.match_id] = (regCounts[r.match_id] || 0) + 1;
    }
  }

  const enriched = matches?.map(m => ({
    ...m,
    registration_count: regCounts[m.id] || 0,
  })) || [];

  res.json({
    data: enriched,
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

matchRoutes.public.get('/:id', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const { id } = req.params;

  const { data: match, error } = await supabase.match
    .from('matches')
    .select(`
      id, title, description, game_mode, map, team_size,
      max_teams, max_players, scheduled_at,
      registration_opens_at, registration_closes_at,
      checkin_opens_at, checkin_closes_at,
      credential_release_at, credential_expires_at,
      status, created_at, created_by
    `)
    .eq('id', id)
    .single();

  if (error || !match) {
    throw new AppError('MATCH_NOT_FOUND', 'Match not found', 404);
  }

  // Get registration count
  const { count } = await supabase.match
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', id)
    .eq('status', 'CONFIRMED');

  res.json({ ...match, registration_count: count || 0 });
});

matchRoutes.public.get('/schedule/range', async (req: Request, res: Response) => {
  const { from, to } = req.query;
  if (!from || !to) {
    throw new AppError('INVALID_PARAMS', 'from and to parameters required', 400);
  }

  const supabase = getSupabaseClients();
  
  const { data: matches, error } = await supabase.match
    .from('matches')
    .select('id, title, game_mode, map, team_size, scheduled_at, status')
    .gte('scheduled_at', from)
    .lte('scheduled_at', to)
    .order('scheduled_at', { ascending: true });

  if (error) {
    throw new AppError('FETCH_FAILED', error.message, 500);
  }

  res.json(matches || []);
});

// Protected routes (require auth)
matchRoutes.protected = Router();