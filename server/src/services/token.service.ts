import type { CookieOptions, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env, isProd } from '../config/env.js';

export const COOKIE_NAME = 'fs_session';

export const signToken = (userId: string) => jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: `${env.JWT_EXPIRES_DAYS}d` });

export function verifyToken(token: string): string | null {
  try {
    const p = jwt.verify(token, env.JWT_SECRET);
    return typeof p === 'object' && typeof p.sub === 'string' ? p.sub : null;
  } catch {
    return null;
  }
}

const cookieOpts = (): CookieOptions => ({
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  path: '/',
});

export const setSessionCookie = (res: Response, userId: string) =>
  res.cookie(COOKIE_NAME, signToken(userId), { ...cookieOpts(), maxAge: env.JWT_EXPIRES_DAYS * 86400_000 });

export const clearSessionCookie = (res: Response) => res.clearCookie(COOKIE_NAME, cookieOpts());
