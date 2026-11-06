import { Camera, Dumbbell, ImagePlus, Loader2, PencilLine, Plus, Sparkles, Trash2, UtensilsCrossed, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, Ring } from '../components/Ring';
import { Sheet } from '../components/Sheet';
import { Chip, DayNav, Empty, PageTitle } from '../components/ui';
import { MEAL_TYPES } from '../lib/constants';
import { formatTime, isoAt, todayKey } from '../lib/dates';
import { haptic } from '../lib/feedback';
import { compressImage } from '../lib/image';
import { AiError, analyzeMeal } from '../lib/ai';
import { savePhoto, usePhoto } from '../lib/photos';
import { mealsOn, nutritionTotals, targetsFor } from '../lib/stats';
import type { MealLog, MealType } from '../lib/types';
import { uid } from '../lib/uid';
import { useApp } from '../state/AppContext';
import { useToast } from '../state/Toast';

const MACROS = [
  { key: 'proteinG', label: 'Protein', color: '#FF4081', unit: 'g' },
  { key: 'carbsG', label: 'Carbs', color: '#FFC400', unit: 'g' },
  { key: 'fatG', label: 'Fat', color: '#00B4FF', unit: 'g' },
] as const;

const guessMealType = (d = new Date()): MealType => {
  const h = d.getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 19) return 'snack';
  return 'dinner';
};

type Editor = { meal: MealLog; photo?: string; isNew: boolean } | null;

export default function Food() {
  const { data } = useApp();
  const toast = useToast();
  const [date, setDate] = useState(todayKey());
  const [editor, setEditor] = useState<Editor>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const meals = useMemo(() => mealsOn(data, date), [data, date]);
  const tot = nutritionTotals(meals);
  const tg = targetsFor(data, date);

  const newMeal = (photo?: string): MealLog => ({
    id: uid(),
    date,
    mealType: guessMealType(),
    loggedAt: date === todayKey() ? new Date().toISOString() : isoAt(date, '13:00'),
    foodItems: [],
    calories: 0, proteinG: 0, carbsG: 0, fatG: 0,
    source: photo ? 'ai' : 'manual',
  });

  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      const url = await compressImage(f, 1024, 0.7);
      setEditor({ meal: newMeal(url), photo: url, isNew: true });
    } catch (e) {
      toast((e as Error).message, { tone: 'error' });
    }
  };

  const remaining = tg.calories - tot.calories;

  return (
    <>
      <PageTitle title="Food" right={<DayNav date={date} onChange={setDate} />} sub={tg.training ? <span className="inline-flex items-center gap-1.5"><Dumbbell size={15} /> Training day targets</span> : 'Rest day targets'} />

      <section className="card mb-5 grid items-center gap-5 md:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-5">
          <Ring value={tg.calories ? tot.calories / tg.calories : 0} size={150} stroke={14} glow color={remaining < 0 ? 'rgb(var(--bad))' : undefined}>
            <div className="h-display text-[42px]">{tot.calories}</div>
            <div className="text-xs font-semibold text-muted">of {tg.calories} kcal</div>
          </Ring>
          <div className="md:hidden">
            <div className="h-display text-[30px]">{Math.abs(remaining)}</div>
            <div className="text-sm text-muted">{remaining >= 0 ? 'kcal left' : 'kcal over'}</div>
          </div>
        </div>
        <div className="space-y-3.5">
          <div className="hidden items-baseline gap-2 md:flex">
            <span className="h-display text-[30px]">{Math.abs(remaining)}</span>
            <span className="text-muted">{remaining >= 0 ? 'kcal left today' : 'kcal over target'}</span>
          </div>
          {MACROS.map((m) => (
            <div key={m.key}>
              <div className="mb-1 flex justify-between text-[15px]">
                <span className="font-semibold">{m.label}</span>
                <span className="text-muted"><strong className="text-ink">{tot[m.key]}</strong> / {tg[m.key]} {m.unit}</span>
              </div>
              <Bar value={tot[m.key]} max={tg[m.key]} color={m.color} />
            </div>
          ))}
        </div>
      </section>

      <div className="mb-6 grid grid-cols-3 gap-2.5">
        <button className="btn-accent min-h-[76px] flex-col gap-1 text-[16px]" onClick={() => camRef.current?.click()}>
          <Camera size={24} /> Take photo
        </button>
        <button className="btn-soft min-h-[76px] flex-col gap-1 text-[16px]" onClick={() => galRef.current?.click()}>
          <ImagePlus size={24} /> Gallery
        </button>
        <button className="btn-soft min-h-[76px] flex-col gap-1 text-[16px]" onClick={() => setEditor({ meal: newMeal(), isNew: true })}>
          <PencilLine size={24} /> Manual
        </button>
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
        <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      {meals.length === 0 ? (
        <Empty icon={<UtensilsCrossed size={30} />} title="No meals logged" body="Snap a photo of your plate and AI estimates calories and macros. You can fix any number before saving." />
      ) : (
        <ol className="relative space-y-3 border-l-2 border-line/70 pl-5">
          {meals.map((m) => (
            <MealRow key={m.id} meal={m} onOpen={(photo) => setEditor({ meal: m, photo, isNew: false })} />
          ))}
        </ol>
      )}

      <MealEditor state={editor} onClose={() => setEditor(null)} />
    </>
  );
}

