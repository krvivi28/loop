import type { NextFunction, Request, Response } from 'express';
import { verifyToken, COOKIE_NAME } from '../services/token.service.js';
import { unauthorized } from '../utils/httpError.js';

declare module 'express-serve-static-core' {
  interface Request {
    userId: string;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = req.cookies?.[COOKIE_NAME] ?? (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
  if (!token) return next(unauthorized('Please log in.'));
  const userId = verifyToken(token);
  if (!userId) return next(unauthorized('Your session expired. Please log in again.'));
  req.userId = userId;
  next();
}
