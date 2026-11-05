import { HardDriveUpload, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { clearLegacy, dismissLegacy, legacyData, legacyPhotos } from '../lib/legacy';
import { useApp } from '../state/AppContext';
import { useToast } from '../state/Toast';

/** Offers to move data from the old browser-only version into the new account (shown once, on an empty account). */
export function LegacyImport() {
  const { data, actions } = useApp();
  const toast = useToast();
  const [legacy] = useState(legacyData);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!legacy || hidden || data.supplements.length || data.meals.length) return null;

  const counts = ['supplements', 'doseLogs', 'meals'].map((k) => (Array.isArray(legacy[k]) ? (legacy[k] as unknown[]).length : 0));

  const run = async () => {
    setBusy(true);
    try {
      const photos = await legacyPhotos();
      const r = await actions.importBackup({ app: 'fitstack', data: legacy, photos });
      clearLegacy();
      setHidden(true);
      toast(`Moved ${r.imported.supplements} items, ${r.imported.doseLogs} dose logs and ${r.imported.meals} meals to your account`);
    } catch (e) {
      toast((e as Error).message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card mb-5 border-accent/60">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent"><HardDriveUpload size={22} /></span>
        <div className="flex-1">
          <h2 className="h-display text-[22px]">Bring your old data along</h2>
          <p className="mt-1 text-[15px] text-muted">
            This browser still has data from the offline version: {counts[0]} items, {counts[1]} dose logs and {counts[2]} meals. Move it into your account?
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button className="btn-accent flex-1" onClick={run} disabled={busy}>{busy && <Loader2 size={18} className="animate-spin" />} Move to my account</button>
        <button className="btn-ghost" onClick={() => { dismissLegacy(); setHidden(true); }} disabled={busy}>Not now</button>
      </div>
    </section>
  );
}
