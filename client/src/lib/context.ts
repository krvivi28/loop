/** Compact, privacy-friendly summary of the user's data for AI prompts (no photos). */
import { FOOD_INSTRUCTIONS, SLOTS, GOALS } from './constants';
import { addDays, rangeKeys, todayKey } from './dates';
import { rangeStats, mealsOn, nutritionTotals, streaks, targetsFor } from './stats';
import type { AppData } from './types';

export function stackContext(data: AppData) {
  return JSON.stringify(
    data.supplements
      .filter((s) => s.status === 'active')
      .map((s) => ({
        name: s.name,
        category: s.category,
        form: s.form,
        doses: s.doses.map((d) => `${d.quantity} @ ${SLOTS[d.slot].label}${d.time ? ` ${d.time}` : ''}`),
        food: FOOD_INSTRUCTIONS[s.foodInstruction],
        schedule: s.schedule.type,
      })),
  );
}

export function aiContext(data: AppData) {
  const today = todayKey();
  const start = addDays(today, -6);
  const r = rangeStats(data, start, today);
  const days = rangeKeys(start, today).map((d) => {
    const n = nutritionTotals(mealsOn(data, d));
    const t = targetsFor(data, d);
    return {
      date: d,
      training: t.training,
      kcal: n.calories, kcalTarget: t.calories,
      protein: n.proteinG, proteinTarget: t.proteinG,
      carbs: n.carbsG, fat: n.fatG,
      waterMl: data.water[d] ?? 0, waterTarget: t.waterMl,
      meals: mealsOn(data, d).map((m) => m.foodItems.map((f) => f.name).join(', ')).filter(Boolean),
    };
  });
  const w = [...data.weights].sort((a, b) => a.date.localeCompare(b.date)).slice(-6);
  return JSON.stringify({
    today,
    profile: {
      goal: data.settings.profile.goal ? GOALS[data.settings.profile.goal] : undefined,
      weightKg: data.settings.profile.weightKg,
      heightCm: data.settings.profile.heightCm,
    },
    stack: JSON.parse(stackContext(data)),
    last7Days: {
      adherencePct: r.adherence === null ? null : Math.round(r.adherence * 100),
      taken: r.taken, missed: r.missed, skipped: r.skipped,
      missedBySlot: r.slotMissed,
      perSupplement: r.perSupp.map((p) => ({ name: p.name, fullDays: p.fullDays, scheduledDays: p.scheduledDays, missedDoses: p.missed })),
    },
    streak: streaks(data),
    nutritionByDay: days,
    weightTrend: w.map((x) => ({ date: x.date, kg: x.kg })),
  });
}
