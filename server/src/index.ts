import mongoose from 'mongoose';
import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { aiConfigured, env } from './config/env.js';

await connectDb();
const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`🚀 Loop API on http://localhost:${env.PORT}/api  (${env.NODE_ENV})`);
  console.log(`   SMS: ${env.SMS_PROVIDER}${env.SMS_PROVIDER === 'console' ? ' (login codes print here)' : ''}`);
  console.log(`   AI:  ${aiConfigured() ? `on (${env.GEMINI_MODEL})` : 'off: add GEMINI_API_KEY to server/.env'}`);
});

const shutdown = async (sig: string) => {
  console.log(`\n${sig} received, shutting down…`);
  server.close();
  await mongoose.disconnect();
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
