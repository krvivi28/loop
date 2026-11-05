import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { isProd } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: 'not_found', message: `No route for ${req.method} ${req.path}` } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return res.status(400).json({
      error: { code: 'validation', message: `${first.path.join('.') || 'Input'}: ${first.message}`, details: err.issues },
    });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ error: { code: 'validation', message: Object.values(err.errors)[0]?.message ?? 'Invalid data' } });
  }
  if ((err as { code?: number })?.code === 11000) {
    return res.status(409).json({ error: { code: 'duplicate', message: 'This item already exists.' } });
  }
  if ((err as { type?: string })?.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'too_large', message: 'Upload is too large.' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'server_error', message: isProd ? 'Something went wrong on the server.' : String((err as Error)?.message ?? err) } });
}
