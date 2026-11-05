import { SLOTS, SLOT_ORDER } from './constants';
import { addDays, dow, minutesOf, todayKey } from './dates';
import type { AppData, DoseLog, DoseSpec, Supplement } from './types';

export type DoseStatus = 'taken' | 'skipped' | 'missed' | 'overdue' | 'pending';

export interface DueDose {
  sup: Supplement;
  index: number;
  spec: DoseSpec;
  date: string;
  logs: DoseLog[];
  takenLogs: DoseLog[];
  skipLog?: DoseLog;
  status: DoseStatus;
}

export const logKey = (supId: string, date: string, index: number) => `${supId}|${date}|${index}`;

export function buildLogIndex(logs: DoseLog[]) {
  const m = new Map<string, DoseLog[]>();
  for (const l of logs) {
    const k = logKey(l.supplementId, l.date, l.doseIndex);
    const arr = m.get(k);
    if (arr) arr.push(l);
    else m.set(k, [l]);
  }
  return m;
}

export function isTrainingDay(data: AppData, date: string) {
  return data.training[date] ?? data.settings.workoutDays.includes(dow(date));
}

export function isScheduled(sup: Supplement, date: string, data: AppData) {
  if (sup.status !== 'active') return false;
  if (date < sup.startDate) return false;
  if (sup.endDate && date > sup.endDate) return false;
  switch (sup.schedule.type) {
    case 'daily':
      return true;
    case 'weekdays':
      return (sup.schedule.weekdays ?? []).includes(dow(date));
    case 'workout_days':
      return isTrainingDay(data, date);
  }
}

function statusFor(spec: DoseSpec, date: string, taken: DoseLog[], skip: DoseLog | undefined, now: Date): DoseStatus {
  if (taken.length) return 'taken';
  if (skip) return 'skipped';
  const today = todayKey();
  if (date < today) return 'missed';
  if (date > today) return 'pending';
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const due = spec.time ? minutesOf(spec.time) + 30 : SLOTS[spec.slot].endsAt * 60;
  return nowMin > due ? 'overdue' : 'pending';
}

export function dueDosesFor(
  data: AppData,
  date: string,
  now = new Date(),
  index = buildLogIndex(data.doseLogs),
  onlySupId?: string,
): DueDose[] {
  const out: DueDose[] = [];
  for (const sup of data.supplements) {
    if (onlySupId && sup.id !== onlySupId) continue;
    if (!isScheduled(sup, date, data)) continue;
    sup.doses.forEach((spec, i) => {
      const logs = index.get(logKey(sup.id, date, i)) ?? [];
      const takenLogs = logs
        .filter((l) => l.status === 'taken')
        .sort((a, b) => (a.takenAt ?? '').localeCompare(b.takenAt ?? ''));
      const skipLog = logs.find((l) => l.status === 'skipped');
      out.push({ sup, index: i, spec, date, logs, takenLogs, skipLog, status: statusFor(spec, date, takenLogs, skipLog, now) });
    });
  }
  return out.sort((a, b) => {
    const s = SLOT_ORDER.indexOf(a.spec.slot) - SLOT_ORDER.indexOf(b.spec.slot);
    if (s) return s;
    return (a.spec.time ?? '99').localeCompare(b.spec.time ?? '99');
  });
}

/** Average units used per day, accounting for weekly schedules. */
export function dailyUsage(sup: Supplement, data: AppData) {
  const perDay = sup.doses.reduce((s, d) => s + d.quantity, 0);
  if (sup.schedule.type === 'daily') return perDay;
  const days = sup.schedule.type === 'weekdays' ? sup.schedule.weekdays?.length ?? 0 : data.settings.workoutDays.length;
  return (perDay * days) / 7;
}

export function stockInfo(sup: Supplement, data: AppData) {
  if (sup.stock === undefined || sup.stock === null) return null;
  const use = dailyUsage(sup, data);
  const daysLeft = use > 0 ? Math.floor(sup.stock / use) : Infinity;
  return { stock: sup.stock, daysLeft, low: daysLeft <= 7 };
}

export function currentSlot(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

export function earliestDate(data: AppData) {
  let min = todayKey();
  for (const s of data.supplements) if (s.startDate < min) min = s.startDate;
  return min;
}

export { addDays };
