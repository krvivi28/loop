import { env } from '../config/env.js';

/** Normalize to E.164 (+919876543210). Returns null if invalid. */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  let digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (trimmed.startsWith('+')) {
    /* already has country code */
  } else if (trimmed.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.length === 10) {
    digits = env.DEFAULT_COUNTRY_CODE + digits;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = env.DEFAULT_COUNTRY_CODE + digits.slice(1);
  }
  const e164 = `+${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

export const maskPhone = (p: string) => `${p.slice(0, 3)}••••••${p.slice(-3)}`;
