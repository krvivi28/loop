import type { Request, Response } from 'express';
import { ChatMessage, DailyLog, DoseLog, Meal, Photo, Supplement, User, Weight } from '../models/index.js';
import { bootstrap, clientSettings, clientUser } from '../services/serialize.service.js';
import { clearSessionCookie } from '../services/token.service.js';
import { notFound } from '../utils/httpError.js';

export async function getBootstrap(req: Request, res: Response) {
  res.json(await bootstrap(req.userId));
}

export async function getMe(req: Request, res: Response) {
  const u = await User.findById(req.userId);
  if (!u) throw notFound('Account');
  res.json({ user: clientUser(u), settings: clientSettings(u) });
}

/** Update profile and/or settings. Only the provided fields change. */
export async function patchMe(req: Request, res: Response) {
  const { settings, onboarded, tourSeen } = req.body as { settings?: Record<string, unknown>; onboarded?: boolean; tourSeen?: boolean };
  const $set: Record<string, unknown> = {};
  if (onboarded !== undefined) $set.onboarded = onboarded;
  if (tourSeen !== undefined) $set.tourSeen = tourSeen;
  if (settings) {
    for (const [k, v] of Object.entries(settings)) {
      if (k === 'profile' || k === 'targets' || k === 'notifySlots') {
        const base = k === 'profile' ? 'profile' : `settings.${k}`;
        for (const [kk, vv] of Object.entries(v as Record<string, unknown>)) $set[`${base}.${kk}`] = vv;
      } else $set[`settings.${k}`] = v;
    }
  }
  const u = await User.findByIdAndUpdate(req.userId, { $set }, { new: true, runValidators: true });
  if (!u) throw notFound('Account');
  res.json({ user: clientUser(u), settings: clientSettings(u) });
}

export async function addCategory(req: Request, res: Response) {
  const name: string = req.body.name;
  const u = await User.findById(req.userId);
  if (!u) throw notFound('Account');
  if (!u.categories.includes(name)) {
    u.categories = [...u.categories.filter((c) => c !== 'Other'), name, 'Other'];
    await u.save();
  }
  res.json({ categories: u.categories });
}

export async function deleteAllUserData(userId: string) {
  await Promise.all([
    Supplement.deleteMany({ userId }),
    DoseLog.deleteMany({ userId }),
    Meal.deleteMany({ userId }),
    Photo.deleteMany({ userId }),
    DailyLog.deleteMany({ userId }),
    Weight.deleteMany({ userId }),
    ChatMessage.deleteMany({ userId }),
  ]);
}

/** Permanently delete the account and everything in it. */
export async function deleteMe(req: Request, res: Response) {
  await deleteAllUserData(req.userId);
  await User.deleteOne({ _id: req.userId });
  clearSessionCookie(res);
  res.json({ ok: true });
}
