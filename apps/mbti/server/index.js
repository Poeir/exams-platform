// Standalone entrypoint: listen + process-level handlers + graceful shutdown.
// The app itself is built in app.js so the exam gateway can mount it instead.
import { app } from './app.js';
import { config } from './config.js';
import { prisma } from './db.js';
import { logger } from './logger.js';

const server = app.listen(config.port, () => {
  logger.info('server_started', {
    port: config.port,
    nodeEnv: process.env.NODE_ENV || 'development',
    engineVersion: config.engineVersion,
  });
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
  logger.info('server_shutting_down', { signal });
  server.close();
  await prisma.$disconnect();
  logger.info('server_stopped');
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
