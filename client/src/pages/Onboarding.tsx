import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Logo } from '../components/Logo';
import { Chip } from '../components/ui';
import { GOALS } from '../lib/constants';
import { suggestTargets } from '../lib/targets';
import type { Goal } from '../lib/types';
import { useApp } from '../state/AppContext';

export default function Onboarding() {
  const { data, actions } = useApp();
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [goal, setGoal] = useState<Goal>('muscle_gain');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const w = parseFloat(weight);
  const valid = w >= 20 && w <= 400;
  const targets = useMemo(() => (valid ? suggestTargets(w, goal) : data.settings.targets), [valid, w, goal, data.settings.targets]);

  const finish = async (skip = false) => {
    setBusy(true);
    setError(null);
    try {
      const h = parseFloat(height);
      await actions.completeOnboarding(
        skip
          ? {}
          : {
              profile: { name: name.trim() || undefined, weightKg: valid ? w : undefined, heightCm: h >= 50 && h <= 260 ? h : undefined, goal },
              targets,
            },
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-xl px-5 pb-10 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <Logo size={30} />
      <h1 className="h-display mt-10 text-[46px]">Set up your profile</h1>
      <p className="mt-2 text-[17px] text-muted">Loop uses this to set your daily calorie, protein and water targets. You can change it any time in Settings.</p>

      <div className="mt-8 space-y-5">
        <label className="block">
          <span className="field-label">Your name</span>
          <input className="input h-12" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="field-label">Weight (kg)</span>
            <input className="input h-12" type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">Height (cm)</span>
            <input className="input h-12" type="number" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
          </label>
        </div>
        <div>
          <span className="field-label">Goal</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(GOALS) as Goal[]).map((g) => <Chip key={g} on={goal === g} onClick={() => setGoal(g)}>{GOALS[g]}</Chip>)}
          </div>
        </div>
      </div>

      <section className="card mt-7">
        <h2 className="h-display text-[22px]">{valid ? 'Your daily targets' : 'Default targets'}</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center sm:grid-cols-5">
          {[
            ['kcal', targets.calories],
            ['protein g', targets.proteinG],
            ['carbs g', targets.carbsG],
            ['fat g', targets.fatG],
            ['water L', +(targets.waterMl / 1000).toFixed(2)],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-raised/70 py-2.5">
              <div className="h-display text-[26px]">{v}</div>
              <div className="text-xs font-semibold text-muted">{l}</div>
            </div>
          ))}
        </div>
        {!valid && <p className="mt-3 text-sm text-muted">Enter your weight to personalise these.</p>}
      </section>

      {error && <p className="mt-4 font-semibold text-bad">{error}</p>}
      <button className="btn-accent mt-6 h-14 w-full text-[20px]" onClick={() => finish(false)} disabled={busy}>
        {busy && <Loader2 size={20} className="animate-spin" />} Start tracking
      </button>
      <button className="btn-ghost mt-2 w-full" onClick={() => finish(true)} disabled={busy}>Skip for now</button>
    </div>
  );
}
