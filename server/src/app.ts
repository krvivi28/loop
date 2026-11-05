import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, isProd } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { api } from './routes/index.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  if (env.CLIENT_ORIGIN) app.use(cors({ origin: env.CLIENT_ORIGIN.split(','), credentials: true }));
  app.use(compression());
  app.use(morgan(isProd ? 'combined' : 'dev'));
  app.use(cookieParser());
  // Backups with photos can be large; everything else is small.
  app.use('/api/data/import', express.json({ limit: '60mb' }));
  app.use(express.json({ limit: '6mb' }));

  app.use('/api', api);
  app.use('/api', notFoundHandler);

  // In production, serve the built React app from ../client/dist
  const here = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(here, '../../client/dist');
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