function MealRow({ meal, onOpen }: { meal: MealLog; onOpen: (photo?: string) => void }) {
  const photo = usePhoto(meal.photoId);
  return (
    <li className="relative">
      <span className="absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-bg bg-accent" />
      <button className="card flex w-full items-center gap-3 p-3 text-left transition hover:border-accent/50" onClick={() => onOpen(photo)}>
        {photo ? (
          <img src={photo} alt="" className="h-16 w-16 rounded-xl object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-raised text-muted"><UtensilsCrossed size={24} /></div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-[19px] font-bold">{MEAL_TYPES[meal.mealType]}</span>
            <span className="text-sm text-muted">{formatTime(meal.loggedAt)}</span>
            {meal.source === 'ai' && <Sparkles size={14} className="text-accent" />}
          </div>
          <p className="truncate text-[14.5px] text-muted">{meal.foodItems.map((f) => f.name).join(', ') || 'No items listed'}</p>
          <p className="mt-0.5 text-[13.5px] font-semibold">
            <span className="text-[#FF4081]">P {meal.proteinG}g</span> · <span className="text-[#FFC400]">C {meal.carbsG}g</span> · <span className="text-[#00B4FF]">F {meal.fatG}g</span>
          </p>
        </div>
        <div className="text-right">
          <div className="h-display text-[28px]">{meal.calories}</div>
          <div className="text-xs text-muted">kcal</div>
        </div>
      </button>
    </li>
  );
}

const NUM_FIELDS: { key: keyof MealLog; label: string; unit: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'proteinG', label: 'Protein', unit: 'g' },
  { key: 'carbsG', label: 'Carbs', unit: 'g' },
  { key: 'fatG', label: 'Fat', unit: 'g' },
  { key: 'fiberG', label: 'Fiber', unit: 'g' },
  { key: 'sugarG', label: 'Sugar', unit: 'g' },
  { key: 'sodiumMg', label: 'Sodium', unit: 'mg' },
];

function MealEditor({ state, onClose }: { state: Editor; onClose: () => void }) {
  const { actions, server } = useApp();
  const toast = useToast();
  const [m, setM] = useState<MealLog | null>(null);
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [err, setErr] = useState<AiError | null>(null);

  useEffect(() => {
    if (state) {
      setM(structuredClone(state.meal));
      setHint('');
      setAnalyzed(!state.isNew || !state.photo);
      setErr(null);
    }
  }, [state]);

  if (!state || !m) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const set = (patch: Partial<MealLog>) => setM((x) => (x ? { ...x, ...patch } : x));

  const analyze = async () => {
    if (!state.photo) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await analyzeMeal(state.photo, hint);
      set({ ...r, source: 'ai' });
      setAnalyzed(true);
      haptic(20);
    } catch (e) {
      setErr(e instanceof AiError ? e : new AiError(0, 'other', (e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      let photoId = m.photoId;
      if (state.isNew && state.photo) photoId = await savePhoto(state.photo);
      onClose();
      await actions.saveMeal({ ...m, photoId, foodItems: m.foodItems.filter((f) => f.name.trim()) });
      toast(state.isNew ? 'Meal logged' : 'Meal updated');
    } catch (e) {
      toast(`Photo upload failed: ${(e as Error).message}`, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const timeVal = (() => {
    const d = new Date(m.loggedAt);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  })();

  return (
    <Sheet
      open={!!state}
      onClose={onClose}
      full
      wide
      title={state.isNew ? 'Log meal' : MEAL_TYPES[m.mealType]}
      footer={
        <div className="flex gap-3">
          {!state.isNew && (
            <button
              className="btn-danger w-14 px-0"
              aria-label="Delete meal"
              onClick={() => {
                actions.deleteMeal(m.id);
                toast('Meal deleted');
                onClose();
              }}
            >
              <Trash2 size={20} />
            </button>
          )}
          {state.photo && !analyzed ? (
            <>
              <button className="btn-soft" onClick={() => setAnalyzed(true)}>Enter manually</button>
              <button className="btn-accent flex-1" onClick={analyze} disabled={busy}>
                {busy ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />} {busy ? 'Analyzing…' : 'Analyze with AI'}
              </button>
            </>
          ) : (
            <button className="btn-accent flex-1" onClick={save} disabled={busy}>{busy && <Loader2 size={20} className="animate-spin" />} {state.isNew ? 'Save meal' : 'Save changes'}</button>
          )}
        </div>
      }
    >
      {state.photo && (
        <div className="relative mb-4 overflow-hidden rounded-2xl">
          <img src={state.photo} alt="Meal" className={`max-h-72 w-full object-cover transition ${busy ? 'scale-105 blur-[2px]' : ''}`} />
          {busy && <div className="absolute inset-0 animate-pulse bg-accent/20" />}
          {m.aiConfidence && analyzed && (
            <span className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur">
              AI confidence: {m.aiConfidence}
            </span>
          )}
        </div>
      )}

      <span className="field-label">Meal</span>
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {(Object.keys(MEAL_TYPES) as MealType[]).map((t) => (
          <Chip key={t} on={m.mealType === t} onClick={() => set({ mealType: t })}>{MEAL_TYPES[t]}</Chip>
        ))}
      </div>
      <label className="mb-4 block w-40">
        <span className="field-label">Time</span>
        <input type="time" className="input" value={timeVal} onChange={(e) => e.target.value && set({ loggedAt: isoAt(m.date, e.target.value) })} />
      </label>

      {state.photo && !analyzed && (
        <>
          <label className="block">
            <span className="field-label">Help the AI (optional)</span>
            <textarea className="input min-h-[72px] py-2.5" placeholder='e.g. "2 rotis, dal, 150 g paneer"' value={hint} onChange={(e) => setHint(e.target.value)} />
          </label>
          {!server.aiConfigured && (
            <p className="mt-3 rounded-xl bg-warn/10 px-3 py-2.5 text-sm">
              AI isn’t set up on the server yet (add GEMINI_API_KEY to server/.env). You can enter values manually.
            </p>
          )}
          {err && <p className="mt-3 rounded-xl bg-bad/10 px-3 py-2.5 text-sm text-ink">{err.message}</p>}
        </>
      )}

      {analyzed && (
        <>
          <div className="mb-2 mt-1 flex items-center justify-between">
            <span className="field-label mb-0">Food items</span>
            <button className="btn-ghost min-h-[36px] px-2 text-[15px]" onClick={() => set({ foodItems: [...m.foodItems, { name: '', quantity: '' }] })}>
              <Plus size={17} /> Add item
            </button>
          </div>
          <div className="mb-5 space-y-2">
            {m.foodItems.length === 0 && <p className="text-sm text-muted">No items. Add what you ate so the AI Coach can see it.</p>}
            {m.foodItems.map((f, i) => (
              <div key={i} className="flex gap-2">
                <input className="input flex-[2]" placeholder="Food" value={f.name} onChange={(e) => set({ foodItems: m.foodItems.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                <input className="input flex-1" placeholder="Qty" value={f.quantity} onChange={(e) => set({ foodItems: m.foodItems.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)) })} />
                <button className="icon-btn" onClick={() => set({ foodItems: m.foodItems.filter((_, j) => j !== i) })} aria-label="Remove item"><X size={18} /></button>
              </div>
            ))}
          </div>
          <span className="field-label">Nutrition (edit anything that looks off)</span>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {NUM_FIELDS.map((f) => (
              <label key={f.key} className={`rounded-xl border border-line bg-bg p-2.5 ${f.key === 'calories' ? 'col-span-2 md:col-span-1' : ''}`}>
                <span className="text-xs font-semibold text-muted">{f.label} ({f.unit})</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="0"
                  className="w-full bg-transparent font-display text-[26px] font-bold focus:outline-none"
                  value={(m[f.key] as number | undefined) || ''}
                  onChange={(e) => set({ [f.key]: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) } as Partial<MealLog>)}
                />
              </label>
            ))}
          </div>
          {m.notes && <p className="mt-4 text-sm text-muted">AI note: {m.notes}</p>}
        </>
      )}
    </Sheet>
  );
}

