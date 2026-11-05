import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, Check, CheckCheck, Clock, Droplet, Dumbbell, Flame, ListChecks, MoreHorizontal, Plus, RotateCcw, SkipForward, Undo2, UtensilsCrossed,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Ring } from '../components/Ring';
import { Sheet } from '../components/Sheet';
import { LegacyImport } from '../components/LegacyImport';
import { DayNav, Empty, SuppAvatar } from '../components/ui';
import { FOOD_INSTRUCTIONS, SKIP_REASONS, SLOTS, SLOT_ORDER, unitLabel } from '../lib/constants';
import { addDays, formatHHMM, formatTime, isoAt, nowHHMM, relativeDay, todayKey } from '../lib/dates';
import { celebrate, haptic } from '../lib/feedback';
import { useLongPress, useNow } from '../lib/hooks';
import { currentSlot, dueDosesFor, isTrainingDay, stockInfo, type DueDose } from '../lib/schedule';
import { dailyScore, mealsOn, nutritionTotals, streaks, targetsFor } from '../lib/stats';
import { withAlpha } from '../lib/theme';
import type { Slot } from '../lib/types';
import { useApp } from '../state/AppContext';
import { useToast } from '../state/Toast';

type SheetState =
  | { kind: 'time'; dose: DueDose; logId?: string; initial: string }
  | { kind: 'skip'; dose: DueDose }
  | { kind: 'again'; dose: DueDose }
  | { kind: 'more'; dose: DueDose }
  | { kind: 'quick' }
  | null;

