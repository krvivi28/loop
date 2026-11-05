import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { categoryIcon } from '../lib/constants';
import { addDays, relativeDay, todayKey } from '../lib/dates';
import { usePhoto } from '../lib/photos';
import { withAlpha } from '../lib/theme';
import type { Supplement } from '../lib/types';

export function PageTitle({ title, right, sub }: { title: string; right?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end gap-3">
      <div className="flex-1">
        <h1 className="h-display text-[40px] md:text-[48px]">{title}</h1>
        {sub && <div className="mt-1 text-[15px] text-muted">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <h2 className="h-display flex-1 text-[22px]">{children}</h2>
      {right}
    </div>
  );
}

export function Chip({ on, onClick, children, color }: { on?: boolean; onClick?: () => void; children: ReactNode; color?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`chip ${on ? 'chip-on' : ''}`}
      style={on && color ? { borderColor: color, background: withAlpha(color, 0.16) } : undefined}
    >
      {children}
    </button>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99, step = 1, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label?: string }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, +v.toFixed(2))));
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-bg">
      <button type="button" className="icon-btn" onClick={() => set(value - step)} aria-label="Decrease" disabled={value <= min}>
        <Minus size={18} />
      </button>
      <div className="min-w-[3.5rem] text-center">
        <span className="h-display text-[26px]">{value}</span>
        {label && <span className="ml-1 text-sm text-muted">{label}</span>}
      </div>
      <button type="button" className="icon-btn" onClick={() => set(value + step)} aria-label="Increase" disabled={value >= max}>
        <Plus size={18} />
      </button>
    </div>
  );
}

export function DayNav({ date, onChange, allowFuture = false }: { date: string; onChange: (d: string) => void; allowFuture?: boolean }) {
  const today = todayKey();
  return (
    <div className="flex items-center gap-1">
      <button className="icon-btn" onClick={() => onChange(addDays(date, -1))} aria-label="Previous day">
        <ChevronLeft size={22} />
      </button>
      <button
        className="min-w-[7rem] rounded-xl px-2 py-1 text-center font-display text-[19px] font-bold hover:bg-raised"
        onClick={() => onChange(today)}
        title="Jump to today"
      >
        {relativeDay(date)}
      </button>
      <button
        className="icon-btn"
        onClick={() => onChange(addDays(date, 1))}
        aria-label="Next day"
        disabled={!allowFuture && date >= today}
        style={!allowFuture && date >= today ? { opacity: 0.3 } : undefined}
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}

export function SuppAvatar({ sup, size = 44 }: { sup: Supplement; size?: number }) {
  const photo = usePhoto(sup.photoId);
  const Icon = categoryIcon(sup.category);
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-2xl"
      style={{ width: size, height: size, background: withAlpha(sup.color, 0.18), color: sup.color, boxShadow: `inset 0 0 0 1.5px ${withAlpha(sup.color, 0.5)}` }}
    >
      {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <Icon size={size * 0.5} strokeWidth={2.2} />}
    </div>
  );
}

export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-accent/15 text-accent">{icon}</div>
      <h3 className="h-display text-[26px]">{title}</h3>
      <p className="mt-2 max-w-sm text-[15px] text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Tiny markdown renderer for AI text: "- " bullets and **bold**. */
export function AiText({ text }: { text: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') ? <strong key={i} className="text-ink">{p.slice(2, -2)}</strong> : p));
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <div className="space-y-2 text-[15.5px] leading-relaxed text-ink/90">
      {lines.map((l, i) => {
        const m = l.match(/^([-*•]|\d+\.)\s+(.*)$/);
        if (m)
          return (
            <div key={i} className="flex gap-2.5">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <p>{inline(m[2])}</p>
            </div>
          );
        if (l.startsWith('#')) return <p key={i} className="font-display text-lg font-bold">{l.replace(/^#+\s*/, '')}</p>;
        return <p key={i}>{inline(l)}</p>;
      })}
    </div>
  );
}

export const Disclaimer = () => (
  <p className="text-xs leading-relaxed text-muted">
    AI suggestions are general information, not medical advice. Check with a doctor before changing any medicine.
  </p>
);
