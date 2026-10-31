import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.ts';

/**
 * Role-Based Access Control (RBAC) Middleware.
 * Usage: requireRoles('ADMIN'), requireRoles('ADMIN', 'STAFF')
 */
export function requireRoles(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Requires one of [${allowedRoles.join(', ')}] role(s), but your role is '${req.user.role}'.`,
      });
      return;
    }

    next();
  };
}

