import 'dotenv/config';
import express, { Router, type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { json, urlencoded } from 'express';
import { createSupabaseClients } from './config/supabase.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { authMiddleware } from './middleware/auth.js';
import { rbacMiddleware } from './middleware/rbac.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { profileRoutes } from './routes/profile.js';
import { matchRoutes } from './routes/matches.js';
import { registrationRoutes } from './routes/registrations.js';
import { checkinRoutes } from './routes/checkin.js';
import { credentialRoutes } from './routes/credentials.js';
import { notificationRoutes } from './routes/notifications.js';
import { adminRoutes } from './routes/admin.js';
import { cronRoutes } from './routes/cron.js';
import { webhookRoutes } from './routes/webhooks.js';
import { logger } from './utils/logger.js';

// Extend Express Router with custom properties
interface ExtendedRouter extends Router {
  public?: Router;
  protected?: Router;
  room?: Router;
}

declare module 'express' {
  interface Router {
    public?: Router;
    protected?: Router;
    room?: Router;
  }
}

async function bootstrap() {
  const app = express();

  // Trust proxy for rate limiting behind Cloudflare
  app.set('trust proxy', true);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  }));

  // CORS
  app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  }));

  // Body parsing
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // Request logging
  app.use(requestLogger);

  // Global rate limiter
  app.use(rateLimiter.global);

  // Initialize Supabase clients
  const supabase = createSupabaseClients();
  app.locals.supabase = supabase;

  // Health check (no auth)
  app.use('/api/v1/health', healthRoutes);
  app.use('/api/v1/time', healthRoutes);

  // Public routes (no auth required)
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/matches', matchRoutes.public);

  // Protected routes (auth required)
  app.use('/api/v1/auth', authMiddleware, authRoutes.protected);
  app.use('/api/v1/profile', authMiddleware, profileRoutes);
  app.use('/api/v1/matches', authMiddleware, matchRoutes.protected);
  app.use('/api/v1/registrations', authMiddleware, registrationRoutes);
  app.use('/api/v1/checkin', authMiddleware, checkinRoutes);
  app.use('/api/v1/credentials', authMiddleware, credentialRoutes);
  app.use('/api/v1/notifications', authMiddleware, notificationRoutes);
  app.use('/api/v1/room', authMiddleware, credentialRoutes.room);

  // Admin routes (auth + admin role)
  app.use('/api/v1/admin', authMiddleware, rbacMiddleware(['ADMIN', 'SUPER_ADMIN']), adminRoutes);

  // Cron routes (secret authentication)
  app.use('/api/v1/cron', cronRoutes);

  // Webhook routes
  app.use('/api/v1/webhooks', webhookRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
        request_id: req.id,
      },
    });
  });

  // Error handler
  app.use(errorHandler);

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    logger.info(`Server started on port ${port}`, { env: process.env.NODE_ENV });
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', { error: err.message, stack: err.stack });
  process.exit(1);
});