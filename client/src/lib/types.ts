export type Slot = 'morning' | 'afternoon' | 'evening' | 'night' | 'pre_workout' | 'post_workout';
export type Form = 'tablet' | 'capsule' | 'scoop' | 'liquid' | 'drops' | 'gummy' | 'injection';
export type FoodInstruction = 'before' | 'with' | 'after' | 'empty_stomach' | 'none';
export type ScheduleType = 'daily' | 'weekdays' | 'workout_days';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';
export type Goal = 'muscle_gain' | 'fat_loss' | 'maintenance' | 'endurance';

export interface DoseSpec {
  slot: Slot;
  time?: string; // "HH:MM"
  quantity: number;
}

export interface Supplement {
  id: string;
  name: string;
  category: string;
  form: Form;
  doses: DoseSpec[];
  foodInstruction: FoodInstruction;
  schedule: { type: ScheduleType; weekdays?: number[] }; // 0 = Sunday
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  stock?: number;
  color: string;
  photoId?: string;
  notes?: string;
  status: 'active' | 'paused' | 'archived';
  createdAt: string;
}

export interface DoseLog {
  id: string;
  supplementId: string;
  date: string;
  slot: Slot;
  doseIndex: number;
  status: 'taken' | 'skipped';
  takenAt?: string; // ISO
  quantity: number;
  skipReason?: string;
  extra?: boolean; // logged again after already taken
}

export interface FoodItem {
  name: string;
  quantity: string;
}

export interface MealLog {
  id: string;
  date: string;
  mealType: MealType;
  loggedAt: string;
  photoId?: string;
  foodItems: FoodItem[];
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  source: 'ai' | 'manual';
  aiConfidence?: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface WeightEntry {
  id: string;
  date: string;
  kg: number;
}

export interface Targets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
}

export interface Settings {
  theme: 'dark' | 'light';
  accentColor: string;
  profile: { name?: string; weightKg?: number; heightCm?: number; goal?: Goal };
  targets: Targets;
  workoutDays: number[];
  notifications: boolean;
  notifySlots: Record<Slot, boolean>;
}

export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  at: string;
}

export interface AiCache {
  summary?: string;
  summaryAt?: string;
  tips?: string;
  tipsAt?: string;
}

export interface User {
  id: string;
  phone?: string;
  phoneMasked?: string;
  email?: string;
  onboarded: boolean;
  tourSeen: boolean;
}

export interface ServerInfo {
  aiConfigured: boolean;
  aiModel: string;
}

export interface AppData {
  schemaVersion: number;
  supplements: Supplement[];
  doseLogs: DoseLog[];
  meals: MealLog[];
  water: Record<string, number>; // date -> ml
  weights: WeightEntry[];
  training: Record<string, boolean>; // date -> override
  categories: string[];
  settings: Settings;
  ai: AiCache;
  chat: ChatMsg[];
}
