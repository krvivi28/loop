import { SLOT_ORDER } from './constants';
import { addDays, daysBetween, fromKey, minutesOf, rangeKeys, todayKey } from './dates';
import { buildLogIndex, dueDosesFor, earliestDate, isTrainingDay } from './schedule';
import type { AppData, MealLog, Slot, Targets } from './types';

export interface DayStat {
  date: string;
  due: number;
  taken: number;
  skipped: number;
  missed: number;
  pct: number | null; // null when nothing due
}

export interface SuppStat {
  id: string;
  name: string;
  color: string;
  scheduledDays: number;
  fullDays: number;
  taken: number;
  skipped: number;
  missed: number;
}

export function dayStats(data: AppData, dates: string[], supId?: string): DayStat[] {
  const idx = buildLogIndex(data.doseLogs);
  const now = new Date();
  return dates.map((date) => {
    const doses = dueDosesFor(data, date, now, idx, supId);
    const taken = doses.filter((d) => d.status === 'taken').length;
    const skipped = doses.filter((d) => d.status === 'skipped').length;
    const missed = doses.filter((d) => d.status === 'missed').length;
    const due = doses.length;
    return { date, due, taken, skipped, missed, pct: due ? taken / due : null };
  });
}

export function rangeStats(data: AppData, start: string, end: string) {
  const dates = rangeKeys(start, end);
  const idx = buildLogIndex(data.doseLogs);
  const now = new Date();
  const per = new Map<string, SuppStat>();
  const slotMissed: Record<string, number> = {};
  let taken = 0, skipped = 0, missed = 0;
  const scatter: { supId: string; x: number; y: number; date: string }[] = [];

  for (const date of dates) {
    const doses = dueDosesFor(data, date, now, idx);
    const bySup = new Map<string, { due: number; taken: number }>();
    for (const d of doses) {
      let s = per.get(d.sup.id);
      if (!s) {
        s = { id: d.sup.id, name: d.sup.name, color: d.sup.color, scheduledDays: 0, fullDays: 0, taken: 0, skipped: 0, missed: 0 };
        per.set(d.sup.id, s);
      }
      const b = bySup.get(d.sup.id) ?? { due: 0, taken: 0 };
      b.due++;
      if (d.status === 'taken') {
        b.taken++;
        s.taken++;
        taken++;
        const t = d.takenLogs[0]?.takenAt;
        if (t) {
          const dt = new Date(t);
          scatter.push({ supId: d.sup.id, x: daysBetween(start, date), y: dt.getHours() + dt.getMinutes() / 60, date });
        }
      } else if (d.status === 'skipped') {
        s.skipped++;
        skipped++;
      } else if (d.status === 'missed') {
        s.missed++;
        missed++;
        slotMissed[d.spec.slot] = (slotMissed[d.spec.slot] ?? 0) + 1;
      }
      bySup.set(d.sup.id, b);
    }
    for (const [id, b] of bySup) {
      const s = per.get(id)!;
      s.scheduledDays++;
      if (b.taken === b.due) s.fullDays++;
    }
  }
  const resolved = taken + skipped + missed;
  const worstSlot = (Object.entries(slotMissed).sort((a, b) => b[1] - a[1])[0]?.[0] as Slot | undefined) ?? undefined;
  return {
    taken, skipped, missed,
    adherence: resolved ? taken / resolved : null,
    perSupp: [...per.values()].sort((a, b) => b.fullDays - a.fullDays),
    slotMissed, worstSlot, scatter,
  };
}

/** Delay in minutes between scheduled time and actual time, per supplement. */
export function timingDrift(data: AppData, start: string, end: string) {
  const out: Record<string, { total: number; n: number }> = {};
  for (const l of data.doseLogs) {
    if (l.status !== 'taken' || !l.takenAt || l.extra || l.date < start || l.date > end) continue;
    const sup = data.supplements.find((s) => s.id === l.supplementId);
    const spec = sup?.doses[l.doseIndex];
    if (!spec?.time) continue;
    const t = new Date(l.takenAt);
    const diff = t.getHours() * 60 + t.getMinutes() - minutesOf(spec.time);
    const o = (out[l.supplementId] ??= { total: 0, n: 0 });
    o.total += diff;
    o.n++;
  }
  return out;
}

export function streaks(data: AppData, supId?: string) {
  const start = earliestDate(data);
  const today = todayKey();
  const days = dayStats(data, rangeKeys(start, today), supId);
  // best streak
  let best = 0, run = 0;
  for (const d of days) {
    if (d.due === 0) continue;
    if (d.taken === d.due) best = Math.max(best, ++run);
    else if (d.date !== today) run = 0;
  }
  // current streak: today counts only once complete
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i];
    if (d.due === 0) continue;
    if (d.taken === d.due) current++;
    else if (d.date === today) continue;
    else break;
  }
  return { current, best: Math.max(best, current) };
}

