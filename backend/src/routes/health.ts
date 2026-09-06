import { Router, Request, Response } from 'express';
import { getSupabaseClients } from '../config/supabase.js';

export const healthRoutes = Router();

healthRoutes.get('/health', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  const checks = await Promise.allSettled([
    supabase.auth.from('profiles').select('id').limit(1),
    supabase.match.from('matches').select('id').limit(1),
    supabase.cred.from('credentials').select('id').limit(1),
    supabase.audit.from('audit_logs').select('id').limit(1),
    supabase.notif.from('notifications').select('id').limit(1),
  ]);

  const healthy = checks.every(c => c.status === 'fulfilled');
  
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks: checks.map((c, i) => ({
      service: ['auth', 'match', 'cred', 'audit', 'notif'][i],
      status: c.status === 'fulfilled' ? 'up' : 'down',
      error: c.status === 'rejected' ? c.reason.message : undefined,
    })),
  });
});

healthRoutes.get('/time', (req: Request, res: Response) => {
  res.json({
    server_time: new Date().toISOString(),
    timezone: 'UTC',
  });
});