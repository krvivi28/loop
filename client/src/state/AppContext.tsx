/**
 * App data now lives in MongoDB. The UI updates instantly (optimistic), then the change
 * is sent to the API. If the server rejects it, we show the error and reload from the server.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Splash } from '../components/Splash';
import { api, ApiError } from '../lib/api';
import { uid } from '../lib/uid';
import type { AiCache, AppData, ChatMsg, DoseLog, MealLog, ServerInfo, Settings, Slot, Supplement, User } from '../lib/types';
import { useAuth } from './AuthContext';
import { useToast } from './Toast';

interface Bootstrap {
  user: User;
  server: ServerInfo;
  data: AppData;
}

interface Actions {
  saveSupplement(s: Supplement): Promise<void>;
  setSupplementStatus(id: string, status: Supplement['status']): void;
  deleteSupplement(id: string): void;
  addCategory(name: string): void;
  logTaken(p: { sup: Supplement; date: string; index: number; slot: Slot; quantity: number; takenAt: string; extra?: boolean }): string;
  logSkipped(p: { sup: Supplement; date: string; index: number; slot: Slot; reason?: string }): string;
  removeLog(id: string): void;
  updateLogTime(id: string, takenAt: string): void;
  saveMeal(m: MealLog): Promise<void>;
  deleteMeal(id: string): void;
  setWater(date: string, ml: number): void;
  addWeight(date: string, kg: number): void;
  deleteWeight(id: string): void;
  setTraining(date: string, on: boolean): void;
  updateSettings(patch: Partial<Settings>): void;
  setAi(patch: Partial<AiCache>): void;
  addChatLocal(m: ChatMsg): void;
  clearChat(): void;
  completeOnboarding(patch: Partial<Settings>): Promise<void>;
  completeTour(): Promise<void>;
  importBackup(json: unknown): Promise<{ imported: Record<string, number>; skipped: number }>;
  clearAllData(): Promise<void>;
  deleteAccount(): Promise<void>;
  reload(): Promise<void>;
}

interface AppValue {
  data: AppData;
  actions: Actions;
  server: ServerInfo;
  user: User;
  syncError: boolean;
  /** kept for compatibility with older components */
  saveError: boolean;
}

