import type { Request } from 'express';
import rateLimit from 'express-rate-limit';

const msg = (message: string) => ({ error: { code: 'rate_limited', message } });

/** Login endpoints: per IP. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: msg('Too many login attempts. Try again in 15 minutes.'),
});

/** AI endpoints: per user (cost control). */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req: Request) => req.userId ?? req.ip ?? 'anon',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: msg('Too many AI requests. Wait a minute and try again.'),
});
