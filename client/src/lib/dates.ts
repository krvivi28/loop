const pad = (n: number) => String(n).padStart(2, '0');

export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => toKey(new Date());
export const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (k: string, n: number) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
};
export const dow = (k: string) => fromKey(k).getDay();
export const daysBetween = (a: string, b: string) =>
  Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);
export const rangeKeys = (start: string, end: string) => {
  const out: string[] = [];
  for (let k = start; k <= end; k = addDays(k, 1)) out.push(k);
  return out;
};

export const formatLong = (k: string) =>
  fromKey(k).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
export const formatShort = (k: string) =>
  fromKey(k).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
export const formatHHMM = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};
export const relativeDay = (k: string) => {
  const diff = daysBetween(k, todayKey());
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  return formatLong(k);
};
/** Build an ISO timestamp from a date key + "HH:MM". */
export const isoAt = (k: string, hhmm: string) => {
  const d = fromKey(k);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
export const nowHHMM = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
