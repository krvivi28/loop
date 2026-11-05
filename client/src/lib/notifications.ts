/**
 * Dose reminders via the browser Notification API.
 * Browsers only fire these reliably while Loop is open (or installed and recently used).
 * Notifications need a secure origin: localhost or https.
 */
import { unitLabel } from './constants';
import { minutesOf, todayKey } from './dates';
import { dueDosesFor } from './schedule';
import type { AppData } from './types';

export const notificationsSupported = () => 'Notification' in window && window.isSecureContext;

export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.requestPermission();
}

const KEY = 'fitstack:notified';
const readNotified = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
};

async function show(title: string, body: string) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', tag: title + body });
    else new Notification(title, { body, icon: '/icon-192.png' });
  } catch {
    /* ignore */
  }
}

export function checkReminders(data: AppData) {
  const s = data.settings;
  if (!s.notifications || !notificationsSupported() || Notification.permission !== 'granted') return;
  const today = todayKey();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const notified = readNotified().filter((k) => k.startsWith(today));
  let changed = false;
  for (const d of dueDosesFor(data, today, now)) {
    if (!d.spec.time || !s.notifySlots[d.spec.slot]) continue;
    if (d.status === 'taken' || d.status === 'skipped') continue;
    const t = minutesOf(d.spec.time);
    const key = `${today}|${d.sup.id}|${d.index}`;
    if (nowMin >= t && nowMin - t <= 20 && !notified.includes(key)) {
      show(`Time for ${d.sup.name}`, `${unitLabel(d.sup.form, d.spec.quantity)}. Open Loop and tap Mark as taken.`);
      notified.push(key);
      changed = true;
    }
  }
  if (changed) localStorage.setItem(KEY, JSON.stringify(notified));
}
