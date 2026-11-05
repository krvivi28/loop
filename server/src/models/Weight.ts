import { Schema, model } from 'mongoose';
import { toClientJSON } from './plugins.js';

const weightSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    kg: { type: Number, required: true, min: 20, max: 400 },
  },
  { timestamps: true },
);
weightSchema.index({ userId: 1, date: 1 }, { unique: true });
toClientJSON(weightSchema);

export const Weight = model('Weight', weightSchema);
