import type { Request, Response } from 'express';
import { DailyLog, Weight } from '../models/index.js';
import { badRequest, notFound } from '../utils/httpError.js';

/** Water and training-day override for one date. training: null clears the override. */
export async function patchDaily(req: Request, res: Response) {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw badRequest('Date must be YYYY-MM-DD');
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ''> = {};
  if (req.body.waterMl !== undefined) $set.waterMl = req.body.waterMl;
  if (req.body.training === null) $unset.training = '';
  else if (req.body.training !== undefined) $set.training = req.body.training;
  const doc = await DailyLog.findOneAndUpdate(
    { userId: req.userId, date },
    { $set, ...(Object.keys($unset).length ? { $unset } : {}) },
    { upsert: true, new: true },
  ).lean();
  res.json({ date, waterMl: doc?.waterMl, training: doc?.training });
}

/** One weight per day: logging again on the same date replaces it. */
export async function upsertWeight(req: Request, res: Response) {
  const { id, date, kg } = req.body;
  await Weight.deleteOne({ userId: req.userId, date });
  const doc = await Weight.create({ _id: id, userId: req.userId, date, kg });
  res.status(201).json(doc);
}

export async function deleteWeight(req: Request, res: Response) {
  const r = await Weight.deleteOne({ _id: req.params.id, userId: req.userId });
  if (!r.deletedCount) throw notFound('Weight entry');
  res.json({ ok: true });
}
