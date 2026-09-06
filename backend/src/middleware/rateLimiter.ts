import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.UPSTASH_REDIS_REST_URL!, {
      password: process.env.UPSTASH_REDIS_REST_TOKEN,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: true,
    });
  }
  return redis;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: 'rl:global',
};

const endpointConfigs: Record<string, RateLimitConfig> = {
  'POST:/api/v1/auth/register': { windowMs: 60000, maxRequests: 5, keyPrefix: 'rl:auth:register' },
  'POST:/api/v1/auth/login': { windowMs: 60000, maxRequests: 10, keyPrefix: 'rl:auth:login' },
  'POST:/api/v1/auth/forgot-password': { windowMs: 3600000, maxRequests: 3, keyPrefix: 'rl:auth:forgot' },
  'POST:/api/v1/matches/:id/register': { windowMs: 60000, maxRequests: 5, keyPrefix: 'rl:registration' },
  'POST:/api/v1/checkin': { windowMs: 60000, maxRequests: 10, keyPrefix: 'rl:checkin' },
  'POST:/api/v1/credentials/:id/access': { windowMs: 60000, maxRequests: 5, keyPrefix: 'rl:credential:access' },
  'GET:/api/v1/credentials/:id/status': { windowMs: 60000, maxRequests: 30, keyPrefix: 'rl:credential:status' },
  'POST:/api/v1/admin': { windowMs: 60000, maxRequests: 100, keyPrefix: 'rl:admin' },
  'GET:/api/v1/notifications': { windowMs: 60000, maxRequests: 30, keyPrefix: 'rl:notifications' },
};

function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function getRateLimitKey(req: Request, config: RateLimitConfig): string {
  const userId = req.user?.id || 'anon';
  const ip = getClientIp(req);
  const path = req.route?.path || req.path;
  return `${config.keyPrefix}:${userId}:${ip}:${path}`;
}

async function checkRateLimit(key: string, config: RateLimitConfig): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  total: number;
}> {
  const client = getRedis();
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  const multi = client.multi();
  multi.zremrangebyscore(key, 0, windowStart);
  multi.zcard(key);
  multi.zadd(key, now, `${now}-${Math.random()}`);
  multi.pexpire(key, config.windowMs);
  
  const results = await multi.exec();
  const currentCount = (results?.[1]?.[1] as number) || 0;
  
  const allowed = currentCount < config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - currentCount);
  const resetTime = now + config.windowMs;
  
  return { allowed, remaining, resetTime, total: config.maxRequests };
}

export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const mergedConfig = { ...defaultConfig, ...config };
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = getRateLimitKey(req, mergedConfig);
      const result = await checkRateLimit(key, mergedConfig);
      
      res.setHeader('X-RateLimit-Limit', result.total);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
      
      if (!result.allowed) {
        res.setHeader('Retry-After', Math.ceil(config.windowMs / 1000));
        return res.status(429).json({
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
            request_id: req.id,
            retry_after: Math.ceil(config.windowMs / 1000),
          },
        });
      }
      
      next();
    } catch (err) {
      // Fail open - don't block on rate limiter errors
      console.error('Rate limiter error:', err);
      next();
    }
  };
}

export const rateLimiter = {
  global: createRateLimiter(),
  auth: {
    register: createRateLimiter(endpointConfigs['POST:/api/v1/auth/register']),
    login: createRateLimiter(endpointConfigs['POST:/api/v1/auth/login']),
    forgotPassword: createRateLimiter(endpointConfigs['POST:/api/v1/auth/forgot-password']),
  },
  registration: createRateLimiter(endpointConfigs['POST:/api/v1/matches/:id/register']),
  checkin: createRateLimiter(endpointConfigs['POST:/api/v1/checkin']),
  credential: {
    access: createRateLimiter(endpointConfigs['POST:/api/v1/credentials/:id/access']),
    status: createRateLimiter(endpointConfigs['GET:/api/v1/credentials/:id/status']),
  },
  admin: createRateLimiter(endpointConfigs['POST:/api/v1/admin']),
  notifications: createRateLimiter(endpointConfigs['GET:/api/v1/notifications']),
  
  // Dynamic endpoint-based limiter
  endpoint: (req: Request, res: Response, next: NextFunction) => {
    const methodPath = `${req.method}:${req.route?.path || req.path}`;
    const config = endpointConfigs[methodPath] || defaultConfig;
    return createRateLimiter(config)(req, res, next);
  },
};