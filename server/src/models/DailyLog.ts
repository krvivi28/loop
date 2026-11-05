import { Schema, model } from 'mongoose';

/** Per-day values that aren't doses or meals: water and the training-day override. */
const dailySchema = new Schema(
  {
    userId: { type: String, required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    waterMl: { type: Number, min: 0 },
    training: Boolean,
  },
  { timestamps: true, versionKey: false },
);
dailySchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyLog = model('DailyLog', dailySchema);
