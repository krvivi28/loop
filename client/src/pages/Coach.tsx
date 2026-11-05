import { KeyRound, Loader2, MessageCircle, RefreshCw, Send, Sparkles, Trash2, Trophy } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, Tooltip, XAxis, YAxis, Bar as RBar, BarChart } from 'recharts';
import { Ring } from '../components/Ring';
import { AiText, Disclaimer, PageTitle, SectionTitle } from '../components/ui';
import { aiContext, stackContext } from '../lib/context';
import { addDays, fromKey, rangeKeys, todayKey } from '../lib/dates';
import { AiError, coachChat, coachSummary, stackTips } from '../lib/ai';
import { dailyScore, mealsOn, nutritionTotals, rangeStats, streaks, targetsFor } from '../lib/stats';
import { useApp } from '../state/AppContext';

const SUGGESTIONS = [
  'What did I eat most this week?',
  'How can I hit my protein target more often?',
  'Which supplement do I forget most?',
  'Give me a high-protein vegetarian dinner idea',
];

const ago = (iso?: string) => {
  if (!iso) return '';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

export default function Coach() {
  const { data, actions, server } = useApp();
  const keyOk = server.aiConfigured;
  const today = todayKey();
  const [loading, setLoading] = useState<'summary' | 'tips' | 'chat' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const chatEnd = useRef<HTMLDivElement>(null);

  const week = useMemo(() => {
    const r = rangeStats(data, addDays(today, -6), today);
    const days = rangeKeys(addDays(today, -6), today);
    const scores = days.map((d) => dailyScore(data, d));
    const proteinHit = days.filter((d) => nutritionTotals(mealsOn(data, d)).proteinG >= targetsFor(data, d).proteinG).length;
    const waterAvg = Math.round(days.reduce((s, d) => s + (data.water[d] ?? 0), 0) / 7);
    return {
      adherence: r.adherence === null ? null : Math.round(r.adherence * 100),
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / 7),
      scores: days.map((d, i) => ({ label: fromKey(d).toLocaleDateString(undefined, { weekday: 'short' }), score: scores[i] })),
      proteinHit, waterAvg,
      streak: streaks(data).current,
      best: r.perSupp[0]?.name,
    };
  }, [data, today]);

  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [data.chat.length, loading]);

  const run = async (kind: 'summary' | 'tips') => {
    setLoading(kind);
    setError(null);
    try {
      if (kind === 'summary') actions.setAi(await coachSummary(aiContext(data)));
      else actions.setAi(await stackTips(stackContext(data)));
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(null);
    }
  };

  const ask = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    setQ('');
    setError(null);
    actions.addChatLocal({ role: 'user', content, at: new Date().toISOString() });
    setLoading('chat');
    try {
      const { answer } = await coachChat(content, aiContext(data));
      actions.addChatLocal(answer);
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <PageTitle title="AI Coach" sub="Insights from your doses, meals and water." />

      {!keyOk && (
        <div className="card mb-5 flex items-center gap-4 border-accent/50">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent"><KeyRound size={24} /></div>
          <p className="flex-1 text-[15px]">AI is not set up on the server yet. Add <code className="font-semibold">OPENAI_API_KEY</code> to <code className="font-semibold">server/.env</code> and restart the server. Charts below work without it.</p>
        </div>
      )}

      {error && <div className="mb-5 rounded-2xl border border-bad/40 bg-bad/10 px-4 py-3 text-[15px]">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Weekly insights */}
        <section className="card md:col-span-2">
          <SectionTitle
            right={
              <button className="btn-soft min-h-[40px] text-[15px]" onClick={() => run('summary')} disabled={!keyOk || !!loading}>
                {loading === 'summary' ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
                {data.ai.summary ? 'Refresh insights' : 'Get insights'}
              </button>
            }
          >
            <span className="inline-flex items-center gap-2"><Sparkles size={20} className="text-accent" /> This week</span>
          </SectionTitle>
          {data.ai.summary ? (
            <>
              <AiText text={data.ai.summary} />
              <p className="mt-3 text-xs text-muted">Updated {ago(data.ai.summaryAt)}</p>
            </>
          ) : (
            <p className="text-muted">Tap “Get insights” for a summary of your last 7 days.</p>
          )}
        </section>

        {/* Report card */}
        <section className="card relative overflow-hidden md:col-span-2" aria-label="Weekly report card">
          <div className="pointer-events-none absolute -left-10 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: 'rgb(var(--accent) / 0.22)' }} />
          <SectionTitle right={<span className="text-xs text-muted">Screenshot to share</span>}>
            <span className="inline-flex items-center gap-2"><Trophy size={20} className="text-accent" /> Weekly report card</span>
          </SectionTitle>
          <div className="relative grid items-center gap-5 md:grid-cols-[auto_1fr]">
            <Ring value={week.avgScore / 100} size={140} stroke={13} glow>
              <div className="h-display text-[46px]">{week.avgScore}</div>
              <div className="text-xs font-semibold text-muted">avg score</div>
            </Ring>
            <div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Tile v={week.adherence === null ? '–' : `${week.adherence}%`} l="Dose adherence" />
                <Tile v={`${week.proteinHit}/7`} l="Protein days hit" />
                <Tile v={`${(week.waterAvg / 1000).toFixed(1)} L`} l="Avg water" />
                <Tile v={`${week.streak}`} l="Day streak" />
              </div>
              <div className="mt-4 h-20">
                <ResponsiveContainer>
                  <BarChart data={week.scores} margin={{ left: -30, right: 0, top: 4 }}>
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip formatter={(v: number) => [v, 'Score']} cursor={{ fill: 'rgb(var(--raised) / 0.5)' }} />
                    <RBar dataKey="score" fill="rgb(var(--accent))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Tips */}
        <section className="card md:col-span-2">
          <SectionTitle
            right={
              <button className="btn-soft min-h-[40px] text-[15px]" onClick={() => run('tips')} disabled={!keyOk || !!loading || !data.supplements.length}>
                {loading === 'tips' ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
                {data.ai.tips ? 'Refresh tips' : 'Get tips'}
              </button>
            }
          >
            Supplement timing tips
          </SectionTitle>
          {data.ai.tips ? <AiText text={data.ai.tips} /> : <p className="text-muted">General timing tips for the items in your stack.</p>}
        </section>

        {/* Chat */}
        <section className="card flex flex-col md:col-span-2">
          <SectionTitle
            right={data.chat.length > 0 && <button className="icon-btn" onClick={actions.clearChat} aria-label="Clear chat"><Trash2 size={18} /></button>}
          >
            <span className="inline-flex items-center gap-2"><MessageCircle size={20} className="text-accent" /> Ask the coach</span>
          </SectionTitle>
          <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            {data.chat.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="chip text-left text-[14px]" onClick={() => ask(s)} disabled={!keyOk}>{s}</button>
                ))}
              </div>
            )}
            {data.chat.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-[15.5px] text-onaccent">{m.content}</div>
              ) : (
                <div key={i} className="max-w-[92%] rounded-2xl rounded-bl-md bg-raised px-4 py-3"><AiText text={m.content} /></div>
              ),
            )}
            {loading === 'chat' && (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-raised px-4 py-3 text-muted"><Loader2 size={16} className="animate-spin" /> Thinking…</div>
            )}
            <div ref={chatEnd} />
          </div>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(q);
            }}
          >
            <input className="input" placeholder={keyOk ? 'Ask about your food, doses or training…' : 'AI is not set up on the server'} value={q} onChange={(e) => setQ(e.target.value)} disabled={!keyOk} />
            <button className="btn-accent w-12 px-0" type="submit" disabled={!keyOk || !q.trim() || !!loading} aria-label="Send"><Send size={19} /></button>
          </form>
        </section>
      </div>

      <div className="mt-6"><Disclaimer /></div>
    </>
  );
}

function Tile({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-2xl bg-raised/70 px-3 py-2.5">
      <div className="h-display text-[28px]">{v}</div>
      <div className="text-xs font-semibold text-muted">{l}</div>
    </div>
  );
}