export function weeklyTrend(data: AppData, weeks = 8) {
  const today = todayKey();
  const out: { label: string; pct: number | null }[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = addDays(today, -w * 7);
    const start = addDays(end, -6);
    const r = rangeStats(data, start, end);
    out.push({
      label: fromKey(start).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      pct: r.adherence === null ? null : Math.round(r.adherence * 100),
    });
  }
  return out;
}

export function mealsOn(data: AppData, date: string): MealLog[] {
  return data.meals.filter((m) => m.date === date).sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
}

export function nutritionTotals(meals: MealLog[]) {
  return meals.reduce(
    (t, m) => ({
      calories: t.calories + (m.calories || 0),
      proteinG: t.proteinG + (m.proteinG || 0),
      carbsG: t.carbsG + (m.carbsG || 0),
      fatG: t.fatG + (m.fatG || 0),
      fiberG: t.fiberG + (m.fiberG || 0),
      sugarG: t.sugarG + (m.sugarG || 0),
      sodiumMg: t.sodiumMg + (m.sodiumMg || 0),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0 },
  );
}

/** Most-recently-logged meals, deduped newest first. Meals with named food items dedupe by those names; meals without any (just numbers typed in) fall back to deduping by meal type + macros. */
export function recentFoods(data: AppData, limit = 10): MealLog[] {
  const signature = (m: MealLog) => {
    const names = m.foodItems.map((f) => f.name.trim().toLowerCase()).filter(Boolean).sort().join('|');
    return names || `_${m.mealType}_${m.calories}_${m.proteinG}_${m.carbsG}_${m.fatG}`;
  };

  const byKey = new Map<string, MealLog>();
  for (const m of [...data.meals].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))) {
    const key = signature(m);
    if (byKey.has(key)) continue;
    byKey.set(key, m);
  }
  return [...byKey.values()].slice(0, limit);
}

/** Training days get a calorie and protein bump. */
export function targetsFor(data: AppData, date: string): Targets & { training: boolean } {
  const t = data.settings.targets;
  const training = isTrainingDay(data, date);
  return training
    ? { ...t, calories: Math.round(t.calories * 1.1), proteinG: t.proteinG + 15, carbsG: Math.round(t.carbsG * 1.15), training }
    : { ...t, training };
}

/** 0–100: 50% doses, 30% protein, 20% water (re-weighted when a part has no target). */
export function dailyScore(data: AppData, date: string) {
  const [d] = dayStats(data, [date]);
  const tg = targetsFor(data, date);
  const n = nutritionTotals(mealsOn(data, date));
  const parts: [number, number][] = [];
  if (d.due) parts.push([0.5, d.taken / d.due]);
  if (tg.proteinG) parts.push([0.3, Math.min(1, n.proteinG / tg.proteinG)]);
  if (tg.waterMl) parts.push([0.2, Math.min(1, (data.water[date] ?? 0) / tg.waterMl)]);
  const w = parts.reduce((s, p) => s + p[0], 0);
  if (!w) return 0;
  return Math.round((parts.reduce((s, p) => s + p[0] * p[1], 0) / w) * 100);
}

export interface Badge {
  id: string;
  name: string;
  detail: string;
  earned: boolean;
  progress: number; // 0..1
}

export function badges(data: AppData): Badge[] {
  const s = streaks(data);
  const today = todayKey();
  const last7 = rangeKeys(addDays(today, -6), today);
  const week = dayStats(data, last7);
  const perfectWeek = week.every((d) => d.due === 0 || d.taken === d.due) && week.some((d) => d.due > 0);
  const proteinDays = last7.filter((k) => {
    const t = targetsFor(data, k);
    return nutritionTotals(mealsOn(data, k)).proteinG >= t.proteinG;
  }).length;
  const waterDays = last7.filter((k) => (data.water[k] ?? 0) >= data.settings.targets.waterMl).length;
  const active = data.supplements.filter((x) => x.status === 'active').length;
  return [
    { id: 'stack', name: 'Stack builder', detail: 'Add 3 items to your stack', earned: active >= 3, progress: Math.min(1, active / 3) },
    { id: 's7', name: '7-day streak', detail: 'Take every dose 7 days in a row', earned: s.best >= 7, progress: Math.min(1, s.best / 7) },
    { id: 's30', name: '30-day streak', detail: 'Take every dose 30 days in a row', earned: s.best >= 30, progress: Math.min(1, s.best / 30) },
    { id: 'perfect', name: 'Perfect week', detail: 'No missed doses in the last 7 days', earned: perfectWeek, progress: perfectWeek ? 1 : week.filter((d) => d.due && d.taken === d.due).length / 7 },
    { id: 'protein', name: 'Protein machine', detail: 'Hit your protein target 5 of the last 7 days', earned: proteinDays >= 5, progress: Math.min(1, proteinDays / 5) },
    { id: 'water', name: 'Hydrated', detail: 'Hit your water target 5 of the last 7 days', earned: waterDays >= 5, progress: Math.min(1, waterDays / 5) },
    { id: 'meal', name: 'First plate', detail: 'Log your first meal', earned: data.meals.length > 0, progress: data.meals.length ? 1 : 0 },
  ];
}

export { SLOT_ORDER };
