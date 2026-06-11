// Express app construction, split from index.js so the exam gateway can mount
// this app under a path prefix (/english) without starting its own listener.
// Run standalone via index.js, which imports this and calls app.listen().
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import papersRouter from './routes/papers.js';
import sectionsRouter from './routes/sections.js';
import itemsRouter from './routes/items.js';
import seedRouter from './routes/seed.js';
import attemptsRouter from './routes/attempts.js';
import mediaRouter from './routes/media.js';
import { isConfigured as storageConfigured } from './azureStorage.js';
import { requireAdmin } from './middleware/adminAuth.js';
import { openapiSpec } from './openapi.js';
import { log, requestLogger } from './logger.js';

export const app = express();

app.set('trust proxy', true);
app.use(requestLogger);
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Runtime config for the frontend. The browser fetches this at load time so no
// configuration is baked into the static bundle. Media now lives in Azure Blob
// Storage behind a server-side SAS (see azureStorage.js / routes/media.js), so
// the only thing the admin UI needs to know is whether uploads are wired up.
app.get('/api/config', (_req, res) => res.json({
  uploadEnabled: storageConfigured(),
}));

app.get('/api/openapi.json', (_req, res) => res.json(openapiSpec));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  customSiteTitle: 'english-test API docs',
}));

app.use('/api', papersRouter);
app.use('/api', sectionsRouter);
app.use('/api', itemsRouter);
app.use('/api', seedRouter);
app.use('/api', attemptsRouter);
app.use('/api', mediaRouter);

// Serve the built frontend (SPA) when a dist/ bundle is present. This lets one
// container host both the API (/api/*) and the static app (/) on a single port.
// STATIC_DIR overrides the default (../../dist relative to this file). In dev,
// running the server alone, dist/ usually doesn't exist and this is skipped.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = process.env.STATIC_DIR
  ? path.resolve(process.env.STATIC_DIR)
  : path.resolve(__dirname, '../../dist');

if (fs.existsSync(path.join(staticDir, 'index.html'))) {
  log.info('serving_static', { dir: staticDir });
  app.use(express.static(staticDir));
  // Gate the admin SPA entry itself. When ADMIN_USERNAME/ADMIN_PASSWORD are
  // unset, requireAdmin returns 503, so the admin shell never loads at all
  // (not even the public paper list it would otherwise show). When they are
  // set, the browser is prompted for Basic auth before the shell is served.
  // This blocks the whole /admin page, rather than only the admin-only API
  // calls behind it. Must come before the SPA fallback below.
  app.get(/^\/admin(\/.*)?$/, requireAdmin, (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
  // SPA fallback: any non-/api GET that isn't a real file returns index.html so
  // client-side routing/refresh works. API 404s fall through to the routers.
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
} else {
  log.warn('static_dir_missing', { dir: staticDir });
}

app.use((err, req, res, _next) => {
  const fields = {
    req_id: req.id,
    method: req.method,
    path: req.originalUrl.split('?')[0],
    err_name: err.name,
    err_message: err.message,
    stack: err.stack,
  };
  if (res.locals.attempt_id) fields.attempt_id = res.locals.attempt_id;
  log.error('unhandled_error', fields);
  res.status(500).json({ error: err.message || 'Internal error' });
});