const Ctx = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { setUser, logout } = useAuth();
  const toast = useToast();
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState(false);

  const reload = useCallback(async () => {
    try {
      const b = await api.get<Bootstrap>('/bootstrap');
      setBoot(b);
      setUser(b.user);
      setLoadError(null);
      setSyncError(false);
    } catch (e) {
      setLoadError((e as Error).message);
      throw e;
    }
  }, [setUser]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const up = useCallback((fn: (d: AppData) => AppData) => setBoot((b) => (b ? { ...b, data: fn(b.data) } : b)), []);

  /** Run an API call after an optimistic update; on failure tell the user and resync. */
  const sync = useCallback(
    (p: Promise<unknown>) =>
      p.then(
        () => setSyncError(false),
        (e: unknown) => {
          const err = e as ApiError;
          if (err.status === 401) return;
          toast(err.status === 0 ? 'Not saved: can’t reach the server.' : `Not saved: ${err.message}`, { tone: 'error', duration: 5000 });
          setSyncError(true);
          reload().catch(() => {});
        },
      ),
    [toast, reload],
  );

  // Debounced writes for things that change many times quickly.
  const settingsPending = useRef<Partial<Settings>>({});
  const settingsTimer = useRef<number>();
  const waterTimers = useRef<Record<string, number>>({});

  const latest = useRef<Bootstrap | null>(null);
  latest.current = boot;

  const adjustStock = (sups: Supplement[], id: string, delta: number) =>
    sups.map((s) => (s.id === id && typeof s.stock === 'number' ? { ...s, stock: Math.max(0, +(s.stock + delta).toFixed(2)) } : s));

  const actions = useMemo<Actions>(
    () => ({
      saveSupplement: async (s) => {
        up((d) => ({ ...d, supplements: d.supplements.some((x) => x.id === s.id) ? d.supplements.map((x) => (x.id === s.id ? s : x)) : [...d.supplements, s] }));
        await sync(api.put(`/supplements/${s.id}`, s));
      },
      setSupplementStatus: (id, status) => {
        up((d) => ({ ...d, supplements: d.supplements.map((s) => (s.id === id ? { ...s, status } : s)) }));
        sync(api.patch(`/supplements/${id}/status`, { status }));
      },
      deleteSupplement: (id) => {
        up((d) => ({ ...d, supplements: d.supplements.filter((s) => s.id !== id), doseLogs: d.doseLogs.filter((l) => l.supplementId !== id) }));
        sync(api.del(`/supplements/${id}`));
      },
      addCategory: (name) => {
        up((d) => (d.categories.includes(name) ? d : { ...d, categories: [...d.categories.filter((c) => c !== 'Other'), name, 'Other'] }));
        sync(api.post('/me/categories', { name }));
      },
      logTaken: ({ sup, date, index, slot, quantity, takenAt, extra }) => {
        const id = uid();
        const log: DoseLog = { id, supplementId: sup.id, date, slot, doseIndex: index, status: 'taken', takenAt, quantity, extra };
        up((d) => ({
          ...d,
          doseLogs: [...d.doseLogs.filter((l) => !(l.status === 'skipped' && l.supplementId === sup.id && l.date === date && l.doseIndex === index)), log],
          supplements: adjustStock(d.supplements, sup.id, -quantity),
        }));
        sync(api.post('/dose-logs', log));
        return id;
      },
      logSkipped: ({ sup, date, index, slot, reason }) => {
        const id = uid();
        const log: DoseLog = { id, supplementId: sup.id, date, slot, doseIndex: index, status: 'skipped', quantity: 0, skipReason: reason };
        up((d) => ({
          ...d,
          doseLogs: [...d.doseLogs.filter((l) => !(l.supplementId === sup.id && l.date === date && l.doseIndex === index && l.status === 'skipped')), log],
        }));
        sync(api.post('/dose-logs', log));
        return id;
      },
      removeLog: (id) => {
        up((d) => {
          const log = d.doseLogs.find((l) => l.id === id);
          if (!log) return d;
          return {
            ...d,
            doseLogs: d.doseLogs.filter((l) => l.id !== id),
            supplements: log.status === 'taken' ? adjustStock(d.supplements, log.supplementId, log.quantity) : d.supplements,
          };
        });
        sync(api.del(`/dose-logs/${id}`));
      },
      updateLogTime: (id, takenAt) => {
        up((d) => ({ ...d, doseLogs: d.doseLogs.map((l) => (l.id === id ? { ...l, takenAt } : l)) }));
        sync(api.patch(`/dose-logs/${id}`, { takenAt }));
      },
      saveMeal: async (m) => {
        up((d) => ({ ...d, meals: d.meals.some((x) => x.id === m.id) ? d.meals.map((x) => (x.id === m.id ? m : x)) : [...d.meals, m] }));
        await sync(api.put(`/meals/${m.id}`, m));
      },
      deleteMeal: (id) => {
        up((d) => ({ ...d, meals: d.meals.filter((m) => m.id !== id) }));
        sync(api.del(`/meals/${id}`));
      },
      setWater: (date, ml) => {
        const v = Math.max(0, ml);
        up((d) => ({ ...d, water: { ...d.water, [date]: v } }));
        window.clearTimeout(waterTimers.current[date]);
        waterTimers.current[date] = window.setTimeout(() => sync(api.patch(`/daily/${date}`, { waterMl: v })), 500);
      },
      addWeight: (date, kg) => {
        const id = uid();
        up((d) => ({
          ...d,
          weights: [...d.weights.filter((w) => w.date !== date), { id, date, kg }],
          settings: { ...d.settings, profile: { ...d.settings.profile, weightKg: kg } },
        }));
        sync(api.post('/weights', { id, date, kg }));
        const profile = latest.current?.data.settings.profile ?? {};
        sync(api.patch('/me', { settings: cleanSettings({ profile: { ...profile, weightKg: kg } }) }));
      },
      deleteWeight: (id) => {
        up((d) => ({ ...d, weights: d.weights.filter((w) => w.id !== id) }));
        sync(api.del(`/weights/${id}`));
      },
      setTraining: (date, on) => {
        up((d) => ({ ...d, training: { ...d.training, [date]: on } }));
        sync(api.patch(`/daily/${date}`, { training: on }));
      },
      updateSettings: (patch) => {
        up((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
        settingsPending.current = { ...settingsPending.current, ...patch };
        window.clearTimeout(settingsTimer.current);
        settingsTimer.current = window.setTimeout(() => {
          const body = settingsPending.current;
          settingsPending.current = {};
          sync(api.patch('/me', { settings: cleanSettings(body) }));
        }, 600);
      },
      setAi: (patch) => up((d) => ({ ...d, ai: { ...d.ai, ...patch } })),
      addChatLocal: (m) => up((d) => ({ ...d, chat: [...d.chat, m].slice(-60) })),
      clearChat: () => {
        up((d) => ({ ...d, chat: [] }));
        sync(api.del('/ai/chat'));
      },
      completeOnboarding: async (patch) => {
        const r = await api.patch<{ user: User; settings: Settings }>('/me', { onboarded: true, settings: cleanSettings(patch) });
        setUser(r.user);
        setBoot((b) => (b ? { ...b, user: r.user, data: { ...b.data, settings: r.settings } } : b));
      },
      completeTour: async () => {
        const r = await api.patch<{ user: User }>('/me', { tourSeen: true });
        setUser(r.user);
        setBoot((b) => (b ? { ...b, user: r.user } : b));
      },
      importBackup: async (json) => {
        const r = await api.post<{ imported: Record<string, number>; skipped: number }>('/data/import', json);
        await reload();
        return r;
      },
      clearAllData: async () => {
        await api.del('/data');
        await reload();
      },
      deleteAccount: async () => {
        await api.del('/me');
        await logout();
      },
      reload,
    }),
    [up, sync, reload, setUser, logout],
  );

  if (!boot) {
    return loadError ? (
      <Splash message={loadError} action={{ label: 'Try again', onClick: () => reload().catch(() => {}) }} />
    ) : (
      <Splash />
    );
  }

  return (
    <Ctx.Provider value={{ data: boot.data, actions, server: boot.server, user: boot.user, syncError, saveError: syncError }}>
      {children}
    </Ctx.Provider>
  );
}

/** Drop undefined/empty values the API would reject. */
function cleanSettings(s: Partial<Settings>): Partial<Settings> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) {
    if (v === undefined) continue;
    if (k === 'profile' && v && typeof v === 'object') {
      out.profile = Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined && x !== null && x !== ''));
    } else out[k] = v;
  }
  return out as Partial<Settings>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be used inside AppProvider');
  return c;
}
