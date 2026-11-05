import type { Request, Response } from 'express';
import { DoseLog, Photo, Supplement } from '../models/index.js';
import { notFound } from '../utils/httpError.js';

export async function list(req: Request, res: Response) {
  res.json(await Supplement.find({ userId: req.userId }).sort({ createdAt: 1 }));
}

/** Create or replace (PUT semantics with a client-generated id). */
export async function upsert(req: Request, res: Response) {
  const { id, createdAt, ...body } = req.body;
  if (req.params.id && req.params.id !== id) throw notFound('Supplement');
  const existing = await Supplement.findOne({ _id: id, userId: req.userId });
  if (!existing && (await Supplement.exists({ _id: id }))) throw notFound('Supplement'); // id belongs to someone else
  if (existing?.photoId && existing.photoId !== body.photoId) await Photo.deleteOne({ _id: existing.photoId, userId: req.userId });
  const doc = await Supplement.findOneAndReplace(
    { _id: id, userId: req.userId },
    { _id: id, userId: req.userId, ...body, createdAt: existing?.createdAt ?? (createdAt ? new Date(createdAt) : new Date()) },
    { upsert: true, new: true, runValidators: true },
  );
  res.status(existing ? 200 : 201).json(doc);
}

export async function setStatus(req: Request, res: Response) {
  const doc = await Supplement.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { status: req.body.status }, { new: true });
  if (!doc) throw notFound('Supplement');
  res.json(doc);
}

/** Deletes the item, its photo and its whole dose history. */
export async function remove(req: Request, res: Response) {
  const doc = await Supplement.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!doc) throw notFound('Supplement');
  await Promise.all([
    DoseLog.deleteMany({ userId: req.userId, supplementId: doc._id }),
    doc.photoId ? Photo.deleteOne({ _id: doc.photoId, userId: req.userId }) : null,
  ]);
  res.json({ ok: true });
}
