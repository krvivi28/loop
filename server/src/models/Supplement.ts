import { Schema, model } from 'mongoose';
import { SLOTS } from './User.js';

export const FORMS = ['tablet', 'capsule', 'scoop', 'liquid', 'drops', 'gummy', 'injection'] as const;
export const FOOD = ['before', 'with', 'after', 'empty_stomach', 'none'] as const;

const doseSchema = new Schema(
  {
    slot: { type: String, enum: SLOTS, required: true },
    time: { type: String, match: /^\d{2}:\d{2}$/ },
    quantity: { type: Number, required: true, min: 0.1 },
  },
  { _id: false },
);

const supplementSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    category: { type: String, required: true, maxlength: 40 },
    form: { type: String, enum: FORMS, required: true },
    doses: { type: [doseSchema], validate: (v: unknown[]) => v.length > 0 && v.length <= 8 },
    foodInstruction: { type: String, enum: FOOD, default: 'none' },
    schedule: {
      type: { type: String, enum: ['daily', 'weekdays', 'workout_days'], default: 'daily' },
      weekdays: { type: [Number], default: undefined },
    },
    startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    endDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    stock: { type: Number, min: 0 },
    color: { type: String, default: '#FF6B00' },
    photoId: String,
    notes: { type: String, maxlength: 500 },
    status: { type: String, enum: ['active', 'paused', 'archived'], default: 'active' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);
// keep createdAt for the client
supplementSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, ret: Record<string, unknown>) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.userId;
    delete ret.updatedAt;
    return ret;
  },
});

export const Supplement = model('Supplement', supplementSchema);
