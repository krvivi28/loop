import { Schema, model, type InferSchemaType } from 'mongoose';
import { newId } from '../utils/id.js';

export const SLOTS = ['morning', 'afternoon', 'evening', 'night', 'pre_workout', 'post_workout'] as const;
export const GOALS = ['muscle_gain', 'fat_loss', 'maintenance', 'endurance'] as const;
export const DEFAULT_CATEGORIES = [
  'Medicine', 'Vitamin', 'Mineral', 'Protein', 'Pre-Workout', 'Creatine',
  'Omega-3 / Fish Oil', 'Probiotic', 'Herbal / Ayurvedic', 'Other',
];

const userSchema = new Schema(
  {
    _id: { type: String, default: newId },
    phone: { type: String, unique: true, sparse: true, index: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, select: false },
    googleId: { type: String, unique: true, sparse: true, index: true },
    onboarded: { type: Boolean, default: false },
    tourSeen: { type: Boolean, default: false },
    profile: {
      name: { type: String, trim: true, maxlength: 60 },
      weightKg: { type: Number, min: 20, max: 400 },
      heightCm: { type: Number, min: 50, max: 260 },
      goal: { type: String, enum: GOALS, default: 'muscle_gain' },
    },
    settings: {
      theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
      accentColor: { type: String, default: '#FF6B00' },
      targets: {
        calories: { type: Number, default: 2400 },
        proteinG: { type: Number, default: 140 },
        carbsG: { type: Number, default: 260 },
        fatG: { type: Number, default: 70 },
        waterMl: { type: Number, default: 3000 },
      },
      workoutDays: { type: [Number], default: [1, 2, 3, 4, 5] },
      notifications: { type: Boolean, default: false },
      notifySlots: {
        morning: { type: Boolean, default: true },
        afternoon: { type: Boolean, default: true },
        evening: { type: Boolean, default: true },
        night: { type: Boolean, default: true },
        pre_workout: { type: Boolean, default: true },
        post_workout: { type: Boolean, default: true },
      },
    },
    categories: { type: [String], default: () => [...DEFAULT_CATEGORIES] },
    ai: {
      summary: String,
      summaryAt: Date,
      tips: String,
      tipsAt: Date,
    },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: string };
export const User = model('User', userSchema);
