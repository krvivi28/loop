import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

/** Validate req.body (default) or req.params with a zod schema; replaces it with the parsed value. */
export const validate =
  (schema: ZodTypeAny, where: 'body' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const r = schema.safeParse(req[where]);
    if (!r.success) return next(r.error);
    (req as unknown as Record<string, unknown>)[where] = r.data;
    next();
  };
