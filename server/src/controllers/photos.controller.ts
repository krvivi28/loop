import type { Request, Response } from 'express';
import { Photo } from '../models/index.js';
import { badRequest, notFound } from '../utils/httpError.js';

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const MAX_BYTES = 3 * 1024 * 1024;

export function parseDataUrl(dataUrl: string) {
  const m = DATA_URL.exec(dataUrl);
  if (!m) throw badRequest('Photo must be a JPEG, PNG or WebP image.', 'bad_image');
  const data = Buffer.from(m[2], 'base64');
  if (data.length > MAX_BYTES) throw badRequest('Photo is larger than 3 MB.', 'too_large');
  return { contentType: m[1], data };
}

export async function upload(req: Request, res: Response) {
  const { contentType, data } = parseDataUrl(req.body.dataUrl);
  const doc = await Photo.create({ userId: req.userId, contentType, data, size: data.length });
  res.status(201).json({ id: doc._id });
}

export async function get(req: Request, res: Response) {
  const doc = await Photo.findOne({ _id: req.params.id, userId: req.userId });
  if (!doc) throw notFound('Photo');
  res.set('Content-Type', doc.contentType);
  res.set('Cache-Control', 'private, max-age=31536000, immutable');
  res.send(doc.data);
}

export async function remove(req: Request, res: Response) {
  await Photo.deleteOne({ _id: req.params.id, userId: req.userId });
  res.json({ ok: true });
}
