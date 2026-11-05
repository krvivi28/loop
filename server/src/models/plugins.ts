import type { Schema } from 'mongoose';

/** Expose `_id` as `id`, hide internal fields in API responses. */
export function toClientJSON(schema: Schema) {
  schema.set('toJSON', {
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.userId;
      delete ret.createdAt;
      delete ret.updatedAt;
      return ret;
    },
  });
}
