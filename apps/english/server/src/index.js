// Standalone entrypoint: listen + process-level handlers + graceful shutdown.
// The app itself is built in app.js so the exam gateway can mount it instead.
import { app } from './app.js';
import { log } from './logger.js';
import { prisma } from './db.js';

const PORT = Number(process.env.PORT) || 3001;

process.on('unhandledRejection', (reason) => {
  log.error('unhandled_rejection', { reason: reason && (reason.stack || reason.message || String(reason)) });
});
process.on('uncaughtException', (err) => {
  log.error('uncaught_exception', { err_name: err.name, err_message: err.message, stack: err.stack });
});

const server = app.listen(PORT, () => {
  log.info('server_started', { port: PORT, env: process.env.NODE_ENV || 'development' });
});

// Graceful shutdown: stop accepting new connections, let in-flight requests
// finish, then disconnect Prisma and exit. A hard deadline guards against
// requests that never finish (Docker would otherwise SIGKILL after its own
// grace period anyway — exiting 1 here makes the timeout visible in logs).
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 10_000;

function shutdown(signal) {
  log.info('shutdown_started', { signal });
  const deadline = setTimeout(() => {
    log.error('shutdown_timeout', { timeout_ms: SHUTDOWN_TIMEOUT_MS });
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  deadline.unref();

  server.close(async (err) => {
    if (err) log.error('shutdown_close_error', { err_message: err.message });
    try {
      await prisma.$disconnect();
    } catch (e) {
      log.error('shutdown_db_error', { err_message: e.message });
    }
    log.info('shutdown_complete', { signal });
    process.exit(err ? 1 : 0);
  });
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
