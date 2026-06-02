// Exam gateway: ONE container / ONE port hosting both assessment engines.
//
//   /english/*     → english-test app (API + SPA), prefix stripped by mount
//   /mbti/*        → mbti app (API + SPA), prefix stripped by mount
//   /api/health    → combined health (pings the shared DB through both clients)
//   /              → tiny landing page linking to both exams
//
// Each app keeps its own node_modules (and its own Prisma client) — Node
// resolves imports relative to each app's files, so the two dependency trees
// coexist in one process. Apps export `app` from app.js and never listen here.
import express from 'express';
import { app as englishApp } from '../apps/english/server/src/app.js';
import { prisma as englishPrisma } from '../apps/english/server/src/db.js';
import { app as mbtiApp } from '../apps/mbti/server/app.js';
import { prisma as mbtiPrisma } from '../apps/mbti/server/db.js';
import { logger } from '../apps/mbti/server/logger.js';

const PORT = Number(process.env.PORT) || 3000;

const gateway = express();
gateway.disable('x-powered-by');
gateway.set('trust proxy', true);

// Combined health for the platform's liveness/readiness probes. Each engine's
// own health stays reachable at /english/api/health and /mbti/api/health.
gateway.get('/api/health', async (_req, res) => {
  const ping = async (name, prisma) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { name, ok: true };
    } catch (err) {
      return { name, ok: false, error: err.message };
    }
  };
  const checks = await Promise.all([
    ping('english', englishPrisma),
    ping('mbti', mbtiPrisma),
  ]);
  const ok = checks.every((c) => c.ok);
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    engines: Object.fromEntries(checks.map((c) => [c.name, c.ok])),
  });
});

gateway.use('/english', englishApp);
gateway.use('/mbti', mbtiApp);

// Minimal landing page. Candidates normally arrive on deep links minted by the
// parent system (launch_url / view_url) — this is just a human-friendly root.
gateway.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="th">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gofive Assessments</title>
<style>
  body { font-family: system-ui, 'IBM Plex Sans Thai', sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #f7f7f8; }
  main { text-align: center; }
  h1 { font-weight: 600; color: #1f2430; }
  a { display: inline-block; margin: 0.5rem; padding: 0.9rem 1.6rem; border-radius: 10px; text-decoration: none; color: #fff; font-weight: 600; }
  .english { background: #2f6fed; }
  .mbti { background: #f05b2f; }
</style></head>
<body><main>
  <h1>Gofive Assessments</h1>
  <a class="english" href="/english/">English Proficiency Test</a>
  <a class="mbti" href="/mbti/">MBTI Workplace Assessment</a>
</main></body></html>`);
});

const server = gateway.listen(PORT, () => {
  logger.info('gateway_started', { port: PORT, nodeEnv: process.env.NODE_ENV || 'development' });
});

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', {
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});
process.on('uncaughtException', (error) => {
  logger.error('uncaught_exception', { message: error.message, stack: error.stack });
});

async function shutdown(signal) {
  logger.info('gateway_shutting_down', { signal });
  server.close();
  await Promise.allSettled([englishPrisma.$disconnect(), mbtiPrisma.$disconnect()]);
  logger.info('gateway_stopped');
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