export default function Today() {
  const { data, actions } = useApp();
  const toast = useToast();
  const now = useNow();
  const today = todayKey();
  const [date, setDate] = useState(today);
  const [sheet, setSheet] = useState<SheetState>(null);
  const isToday = date === today;
  const isPast = date < today;

  const doses = useMemo(() => dueDosesFor(data, date, now), [data, date, now]);
  const taken = doses.filter((d) => d.status === 'taken').length;
  const total = doses.length;
  const streak = useMemo(() => streaks(data), [data]);
  const score = useMemo(() => dailyScore(data, date), [data, date]);
  const foodTotals = useMemo(() => nutritionTotals(mealsOn(data, date)), [data, date]);
  const foodTargets = useMemo(() => targetsFor(data, date), [data, date]);
  const training = isTrainingDay(data, date);
  const nextDose = doses.find((d) => d.status === 'pending' || d.status === 'overdue');
  const lowStock = data.supplements.filter((s) => s.status === 'active' && stockInfo(s, data)?.low);
  const active = data.supplements.filter((s) => s.status === 'active');

  // Confetti when the last dose of today gets logged.
  const prevTaken = useRef<{ date: string; taken: number }>({ date, taken });
  useEffect(() => {
    const p = prevTaken.current;
    if (isToday && p.date === date && total > 0 && taken === total && p.taken < total) celebrate(data.settings.accentColor);
    prevTaken.current = { date, taken };
  }, [taken, total, date, isToday, data.settings.accentColor]);

  const markTaken = (d: DueDose, takenAt?: string, extra?: boolean) => {
    if (date > today) return;
    if (!takenAt && !isToday) {
      setSheet({ kind: 'time', dose: d, initial: d.spec.time || SLOTS[d.spec.slot].defaultTime || '12:00' });
      return;
    }
    haptic(25);
    const id = actions.logTaken({
      sup: d.sup, date, index: d.index, slot: d.spec.slot, quantity: d.spec.quantity, takenAt: takenAt ?? new Date().toISOString(), extra,
    });
    toast(`${d.sup.name} logged${extra ? ' again' : ''}`, { action: { label: 'Undo', onClick: () => actions.removeLog(id) } });
  };

  const onTapDose = (d: DueDose) => {
    if (d.status === 'taken') setSheet({ kind: 'again', dose: d });
  };

  const markSlot = (slot: Slot) => {
    const pending = doses.filter((d) => d.spec.slot === slot && d.status !== 'taken' && d.status !== 'skipped');
    if (!pending.length || date > today) return;
    haptic([20, 30, 20]);
    const at = isToday ? new Date().toISOString() : isoAt(date, SLOTS[slot].defaultTime || '12:00');
    const ids = pending.map((d) =>
      actions.logTaken({ sup: d.sup, date, index: d.index, slot, quantity: d.spec.quantity, takenAt: at }),
    );
    toast(`${pending.length} ${SLOTS[slot].label.toLowerCase()} dose${pending.length > 1 ? 's' : ''} logged`, {
      action: { label: 'Undo', onClick: () => ids.forEach((i) => actions.removeLog(i)) },
    });
  };

  const groups = SLOT_ORDER.map((slot) => ({ slot, items: doses.filter((d) => d.spec.slot === slot) })).filter((g) => g.items.length);
  const nowSlot = currentSlot(now);

  if (!active.length) {
    return (
      <>
        <TodayHeader date={date} setDate={setDate} training={training} onTraining={(v) => actions.setTraining(date, v)} />
        <LegacyImport />
        <Empty
          icon={<ListChecks size={30} />}
          title="Build your stack"
          body="Add your supplements and medicines once. Loop then shows exactly what to take each day and when you took it."
          action={<Link to="/stack?new=1" className="btn-accent px-6"><Plus size={20} /> Add first item</Link>}
        />
        <div className="mt-4"><WaterCard date={date} /></div>
      </>
    );
  }

  return (
    <>
      <TodayHeader date={date} setDate={setDate} training={training} onTraining={(v) => actions.setTraining(date, v)} />
        <LegacyImport />

      {/* Scoreboard */}
      <section className="card relative mb-5 overflow-hidden">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full opacity-40 blur-3xl"
          style={{ background: 'rgb(var(--accent) / 0.35)' }}
        />
        <div className="relative flex items-center gap-5">
          <Ring value={total ? taken / total : 0} size={152} stroke={14} glow>
            <div className="h-display text-[54px]">
              {taken}
              <span className="text-[30px] text-muted">/{total}</span>
            </div>
            <div className="text-[13px] font-semibold text-muted">doses taken</div>
          </Ring>
          <div className="min-w-0 flex-1 space-y-3">
            <Stat icon={<Flame size={18} />} label="Day streak" value={streak.current} />
            <Stat icon={<CheckCheck size={18} />} label="Daily score" value={score} suffix="/100" />
            <Stat icon={<UtensilsCrossed size={18} />} label="Calories" value={foodTotals.calories} suffix={`/${foodTargets.calories}`} />
            <Stat icon={<Dumbbell size={18} />} label="Protein" value={foodTotals.proteinG} suffix={`/${foodTargets.proteinG}g`} />
            {total > 0 && taken === total ? (
              <p className="font-display text-lg font-bold text-good">All done for {isToday ? 'today' : 'this day'}.</p>
            ) : nextDose && isToday ? (
              <p className="text-[14.5px] leading-snug text-muted">
                Next: <span className="font-semibold text-ink">{nextDose.sup.name}</span>
                {nextDose.spec.time ? ` at ${formatHHMM(nextDose.spec.time)}` : ` · ${SLOTS[nextDose.spec.slot].label}`}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {lowStock.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 shrink-0 text-warn" size={20} />
          <p className="text-[15px]">
            Running low:{' '}
            {lowStock.map((s, i) => {
              const info = stockInfo(s, data)!;
              return (
                <span key={s.id}>
                  {i > 0 && ', '}
                  <strong>{s.name}</strong> ({info.daysLeft} day{info.daysLeft === 1 ? '' : 's'} left)
                </span>
              );
            })}
            . Time to reorder.
          </p>
        </div>
      )}

      {/* Dose list; swipe left/right to change day */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        dragDirectionLock
        style={{ touchAction: 'pan-y' }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 90) setDate(addDays(date, -1));
          else if (info.offset.x < -90 && date < today) setDate(addDays(date, 1));
        }}
      >
        {total === 0 ? (
          <div className="card py-8 text-center text-muted">Nothing scheduled for {relativeDay(date).toLowerCase()}.</div>
        ) : (
          <div className="space-y-6">
            {groups.map(({ slot, items }) => (
              <SlotGroup
                key={slot}
                slot={slot}
                items={items}
                current={isToday && slot === nowSlot}
                canLog={date <= today}
                onMarkAll={() => markSlot(slot)}
              >
                {items.map((d) => (
                  <DoseCard
                    key={`${d.sup.id}-${d.index}`}
                    d={d}
                    isPast={isPast}
                    onTake={() => markTaken(d)}
                    onTap={() => onTapDose(d)}
                    onMore={() => setSheet({ kind: 'more', dose: d })}
                    onUndo={() => {
                      const l = d.takenLogs[d.takenLogs.length - 1] ?? d.skipLog;
                      if (l) actions.removeLog(l.id);
                    }}
                    onChangeTime={() => {
                      const l = d.takenLogs[0];
                      if (l?.takenAt) setSheet({ kind: 'time', dose: d, logId: l.id, initial: hhmmOf(l.takenAt) });
                    }}
                  />
                ))}
              </SlotGroup>
            ))}
          </div>
        )}
      </motion.div>

      <div className="mt-6"><WaterCard date={date} /></div>

      {/* Quick check */}
      <button
        onClick={() => setSheet({ kind: 'quick' })}
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-accent pl-4 pr-5 font-display text-[17px] font-bold text-onaccent shadow-[0_10px_30px_-8px_rgb(var(--accent)/0.9)] transition active:scale-95 md:bottom-8 md:right-8"
        aria-label="Quick check: what did I take today?"
      >
        <ListChecks size={22} /> Quick check
      </button>

      {/* Sheets */}
      <TimeSheet
        state={sheet?.kind === 'time' ? sheet : null}
        date={date}
        onClose={() => setSheet(null)}
        onSave={(hhmm) => {
          if (sheet?.kind !== 'time') return;
          if (sheet.logId) {
            actions.updateLogTime(sheet.logId, isoAt(date, hhmm));
            toast('Time updated');
          } else markTaken(sheet.dose, isoAt(date, hhmm));
          setSheet(null);
        }}
      />
      <Sheet open={sheet?.kind === 'skip'} onClose={() => setSheet(null)} title="Skip this dose?">
        {sheet?.kind === 'skip' && (
          <>
            <p className="mb-4 text-muted">
              {sheet.dose.sup.name}, {SLOTS[sheet.dose.spec.slot].label.toLowerCase()}. Pick a reason (optional):
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SKIP_REASONS.map((r) => (
                <button
                  key={r}
                  className="btn-soft justify-start"
                  onClick={() => {
                    const d = sheet.dose;
                    const id = actions.logSkipped({ sup: d.sup, date, index: d.index, slot: d.spec.slot, reason: r });
                    toast(`${d.sup.name} skipped`, { action: { label: 'Undo', onClick: () => actions.removeLog(id) } });
                    setSheet(null);
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </>
        )}
      </Sheet>
      <Sheet
        open={sheet?.kind === 'again'}
        onClose={() => setSheet(null)}
        title="Already taken"
        footer={
          <div className="flex gap-3">
            <button className="btn-accent flex-1" onClick={() => setSheet(null)}>Got it</button>
            <button
              className="btn-soft flex-1"
              onClick={() => {
                if (sheet?.kind === 'again') markTaken(sheet.dose, isToday ? undefined : sheet.dose.takenLogs[0]?.takenAt, true);
                setSheet(null);
              }}
            >
              Log again
            </button>
          </div>
        }
      >
        {sheet?.kind === 'again' && (
          <div className="flex items-center gap-4 rounded-2xl bg-good/10 p-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-good text-white"><Check size={32} strokeWidth={3} /></div>
            <p className="flex-1 text-[17px]">
              You took <strong>{sheet.dose.sup.name}</strong> at{' '}
              <strong className="text-good">{sheet.dose.takenLogs.map((l) => (l.takenAt ? formatTime(l.takenAt) : '')).join(', ')}</strong>
              {isToday ? ' today' : ` on ${relativeDay(date)}`}.
            </p>
          </div>
        )}
      </Sheet>
      <Sheet open={sheet?.kind === 'more'} onClose={() => setSheet(null)} title={sheet?.kind === 'more' ? sheet.dose.sup.name : ''}>
        {sheet?.kind === 'more' && (
          <div className="flex flex-col gap-2">
            <button
              className="btn-soft justify-start"
              onClick={() =>
                setSheet({ kind: 'time', dose: sheet.dose, initial: isToday ? nowHHMM() : sheet.dose.spec.time || SLOTS[sheet.dose.spec.slot].defaultTime || '12:00' })
              }
            >
              <Clock size={20} /> I took it earlier
            </button>
            <button className="btn-soft justify-start" onClick={() => setSheet({ kind: 'skip', dose: sheet.dose })}>
              <SkipForward size={20} /> Skip this dose
            </button>
          </div>
        )}
      </Sheet>
      <QuickCheck open={sheet?.kind === 'quick'} onClose={() => setSheet(null)} doses={dueDosesFor(data, today, now)} />
    </>
  );
}

const hhmmOf = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function TodayHeader({ date, setDate, training, onTraining }: { date: string; setDate: (d: string) => void; training: boolean; onTraining: (v: boolean) => void }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <div className="flex-1">
        <h1 className="h-display text-[40px] md:text-[48px]">{relativeDay(date) === 'Today' ? 'Today' : relativeDay(date)}</h1>
        <p className="text-[15px] text-muted">
          {new Date(date + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            haptic();
            onTraining(!training);
          }}
          aria-pressed={training}
          className={`chip ${training ? 'chip-on' : ''}`}
          title="Training days add pre/post-workout doses and raise food targets"
        >
          <Dumbbell size={17} /> {training ? 'Training day' : 'Rest day'}
        </button>
        <DayNav date={date} onChange={setDate} />
      </div>
    </div>
  );
}

function Stat({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: number; suffix?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">{icon}</span>
      <div>
        <div className="h-display text-[26px]">
          {value}
          {suffix && <span className="text-base text-muted">{suffix}</span>}
        </div>
        <div className="-mt-0.5 text-xs font-semibold text-muted">{label}</div>
      </div>
    </div>
  );
}

function SlotGroup({
  slot, items, current, canLog, onMarkAll, children,
}: { slot: Slot; items: DueDose[]; current: boolean; canLog: boolean; onMarkAll: () => void; children: React.ReactNode }) {
  const Icon = SLOTS[slot].icon;
  const done = items.filter((d) => d.status === 'taken').length;
  const pending = items.some((d) => d.status !== 'taken' && d.status !== 'skipped');
  const lp = useLongPress(() => canLog && pending && onMarkAll());
  return (
    <section>
      <div className="mb-2.5 flex select-none items-center gap-2.5" {...lp}>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${current ? 'bg-accent text-onaccent' : 'bg-raised text-muted'}`}>
          <Icon size={19} strokeWidth={2.3} />
        </span>
        <h2 className="h-display text-[24px]">{SLOTS[slot].label}</h2>
        {current && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">Now</span>}
        <span className="ml-1 text-sm font-semibold text-muted">{done}/{items.length}</span>
        <div className="flex-1" />
        {canLog && pending && items.length > 1 && (
          <button className="btn-ghost min-h-[36px] px-3 text-[15px]" onClick={onMarkAll} title="Long-press the slot title to do this too">
            <CheckCheck size={18} /> Mark all
          </button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

function DoseCard({
  d, isPast, onTake, onTap, onMore, onUndo, onChangeTime,
}: { d: DueDose; isPast: boolean; onTake: () => void; onTap: () => void; onMore: () => void; onUndo: () => void; onChangeTime: () => void }) {
  const { sup, spec, status } = d;
  const isTaken = status === 'taken';
  const border =
    status === 'taken' ? 'rgb(var(--good) / 0.55)'
    : status === 'overdue' ? 'rgb(var(--warn) / 0.6)'
    : status === 'missed' ? 'rgb(var(--bad) / 0.5)'
    : undefined;
  return (
    <motion.div
      layout
      className={`card relative overflow-hidden p-4 transition ${status === 'skipped' ? 'opacity-60' : ''}`}
      style={{ borderColor: border, background: isTaken ? 'rgb(var(--good) / 0.07)' : undefined }}
    >
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: sup.color }} />
      <button type="button" className="flex w-full items-center gap-3 text-left" onClick={onTap} disabled={!isTaken} aria-label={isTaken ? `${sup.name}: already taken, tap for details` : undefined}>
        <SuppAvatar sup={sup} size={48} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[21px] font-bold leading-tight">{sup.name}</div>
          <div className="mt-0.5 text-[14px] text-muted">
            {unitLabel(sup.form, spec.quantity)}
            {sup.foodInstruction !== 'none' && ` · ${FOOD_INSTRUCTIONS[sup.foodInstruction]}`}
            {spec.time && ` · ${formatHHMM(spec.time)}`}
          </div>
        </div>
      </button>

      <AnimatePresence mode="wait" initial={false}>
        {isTaken ? (
          <motion.div key="taken" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 flex items-center gap-2">
            <motion.span
              initial={{ scale: 0.4, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-good text-white"
            >
              <Check size={24} strokeWidth={3.2} />
            </motion.span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[20px] font-bold leading-tight text-good">
                Taken at {d.takenLogs[0]?.takenAt ? formatTime(d.takenLogs[0].takenAt) : '—'}
              </div>
              {d.takenLogs.length > 1 && (
                <div className="text-xs font-semibold text-warn">
                  Logged {d.takenLogs.length}× · also {d.takenLogs.slice(1).map((l) => (l.takenAt ? formatTime(l.takenAt) : '')).join(', ')}
                </div>
              )}
            </div>
            <button className="icon-btn" onClick={onChangeTime} aria-label="Change time"><Clock size={19} /></button>
            <button className="icon-btn" onClick={onUndo} aria-label="Undo"><Undo2 size={19} /></button>
          </motion.div>
        ) : status === 'skipped' ? (
          <motion.div key="skipped" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 flex items-center gap-2">
            <SkipForward size={18} className="text-muted" />
            <span className="flex-1 font-semibold text-muted">Skipped{d.skipLog?.skipReason ? ` · ${d.skipLog.skipReason}` : ''}</span>
            <button className="btn-ghost min-h-[36px] px-3 text-[15px]" onClick={onUndo}><RotateCcw size={16} /> Undo</button>
          </motion.div>
        ) : (
          <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3">
            {(status === 'overdue' || status === 'missed') && (
              <div className={`mb-2 text-[13.5px] font-semibold ${status === 'missed' ? 'text-bad' : 'text-warn'}`}>
                {status === 'missed' ? 'Missed' : `Overdue${spec.time ? ` · was due ${formatHHMM(spec.time)}` : ''}`}
              </div>
            )}
            {d.status === 'pending' && d.date > todayKey() ? (
              <div className="text-sm text-muted">Upcoming</div>
            ) : (
              <div className="flex gap-2">
                <button className="btn-accent min-h-[50px] flex-1 text-[19px]" onClick={onTake}>
                  <Check size={22} strokeWidth={3} /> {isPast ? 'I took it' : 'Mark as taken'}
                </button>
                <button className="btn-soft min-h-[50px] w-[50px] px-0" onClick={onMore} aria-label="More options">
                  <MoreHorizontal size={22} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TimeSheet({ state, date, onClose, onSave }: { state: { dose: DueDose; initial: string; logId?: string } | null; date: string; onClose: () => void; onSave: (hhmm: string) => void }) {
  const [t, setT] = useState('08:00');
  useEffect(() => {
    if (state) setT(state.initial);
  }, [state]);
  return (
    <Sheet
      open={!!state}
      onClose={onClose}
      title={state?.logId ? 'Change time' : 'When did you take it?'}
      footer={<button className="btn-accent w-full" onClick={() => onSave(t)}>Save time</button>}
    >
      {state && (
        <>
          <p className="mb-4 text-muted">
            {state.dose.sup.name} · {relativeDay(date)}
          </p>
          <input type="time" className="input h-16 text-center font-display text-[32px] font-bold" value={t} onChange={(e) => setT(e.target.value)} />
        </>
      )}
    </Sheet>
  );
}

function QuickCheck({ open, onClose, doses }: { open: boolean; onClose: () => void; doses: DueDose[] }) {
  const taken = doses.filter((d) => d.status === 'taken').sort((a, b) => (a.takenLogs[0].takenAt ?? '').localeCompare(b.takenLogs[0].takenAt ?? ''));
  const left = doses.filter((d) => d.status === 'pending' || d.status === 'overdue');
  return (
    <Sheet open={open} onClose={onClose} title="Taken today">
      {taken.length === 0 ? (
        <p className="py-4 text-[17px] text-muted">Nothing logged yet today.</p>
      ) : (
        <ul className="divide-y divide-line/60">
          {taken.map((d) => (
            <li key={`${d.sup.id}-${d.index}`} className="flex items-center gap-3 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-good text-white"><Check size={18} strokeWidth={3} /></span>
              <span className="flex-1 text-[17px] font-semibold">
                {d.sup.name} <span className="font-normal text-muted">· {unitLabel(d.sup.form, d.spec.quantity)}</span>
              </span>
              <span className="font-display text-[19px] font-bold text-good">{d.takenLogs.map((l) => formatTime(l.takenAt!)).join(', ')}</span>
            </li>
          ))}
        </ul>
      )}
      {left.length > 0 && (
        <>
          <h3 className="mb-1 mt-5 font-display text-lg font-bold text-muted">Still to take</h3>
          <ul>
            {left.map((d) => (
              <li key={`${d.sup.id}-${d.index}`} className="flex items-center gap-3 py-2">
                <span className="h-3 w-3 rounded-full" style={{ background: d.sup.color }} />
                <span className="flex-1">{d.sup.name}</span>
                <span className={`text-sm font-semibold ${d.status === 'overdue' ? 'text-warn' : 'text-muted'}`}>
                  {d.spec.time ? formatHHMM(d.spec.time) : SLOTS[d.spec.slot].label}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}

function WaterCard({ date }: { date: string }) {
  const { data, actions } = useApp();
  const ml = data.water[date] ?? 0;
  const target = data.settings.targets.waterMl || 3000;
  const max = Math.max(Math.ceil((target * 1.5) / 250) * 250, ml);
  const pct = Math.min(1, ml / max);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateFromY = (clientY: number) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const frac = 1 - Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const value = Math.min(max, Math.round((frac * max) / 50) * 50);
    actions.setWater(date, value);
  };

  return (
    <section className="card flex items-center gap-4">
      <div
        ref={boxRef}
        className="relative h-24 w-14 shrink-0 touch-none select-none overflow-hidden rounded-[14px] border-2 border-line bg-bg"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragging.current = true;
          updateFromY(e.clientY);
        }}
        onPointerMove={(e) => dragging.current && updateFromY(e.clientY)}
        onPointerUp={() => {
          dragging.current = false;
          haptic();
        }}
        role="slider"
        aria-label="Water intake"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={ml}
      >
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{ background: withAlpha('#00B4FF', 0.85) }}
          initial={false}
          animate={{ height: `${pct * 100}%` }}
          transition={{ type: 'spring', damping: 18, stiffness: 120 }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <Droplet size={18} className="self-center text-[#00B4FF]" />
          <span className="h-display text-[30px]">{(ml / 1000).toFixed(2).replace(/\.?0+$/, '')}</span>
          <span className="text-muted">/ {(target / 1000).toFixed(1)} L water</span>
        </div>
        <div className="mt-2"><Bar value={ml} max={target} color="#00B4FF" /></div>
        <p className="mt-1 text-xs text-muted">Drag the bottle to log water</p>
      </div>
    </section>
  );
}
