import { Schema, model } from 'mongoose';
import { newId } from '../utils/id.js';

const chatSchema = new Schema(
  {
    _id: { type: String, default: newId },
    userId: { type: String, required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 8000 },
    at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);
chatSchema.index({ userId: 1, at: 1 });
chatSchema.set('toJSON', {
  transform: (_d, ret: Record<string, unknown>) => ({ role: ret.role, content: ret.content, at: ret.at }),
});

export const ChatMessage = model('ChatMessage', chatSchema);
