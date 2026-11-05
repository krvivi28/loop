import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { Otp } from '../models/index.js';
import { HttpError, tooMany } from '../utils/httpError.js';
import { sendLoginCode } from './sms.service.js';

const TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

const hash = (phone: string, code: string) => createHmac('sha256', env.OTP_SECRET).update(`${phone}:${code}`).digest('hex');

/** Creates (or replaces) the code for this phone and sends it. Returns the code (used only for dev echo). */
export async function issueCode(phone: string) {
  const existing = await Otp.findOne({ phone });
  if (existing && Date.now() - existing.sentAt.getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.sentAt.getTime())) / 1000);
    throw tooMany(`Please wait ${wait} seconds before requesting a new code.`);
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await Otp.findOneAndUpdate(
    { phone },
    { codeHash: hash(phone, code), attempts: 0, sentAt: new Date(), expiresAt: new Date(Date.now() + TTL_MS) },
    { upsert: true },
  );
  await sendLoginCode(phone, code);
  return code;
}

export async function checkCode(phone: string, code: string) {
  const otp = await Otp.findOne({ phone });
  if (!otp || otp.expiresAt.getTime() < Date.now()) {
    throw new HttpError(400, 'code_expired', 'This code has expired. Request a new one.');
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    await otp.deleteOne();
    throw new HttpError(429, 'too_many_attempts', 'Too many wrong codes. Request a new one.');
  }
  const a = Buffer.from(otp.codeHash, 'hex');
  const b = Buffer.from(hash(phone, code), 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    otp.attempts += 1;
    await otp.save();
    const left = MAX_ATTEMPTS - otp.attempts;
    throw new HttpError(400, 'wrong_code', left > 0 ? `Wrong code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Wrong code. Request a new one.');
  }
  await otp.deleteOne();
}
