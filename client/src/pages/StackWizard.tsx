import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Camera, Check, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Sheet } from '../components/Sheet';
import { Chip, Stepper } from '../components/ui';
import { categoryIcon, FOOD_INSTRUCTIONS, FORMS, SLOTS, SLOT_ORDER, SUPP_COLORS, unitLabel, WEEKDAYS } from '../lib/constants';
import { formatHHMM, todayKey } from '../lib/dates';
import { compressImage } from '../lib/image';
import { photoUrl, savePhoto } from '../lib/photos';
import type { DoseSpec, FoodInstruction, Form, ScheduleType, Slot, Supplement } from '../lib/types';
import { uid } from '../lib/uid';
import { useApp } from '../state/AppContext';
import { useToast } from '../state/Toast';

const DEFAULT_SLOTS: Record<number, Slot[]> = {
  1: ['morning'],
  2: ['morning', 'night'],
  3: ['morning', 'afternoon', 'night'],
  4: ['morning', 'afternoon', 'evening', 'night'],
  5: ['morning', 'pre_workout', 'afternoon', 'evening', 'night'],
  6: ['morning', 'pre_workout', 'afternoon', 'post_workout', 'evening', 'night'],
};

const blank = (color: string): Supplement => ({
  id: uid(),
  name: '',
  category: 'Vitamin',
  form: 'tablet',
  doses: [{ slot: 'morning', time: '08:00', quantity: 1 }],
  foodInstruction: 'after',
  schedule: { type: 'daily', weekdays: [1, 2, 3, 4, 5] },
  startDate: todayKey(),
  color,
  status: 'active',
  createdAt: new Date().toISOString(),
});

const STEPS = ['Name', 'Category', 'Form', 'Times a day', 'When', 'With food?', 'Schedule', 'Stock', 'Look', 'Review'] as const;

