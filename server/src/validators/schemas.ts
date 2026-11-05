import { z } from 'zod';
import { ID_RE } from '../utils/id.js';

const id = z.string().regex(ID_RE, 'Invalid id');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
const hhmm = z.string().regex(/^\d{2}:\d{2}$/);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const slot = z.enum(['morning', 'afternoon', 'evening', 'night', 'pre_workout', 'post_workout']);
const num = (max = 100000) => z.number().finite().min(0).max(max);

// ---- auth ----
export const requestOtpSchema = z.object({ phone: z.string({ message: 'Enter your mobile number.' }).min(6, 'Enter a valid mobile number.').max(20, 'Enter a valid mobile number.') });
export const verifyOtpSchema = z.object({ phone: z.string().min(6).max(20), code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') });
export const emailAuthSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(72),
});

// ---- settings / profile ----
export const settingsPatchSchema = z
  .object({
    theme: z.enum(['dark', 'light']),
    accentColor: hex,
    profile: z
      .object({
        name: z.string().trim().max(60).optional(),
        weightKg: z.number().min(20).max(400).optional(),
        heightCm: z.number().min(50).max(260).optional(),
        goal: z.enum(['muscle_gain', 'fat_loss', 'maintenance', 'endurance']).optional(),
      })
      .strict(),
    targets: z.object({ calories: num(20000), proteinG: num(1000), carbsG: num(2000), fatG: num(1000), waterMl: num(20000) }).partial(),
    workoutDays: z.array(z.number().int().min(0).max(6)).max(7),
    notifications: z.boolean(),
    notifySlots: z.record(slot, z.boolean()),
  })
  .partial()
  .strict();
export const mePatchSchema = z.object({ settings: settingsPatchSchema.optional(), onboarded: z.boolean().optional(), tourSeen: z.boolean().optional() }).strict();
export const categorySchema = z.object({ name: z.string().trim().min(1).max(40) });

// ---- supplements ----
export const supplementSchema = z.object({
  id,
  name: z.string().trim().min(1).max(60),
  category: z.string().trim().min(1).max(40),
  form: z.enum(['tablet', 'capsule', 'scoop', 'liquid', 'drops', 'gummy', 'injection']),
  doses: z.array(z.object({ slot, time: hhmm.optional(), quantity: z.number().min(0.1).max(1000) })).min(1).max(8),
  foodInstruction: z.enum(['before', 'with', 'after', 'empty_stomach', 'none']),
  schedule: z.object({ type: z.enum(['daily', 'weekdays', 'workout_days']), weekdays: z.array(z.number().int().min(0).max(6)).optional() }),
  startDate: date,
  endDate: date.optional(),
  stock: num(100000).optional(),
  color: hex,
  photoId: z.string().max(64).optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['active', 'paused', 'archived']).default('active'),
  createdAt: z.string().optional(),
});
export const statusSchema = z.object({ status: z.enum(['active', 'paused', 'archived']) });

// ---- dose logs ----
export const doseLogSchema = z.object({
  id,
  supplementId: id,
  date,
  slot,
  doseIndex: z.number().int().min(0).max(7),
  status: z.enum(['taken', 'skipped']),
  takenAt: z.string().datetime({ offset: true }).optional(),
  quantity: z.number().min(0).max(1000).default(0),
  skipReason: z.string().max(60).optional(),
  extra: z.boolean().optional(),
});
export const doseLogBulkSchema = z.object({ logs: z.array(doseLogSchema).min(1).max(30) });
export const doseLogPatchSchema = z.object({ takenAt: z.string().datetime({ offset: true }) });

// ---- meals ----
export const mealSchema = z.object({
  id,
  date,
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout']),
  loggedAt: z.string().datetime({ offset: true }),
  photoId: z.string().max(64).optional(),
  foodItems: z.array(z.object({ name: z.string().max(80), quantity: z.string().max(40).default('') })).max(30).default([]),
  calories: num(20000),
  proteinG: num(2000),
  carbsG: num(2000),
  fatG: num(2000),
  fiberG: num(1000).optional(),
  sugarG: num(1000).optional(),
  sodiumMg: num(100000).optional(),
  source: z.enum(['ai', 'manual']),
  aiConfidence: z.enum(['low', 'medium', 'high']).optional(),
  notes: z.string().max(500).optional(),
});

// ---- photos ----
export const photoUploadSchema = z.object({ dataUrl: z.string().max(4_500_000) });

// ---- daily / weight ----
export const dailyPatchSchema = z
  .object({ waterMl: num(20000).optional(), training: z.boolean().nullable().optional() })
  .refine((v) => v.waterMl !== undefined || v.training !== undefined, 'Nothing to update');
export const weightSchema = z.object({ id, date, kg: z.number().min(20).max(400) });

// ---- AI ----
export const analyzeMealSchema = z.object({ dataUrl: z.string().max(4_500_000), hint: z.string().max(300).default('') });
export const contextSchema = z.object({ context: z.string().max(60_000) });
export const chatSchema = z.object({ message: z.string().trim().min(1).max(2000), context: z.string().max(60_000) });
