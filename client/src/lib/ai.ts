/** AI features call the FitStack server, which holds the OpenAI key. */
import { api, ApiError } from './api';
import type { ChatMsg, MealLog } from './types';

export { ApiError as AiError };

export type MealAnalysis = Pick<MealLog, 'foodItems' | 'calories' | 'proteinG' | 'carbsG' | 'fatG' | 'fiberG' | 'sugarG' | 'sodiumMg' | 'aiConfidence' | 'notes'>;

export const analyzeMeal = (dataUrl: string, hint: string) => api.post<MealAnalysis>('/ai/analyze-meal', { dataUrl, hint });
export const coachSummary = (context: string) => api.post<{ summary: string; summaryAt: string }>('/ai/summary', { context });
export const stackTips = (context: string) => api.post<{ tips: string; tipsAt: string }>('/ai/tips', { context });
export const coachChat = (message: string, context: string) => api.post<{ question: ChatMsg; answer: ChatMsg }>('/ai/chat', { message, context });
