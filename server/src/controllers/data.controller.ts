import type { Request, Response } from 'express';
import { z } from 'zod';
import { DailyLog, DoseLog, Meal, Photo, Supplement, User, Weight } from '../models/index.js';
import { bootstrap } from '../services/serialize.service.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { ID_RE } from '../utils/id.js';
import { doseLogSchema, mealSchema, settingsPatchSchema, supplementSchema, weightSchema } from '../validators/schemas.js';
import { deleteAllUserData } from './me.controller.js';
import { parseDataUrl } from './photos.controller.js';

/** Full backup as JSON, including photos (base64). */
export async function exportData(req: Request, res: Response) {
  const { data } = await bootstrap(req.userId);
  const photos = await Photo.find({ userId: req.userId }).lean();
  res.setHeader('Content-Disposition', `attachment; filename="fitstack-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({
    app: 'fitstack',
    exportedAt: new Date().toISOString(),
    data,
    photos: photos.map((p) => ({ id: p._id, dataUrl: `data:${p.contentType};base64,${p.data.toString('base64')}`, createdAt: p.createdAt })),
  });
}

const importSchema = z.object({
  app: z.literal('fitstack'),
  data: z.object({
    supplements: z.array(z.unknown()).default([]),
    doseLogs: z.array(z.unknown()).default([]),
    meals: z.array(z.unknown()).default([]),
    water: z.record(z.number()).default({}),
    training: z.record(z.boolean()).default({}),
    weights: z.array(z.unknown()).default([]),
    categories: z.array(z.string().max(40)).max(100).optional(),
    settings: z.record(z.unknown()).optional(),
  }),
  photos: z.array(z.object({ id: z.string(), dataUrl: z.string() })).default([]),
});

/** Replace everything in the account with a backup (also used to move data from the old browser-only version). */
export async function importData(req: Request, res: Response) {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('That file is not a Loop backup.', 'bad_backup');
  const { data, photos } = parsed.data;
  const userId = req.userId;
  const user = await User.findById(userId);
  if (!user) throw notFound('Account');

  const pick = <T extends z.ZodTypeAny>(schema: T, items: unknown[]) => {
    const ok: z.infer<T>[] = [];
    let skipped = 0;
    for (const it of items) {
      const r = schema.safeParse(it);
      if (r.success) ok.push(r.data);
      else skipped++;
    }
    return { ok, skipped };
  };
  const sups = pick(supplementSchema, data.supplements);
  const supIds = new Set(sups.ok.map((s) => s.id));
  const logs = pick(doseLogSchema, data.doseLogs);
  const meals = pick(mealSchema, data.meals);
  const weights = pick(weightSchema, data.weights);

  const photoDocs: { _id: string; userId: string; contentType: string; data: Buffer; size: number }[] = [];
  for (const p of photos) {
    if (!ID_RE.test(p.id)) continue;
    try {
      const { contentType, data: buf } = parseDataUrl(p.dataUrl);
      photoDocs.push({ _id: p.id, userId, contentType, data: buf, size: buf.length });
    } catch {
      /* skip bad photo */
    }
  }
  const photoIds = new Set(photoDocs.map((p) => p._id));

  await deleteAllUserData(userId);
  // ids are globally unique (_id); drop any that already exist in another account
  const free = async (Model: typeof Supplement | typeof DoseLog | typeof Meal | typeof Weight | typeof Photo, ids: string[]) => {
    const taken = new Set((await (Model as typeof Supplement).find({ _id: { $in: ids } }, { _id: 1 }).lean()).map((d) => String(d._id)));
    return (id: string) => !taken.has(id);
  };
  const okPhoto = await free(Photo, [...photoIds]);
  if (photoDocs.length) await Photo.insertMany(photoDocs.filter((p) => okPhoto(p._id)));
  const okSup = await free(Supplement, [...supIds]);
  await Supplement.insertMany(
    sups.ok.filter((s) => okSup(s.id)).map(({ id, createdAt, ...s }) => ({
      ...s, _id: id, userId, photoId: s.photoId && photoIds.has(s.photoId) ? s.photoId : undefined, createdAt: createdAt ? new Date(createdAt) : new Date(),
    })),
  );
  const okLog = await free(DoseLog, logs.ok.map((l) => l.id));
  await DoseLog.insertMany(logs.ok.filter((l) => supIds.has(l.supplementId) && okLog(l.id)).map(({ id, ...l }) => ({ ...l, _id: id, userId })));
  const okMeal = await free(Meal, meals.ok.map((m) => m.id));
  await Meal.insertMany(meals.ok.filter((m) => okMeal(m.id)).map(({ id, ...m }) => ({ ...m, _id: id, userId, photoId: m.photoId && photoIds.has(m.photoId) ? m.photoId : undefined })));
  const okW = await free(Weight, weights.ok.map((w) => w.id));
  const seenW = new Set<string>();
  await Weight.insertMany(weights.ok.filter((w) => okW(w.id) && !seenW.has(w.date) && seenW.add(w.date)).map(({ id, ...w }) => ({ ...w, _id: id, userId })));

  const dates = new Set([...Object.keys(data.water), ...Object.keys(data.training)].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)));
  if (dates.size)
    await DailyLog.insertMany([...dates].map((date) => ({ userId, date, waterMl: data.water[date], training: data.training[date] })));

  if (data.categories?.length) user.categories = data.categories;
  const s = data.settings ? settingsPatchSchema.safeParse(stripUnknownSettings(data.settings)) : null;
  if (s?.success) {
    const { profile, ...rest } = s.data;
    if (profile) user.set('profile', { ...user.toObject().profile, ...profile });
    user.set('settings', { ...user.toObject().settings, ...rest, targets: { ...user.toObject().settings?.targets, ...rest.targets } });
  }
  await user.save();

  res.json({
    imported: { supplements: sups.ok.length, doseLogs: logs.ok.length, meals: meals.ok.length, weights: weights.ok.length, photos: photoDocs.length },
    skipped: sups.skipped + logs.skipped + meals.skipped + weights.skipped,
  });
}

/** The old browser version stored extra keys (API key, model): ignore them. */
function stripUnknownSettings(s: Record<string, unknown>) {
  const allowed = ['theme', 'accentColor', 'profile', 'targets', 'workoutDays', 'notifications', 'notifySlots'];
  const out: Record<string, unknown> = {};
  for (const k of allowed) if (s[k] !== undefined) out[k] = s[k];
  if (out.profile && typeof out.profile === 'object') {
    const p = out.profile as Record<string, unknown>;
    out.profile = Object.fromEntries(Object.entries(p).filter(([k, v]) => ['name', 'weightKg', 'heightCm', 'goal'].includes(k) && v !== undefined && v !== null));
  }
  return out;
}

/** Clear all tracking data but keep the account, profile and settings. */
export async function clearData(req: Request, res: Response) {
  await deleteAllUserData(req.userId);
  await User.updateOne({ _id: req.userId }, { $unset: { ai: '' } });
  res.json({ ok: true });
}

