import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
}

/** Exchanges the auth code for tokens, then decodes the id_token (received directly from Google over HTTPS, so re-verifying its signature isn't necessary). */
export async function exchangeCode(code: string): Promise<GoogleProfile> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: env.GOOGLE_REDIRECT_URI!,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    console.error('Google token exchange failed:', res.status, await res.text().catch(() => ''));
    throw new HttpError(502, 'google_failed', 'Could not sign in with Google.');
  }
  const { id_token } = (await res.json()) as { id_token: string };
  const payload = jwt.decode(id_token);
  if (!payload || typeof payload !== 'object' || typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
    throw new HttpError(502, 'google_failed', 'Could not sign in with Google.');
  }
  return { sub: payload.sub, email: payload.email, name: typeof payload.name === 'string' ? payload.name : undefined };
}
