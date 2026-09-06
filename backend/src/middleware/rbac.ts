import { Request, Response, NextFunction } from 'express';

const ROLE_HIERARCHY = {
  PLAYER: 0,
  MODERATOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
} as const;

type Role = keyof typeof ROLE_HIERARCHY;

export function rbacMiddleware(allowedRoles: Role[]) {
  const minLevel = Math.min(...allowedRoles.map(r => ROLE_HIERARCHY[r]));

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required', request_id: req.id },
      });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role as Role] ?? -1;
    
    if (userLevel < minLevel) {
      return res.status(403).json({
        error: { 
          code: 'FORBIDDEN', 
          message: `Insufficient permissions. Required: ${allowedRoles.join(' or ')}, Current: ${req.user.role}`,
          request_id: req.id,
        },
      });
    }

    next();
  };
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  return rbacMiddleware(['SUPER_ADMIN'])(req, res, next);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return rbacMiddleware(['ADMIN', 'SUPER_ADMIN'])(req, res, next);
}

export function requireModerator(req: Request, res: Response, next: NextFunction) {
  return rbacMiddleware(['MODERATOR', 'ADMIN', 'SUPER_ADMIN'])(req, res, next);
}