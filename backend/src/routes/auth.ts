import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSupabaseClients } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { sendEmail } from '../services/email.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/),
  display_name: z.string().min(1).max(50),
  ff_uid: z.string().regex(/^\d{8,12}$/),
  in_game_name: z.string().min(1).max(30),
  date_of_birth: z.string().date(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(12).max(128),
});

export const authRoutes = Router() as Router & { protected: Router };

// Public routes
authRoutes.post('/register', async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);
  const supabase = getSupabaseClients();

  // Check age
  const dob = new Date(data.date_of_birth);
  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 13) {
    throw new AppError('AGE_RESTRICTED', 'You must be at least 13 years old', 400);
  }

  const { data: authData, error: authError } = await supabase.auth.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      username: data.username,
      display_name: data.display_name,
      role: 'PLAYER',
    },
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      throw new AppError('EMAIL_EXISTS', 'Email already registered', 409);
    }
    throw new AppError('REGISTRATION_FAILED', authError.message, 400);
  }

  const user = authData.user;

  // Create profile
  const { error: profileError } = await supabase.auth
    .from('profiles')
    .insert({
      user_id: user.id,
      username: data.username,
      display_name: data.display_name,
      ff_uid: data.ff_uid,
      in_game_name: data.in_game_name,
      account_status: 'ACTIVE',
    });

  if (profileError) {
    await supabase.auth.auth.admin.deleteUser(user.id);
    throw new AppError('PROFILE_CREATION_FAILED', profileError.message, 500);
  }

  // Create admin_users entry
  await supabase.auth.from('admin_users').insert({
    user_id: user.id,
    role: 'PLAYER',
  });

  // Send verification email
  await sendEmail({
    to: data.email,
    subject: 'Welcome to TMT OFFICIAL eSports',
    template: 'welcome',
    data: { username: data.username },
  });

  logger.info('User registered', { userId: user.id, email: data.email });

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      created_at: user.created_at,
    },
    message: 'Registration successful. Please verify your email.',
  });
});

authRoutes.post('/login', async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);
  const supabase = getSupabaseClients();

  const { data: authData, error } = await supabase.auth.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const session = authData.session!;
  const user = authData.user!;

  // Set HttpOnly cookies
  res.cookie('sb-access-token', session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('sb-refresh-token', session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  logger.info('User logged in', { userId: user.id });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: 'PLAYER', // Will be updated by middleware
    },
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
    },
  });
});

authRoutes.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  
  await supabase.auth.auth.signOut();
  
  res.clearCookie('sb-access-token');
  res.clearCookie('sb-refresh-token');
  
  logger.info('User logged out', { userId: req.user?.id });
  
  res.status(204).send();
});

authRoutes.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.['sb-refresh-token'];
  
  if (!refreshToken) {
    throw new AppError('NO_REFRESH_TOKEN', 'Refresh token required', 401);
  }

  const supabase = getSupabaseClients();
  
  const { data, error } = await supabase.auth.auth.refreshSession({ refresh_token: refreshToken });
  
  if (error || !data.session) {
    throw new AppError('TOKEN_REFRESH_FAILED', 'Failed to refresh session', 401);
  }

  const session = data.session;

  res.cookie('sb-access-token', session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('sb-refresh-token', session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
    },
  });
});

authRoutes.post('/forgot-password', async (req: Request, res: Response) => {
  const data = forgotPasswordSchema.parse(req.body);
  const supabase = getSupabaseClients();

  // Anti-enumeration: always return success
  const { error } = await supabase.auth.auth.resetPasswordForEmail(data.email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
  });

  if (!error) {
    logger.info('Password reset requested', { email: data.email });
  }

  res.json({ message: 'If the email exists, a reset link has been sent' });
});

authRoutes.post('/reset-password', async (req: Request, res: Response) => {
  const data = resetPasswordSchema.parse(req.body);
  const supabase = getSupabaseClients();

  const { error } = await supabase.auth.auth.updateUser({ password: data.password });
  
  if (error) {
    throw new AppError('PASSWORD_RESET_FAILED', error.message, 400);
  }

  res.json({ message: 'Password updated successfully' });
});

// Protected routes
authRoutes.protected = Router();
authRoutes.protected.use(authMiddleware);

authRoutes.protected.get('/me', async (req: Request, res: Response) => {
  const supabase = getSupabaseClients();
  
  const { data: profile } = await supabase.auth
    .from('profiles')
    .select('*')
    .eq('user_id', req.user!.id)
    .single();

  const { data: adminUser } = await supabase.auth
    .from('admin_users')
    .select('role, permissions')
    .eq('user_id', req.user!.id)
    .single();

  res.json({
    id: req.user!.id,
    email: req.user!.email,
    role: adminUser?.role || 'PLAYER',
    permissions: adminUser?.permissions || {},
    profile,
  });
});