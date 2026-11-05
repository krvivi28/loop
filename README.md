# FitStack

Supplement, medicine and nutrition tracker with phone-number login.

- **client/**: React + TypeScript + Vite app (mobile-first PWA)
- **server/**: Node.js + Express + TypeScript API, MongoDB (Mongoose), OpenAI calls

```
Browser ──/api──► Express API ──► MongoDB
                       └────────► OpenAI (key stays on the server)
```

## 1. What you need

- **Node.js 18+** (LTS from https://nodejs.org)
- **MongoDB**, any one of:
  - **Docker:** `docker compose up -d` in this folder (uses `docker-compose.yml`)
  - **Local install:** MongoDB Community Server from https://www.mongodb.com/try/download/community
  - **MongoDB Atlas** (free cloud tier): create a cluster, a database user, allow your IP, copy the `mongodb+srv://…` connection string

## 2. Set up

```bash
npm run setup                      # installs root, server and client packages
cp server/.env.example server/.env # Windows: copy server\.env.example server\.env
```

Edit **server/.env**:

| Setting | What to put |
|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/fitstack` for Docker/local, or your Atlas string |
| `JWT_SECRET`, `OTP_SECRET` | Two different long random strings. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `OPENAI_API_KEY` | The key from the file on your desktop |
| `SMS_PROVIDER` | `console` for now (login codes print in the terminal) |

## 3. Run

```bash
npm run dev
```

This starts the API on http://localhost:4000 and the app on **http://localhost:5173**. Open the app, enter your mobile number, and use the 6-digit code. In development the code is shown on screen and printed in the terminal.

**Phone on the same Wi-Fi:** open the *Network* address Vite prints (e.g. `http://192.168.1.20:5173`). Login works there too, because Vite forwards `/api` to the server.

**Already used the offline version?** Log in from the same browser and the Today screen offers **Move to my account**, which uploads your old stack, logs, meals and photos.

## How login works

One flow for both sign up and log in, with no password:

1. `POST /api/auth/request-otp { phone }`: the number is normalized to E.164 (10-digit numbers get `+91`). A 6-digit code is generated, stored only as an HMAC hash, and expires in 5 minutes. A new code can be requested every 30 s.
2. `POST /api/auth/verify-otp { phone, code }`: 5 wrong tries invalidates the code. On success the user is created if new (sign up), and a signed session token is set as an **httpOnly cookie** (30 days).
3. New users see the profile setup screen (name, weight, height, goal → suggested targets). After that they land on Today.

Login routes are rate-limited per IP; AI routes per user.

### Sending real SMS

Set in `server/.env`:

```
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_FROM=+1xxxxxxxxxx
```

For an Indian SMS provider (MSG91, Gupshup, AWS SNS…), add a branch in `server/src/services/sms.service.ts`. Note that SMS to Indian numbers needs DLT-registered templates with most providers.

## Database (MongoDB collections)

| Collection | Holds | Key indexes |
|---|---|---|
| `users` | phone, profile (name, weight, height, goal), settings (theme, accent, targets, training days, reminders), categories, cached AI insights | `phone` unique |
| `otps` | pending login code hash, attempts | `phone` unique, TTL on `expiresAt` |
| `supplements` | name, category, form, doses (slot, time, quantity), food instruction, schedule, dates, stock, color, photo | `userId` |
| `doselogs` | taken/skipped per dose per day, time, quantity, skip reason | `userId+date`, `userId+supplementId+date+doseIndex` |
| `meals` | meal type, time, food items, calories and macros, AI confidence, photo | `userId+date` |
| `photos` | compressed image bytes (≤ 3 MB), owner | `userId` |
| `dailylogs` | water ml and training-day override per date | `userId+date` unique |
| `weights` | body weight per date | `userId+date` unique |
| `chatmessages` | AI Coach conversation | `userId+at` |

Every query is scoped by `userId`, so one user can never read or change another user's data.

## API

All routes are under `/api`. Everything except `auth/*` and `health` needs the session cookie.

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Server check |
| POST | `/auth/request-otp` | Send login code |
| POST | `/auth/verify-otp` | Verify code → sign up or log in |
| POST | `/auth/logout` | End session |
| GET | `/bootstrap` | User, settings and all tracking data in one call |
| GET / PATCH / DELETE | `/me` | Get, update (profile, settings, onboarded) or delete account |
| POST | `/me/categories` | Add a custom category |
| GET / POST | `/supplements` | List / create |
| PUT / DELETE | `/supplements/:id` | Update / delete (also deletes its logs and photo) |
| PATCH | `/supplements/:id/status` | Active, paused, archived |
| GET / POST | `/dose-logs` | List (`?from=&to=`) / log taken or skipped (stock goes down) |
| POST | `/dose-logs/bulk` | Mark several doses at once |
| PATCH / DELETE | `/dose-logs/:id` | Change time / undo (stock comes back) |
| GET / POST | `/meals` | List / create |
| PUT / DELETE | `/meals/:id` | Update / delete (also deletes its photo) |
| POST | `/photos` | Upload a compressed image (data URL) |
| GET / DELETE | `/photos/:id` | Get image / delete |
| PATCH | `/daily/:date` | Water and training-day override |
| POST | `/weights`, DELETE `/weights/:id` | Body weight |
| GET | `/ai/status` | Whether AI is configured |
| POST | `/ai/analyze-meal` | Photo → calories and macros |
| POST | `/ai/summary`, `/ai/tips` | Weekly insights, timing tips |
| GET / POST / DELETE | `/ai/chat` | Coach chat |
| GET | `/data/export` | Full backup (JSON, with photos) |
| POST | `/data/import` | Restore a backup (replaces data) |
| DELETE | `/data` | Clear tracking data, keep account |

## Server layout

```
server/src/
  config/        env validation, MongoDB connection
  models/        Mongoose schemas
  validators/    zod request schemas
  middleware/    auth, validation, rate limits, errors
  services/      OTP, SMS, session tokens, OpenAI, response shaping
  controllers/   request handlers
  routes/        URL → controller wiring
  app.ts         Express app (also serves client/dist in production)
  index.ts       start + graceful shutdown
```

## Production

```bash
npm run build
NODE_ENV=production npm start      # or set NODE_ENV=production in server/.env
```

The server then serves the built app and the API on one port (`PORT`, default 4000). Put it behind **https** (session cookies are `Secure` in production, and reminders and offline mode need https). Use MongoDB Atlas or a managed MongoDB, a real SMS provider, and fresh random `JWT_SECRET`/`OTP_SECRET` values.
