import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '../components/Logo';
import { Chip } from '../components/ui';
import { API_BASE, api, ApiError } from '../lib/api';
import type { User } from '../lib/types';
import { useAuth } from '../state/AuthContext';

interface OtpResponse {
  phone: string;
  isNewUser: boolean;
  resendInSec: number;
  devCode?: string;
}

/** Flip back to true once Twilio (or another SMS provider) is live. The phone/OTP flow below is untouched. */
const PHONE_LOGIN_ENABLED = false;

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20s20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.1 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.5C29.4 34.9 26.8 36 24 36c-5.2 0-9.6-3.1-11.3-7.6l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.5 5.5C40.4 36.6 44 31 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

export default function Login() {
  const { setUser } = useAuth();
  const [method, setMethod] = useState<'phone' | 'email'>(PHONE_LOGIN_ENABLED ? 'phone' : 'email');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [cc, setCc] = useState('+91');
  const [num, setNum] = useState('');
  const [code, setCode] = useState('');
  const [otp, setOtp] = useState<OtpResponse | null>(null);
  const [emailVal, setEmailVal] = useState('');
  const [passwordVal, setPasswordVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait(wait - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('authError') === 'google_failed') {
      setError('Could not sign in with Google. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const submitEmail = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ user: User }>('/auth/email', { email: emailVal, password: passwordVal });
      setUser(r.user);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const fullPhone = `${cc.startsWith('+') ? cc : `+${cc}`}${num.replace(/\D/g, '')}`;

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<OtpResponse>('/auth/request-otp', { phone: fullPhone });
      setOtp(r);
      setStep('code');
      setCode('');
      setWait(r.resendInSec);
      setTimeout(() => codeRef.current?.focus(), 250);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (c = code) => {
    if (c.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ user: User }>('/auth/verify-otp', { phone: otp?.phone ?? fullPhone, code: c });
      setUser(r.user);
    } catch (e) {
      setError((e as ApiError).message);
      setCode('');
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
      {/* big background ring: the brand's one bold moment */}
      <svg className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] opacity-90 md:-right-24 md:-top-24" viewBox="0 0 200 200" aria-hidden>
        <circle cx="100" cy="100" r="80" fill="none" stroke="rgb(var(--line) / 0.6)" strokeWidth="22" />
        <motion.circle
          cx="100" cy="100" r="80" fill="none" stroke="rgb(var(--accent))" strokeWidth="22" strokeLinecap="round"
          strokeDasharray="502.6" initial={{ strokeDashoffset: 502.6 }} animate={{ strokeDashoffset: 120 }}
          transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }} transform="rotate(-90 100 100)"
          style={{ filter: 'drop-shadow(0 0 18px rgb(var(--accent) / 0.6))' }}
        />
      </svg>

      <div className="relative"><Logo size={32} /></div>

      <div className="relative mx-auto mt-auto w-full max-w-md md:mt-[18vh]">
        {PHONE_LOGIN_ENABLED && !(method === 'phone' && step === 'code') && (
          <div className="mb-5 flex gap-2">
            <Chip on={method === 'phone'} onClick={() => { setMethod('phone'); setError(null); }}>Phone</Chip>
            <Chip on={method === 'email'} onClick={() => { setMethod('email'); setError(null); }}>Email</Chip>
          </div>
        )}
        <AnimatePresence mode="wait">
          {method === 'email' ? (
            <motion.form
              key="email"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }}
              onSubmit={(e) => { e.preventDefault(); submitEmail(); }}
            >
              <h1 className="h-display text-[54px] md:text-[64px]">Close the loop<br />on your health.</h1>
              <p className="mb-7 mt-3 text-[17px] text-muted">Log in or sign up with your email and a password.</p>
              <label className="field-label" htmlFor="email">Email</label>
              <input
                id="email" autoFocus type="email" inputMode="email" autoComplete="email"
                className="input h-14 text-[19px] font-semibold" placeholder="you@example.com"
                value={emailVal} onChange={(e) => setEmailVal(e.target.value)}
              />
              <label className="field-label mt-4" htmlFor="password">Password</label>
              <input
                id="password" type="password" autoComplete="current-password" minLength={8}
                className="input h-14 text-[19px] font-semibold" placeholder="At least 8 characters"
                value={passwordVal} onChange={(e) => setPasswordVal(e.target.value)}
              />
              {error && <p className="mt-3 text-[15px] font-semibold text-bad">{error}</p>}
              <button className="btn-accent mt-5 h-14 w-full text-[20px]" disabled={busy || !emailVal.includes('@') || passwordVal.length < 8}>
                {busy && <Loader2 className="animate-spin" size={20} />} Continue
              </button>
            </motion.form>
          ) : step === 'phone' ? (
            <motion.form
              key="phone"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }}
              onSubmit={(e) => { e.preventDefault(); send(); }}
            >
              <h1 className="h-display text-[54px] md:text-[64px]">Close the loop<br />on your health.</h1>
              <p className="mb-7 mt-3 text-[17px] text-muted">Log in or sign up with your mobile number. We’ll text you a 6-digit code.</p>
              <label className="field-label" htmlFor="phone">Mobile number</label>
              <div className="flex gap-2">
                <input aria-label="Country code" className="input h-14 w-[4.75rem] text-center text-[19px] font-semibold" value={cc} onChange={(e) => setCc(e.target.value.replace(/[^\d+]/g, '').slice(0, 4))} />
                <input
                  id="phone" autoFocus type="tel" inputMode="tel" autoComplete="tel-national"
                  className="input h-14 flex-1 text-[21px] font-semibold tracking-wide" placeholder="98765 43210"
                  value={num} onChange={(e) => setNum(e.target.value.replace(/[^\d ]/g, '').slice(0, 15))}
                />
              </div>
              {error && <p className="mt-3 text-[15px] font-semibold text-bad">{error}</p>}
              <button className="btn-accent mt-5 h-14 w-full text-[20px]" disabled={busy || num.replace(/\D/g, '').length < 6}>
                {busy && <Loader2 className="animate-spin" size={20} />} Send code
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="code"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
              onSubmit={(e) => { e.preventDefault(); verify(); }}
            >
              <button type="button" className="btn-ghost -ml-3 mb-3" onClick={() => { setStep('phone'); setError(null); }}>
                <ArrowLeft size={20} /> Change number
              </button>
              <h1 className="h-display text-[48px]">Enter the code</h1>
              <p className="mb-6 mt-2 text-[17px] text-muted">
                Sent to <strong className="text-ink">{otp?.phone}</strong>.{otp?.isNewUser && ' We’ll create your account when you confirm.'}
              </p>
              {otp?.devCode && (
                <div className="mb-4 rounded-xl border border-dashed border-accent/60 bg-accent/10 px-4 py-2.5 text-sm">
                  Development mode: your code is <strong className="font-display text-lg tracking-widest">{otp.devCode}</strong> (also printed in the server terminal).
                </div>
              )}
              <input
                ref={codeRef} aria-label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                className="input h-20 text-center font-display text-[44px] font-extrabold tracking-[0.5em]"
                value={code}
                onChange={(e) => {
                  const c = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(c);
                  if (c.length === 6) verify(c);
                }}
              />
              {error && <p className="mt-3 text-[15px] font-semibold text-bad">{error}</p>}
              <button className="btn-accent mt-5 h-14 w-full text-[20px]" disabled={busy || code.length !== 6}>
                {busy && <Loader2 className="animate-spin" size={20} />} {otp?.isNewUser ? 'Create account' : 'Log in'}
              </button>
              <button type="button" className="btn-ghost mt-2 w-full" disabled={wait > 0 || busy} onClick={send}>
                {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
        {!(method === 'phone' && step === 'code') && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted">
              <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>
            <button type="button" className="btn-soft h-14 w-full gap-2.5 text-[17px]" onClick={() => { window.location.href = `${API_BASE}/auth/google`; }}>
              <GoogleIcon /> Continue with Google
            </button>
          </>
        )}
      </div>
      <p className="relative mx-auto mt-8 max-w-md text-center text-xs text-muted md:mt-auto">Your supplement, medicine and food logs are private to your account.</p>
    </div>
  );
}
