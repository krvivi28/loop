import { Award, BarChart3, Flame, Lock, Plus, Scale, Trash2, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar as RBar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { Ring } from '../components/Ring';
import { Sheet } from '../components/Sheet';
import { Chip, Empty, PageTitle, SectionTitle } from '../components/ui';
import { FORMS, SLOTS } from '../lib/constants';
import { addDays, dow, formatShort, formatTime, rangeKeys, relativeDay, todayKey } from '../lib/dates';
import { dueDosesFor, stockInfo } from '../lib/schedule';
import { badges, dayStats, mealsOn, nutritionTotals, rangeStats, streaks, targetsFor, timingDrift, weeklyTrend } from '../lib/stats';
import type { Slot } from '../lib/types';
import { useApp } from '../state/AppContext';

const RANGES = [
  { id: '1', label: 'Today', days: 1 },
  { id: '7', label: '7 days', days: 7 },
  { id: '30', label: '30 days', days: 30 },
  { id: '90', label: '90 days', days: 90 },
  { id: 'custom', label: 'Custom', days: 0 },
];

const STATUS_COLORS = { Taken: 'rgb(var(--good))', Skipped: 'rgb(var(--muted))', Missed: 'rgb(var(--bad))' };

export default function Stats() {
  const { data } = useApp();
  const today = todayKey();
  const [range, setRange] = useState('7');
  const [custom, setCustom] = useState({ start: addDays(today, -13), end: today });
  const [dayOpen, setDayOpen] = useState<string | null>(null);

  const { start, end } = range === 'custom' ? custom : { start: addDays(today, -(Number(range) - 1)), end: today };
  const r = useMemo(() => rangeStats(data, start, end), [data, start, end]);
  const s = useMemo(() => streaks(data), [data]);
  const trend = useMemo(() => weeklyTrend(data, 8), [data]);
  const drift = useMemo(() => timingDrift(data, start, end), [data, start, end]);
  const heatStart = useMemo(() => {
    const s0 = addDays(today, -7 * 15 + 1);
    return addDays(s0, -((dow(s0) + 6) % 7)); // align to Monday
  }, [today]);
  const heat = useMemo(() => dayStats(data, rangeKeys(heatStart, today)), [data, heatStart, today]);
  const bdg = useMemo(() => badges(data), [data]);
  const rangeLabel = RANGES.find((x) => x.id === range)?.label ?? 'Custom';
  const singleDay = start === end;
  const macroDays = useMemo(
    () =>
      singleDay
        ? []
        : rangeKeys(start, end).map((d) => {
            const n = nutritionTotals(mealsOn(data, d));
            const t = targetsFor(data, d);
            return { label: formatShort(d), kcal: n.calories, protein: n.proteinG, kcalT: t.calories, proteinT: t.proteinG, fat: n.fatG, fatT: t.fatG };
          }),
    [data, start, end, singleDay],
  );
  const dayMacros = useMemo(() => {
    if (!singleDay) return null;
    const n = nutritionTotals(mealsOn(data, start));
    return [
      { name: 'Protein', value: n.proteinG, color: '#FF4081' },
      { name: 'Carbs', value: n.carbsG, color: '#FFC107' },
      { name: 'Fat', value: n.fatG, color: '#29B6F6' },
    ].filter((x) => x.value > 0);
  }, [data, start, singleDay]);

  if (!data.supplements.length) {
    return (
      <>
        <PageTitle title="Stats" />
        <Empty icon={<BarChart3 size={30} />} title="No stats yet" body="Add items to your stack and log a few doses. Your charts build up from there." />
        <Badges list={bdg} />
        <WeightCard />
      </>
    );
  }

  const pie = [
    { name: 'Taken', value: r.taken },
    { name: 'Skipped', value: r.skipped },
    { name: 'Missed', value: r.missed },
  ].filter((x) => x.value > 0);
  const adherencePct = r.adherence === null ? null : Math.round(r.adherence * 100);
  const lows = data.supplements.filter((x) => x.status === 'active' && stockInfo(x, data));

  return (
    <>
      <PageTitle title="Stats" />

      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
        {RANGES.map((x) => <Chip key={x.id} on={range === x.id} onClick={() => setRange(x.id)}>{x.label}</Chip>)}
      </div>
      {range === 'custom' && (
        <div className="mb-5 grid max-w-md grid-cols-2 gap-3">
          <input type="date" className="input" value={custom.start} max={custom.end} onChange={(e) => e.target.value && setCustom({ ...custom, start: e.target.value })} />
          <input type="date" className="input" value={custom.end} min={custom.start} max={today} onChange={(e) => e.target.value && setCustom({ ...custom, end: e.target.value })} />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {singleDay ? (
          <section className="card md:col-span-2">
            <SectionTitle>Today's macros</SectionTitle>
            {!dayMacros || dayMacros.length === 0 ? (
              <p className="py-10 text-center text-muted">Log a meal on the Food tab to see this.</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={dayMacros} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={3} stroke="none" cornerRadius={6}>
                        {dayMacros.map((p) => <Cell key={p.name} fill={p.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v} g`, 'grams']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-2">
                  {dayMacros.map((p) => (
                    <li key={p.name} className="flex items-center gap-2.5">
                      <span className="h-3.5 w-3.5 rounded" style={{ background: p.color }} />
                      <span className="w-16 text-muted">{p.name}</span>
                      <span className="h-display text-[24px]">{p.value}g</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ) : (
          <>
            <TrendCard title={`Calories, ${rangeLabel.toLowerCase()}`} data={macroDays} k="kcal" t="kcalT" unit="kcal" color="rgb(var(--accent))" />
            <TrendCard title={`Protein, ${rangeLabel.toLowerCase()}`} data={macroDays} k="protein" t="proteinT" unit="g" color="#FF4081" />
            <TrendCard title={`Fat, ${rangeLabel.toLowerCase()}`} data={macroDays} k="fat" t="fatT" unit="g" color="#29B6F6" />
          </>
        )}

        {/* Adherence gauge */}
        <section className="card flex items-center gap-5">
          <Ring value={(adherencePct ?? 0) / 100} size={150} stroke={16} glow>
            <div className="h-display text-[46px]">{adherencePct ?? '–'}<span className="text-2xl text-muted">%</span></div>
            <div className="text-xs font-semibold text-muted">adherence</div>
          </Ring>
          <div className="space-y-3">
            <Big icon={<Flame size={18} />} v={s.current} l="Current streak" />
            <Big icon={<Trophy size={18} />} v={s.best} l="Best streak" />
            {r.worstSlot && (
              <p className="text-[14px] text-muted">
                You miss <strong className="text-ink">{SLOTS[r.worstSlot as Slot].label.toLowerCase()}</strong> doses most often.
              </p>
            )}
          </div>
        </section>

        {/* Pie */}
        <section className="card">
          <SectionTitle>Taken vs missed</SectionTitle>
          {pie.length === 0 ? (
            <p className="py-10 text-center text-muted">No doses due yet in this period.</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={3} stroke="none" cornerRadius={6}>
                      {pie.map((p) => <Cell key={p.name} fill={STATUS_COLORS[p.name as keyof typeof STATUS_COLORS]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {(['Taken', 'Skipped', 'Missed'] as const).map((k) => (
                  <li key={k} className="flex items-center gap-2.5">
                    <span className="h-3.5 w-3.5 rounded" style={{ background: STATUS_COLORS[k] }} />
                    <span className="w-16 text-muted">{k}</span>
                    <span className="h-display text-[24px]">{k === 'Taken' ? r.taken : k === 'Skipped' ? r.skipped : r.missed}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Per supplement days */}
        <section className="card md:col-span-2">
          <SectionTitle>Days taken per item</SectionTitle>
          <div style={{ height: Math.max(140, r.perSupp.length * 46) }}>
            <ResponsiveContainer>
              <BarChart data={r.perSupp} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid horizontal={false} stroke="rgb(var(--line) / 0.5)" />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgb(var(--raised) / 0.5)' }} formatter={(v: number, n: string) => [v, n === 'fullDays' ? 'Days fully taken' : 'Days scheduled']} />
                <RBar dataKey="scheduledDays" fill="rgb(var(--line))" radius={[0, 8, 8, 0]} barSize={14} />
                <RBar dataKey="fullDays" radius={[0, 8, 8, 0]} barSize={14}>
                  {r.perSupp.map((p) => <Cell key={p.id} fill={p.color} />)}
                </RBar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted">Grey bar: days scheduled. Colored bar: days you took every dose.</p>
        </section>

        {/* Share donut */}
        <section className="card">
          <SectionTitle>Share of doses taken</SectionTitle>
          {r.taken === 0 ? (
            <p className="py-10 text-center text-muted">Log doses to see this.</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={r.perSupp.filter((p) => p.taken)} dataKey="taken" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none" cornerRadius={5}>
                      {r.perSupp.filter((p) => p.taken).map((p) => <Cell key={p.id} fill={p.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="min-w-0 space-y-1.5 text-[14.5px]">
                {r.perSupp.filter((p) => p.taken).map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.color }} />
                    <span className="truncate">{p.name}</span>
                    <span className="ml-auto font-bold">{Math.round((p.taken / r.taken) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Weekly trend */}
        <section className="card">
          <SectionTitle>Weekly adherence</SectionTitle>
          <div className="h-48">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 8, right: 12, left: -18 }}>
                <CartesianGrid vertical={false} stroke="rgb(var(--line) / 0.5)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} unit="%" />
                <Tooltip formatter={(v: number) => [`${v}%`, 'Adherence']} />
                <Line type="monotone" dataKey="pct" stroke="rgb(var(--accent))" strokeWidth={3.5} dot={{ r: 4, fill: 'rgb(var(--accent))' }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Heatmap */}
        <section className="card md:col-span-2">
          <SectionTitle>Last 15 weeks</SectionTitle>
          <div className="no-scrollbar overflow-x-auto">
            <div className="grid w-max grid-flow-col grid-rows-7 gap-[5px]">
              {heat.map((d) => {
                const future = d.date > today;
                const bg = future || d.pct === null ? 'rgb(var(--raised))' : d.pct === 0 ? 'rgb(var(--bad) / 0.45)' : `rgb(var(--accent) / ${0.25 + d.pct * 0.75})`;
                return (
                  <button
                    key={d.date}
                    disabled={future}
                    onClick={() => setDayOpen(d.date)}
                    title={`${formatShort(d.date)}: ${d.due ? `${d.taken}/${d.due}` : 'nothing due'}`}
                    className={`h-[18px] w-[18px] rounded-[5px] transition hover:scale-125 md:h-[22px] md:w-[22px] ${d.date === today ? 'ring-2 ring-ink/70' : ''}`}
                    style={{ background: bg, opacity: future ? 0.35 : 1 }}
                    aria-label={`${formatShort(d.date)}, ${d.taken} of ${d.due} taken`}
                  />
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted">
            <span>Less</span>
            {[0.25, 0.5, 0.75, 1].map((a) => <span key={a} className="h-3.5 w-3.5 rounded" style={{ background: `rgb(var(--accent) / ${a})` }} />)}
            <span>All taken</span>
            <span className="ml-3 h-3.5 w-3.5 rounded" style={{ background: 'rgb(var(--bad) / 0.45)' }} />
            <span>None</span>
            <span className="ml-auto">Tap a day for details</span>
          </div>
        </section>

        {/* Timing scatter */}
        <section className="card md:col-span-2">
          <SectionTitle>What time you actually take them</SectionTitle>
          {r.scatter.length === 0 ? (
            <p className="py-8 text-center text-muted">Log doses to see your timing.</p>
          ) : (
            <>
              <div className="h-60">
                <ResponsiveContainer>
                  <ScatterChart margin={{ top: 8, right: 12, left: -12 }}>
                    <CartesianGrid stroke="rgb(var(--line) / 0.5)" />
                    <XAxis type="number" dataKey="x" name="Day" tickLine={false} axisLine={false} domain={[0, 'dataMax']} tickFormatter={(v: number) => formatShort(addDays(start, v))} allowDecimals={false} />
                    <YAxis type="number" dataKey="y" name="Time" domain={[0, 24]} ticks={[0, 6, 12, 18, 24]} reversed tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}:00`} />
                    <ZAxis range={[70, 70]} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(v: number, n: string) => (n === 'Time' ? [`${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}`, n] : [formatShort(addDays(start, v)), n])}
                    />
                    {r.perSupp.map((p) => (
                      <Scatter key={p.id} name={p.name} data={r.scatter.filter((x) => x.supId === p.id)} fill={p.color} />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
                {r.perSupp.map((p) => {
                  const dft = drift[p.id];
                  const avg = dft ? Math.round(dft.total / dft.n) : null;
                  return (
                    <span key={p.id} className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                      {p.name}
                      {avg !== null && (
                        <span className={`font-semibold ${Math.abs(avg) > 45 ? 'text-warn' : 'text-muted'}`}>
                          {Math.abs(avg) < 5 ? 'on time' : `${Math.abs(avg)} min ${avg > 0 ? 'late' : 'early'} on avg`}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Stock */}
        {lows.length > 0 && (
          <section className="card md:col-span-2">
            <SectionTitle>Stock</SectionTitle>
            <div className="grid gap-2.5 md:grid-cols-2">
              {lows.map((x) => {
                const info = stockInfo(x, data)!;
                const pct = Number.isFinite(info.daysLeft) ? Math.min(1, info.daysLeft / 30) : 1;
                return (
                  <div key={x.id} className="flex items-center gap-3">
                    <span className="w-32 truncate font-semibold">{x.name}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line/60">
                      <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: info.low ? 'rgb(var(--warn))' : x.color }} />
                    </div>
                    <span className={`w-28 text-right text-sm ${info.low ? 'font-bold text-warn' : 'text-muted'}`}>
                      {info.stock} {FORMS[x.form].many}{Number.isFinite(info.daysLeft) ? ` · ${info.daysLeft}d` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <Badges list={bdg} />
      <WeightCard />

      <DayDetail date={dayOpen} onClose={() => setDayOpen(null)} />
    </>
  );
}

function Big({ icon, v, l }: { icon: React.ReactNode; v: number; l: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">{icon}</span>
      <div>
        <div className="h-display text-[26px]">{v} <span className="text-base text-muted">{v === 1 ? 'day' : 'days'}</span></div>
        <div className="-mt-0.5 text-xs font-semibold text-muted">{l}</div>
      </div>
    </div>
  );
}

function TrendCard({ title, data, k, t, unit, color }: { title: string; data: Record<string, number | string>[]; k: string; t: string; unit: string; color: string }) {
  const target = data[data.length - 1]?.[t] as number;
  const hasData = data.some((d) => (d[k] as number) > 0);
  return (
    <section className="card">
      <SectionTitle>{title}</SectionTitle>
      {!hasData ? (
        <p className="py-10 text-center text-muted">Log meals on the Food tab to see this.</p>
      ) : (
        <div className="h-52">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 12, left: -14 }}>
              <CartesianGrid vertical={false} stroke="rgb(var(--line) / 0.5)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} domain={[0, (max: number) => Math.round(Math.max(max, target || 0) * 1.1)]} />
              <Tooltip formatter={(v: number, n: string) => [`${v} ${unit}`, n === k ? 'Eaten' : 'Target']} />
              <ReferenceLine y={target} stroke="rgb(var(--muted))" strokeDasharray="5 5" label={{ value: 'target', position: 'insideTopRight', fill: 'rgb(var(--muted))', fontSize: 11 }} />
              <Line type="monotone" dataKey={k} stroke={color} strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function Badges({ list }: { list: ReturnType<typeof badges> }) {
  return (
    <section className="mt-8">
      <SectionTitle>Badges</SectionTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {list.map((b) => (
          <div key={b.id} className={`card relative overflow-hidden p-3.5 ${b.earned ? 'border-accent/60' : ''}`}>
            <div className={`mb-2 flex h-11 w-11 items-center justify-center rounded-2xl ${b.earned ? 'bg-accent text-onaccent' : 'bg-raised text-muted'}`}>
              {b.earned ? <Award size={24} /> : <Lock size={20} />}
            </div>
            <div className="font-display text-[18px] font-bold leading-tight">{b.name}</div>
            <div className="mt-0.5 text-[13px] leading-snug text-muted">{b.detail}</div>
            {!b.earned && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/60">
                <div className="h-full rounded-full bg-accent" style={{ width: `${b.progress * 100}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function WeightCard() {
  const { data, actions } = useApp();
  const [kg, setKg] = useState('');
  const [date, setDate] = useState(todayKey());
  const list = [...data.weights].sort((a, b) => a.date.localeCompare(b.date));
  const chart = list.slice(-30).map((w) => ({ label: formatShort(w.date), kg: w.kg }));
  const first = list[0]?.kg;
  const last = list[list.length - 1]?.kg;
  return (
    <section className="card mt-8">
      <SectionTitle right={last !== undefined && first !== undefined && list.length > 1 ? (
        <span className={`text-sm font-bold ${last - first > 0 ? 'text-accent' : 'text-good'}`}>{last - first > 0 ? '+' : ''}{(last - first).toFixed(1)} kg overall</span>
      ) : undefined}>
        <span className="inline-flex items-center gap-2"><Scale size={20} /> Body weight</span>
      </SectionTitle>
      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = parseFloat(kg);
          if (v > 20 && v < 400) {
            actions.addWeight(date, +v.toFixed(1));
            setKg('');
          }
        }}
      >
        <input type="number" step="0.1" inputMode="decimal" placeholder="kg" className="input w-28" value={kg} onChange={(e) => setKg(e.target.value)} />
        <input type="date" className="input w-44" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} />
        <button className="btn-accent" type="submit" disabled={!kg}><Plus size={18} /> Log weight</button>
      </form>
      {chart.length > 1 ? (
        <div className="h-48">
          <ResponsiveContainer>
            <LineChart data={chart} margin={{ top: 8, right: 12, left: -18 }}>
              <CartesianGrid vertical={false} stroke="rgb(var(--line) / 0.5)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number) => [`${v} kg`, 'Weight']} />
              <Line type="monotone" dataKey="kg" stroke="rgb(var(--accent))" strokeWidth={3} dot={{ r: 3.5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted">Log your weight on two or more days to see the trend.</p>
      )}
      {list.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {list.slice(-6).reverse().map((w) => (
            <li key={w.id} className="flex items-center gap-1 rounded-full bg-raised py-1 pl-3 pr-1 text-sm">
              {formatShort(w.date)}: <strong>{w.kg} kg</strong>
              <button className="ml-1 rounded-full p-1 text-muted hover:text-bad" onClick={() => actions.deleteWeight(w.id)} aria-label="Delete entry"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DayDetail({ date, onClose }: { date: string | null; onClose: () => void }) {
  const { data } = useApp();
  const doses = date ? dueDosesFor(data, date) : [];
  return (
    <Sheet open={!!date} onClose={onClose} title={date ? relativeDay(date) : ''}>
      {doses.length === 0 ? (
        <p className="py-4 text-muted">Nothing was scheduled this day.</p>
      ) : (
        <ul className="divide-y divide-line/60">
          {doses.map((d) => (
            <li key={`${d.sup.id}-${d.index}`} className="flex items-center gap-3 py-3">
              <span className="h-3 w-3 rounded-full" style={{ background: d.sup.color }} />
              <span className="flex-1">
                <span className="font-semibold">{d.sup.name}</span> <span className="text-muted">· {SLOTS[d.spec.slot].label}</span>
              </span>
              <span className={`text-sm font-bold ${d.status === 'taken' ? 'text-good' : d.status === 'skipped' ? 'text-muted' : d.status === 'missed' ? 'text-bad' : 'text-warn'}`}>
                {d.status === 'taken' ? `Taken ${d.takenLogs[0].takenAt ? formatTime(d.takenLogs[0].takenAt) : ''}` : d.status === 'skipped' ? `Skipped${d.skipLog?.skipReason ? ` (${d.skipLog.skipReason})` : ''}` : d.status === 'missed' ? 'Missed' : 'Not yet'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
