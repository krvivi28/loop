import { aiConfigured, env } from '../config/env.js';
import { ChatMessage, DailyLog, DoseLog, Meal, Supplement, User, Weight } from '../models/index.js';
import { notFound } from '../utils/httpError.js';
import { maskPhone } from '../utils/phone.js';

type AnyUser = InstanceType<typeof User>;

/** Settings in the shape the client uses (profile lives inside settings there). */
export function clientSettings(u: AnyUser) {
  const o = u.toObject();
  const s = o.settings ?? {};
  const p: { name?: string | null; weightKg?: number | null; heightCm?: number | null; goal?: string | null } = o.profile ?? {};
  return { ...s, profile: { name: p.name ?? undefined, weightKg: p.weightKg ?? undefined, heightCm: p.heightCm ?? undefined, goal: p.goal ?? undefined } };
}

export const clientUser = (u: AnyUser) => ({
  id: u._id,
  phone: u.phone,
  phoneMasked: u.phone ? maskPhone(u.phone) : undefined,
  email: u.email,
  onboarded: u.onboarded,
  tourSeen: u.tourSeen,
});

/** Everything the app needs after login, in one round trip. */
export async function bootstrap(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw notFound('Account');
  const [supplements, doseLogs, meals, daily, weights, chat] = await Promise.all([
    Supplement.find({ userId }).sort({ createdAt: 1 }),
    DoseLog.find({ userId }).sort({ date: 1 }),
    Meal.find({ userId }).sort({ loggedAt: 1 }),
    DailyLog.find({ userId }).lean(),
    Weight.find({ userId }).sort({ date: 1 }),
    ChatMessage.find({ userId }).sort({ at: 1 }).limit(60),
  ]);
  const water: Record<string, number> = {};
  const training: Record<string, boolean> = {};
  for (const d of daily) {
    if (typeof d.waterMl === 'number') water[d.date] = d.waterMl;
    if (typeof d.training === 'boolean') training[d.date] = d.training;
  }
  const ai = user.toObject().ai ?? {};
  return {
    user: clientUser(user),
    server: { aiConfigured: aiConfigured(), aiModel: env.OPENAI_MODEL },
    data: {
      schemaVersion: 1,
      supplements: supplements.map((x) => x.toJSON()),
      doseLogs: doseLogs.map((x) => x.toJSON()),
      meals: meals.map((x) => x.toJSON()),
      water,
      training,
      weights: weights.map((x) => x.toJSON()),
      categories: user.categories,
      settings: clientSettings(user),
      ai: {
        summary: ai.summary,
        summaryAt: ai.summaryAt?.toISOString?.(),
        tips: ai.tips,
        tipsAt: ai.tipsAt?.toISOString?.(),
      },
      chat: chat.map((c) => c.toJSON()),
    },
  };
}