export function StackWizard({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: Supplement }) {
  const { data, actions } = useApp();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [s, setS] = useState<Supplement>(() => blank(SUPP_COLORS[0]));
  const [photo, setPhoto] = useState<string | undefined>();
  const [photoChanged, setPhotoChanged] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [trackStock, setTrackStock] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setPhotoChanged(false);
    if (editing) {
      setS(structuredClone(editing));
      setTrackStock(typeof editing.stock === 'number');
      setPhoto(photoUrl(editing.photoId));
    } else {
      const used = new Set(data.supplements.map((x) => x.color));
      setS(blank(SUPP_COLORS.find((c) => !used.has(c)) ?? SUPP_COLORS[data.supplements.length % SUPP_COLORS.length]));
      setTrackStock(false);
      setPhoto(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const set = <K extends keyof Supplement>(k: K, v: Supplement[K]) => setS((x) => ({ ...x, [k]: v }));
  const setDose = (i: number, patch: Partial<DoseSpec>) => setS((x) => ({ ...x, doses: x.doses.map((d, j) => (j === i ? { ...d, ...patch } : d)) }));
  const setTimes = (n: number) =>
    setS((x) => {
      const slots = DEFAULT_SLOTS[n] ?? DEFAULT_SLOTS[6];
      const doses = Array.from({ length: n }, (_, i) => x.doses[i] ?? { slot: slots[i], time: SLOTS[slots[i]].defaultTime || undefined, quantity: x.doses[0]?.quantity ?? 1 });
      return { ...x, doses };
    });

  const valid = (() => {
    switch (STEPS[step]) {
      case 'Name': return s.name.trim().length > 0;
      case 'When': return s.doses.every((d) => d.quantity > 0);
      case 'Schedule': return s.schedule.type !== 'weekdays' || (s.schedule.weekdays?.length ?? 0) > 0;
      default: return true;
    }
  })();

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(Math.max(0, Math.min(STEPS.length - 1, n)));
  };

  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      let photoId = s.photoId;
      // the server removes the old photo when photoId changes
      if (photoChanged) photoId = photo ? await savePhoto(photo) : undefined;
      const out: Supplement = { ...s, name: s.name.trim(), photoId, stock: trackStock ? s.stock ?? 0 : undefined };
      onClose();
      await actions.saveSupplement(out);
      toast(editing ? `${out.name} updated` : `${out.name} added to your stack`);
    } catch (e) {
      toast(`Photo upload failed: ${(e as Error).message}`, { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const unit = FORMS[s.form];
  const body = (() => {
    switch (STEPS[step]) {
      case 'Name':
        return (
          <Q title="What are you taking?">
            <input
              autoFocus
              className="input h-14 text-[20px]"
              placeholder="e.g. Vitamin D3, Whey Protein, Metformin"
              value={s.name}
              onChange={(e) => set('name', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && valid && go(step + 1)}
              maxLength={60}
            />
          </Q>
        );
      case 'Category':
        return (
          <Q title="Pick a category">
            <div className="flex flex-wrap gap-2">
              {data.categories.map((c) => {
                const Icon = categoryIcon(c);
                return (
                  <Chip key={c} on={s.category === c} onClick={() => set('category', c)}>
                    <Icon size={17} /> {c}
                  </Chip>
                );
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <input className="input" placeholder="Add your own category" value={newCat} onChange={(e) => setNewCat(e.target.value)} maxLength={30} />
              <button
                className="btn-soft"
                disabled={!newCat.trim()}
                onClick={() => {
                  actions.addCategory(newCat.trim());
                  set('category', newCat.trim());
                  setNewCat('');
                }}
              >
                <Plus size={18} /> Add
              </button>
            </div>
          </Q>
        );
      case 'Form':
        return (
          <Q title="What form is it?">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(FORMS) as Form[]).map((f) => (
                <Chip key={f} on={s.form === f} onClick={() => set('form', f)}>{FORMS[f].label}</Chip>
              ))}
            </div>
          </Q>
        );
      case 'Times a day':
        return (
          <Q title="How many times a day?">
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => setTimes(n)}
                  className={`flex h-20 flex-col items-center justify-center rounded-2xl border-2 transition active:scale-95 ${
                    s.doses.length === n ? 'border-accent bg-accent/15' : 'border-line bg-bg'
                  }`}
                >
                  <span className="h-display text-[34px]">{n}×</span>
                  <span className="text-xs font-semibold text-muted">per day</span>
                </button>
              ))}
            </div>
          </Q>
        );
      case 'When':
        return (
          <Q title="When, and how many each time?">
            <div className="space-y-4">
              {s.doses.map((d, i) => (
                <div key={i} className="rounded-2xl border border-line bg-bg/60 p-3.5">
                  <div className="mb-2 font-display text-lg font-bold text-muted">Dose {i + 1}</div>
                  <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {SLOT_ORDER.map((slot) => {
                      const Icon = SLOTS[slot].icon;
                      return (
                        <Chip key={slot} on={d.slot === slot} onClick={() => setDose(i, { slot, time: SLOTS[slot].defaultTime || d.time })}>
                          <Icon size={16} /> {SLOTS[slot].label}
                        </Chip>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Stepper
                      value={d.quantity}
                      onChange={(v) => setDose(i, { quantity: v })}
                      min={s.form === 'scoop' ? 0.5 : 1}
                      step={s.form === 'scoop' ? 0.5 : s.form === 'liquid' ? 5 : 1}
                      max={s.form === 'liquid' ? 500 : 20}
                      label={d.quantity === 1 ? unit.one : unit.many}
                    />
                    <label className="flex items-center gap-2 text-sm text-muted">
                      Reminder time
                      <input type="time" className="input w-[8.5rem]" value={d.time ?? ''} onChange={(e) => setDose(i, { time: e.target.value || undefined })} />
                    </label>
                    {d.time && (
                      <button className="icon-btn" onClick={() => setDose(i, { time: undefined })} aria-label="Clear time"><X size={18} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Q>
        );
      case 'With food?':
        return (
          <Q title="How should you take it?">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(FOOD_INSTRUCTIONS) as FoodInstruction[]).map((f) => (
                <Chip key={f} on={s.foodInstruction === f} onClick={() => set('foodInstruction', f)}>{FOOD_INSTRUCTIONS[f]}</Chip>
              ))}
            </div>
          </Q>
        );
      case 'Schedule':
        return (
          <Q title="Which days?">
            <div className="flex flex-wrap gap-2">
              {([['daily', 'Every day'], ['weekdays', 'Specific days'], ['workout_days', 'Training days only']] as [ScheduleType, string][]).map(([t, l]) => (
                <Chip key={t} on={s.schedule.type === t} onClick={() => set('schedule', { ...s.schedule, type: t })}>{l}</Chip>
              ))}
            </div>
            {s.schedule.type === 'weekdays' && (
              <div className="mt-4 grid grid-cols-7 gap-1.5">
                {WEEKDAYS.map((w, i) => {
                  const on = s.schedule.weekdays?.includes(i);
                  return (
                    <button
                      key={w}
                      className={`h-12 rounded-xl border-2 font-display font-bold ${on ? 'border-accent bg-accent text-onaccent' : 'border-line'}`}
                      onClick={() => {
                        const wd = new Set(s.schedule.weekdays ?? []);
                        on ? wd.delete(i) : wd.add(i);
                        set('schedule', { ...s.schedule, weekdays: [...wd].sort() });
                      }}
                    >
                      {w.slice(0, 2)}
                    </button>
                  );
                })}
              </div>
            )}
            {s.schedule.type === 'workout_days' && (
              <p className="mt-3 text-sm text-muted">Uses the training days from Settings. You can also flip any day to training on the Today screen.</p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <label>
                <span className="field-label">Start date</span>
                <input type="date" className="input" value={s.startDate} onChange={(e) => e.target.value && set('startDate', e.target.value)} />
              </label>
              <label>
                <span className="field-label">End date (optional)</span>
                <input type="date" className="input" value={s.endDate ?? ''} min={s.startDate} onChange={(e) => set('endDate', e.target.value || undefined)} />
              </label>
            </div>
          </Q>
        );
      case 'Stock':
        return (
          <Q title="Track how many you have left?">
            <p className="-mt-2 mb-4 text-muted">Loop counts down as you log and warns you a week before you run out.</p>
            <div className="flex gap-2">
              <Chip on={!trackStock} onClick={() => setTrackStock(false)}>No thanks</Chip>
              <Chip on={trackStock} onClick={() => setTrackStock(true)}>Yes, track stock</Chip>
            </div>
            {trackStock && (
              <div className="mt-5">
                <span className="field-label">{unit.many} left right now</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  className="input h-14 w-40 font-display text-[26px] font-bold"
                  value={s.stock ?? ''}
                  onChange={(e) => set('stock', e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)))}
                />
              </div>
            )}
          </Q>
        );
      case 'Look':
        return (
          <Q title="Make it easy to recognize">
            <span className="field-label">Color</span>
            <div className="flex flex-wrap gap-2.5">
              {SUPP_COLORS.map((c) => (
                <button
                  key={c}
                  className="flex h-11 w-11 items-center justify-center rounded-full transition active:scale-90"
                  style={{ background: c, boxShadow: s.color === c ? `0 0 0 3px rgb(var(--surface)), 0 0 0 5px ${c}` : undefined }}
                  onClick={() => set('color', c)}
                  aria-label={`Color ${c}`}
                >
                  {s.color === c && <Check size={20} color="#fff" strokeWidth={3} />}
                </button>
              ))}
              <label className="relative flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-line" title="Custom color">
                <Plus size={18} className="text-muted" />
                <input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={s.color} onChange={(e) => set('color', e.target.value.toUpperCase())} />
              </label>
            </div>
            <span className="field-label mt-6">Photo of the bottle or strip (optional)</span>
            <div className="flex items-center gap-3">
              {photo ? (
                <img src={photo} alt="" className="h-24 w-24 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-line text-muted"><Camera size={28} /></div>
              )}
              <div className="flex flex-col gap-2">
                <button className="btn-soft" onClick={() => fileRef.current?.click()}><Camera size={18} /> {photo ? 'Change' : 'Add photo'}</button>
                {photo && (
                  <button className="btn-ghost" onClick={() => { setPhoto(undefined); setPhotoChanged(true); }}><Trash2 size={18} /> Remove</button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  try {
                    setPhoto(await compressImage(f, 500, 0.75));
                    setPhotoChanged(true);
                  } catch (err) {
                    toast((err as Error).message, { tone: 'error' });
                  }
                }}
              />
            </div>
            <label className="mt-6 block">
              <span className="field-label">Notes</span>
              <textarea className="input min-h-[80px] py-2.5" value={s.notes ?? ''} onChange={(e) => set('notes', e.target.value || undefined)} placeholder="e.g. prescribed by Dr. Mehta, take with milk" />
            </label>
          </Q>
        );
      case 'Review':
        return (
          <Q title="Look good?">
            <div className="overflow-hidden rounded-2xl border border-line">
              <div className="flex items-center gap-3 p-4" style={{ background: `${s.color}22` }}>
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl" style={{ background: s.color, color: '#fff' }}>
                  {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : (() => { const I = categoryIcon(s.category); return <I size={28} />; })()}
                </div>
                <div>
                  <div className="h-display text-[28px]">{s.name}</div>
                  <div className="text-sm text-muted">{s.category} · {FORMS[s.form].label}</div>
                </div>
              </div>
              <dl className="divide-y divide-line/60 text-[15px]">
                {s.doses.map((d, i) => (
                  <Row key={i} k={SLOTS[d.slot].label} v={`${unitLabel(s.form, d.quantity)}${d.time ? ` at ${formatHHMM(d.time)}` : ''}`} />
                ))}
                <Row k="Food" v={FOOD_INSTRUCTIONS[s.foodInstruction]} />
                <Row
                  k="Days"
                  v={s.schedule.type === 'daily' ? 'Every day' : s.schedule.type === 'workout_days' ? 'Training days' : (s.schedule.weekdays ?? []).map((w) => WEEKDAYS[w]).join(', ')}
                />
                <Row k="From" v={`${s.startDate}${s.endDate ? ` to ${s.endDate}` : ''}`} />
                {trackStock && <Row k="Stock" v={`${s.stock ?? 0} ${unit.many}`} />}
              </dl>
            </div>
          </Q>
        );
    }
  })();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      full
      wide
      title={editing ? 'Edit item' : 'Add to stack'}
      footer={
        <div className="flex gap-3">
          {step > 0 && (
            <button className="btn-soft w-14 px-0" onClick={() => go(step - 1)} aria-label="Back"><ArrowLeft size={22} /></button>
          )}
          {step < STEPS.length - 1 ? (
            <>
              {editing && (
                <button className="btn-soft" onClick={save} disabled={!s.name.trim() || saving}>Save now</button>
              )}
              <button className="btn-accent flex-1" onClick={() => go(step + 1)} disabled={!valid}>Next</button>
            </>
          ) : (
            <button className="btn-accent flex-1" onClick={save} disabled={saving}><Check size={20} strokeWidth={3} /> {editing ? 'Save changes' : 'Add to stack'}</button>
          )}
        </div>
      }
    >
      {/* progress */}
      <div className="mb-6 flex gap-1">
        {STEPS.map((l, i) => (
          <button
            key={l}
            className={`h-1.5 flex-1 rounded-full transition ${i <= step ? 'bg-accent' : 'bg-line'}`}
            onClick={() => (i < step || (editing && s.name.trim())) && go(i)}
            aria-label={`Step ${i + 1}: ${l}`}
          />
        ))}
      </div>
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={step}
          custom={dir}
          initial={{ opacity: 0, x: dir * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -40 }}
          transition={{ duration: 0.18 }}
        >
          {body}
        </motion.div>
      </AnimatePresence>
    </Sheet>
  );
}

function Q({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="h-display mb-5 text-[32px] md:text-[36px]">{title}</h3>
      {children}
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex gap-3 px-4 py-2.5">
    <dt className="w-24 shrink-0 text-muted">{k}</dt>
    <dd className="font-semibold">{v}</dd>
  </div>
);
