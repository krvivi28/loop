/** All OpenAI calls happen here, on the server. The API key never reaches the browser. */
import { aiConfigured, env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

type Content = string | ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } })[];
interface Msg { role: 'system' | 'user' | 'assistant'; content: Content }

const SAFETY = `You are Loop Coach, a friendly, concise fitness and nutrition assistant inside a personal tracking app.
Rules: give general information only, never medical advice. Never tell the user to start, stop or change the dose of a prescribed medicine; for anything about medicines, drug interactions or symptoms, tell them to ask their doctor or pharmacist.
Be specific to the user's data, use numbers, keep it short, use "- " bullet lines and **bold** sparingly.`;

async function chat(messages: Msg[], opts: { json?: boolean; maxTokens?: number } = {}) {
  if (!aiConfigured()) throw new HttpError(503, 'ai_not_configured', 'AI is not set up on the server. Add OPENAI_API_KEY to server/.env and restart.');
  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        messages,
        max_tokens: opts.maxTokens ?? 800,
        temperature: 0.4,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new HttpError(502, 'ai_unreachable', 'Could not reach OpenAI. Try again.');
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    console.error('OpenAI error', res.status, detail?.error?.message);
    if (res.status === 401) throw new HttpError(502, 'ai_bad_key', 'The server’s OpenAI key was rejected. Check OPENAI_API_KEY in server/.env.');
    if (res.status === 429) throw new HttpError(429, 'ai_rate_limited', 'OpenAI rate limit or quota reached. Wait a minute or check OpenAI billing.');
    if (res.status === 404) throw new HttpError(502, 'ai_bad_model', `OpenAI model "${env.OPENAI_MODEL}" was not found. Change OPENAI_MODEL in server/.env.`);
    throw new HttpError(502, 'ai_error', detail?.error?.message ?? `OpenAI returned an error (${res.status}).`);
  }
  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) throw new HttpError(502, 'ai_empty', 'OpenAI returned an empty answer. Try again.');
  return text;
}

const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
};

export async function analyzeMeal(dataUrl: string, hint: string) {
  const prompt = `Estimate the nutrition of the meal in this photo.${hint ? ` The user says: "${hint.replace(/"/g, "'")}".` : ''}
Assume typical Indian and international portion sizes when unclear.
Return ONLY a JSON object with exactly these keys:
{"food_items":[{"name":"","estimated_quantity":""}],"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0,"sugar_g":0,"sodium_mg":0,"confidence":"low|medium|high","notes":""}
If the photo does not contain food, return empty food_items, zeros, confidence "low" and explain in notes.`;
  const text = await chat(
    [
      { role: 'system', content: 'You are a precise nutrition estimator. You output strict JSON only.' },
      { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }] },
    ],
    { json: true, maxTokens: 600 },
  );
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    throw new HttpError(502, 'ai_bad_json', 'Could not read the AI result. Try again or enter values manually.');
  }
  const items = Array.isArray(j.food_items) ? (j.food_items as Record<string, unknown>[]) : [];
  const conf = String(j.confidence ?? 'low');
  return {
    foodItems: items.map((i) => ({ name: String(i.name ?? '').slice(0, 80), quantity: String(i.estimated_quantity ?? '').slice(0, 40) })).filter((i) => i.name),
    calories: num(j.calories),
    proteinG: num(j.protein_g),
    carbsG: num(j.carbs_g),
    fatG: num(j.fat_g),
    fiberG: num(j.fiber_g),
    sugarG: num(j.sugar_g),
    sodiumMg: num(j.sodium_mg),
    aiConfidence: ['low', 'medium', 'high'].includes(conf) ? conf : 'low',
    notes: j.notes ? String(j.notes).slice(0, 500) : undefined,
  };
}

export const coachSummary = (context: string) =>
  chat([
    { role: 'system', content: SAFETY },
    {
      role: 'user',
      content: `Here is my tracking data as JSON:\n${context}\n\nWrite my weekly insights: 4–6 bullet points covering supplement adherence (which ones and which time slots I miss), protein/calorie vs targets, water, and one concrete action for next week. Start directly with the bullets.`,
    },
  ]);

export const stackTips = (context: string) =>
  chat([
    { role: 'system', content: SAFETY },
    {
      role: 'user',
      content: `My current supplement/medicine stack and schedule (JSON):\n${context}\n\nGive general timing tips for these supplements (e.g. with food, spacing, pre/post workout), 1 bullet per item, max 6 bullets. For any item in the Medicine category, only say to follow the doctor's instructions.`,
    },
  ]);

export const coachChat = (context: string, history: { role: 'user' | 'assistant'; content: string }[]) =>
  chat([{ role: 'system', content: `${SAFETY}\n\nThe user's recent tracking data (JSON):\n${context}` }, ...history]);
