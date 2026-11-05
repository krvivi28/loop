import { Schema, model } from 'mongoose';
import { toClientJSON } from './plugins.js';

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'] as const;

const mealSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    mealType: { type: String, enum: MEAL_TYPES, required: true },
    loggedAt: { type: Date, required: true },
    photoId: String,
    foodItems: [{ _id: false, name: { type: String, maxlength: 80 }, quantity: { type: String, maxlength: 40 } }],
    calories: { type: Number, default: 0, min: 0 },
    proteinG: { type: Number, default: 0, min: 0 },
    carbsG: { type: Number, default: 0, min: 0 },
    fatG: { type: Number, default: 0, min: 0 },
    fiberG: { type: Number, min: 0 },
    sugarG: { type: Number, min: 0 },
    sodiumMg: { type: Number, min: 0 },
    source: { type: String, enum: ['ai', 'manual'], default: 'manual' },
    aiConfidence: { type: String, enum: ['low', 'medium', 'high'] },
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);
mealSchema.index({ userId: 1, date: 1 });
toClientJSON(mealSchema);

export const Meal = model('Meal', mealSchema);
