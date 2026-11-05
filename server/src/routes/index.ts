import { Router } from 'express';
import * as ai from '../controllers/ai.controller.js';
import * as auth from '../controllers/auth.controller.js';
import * as data from '../controllers/data.controller.js';
import * as doseLogs from '../controllers/doseLogs.controller.js';
import * as me from '../controllers/me.controller.js';
import * as meals from '../controllers/meals.controller.js';
import * as photos from '../controllers/photos.controller.js';
import * as sups from '../controllers/supplements.controller.js';
import * as tracking from '../controllers/tracking.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter, authLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { ah } from '../utils/asyncHandler.js';
import * as v from '../validators/schemas.js';

export const api = Router();

api.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ---- Auth (phone + one-time code; same flow for sign up and log in) ----
const authR = Router();
authR.post('/request-otp', authLimiter, validate(v.requestOtpSchema), ah(auth.requestOtp));
authR.post('/verify-otp', authLimiter, validate(v.verifyOtpSchema), ah(auth.verifyOtp));
authR.post('/email', authLimiter, validate(v.emailAuthSchema), ah(auth.emailAuth));
authR.get('/google', ah(auth.googleStart));
authR.get('/google/callback', ah(auth.googleCallback));
authR.post('/logout', ah(auth.logout));
api.use('/auth', authR);

// Everything below needs a session.
api.use(requireAuth);

api.get('/bootstrap', ah(me.getBootstrap));

const meR = Router();
meR.get('/', ah(me.getMe));
meR.patch('/', validate(v.mePatchSchema), ah(me.patchMe));
meR.delete('/', ah(me.deleteMe));
meR.post('/categories', validate(v.categorySchema), ah(me.addCategory));
api.use('/me', meR);

const supR = Router();
supR.get('/', ah(sups.list));
supR.post('/', validate(v.supplementSchema), ah(sups.upsert));
supR.put('/:id', validate(v.supplementSchema), ah(sups.upsert));
supR.patch('/:id/status', validate(v.statusSchema), ah(sups.setStatus));
supR.delete('/:id', ah(sups.remove));
api.use('/supplements', supR);

const logR = Router();
logR.get('/', ah(doseLogs.list));
logR.post('/', validate(v.doseLogSchema), ah(doseLogs.create));
logR.post('/bulk', validate(v.doseLogBulkSchema), ah(doseLogs.createBulk));
logR.patch('/:id', validate(v.doseLogPatchSchema), ah(doseLogs.updateTime));
logR.delete('/:id', ah(doseLogs.remove));
api.use('/dose-logs', logR);

const mealR = Router();
mealR.get('/', ah(meals.list));
mealR.post('/', validate(v.mealSchema), ah(meals.upsert));
mealR.put('/:id', validate(v.mealSchema), ah(meals.upsert));
mealR.delete('/:id', ah(meals.remove));
api.use('/meals', mealR);

const photoR = Router();
photoR.post('/', validate(v.photoUploadSchema), ah(photos.upload));
photoR.get('/:id', ah(photos.get));
photoR.delete('/:id', ah(photos.remove));
api.use('/photos', photoR);

api.patch('/daily/:date', validate(v.dailyPatchSchema), ah(tracking.patchDaily));

const wR = Router();
wR.post('/', validate(v.weightSchema), ah(tracking.upsertWeight));
wR.delete('/:id', ah(tracking.deleteWeight));
api.use('/weights', wR);

const aiR = Router();
aiR.get('/status', ai.status);
aiR.get('/chat', ah(ai.getChat));
aiR.delete('/chat', ah(ai.clearChat));
aiR.post('/analyze-meal', aiLimiter, validate(v.analyzeMealSchema), ah(ai.analyzeMeal));
aiR.post('/summary', aiLimiter, validate(v.contextSchema), ah(ai.summary));
aiR.post('/tips', aiLimiter, validate(v.contextSchema), ah(ai.tips));
aiR.post('/chat', aiLimiter, validate(v.chatSchema), ah(ai.chat));
api.use('/ai', aiR);

const dataR = Router();
dataR.get('/export', ah(data.exportData));
dataR.post('/import', ah(data.importData));
dataR.delete('/', ah(data.clearData));
api.use('/data', dataR);
