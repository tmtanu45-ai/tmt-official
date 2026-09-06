import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  sessionId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      supabase?: SupabaseClient;
      id: string;
    }
  }
}

let supabaseAuth: SupabaseClient | null = null;

function getSupabaseAuth(): SupabaseClient {
  if (!supabaseAuth) {
    supabaseAuth = createClient(
      process.env.SUPABASE_AUTH_URL!,
      process.env.SUPABASE_AUTH_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return supabaseAuth;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  req.id = crypto.randomUUID();
  
  const accessToken = req.cookies?.['sb-access-token'] || req.headers.authorization?.replace('Bearer ', '');
  
  if (!accessToken) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required', request_id: req.id },
    });
  }

  try {
    const supabase = getSupabaseAuth();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token', request_id: req.id },
      });
    }

    // Get user role from admin_users table
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single();

    req.user = {
      id: user.id,
      email: user.email!,
      role: adminUser?.role || 'PLAYER',
      sessionId: accessToken.substring(0, 8),
    };
    req.supabase = supabase;

    next();
  } catch (err) {
    logger.error('Auth middleware error', { error: err instanceof Error ? err.message : 'Unknown', requestId: req.id });
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Authentication failed', request_id: req.id },
    });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const accessToken = req.cookies?.['sb-access-token'] || req.headers.authorization?.replace('Bearer ', '');
  
  if (!accessToken) {
    return next();
  }

  authMiddleware(req, res, next);
}