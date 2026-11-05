import { Schema, model } from 'mongoose';
import { newId } from '../utils/id.js';

/** Compressed JPEG/PNG/WebP photos (~100–300 KB each), owned by one user. */
const photoSchema = new Schema(
  {
    _id: { type: String, default: newId },
    userId: { type: String, required: true, index: true },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true },
    size: Number,
  },
  { timestamps: true, versionKey: false },
);

export const Photo = model('Photo', photoSchema);
