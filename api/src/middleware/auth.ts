import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as {
      user_id: string;
      is_admin: boolean;
    };
    req.user = { user_id: payload.user_id, is_admin: payload.is_admin };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as {
      user_id: string;
      is_admin: boolean;
    };
    req.user = { user_id: payload.user_id, is_admin: payload.is_admin };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
