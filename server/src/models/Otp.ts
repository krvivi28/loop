import { Schema, model } from 'mongoose';

/** One pending login code per phone. Expires automatically (TTL index). */
const otpSchema = new Schema(
  {
    phone: { type: String, required: true, unique: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    sentAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = model('Otp', otpSchema);
