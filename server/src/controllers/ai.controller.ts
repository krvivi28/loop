import type { Request, Response } from 'express';
import { aiConfigured, env } from '../config/env.js';
import { ChatMessage, User } from '../models/index.js';
import * as ai from '../services/gemini.service.js';
import { parseDataUrl } from './photos.controller.js';

export function status(_req: Request, res: Response) {
  res.json({ configured: aiConfigured(), model: env.GEMINI_MODEL });
}

export async function analyzeMeal(req: Request, res: Response) {
  parseDataUrl(req.body.dataUrl); // validates type and size
  res.json(await ai.analyzeMeal(req.body.dataUrl, req.body.hint));
}

export async function summary(req: Request, res: Response) {
  const text = await ai.coachSummary(req.body.context);
  const at = new Date();
  await User.updateOne({ _id: req.userId }, { $set: { 'ai.summary': text, 'ai.summaryAt': at } });
  res.json({ summary: text, summaryAt: at.toISOString() });
}

export async function tips(req: Request, res: Response) {
  const text = await ai.stackTips(req.body.context);
  const at = new Date();
  await User.updateOne({ _id: req.userId }, { $set: { 'ai.tips': text, 'ai.tipsAt': at } });
  res.json({ tips: text, tipsAt: at.toISOString() });
}

export async function getChat(req: Request, res: Response) {
  res.json(await ChatMessage.find({ userId: req.userId }).sort({ at: 1 }).limit(60));
}

/** Saves the question, asks OpenAI with the last 12 messages, saves and returns the answer. */
export async function chat(req: Request, res: Response) {
  const history = await ChatMessage.find({ userId: req.userId }).sort({ at: -1 }).limit(11).lean();
  const messages = [...history.reverse().map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })), { role: 'user' as const, content: req.body.message }];
  const answer = await ai.coachChat(req.body.context, messages);
  const now = Date.now();
  const [q, a] = await ChatMessage.create([
    { userId: req.userId, role: 'user', content: req.body.message, at: new Date(now) },
    { userId: req.userId, role: 'assistant', content: answer, at: new Date(now + 1) },
  ]);
  res.json({ question: q.toJSON(), answer: a.toJSON() });
}

export async function clearChat(req: Request, res: Response) {
  await ChatMessage.deleteMany({ userId: req.userId });
  res.json({ ok: true });
}
