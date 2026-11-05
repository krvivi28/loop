import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { env, googleConfigured, isProd } from '../config/env.js';
import { User } from '../models/index.js';
import { exchangeCode, googleAuthUrl } from '../services/google.service.js';
import { checkCode, issueCode } from '../services/otp.service.js';
import { hashPassword, verifyPassword } from '../services/password.service.js';
import { clientUser } from '../services/serialize.service.js';
import { clearSessionCookie, setSessionCookie } from '../services/token.service.js';
import { badRequest, HttpError } from '../utils/httpError.js';
import { normalizePhone } from '../utils/phone.js';

const GOOGLE_STATE_COOKIE = 'fs_google_state';

const parsePhone = (raw: string) => {
  const phone = normalizePhone(raw);
  if (!phone) throw badRequest('Enter a valid mobile number.', 'invalid_phone');
  return phone;
};

/** Step 1: send a code. Works for both sign up and log in. */
export async function requestOtp(req: Request, res: Response) {
  const phone = parsePhone(req.body.phone);
  const code = await issueCode(phone);
  const isNewUser = !(await User.exists({ phone }));
  res.json({
    phone,
    isNewUser,
    expiresInSec: 300,
    resendInSec: 30,
    // Local development convenience only: never sent in production or with a real SMS provider.
    ...(!isProd && env.SMS_PROVIDER === 'console' ? { devCode: code } : {}),
  });
}

/** Step 2: verify code → create account if new (sign up) → set session cookie (log in). */
export async function verifyOtp(req: Request, res: Response) {
  const phone = parsePhone(req.body.phone);
  await checkCode(phone, req.body.code);
  let user = await User.findOne({ phone });
  const isNewUser = !user;
  if (!user) user = await User.create({ phone });
  user.lastLoginAt = new Date();
  await user.save();
  setSessionCookie(res, user._id);
  res.status(isNewUser ? 201 : 200).json({ user: clientUser(user), isNewUser });
}

export async function logout(_req: Request, res: Response) {
  clearSessionCookie(res);
  res.json({ ok: true });
}

/** One endpoint for both sign up and log in, same spirit as the phone OTP flow above. */
export async function emailAuth(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  let user = await User.findOne({ email }).select('+passwordHash');
  let isNewUser = false;
  if (user) {
    if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      throw badRequest('Wrong email or password.', 'invalid_credentials');
    }
  } else {
    isNewUser = true;
    user = await User.create({ email, passwordHash: hashPassword(password) });
  }
  user.lastLoginAt = new Date();
  await user.save();
  setSessionCookie(res, user._id);
  res.status(isNewUser ? 201 : 200).json({ user: clientUser(user), isNewUser });
}

export async function googleStart(req: Request, res: Response) {
  if (!googleConfigured()) throw new HttpError(503, 'google_not_configured', 'Google sign-in is not set up yet.');
  const state = randomBytes(16).toString('hex');
  const referer = req.get('referer');
  const returnTo = referer ? new URL(referer).origin : '/';
  res.cookie(GOOGLE_STATE_COOKIE, JSON.stringify({ state, returnTo }), {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000,
  });
  res.redirect(googleAuthUrl(state));
}

export async function googleCallback(req: Request, res: Response) {
  const raw = req.cookies?.[GOOGLE_STATE_COOKIE];
  res.clearCookie(GOOGLE_STATE_COOKIE);
  const saved = raw ? (JSON.parse(raw) as { state: string; returnTo: string }) : null;
  const returnTo = saved?.returnTo ?? '/';
  try {
    if (!saved || saved.state !== req.query.state || typeof req.query.code !== 'string') {
      throw new HttpError(400, 'google_failed', 'Could not sign in with Google.');
    }
    const profile = await exchangeCode(req.query.code);
    let user = await User.findOne({ googleId: profile.sub });
    if (!user) user = await User.findOne({ email: profile.email });
    if (!user) {
      user = await User.create({ googleId: profile.sub, email: profile.email, profile: { name: profile.name } });
    } else if (!user.googleId) {
      user.googleId = profile.sub;
    }
    user.lastLoginAt = new Date();
    await user.save();
    setSessionCookie(res, user._id);
    res.redirect(returnTo);
  } catch (e) {
    console.error('Google sign-in failed:', e);
    res.redirect(`${returnTo}?authError=google_failed`);
  }
}
