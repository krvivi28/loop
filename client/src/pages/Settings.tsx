import { Bell, Check, ChevronDown, Database, Download, Loader2, LogOut, Moon, Palette, Smartphone, Sun, Target, Trash2, Upload, User, Dumbbell } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { Confirm } from '../components/Sheet';
import { Chip, PageTitle } from '../components/ui';
import { ACCENTS, GOALS, SLOTS, SLOT_ORDER, WEEKDAYS } from '../lib/constants';
import { notificationsSupported, requestPermission } from '../lib/notifications';
import { downloadExport } from '../lib/api';
import { suggestTargets as calcTargets } from '../lib/targets';
import { useAuth } from '../state/AuthContext';
import type { Goal, Settings as S, Targets } from '../lib/types';
import { useApp } from '../state/AppContext';
import { useToast } from '../state/Toast';

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2 className="h-display mb-4 flex items-center gap-2.5 text-[24px]">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function CollapsibleSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card">
      <button className="flex w-full items-center gap-2.5 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">{icon}</span>
        <h2 className="h-display flex-1 text-[24px]">{title}</h2>
        <ChevronDown size={20} className={`text-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}

const NumField = ({ label, value, onChange, unit }: { label: string; value?: number; onChange: (v?: number) => void; unit: string }) => (
  <label className="block">
    <span className="field-label">{label}</span>
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        className="input pr-12"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)))}
      />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>
    </div>
  </label>
);

export default function Settings() {
  const { data, actions, user } = useApp();
  const { logout } = useAuth();
  const toast = useToast();
  const s = data.settings;
  const set = (patch: Partial<S>) => actions.updateSettings(patch);
  const setT = (patch: Partial<Targets>) => set({ targets: { ...s.targets, ...patch } });

  const [busy, setBusy] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmImport, setConfirmImport] = useState<unknown>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const suggestTargets = () => {
    const w = s.profile.weightKg;
    if (!w) return toast('Enter your weight first.', { tone: 'error' });
    setT(calcTargets(w, s.profile.goal ?? 'maintenance'));
    toast('Targets updated from your weight and goal');
  };

  const exportData = async () => {
    setBusy('export');
    try {
      await downloadExport();
      toast('Backup downloaded');
    } catch (e) {
      toast((e as Error).message, { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const onImportFile = async (f?: File) => {
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (j?.app !== 'fitstack' || !j.data) throw new Error();
      setConfirmImport(j);
    } catch {
      toast('That file is not a Loop backup.', { tone: 'error' });
    }
  };

  return (
    <>
      <PageTitle title="Settings" />
      <div className="grid gap-4 md:grid-cols-2">
        <Section icon={<User size={19} />} title="Profile">
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 block">
              <span className="field-label">Name</span>
              <input className="input" value={s.profile.name ?? ''} onChange={(e) => set({ profile: { ...s.profile, name: e.target.value || undefined } })} />
            </label>
            <NumField label="Weight" unit="kg" value={s.profile.weightKg} onChange={(v) => set({ profile: { ...s.profile, weightKg: v } })} />
            <NumField label="Height" unit="cm" value={s.profile.heightCm} onChange={(v) => set({ profile: { ...s.profile, heightCm: v } })} />
          </div>
          <span className="field-label mt-4">Goal</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(GOALS) as Goal[]).map((g) => (
              <Chip key={g} on={s.profile.goal === g} onClick={() => set({ profile: { ...s.profile, goal: g } })}>{GOALS[g]}</Chip>
            ))}
          </div>
        </Section>

        <Section icon={<Target size={19} />} title="Daily targets">
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Calories" unit="kcal" value={s.targets.calories} onChange={(v) => setT({ calories: v ?? 0 })} />
            <NumField label="Protein" unit="g" value={s.targets.proteinG} onChange={(v) => setT({ proteinG: v ?? 0 })} />
            <NumField label="Carbs" unit="g" value={s.targets.carbsG} onChange={(v) => setT({ carbsG: v ?? 0 })} />
            <NumField label="Fat" unit="g" value={s.targets.fatG} onChange={(v) => setT({ fatG: v ?? 0 })} />
            <NumField label="Water" unit="ml" value={s.targets.waterMl} onChange={(v) => setT({ waterMl: v ?? 0 })} />
          </div>
          <button className="btn-soft mt-4 w-full" onClick={suggestTargets}>Suggest targets from my weight and goal</button>
          <p className="mt-2 text-xs text-muted">Training days automatically add 10% calories and 15 g protein.</p>
        </Section>

        <Section icon={<Dumbbell size={19} />} title="Training days">
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((w, i) => {
              const on = s.workoutDays.includes(i);
              return (
                <button
                  key={w}
                  className={`h-12 rounded-xl border-2 font-display font-bold ${on ? 'border-accent bg-accent text-onaccent' : 'border-line'}`}
                  onClick={() => set({ workoutDays: on ? s.workoutDays.filter((d) => d !== i) : [...s.workoutDays, i].sort() })}
                  aria-pressed={on}
                >
                  {w.slice(0, 2)}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-muted">Used for “training days only” items and higher food targets. Override any day on the Today screen.</p>
        </Section>

        <Section icon={<Bell size={19} />} title="Reminders">
          {!notificationsSupported() ? (
            <p className="text-sm text-muted">Notifications need the app opened on <strong>localhost</strong> or <strong>https</strong>. On a phone over Wi-Fi (http), reminders are not available.</p>
          ) : (
            <>
              <div className="flex gap-2">
                <Chip
                  on={s.notifications}
                  onClick={async () => {
                    if (s.notifications) return set({ notifications: false });
                    const p = await requestPermission();
                    if (p === 'granted') {
                      set({ notifications: true });
                      toast('Reminders on');
                    } else toast('Notifications are blocked. Allow them in your browser site settings.', { tone: 'error' });
                  }}
                >
                  {s.notifications ? 'Reminders on' : 'Turn on reminders'}
                </Chip>
              </div>
              {s.notifications && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {SLOT_ORDER.map((slot) => (
                    <Chip key={slot} on={s.notifySlots[slot]} onClick={() => set({ notifySlots: { ...s.notifySlots, [slot]: !s.notifySlots[slot] } })}>
                      {SLOTS[slot].label}
                    </Chip>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Reminders fire at each dose’s reminder time, but browsers only deliver them while Loop is open or recently used. Install it to your home screen for the best results.
              </p>
            </>
          )}
        </Section>

        <Section icon={<Smartphone size={19} />} title="Account">
          <p className="text-[15px]">Logged in as <strong>{user.phone ?? user.email}</strong></p>
          <button className="btn-soft mt-4 w-full" onClick={logout}><LogOut size={18} /> Log out</button>
          <button className="btn-danger mt-2 w-full" onClick={() => setConfirmDelete(true)}><Trash2 size={18} /> Delete account</button>
        </Section>

        <Section icon={<Database size={19} />} title="Your data">
          <p className="mb-4 text-sm text-muted">Your data is saved to your account and syncs across devices. Export a backup file any time.</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-soft" onClick={exportData} disabled={busy === 'export'}>{busy === 'export' ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Export</button>
            <button className="btn-soft" onClick={() => importRef.current?.click()}><Upload size={18} /> Import</button>
          </div>
          <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { onImportFile(e.target.files?.[0]); e.target.value = ''; }} />
          <button className="btn-danger mt-2 w-full" onClick={() => setConfirmReset(true)}><Trash2 size={18} /> Clear tracking data</button>
        </Section>

        <CollapsibleSection icon={<Palette size={19} />} title="Appearance">
          <span className="field-label">Theme</span>
          <div className="mb-5 flex gap-2">
            <Chip on={s.theme === 'dark'} onClick={() => set({ theme: 'dark' })}><Moon size={16} /> Dark</Chip>
            <Chip on={s.theme === 'light'} onClick={() => set({ theme: 'light' })}><Sun size={16} /> Light</Chip>
          </div>
          <span className="field-label">Accent color</span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {ACCENTS.map((a) => (
              <button
                key={a.hex}
                onClick={() => set({ accentColor: a.hex })}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-2.5 transition active:scale-95 ${s.accentColor.toUpperCase() === a.hex ? 'border-ink/70' : 'border-transparent hover:bg-raised'}`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: a.hex, boxShadow: `0 6px 20px -6px ${a.hex}` }}>
                  {s.accentColor.toUpperCase() === a.hex && <Check size={22} strokeWidth={3} color="#11141c" />}
                </span>
                <span className="text-center text-xs font-semibold leading-tight">{a.name}</span>
              </button>
            ))}
            <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-transparent p-2.5 hover:bg-raised">
              <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full" style={{ background: 'conic-gradient(#ff1744,#ffc400,#c6ff00,#00e5a0,#00b4ff,#7c4dff,#ff1744)' }}>
                <input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={s.accentColor} onChange={(e) => set({ accentColor: e.target.value })} aria-label="Custom accent color" />
              </span>
              <span className="text-xs font-semibold">Custom</span>
            </label>
          </div>
        </CollapsibleSection>
      </div>

      <Confirm
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Clear tracking data?"
        body="This deletes your stack, every dose log, meals, photos, water, weight and AI chat from your account. Your login, profile and settings stay. It cannot be undone, so export a backup first if you might need it."
        confirmLabel="Delete data"
        danger
        onConfirm={async () => {
          try {
            await actions.clearAllData();
            toast('Tracking data cleared');
          } catch (e) {
            toast((e as Error).message, { tone: 'error' });
          }
        }}
      />
      <Confirm
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete your account?"
        body={<>This permanently deletes the account for <strong>{user.phone ?? user.email}</strong> and all its data. You can sign up again later, but nothing will be restored.</>}
        confirmLabel="Delete account"
        danger
        onConfirm={async () => {
          try {
            await actions.deleteAccount();
          } catch (e) {
            toast((e as Error).message, { tone: 'error' });
          }
        }}
      />
      <Confirm
        open={!!confirmImport}
        onClose={() => setConfirmImport(null)}
        title="Replace current data?"
        body="Importing replaces everything in your account with the backup."
        confirmLabel="Import backup"
        onConfirm={async () => {
          try {
            const r = await actions.importBackup(confirmImport);
            toast(`Imported ${r.imported.supplements} items, ${r.imported.doseLogs} dose logs, ${r.imported.meals} meals`);
          } catch (e) {
            toast((e as Error).message, { tone: 'error' });
          }
        }}
      />
    </>
  );
}
