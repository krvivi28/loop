import { Archive, ArchiveRestore, ChevronDown, Layers, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Confirm } from '../components/Sheet';
import { Empty, PageTitle, SuppAvatar } from '../components/ui';
import { FOOD_INSTRUCTIONS, FORMS, SLOTS, WEEKDAYS, unitLabel } from '../lib/constants';
import { stockInfo } from '../lib/schedule';
import type { Supplement } from '../lib/types';
import { useApp } from '../state/AppContext';
import { useToast } from '../state/Toast';
import { StackWizard } from './StackWizard';

export default function Stack() {
  const { data, actions } = useApp();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [wizard, setWizard] = useState<{ open: boolean; editing?: Supplement }>({ open: false });
  const [del, setDel] = useState<Supplement | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (params.get('new')) {
      setWizard({ open: true });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const live = data.supplements.filter((s) => s.status !== 'archived');
  const archived = data.supplements.filter((s) => s.status === 'archived');
  const cats = [...new Set(live.map((s) => s.category))].sort((a, b) => data.categories.indexOf(a) - data.categories.indexOf(b));

  return (
    <>
      <PageTitle
        title="My stack"
        sub={`${live.filter((s) => s.status === 'active').length} active`}
        right={<button className="btn-accent" onClick={() => setWizard({ open: true })}><Plus size={20} strokeWidth={3} /> Add</button>}
      />

      {live.length === 0 ? (
        <Empty
          icon={<Layers size={30} />}
          title="Nothing here yet"
          body="Add a supplement or medicine. You'll pick when you take it and how many, and it shows up on Today."
          action={<button className="btn-accent px-6" onClick={() => setWizard({ open: true })}><Plus size={20} /> Add first item</button>}
        />
      ) : (
        <div className="space-y-7">
          {cats.map((c) => (
            <section key={c}>
              <h2 className="h-display mb-3 text-[22px] text-muted">{c}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {live.filter((s) => s.category === c).map((s) => (
                  <ItemCard
                    key={s.id}
                    s={s}
                    onEdit={() => setWizard({ open: true, editing: s })}
                    onPause={() => {
                      actions.setSupplementStatus(s.id, s.status === 'paused' ? 'active' : 'paused');
                      toast(s.status === 'paused' ? `${s.name} resumed` : `${s.name} paused`);
                    }}
                    onArchive={() => {
                      actions.setSupplementStatus(s.id, 'archived');
                      toast(`${s.name} archived`, { action: { label: 'Undo', onClick: () => actions.setSupplementStatus(s.id, s.status) } });
                    }}
                    onDelete={() => setDel(s)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <section className="mt-8">
          <button className="btn-ghost -ml-3" onClick={() => setShowArchived(!showArchived)}>
            <ChevronDown size={20} className={`transition ${showArchived ? 'rotate-180' : ''}`} /> Archived ({archived.length})
          </button>
          {showArchived && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {archived.map((s) => (
                <div key={s.id} className="card flex items-center gap-3 opacity-70">
                  <SuppAvatar sup={s} size={40} />
                  <span className="flex-1 font-display text-lg font-bold">{s.name}</span>
                  <button className="icon-btn" onClick={() => actions.setSupplementStatus(s.id, 'active')} aria-label="Restore"><ArchiveRestore size={19} /></button>
                  <button className="icon-btn hover:text-bad" onClick={() => setDel(s)} aria-label="Delete"><Trash2 size={19} /></button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <StackWizard open={wizard.open} editing={wizard.editing} onClose={() => setWizard({ open: false })} />
      <Confirm
        open={!!del}
        onClose={() => setDel(null)}
        title={`Delete ${del?.name ?? ''}?`}
        body="This removes the item and all its dose history. Archive it instead if you want to keep your stats."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (del) {
            actions.deleteSupplement(del.id);
            toast(`${del.name} deleted`);
          }
        }}
      />
    </>
  );
}

function ItemCard({ s, onEdit, onPause, onArchive, onDelete }: { s: Supplement; onEdit: () => void; onPause: () => void; onArchive: () => void; onDelete: () => void }) {
  const { data } = useApp();
  const stock = stockInfo(s, data);
  const sched =
    s.schedule.type === 'daily' ? 'Every day' : s.schedule.type === 'workout_days' ? 'Training days' : (s.schedule.weekdays ?? []).map((w) => WEEKDAYS[w]).join(', ');
  return (
    <article className={`card relative overflow-hidden ${s.status === 'paused' ? 'opacity-60' : ''}`}>
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: s.color }} />
      <div className="flex items-start gap-3">
        <SuppAvatar sup={s} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-[22px] font-bold leading-tight">{s.name}</h3>
            {s.status === 'paused' && <span className="rounded-full bg-raised px-2 py-0.5 text-xs font-bold text-muted">Paused</span>}
          </div>
          <p className="mt-0.5 text-[14.5px] text-muted">
            {s.doses.map((d) => `${unitLabel(s.form, d.quantity)} ${SLOTS[d.slot].label.toLowerCase()}`).join(' · ')}
          </p>
          <p className="text-[14px] text-muted">
            {FORMS[s.form].label} · {FOOD_INSTRUCTIONS[s.foodInstruction]} · {sched}
            {s.endDate && ` · until ${s.endDate}`}
          </p>
        </div>
      </div>
      {stock && (
        <div className={`mt-3 rounded-xl px-3 py-2 text-[14px] font-semibold ${stock.low ? 'bg-warn/15 text-warn' : 'bg-raised text-muted'}`}>
          {stock.stock} {FORMS[s.form].many} left
          {Number.isFinite(stock.daysLeft) && ` · about ${stock.daysLeft} day${stock.daysLeft === 1 ? '' : 's'}`}
          {stock.low && ' · reorder soon'}
        </div>
      )}
      <div className="mt-3 flex gap-1 border-t border-line/60 pt-2">
        <button className="btn-ghost min-h-[40px] flex-1 px-2 text-[15px]" onClick={onEdit}><Pencil size={17} /> Edit</button>
        <button className="btn-ghost min-h-[40px] flex-1 px-2 text-[15px]" onClick={onPause}>
          {s.status === 'paused' ? <><Play size={17} /> Resume</> : <><Pause size={17} /> Pause</>}
        </button>
        <button className="icon-btn" onClick={onArchive} aria-label="Archive"><Archive size={18} /></button>
        <button className="icon-btn hover:text-bad" onClick={onDelete} aria-label="Delete"><Trash2 size={18} /></button>
      </div>
    </article>
  );
}
