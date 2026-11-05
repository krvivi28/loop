import type { Request, Response } from 'express';
import { z } from 'zod';
import { DoseLog, Supplement } from '../models/index.js';
import type { doseLogSchema } from '../validators/schemas.js';
import { notFound } from '../utils/httpError.js';

type LogInput = z.infer<typeof doseLogSchema>;

/** Atomically change stock (never below 0; untouched if the item doesn't track stock). */
const adjustStock = (userId: string, supplementId: string, delta: number) =>
  Supplement.updateOne({ _id: supplementId, userId }, [
    { $set: { stock: { $cond: [{ $isNumber: '$stock' }, { $max: [0, { $round: [{ $add: ['$stock', delta] }, 2] }] }, '$stock'] } } },
  ]);

async function createLog(userId: string, l: LogInput) {
  const sup = await Supplement.exists({ _id: l.supplementId, userId });
  if (!sup) throw notFound('Supplement');
  const sameDose = { userId, supplementId: l.supplementId, date: l.date, doseIndex: l.doseIndex };
  // Taking a dose replaces a skip; a new skip replaces an old skip.
  await DoseLog.deleteMany({ ...sameDose, status: 'skipped' });
  const doc = await DoseLog.create({ _id: l.id, userId, ...l, quantity: l.status === 'taken' ? l.quantity : 0 });
  if (l.status === 'taken' && l.quantity) await adjustStock(userId, l.supplementId, -l.quantity);
  return doc;
}

export async function list(req: Request, res: Response) {
  const { from, to } = req.query as { from?: string; to?: string };
  const q: Record<string, unknown> = { userId: req.userId };
  if (from || to) q.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  res.json(await DoseLog.find(q).sort({ date: 1 }));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await createLog(req.userId, req.body));
}

/** "Mark all" for a time slot. */
export async function createBulk(req: Request, res: Response) {
  const out = [];
  for (const l of req.body.logs as LogInput[]) out.push(await createLog(req.userId, l));
  res.status(201).json(out);
}

export async function updateTime(req: Request, res: Response) {
  const doc = await DoseLog.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { takenAt: req.body.takenAt }, { new: true });
  if (!doc) throw notFound('Log');
  res.json(doc);
}

/** Undo: removes the log and gives the stock back. */
export async function remove(req: Request, res: Response) {
  const doc = await DoseLog.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!doc) throw notFound('Log');
  if (doc.status === 'taken' && doc.quantity) await adjustStock(req.userId, doc.supplementId, doc.quantity);
  res.json({ ok: true });
}
