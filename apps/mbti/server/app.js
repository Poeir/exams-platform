// Express app construction, split from index.js so the exam gateway can mount
// this app under a path prefix (/mbti) without starting its own listener.
// Run standalone via index.js, which imports this and calls app.listen().
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { config } from './config.js';
import { prisma } from './db.js';
import { HttpError } from './httpError.js';
import { logger } from './logger.js';
import { securelyMatches } from './security.js';
import {
  completeAssessmentAttempt,
  createAssessmentAttempt,
  createLatestResultViewLink,
  createResultViewLink,
  getResultByAttemptToken,
  getResultByViewToken,
  listSubjectResults,
} from './assessmentService.js';
import { deliverResult } from './webhook.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

app.use((request, response, next) => {
  const requestId = request.get('x-request-id') || randomUUID();
  const startedAt = process.hrtime.bigint();
  request.id = requestId;
  response.setHeader('x-request-id', requestId);
  response.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const fields = {
      requestId,
      method: request.method,
      path: request.originalUrl,
      status: response.statusCode,
      durationMs: Math.round(durationMs),
      ip: request.ip,
    };
    if (response.statusCode >= 500) logger.error('http_request', fields);
    else if (response.statusCode >= 400) logger.warn('http_request', fields);
    else logger.info('http_request', fields);
  });
  next();
});

// Serve the built React SPA when present (production single-container deploy).
// In local dev the frontend runs under Vite, dist/ is absent, and this is skipped.
const distPath = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const hasFrontend = existsSync(resolve(distPath, 'index.html'));
if (hasFrontend) {
  app.use(express.static(distPath));
}

const openapiPath = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/openapi.yaml');
const openapiDocument = YAML.parse(readFileSync(openapiPath, 'utf8'));
app.get('/api/docs.json', (request, response) => response.json(openapiDocument));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument, {
  customSiteTitle: 'MBTI Service API docs',
}));

app.get('/api/health', async (request, response) => {
  await prisma.$queryRaw`SELECT 1`;
  response.json({ status: 'ok' });
});

app.post('/api/v1/assessment-attempts', requireParentService, async (request, response) => {
  const attempt = await createAssessmentAttempt(request.body);
  logger.info('assessment_attempt_created', {
    requestId: request.id,
    attemptId: attempt.id,
    subjectId: attempt.subjectId,
    sourceSystem: request.body?.sourceSystem,
  });
  response.status(201).json(attempt);
});

app.post('/api/v1/assessment-attempts/:attemptId/complete', async (request, response) => {
  const result = await completeAssessmentAttempt(
    request.params.attemptId,
    requireBearerToken(request),
    request.body,
  );
  logger.info('assessment_attempt_completed', {
    requestId: request.id,
    attemptId: request.params.attemptId,
    resultId: result.id,
    mbtiCode: result.result?.code,
  });
  response.status(201).json(result);
});

// Parent-triggered webhook retry — useful when the parent missed the first
// push (e.g. their endpoint was down). Same contract as english-test's
// POST /api/attempts/:id/redeliver.
app.post('/api/v1/assessment-attempts/:attemptId/redeliver', requireParentService, async (request, response) => {
  const delivered = await deliverResult(request.params.attemptId);
  logger.info('webhook_redeliver_requested', {
    requestId: request.id,
    attemptId: request.params.attemptId,
    delivered,
  });
  response.json({ delivered });
});

// Parent backend → short-lived signed URL for "open result in a new tab".
app.post('/api/v1/assessment-attempts/:attemptId/view-link', requireParentService, async (request, response) => {
  const link = await createResultViewLink(request.params.attemptId);
  logger.info('result_view_link_created', {
    requestId: request.id,
    attemptId: link.attemptId,
  });
  response.status(201).json(link);
});

// Browser (opened by the parent site) → read-only result via the signed token.
// Declared before /:resultId so 'view' is not swallowed by the param route.
app.get('/api/v1/assessment-results/view', async (request, response) => {
  const result = await getResultByViewToken(request.query.token);
  response.json(result);
});

app.get('/api/v1/assessment-results/:resultId', async (request, response) => {
  const result = await getResultByAttemptToken(
    request.params.resultId,
    requireBearerToken(request),
  );
  response.json(result);
});

app.get('/api/v1/subjects/:sourceSystem/:externalUserId/results', requireParentService, async (request, response) => {
  const results = await listSubjectResults(
    request.params.sourceSystem,
    request.params.externalUserId,
  );
  response.json({ results });
});

// Attempt-id-free "view result" — mints a view link for the subject's LATEST
// completed attempt, so a parent only ever needs its own user id.
app.post('/api/v1/subjects/:sourceSystem/:externalUserId/view-link', requireParentService, async (request, response) => {
  const link = await createLatestResultViewLink(
    request.params.sourceSystem,
    request.params.externalUserId,
  );
  logger.info('subject_view_link_created', {
    requestId: request.id,
    attemptId: link.attemptId,
    sourceSystem: request.params.sourceSystem,
  });
  response.status(201).json(link);
});

// SPA fallback: any non-API GET returns index.html so client-side routing works.
// Express 5 dropped string wildcards, so this is a plain middleware rather than app.get('*').
if (hasFrontend) {
  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api')) return next();
    response.sendFile(resolve(distPath, 'index.html'));
  });
}

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  const status = error instanceof HttpError ? error.status : 500;
  if (status === 500) {
    logger.error('unhandled_error', {
      requestId: request.id,
      method: request.method,
      path: request.originalUrl,
      message: error.message,
      stack: error.stack,
    });
  } else {
    logger.warn('client_error', {
      requestId: request.id,
      method: request.method,
      path: request.originalUrl,
      status,
      message: error.message,
    });
  }
  return response.status(status).json({
    error: status === 500 ? 'Internal service error.' : error.message,
  });
});

function requireParentService(request, response, next) {
  // X-API-Key is the unified parent-auth header across both assessment
  // engines (english-test uses the same name); x-service-key is the legacy
  // mbti-only header, accepted as an alias for older integrations.
  const presented = request.get('x-api-key') || request.get('x-service-key');
  if (!securelyMatches(presented, config.parentApiKey)) {
    logger.warn('parent_service_auth_failed', {
      requestId: request.id,
      path: request.originalUrl,
      ip: request.ip,
    });
    return response.status(401).json({ error: 'Parent service authorization is required.' });
  }
  return next();
}

function requireBearerToken(request) {
  const authorization = request.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Attempt token is required.');
  return token;
}
