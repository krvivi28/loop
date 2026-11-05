import { Schema, model } from 'mongoose';
import { SLOTS } from './User.js';
import { toClientJSON } from './plugins.js';

const doseLogSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    supplementId: { type: String, required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    slot: { type: String, enum: SLOTS, required: true },
    doseIndex: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['taken', 'skipped'], required: true },
    takenAt: Date,
    quantity: { type: Number, default: 0 },
    skipReason: { type: String, maxlength: 60 },
    extra: Boolean,
  },
  { timestamps: true },
);
doseLogSchema.index({ userId: 1, date: 1 });
doseLogSchema.index({ userId: 1, supplementId: 1, date: 1, doseIndex: 1 });
toClientJSON(doseLogSchema);

export const DoseLog = model('DoseLog', doseLogSchema);
