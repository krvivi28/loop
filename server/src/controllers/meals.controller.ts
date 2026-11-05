import type { Request, Response } from 'express';
import { Meal, Photo } from '../models/index.js';
import { notFound } from '../utils/httpError.js';

export async function list(req: Request, res: Response) {
  const { from, to } = req.query as { from?: string; to?: string };
  const q: Record<string, unknown> = { userId: req.userId };
  if (from || to) q.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  res.json(await Meal.find(q).sort({ loggedAt: 1 }));
}

export async function upsert(req: Request, res: Response) {
  const { id, ...body } = req.body;
  if (req.params.id && req.params.id !== id) throw notFound('Meal');
  const existing = await Meal.findOne({ _id: id, userId: req.userId });
  if (!existing && (await Meal.exists({ _id: id }))) throw notFound('Meal');
  if (body.photoId && !(await Photo.exists({ _id: body.photoId, userId: req.userId }))) throw notFound('Photo');
  if (existing?.photoId && existing.photoId !== body.photoId) await Photo.deleteOne({ _id: existing.photoId, userId: req.userId });
  const doc = await Meal.findOneAndReplace({ _id: id, userId: req.userId }, { _id: id, userId: req.userId, ...body }, { upsert: true, new: true, runValidators: true });
  res.status(existing ? 200 : 201).json(doc);
}

export async function remove(req: Request, res: Response) {
  const doc = await Meal.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!doc) throw notFound('Meal');
  if (doc.photoId) await Photo.deleteOne({ _id: doc.photoId, userId: req.userId });
  res.json({ ok: true });
}
