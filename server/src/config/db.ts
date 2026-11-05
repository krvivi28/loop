import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => console.log('✅ MongoDB reconnected'));
  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log(`✅ MongoDB connected (${mongoose.connection.name})`);
  } catch (e) {
    console.error('❌ Could not connect to MongoDB:', (e as Error).message);
    console.error('   Is MongoDB running? Check MONGODB_URI in server/.env');
    process.exit(1);
  }
}
