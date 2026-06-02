import { randomUUID } from 'node:crypto';

// Tiny structured JSON logger. One JSON object per line on stdout/stderr so
// log aggregators (CloudWatch, Loki, GCP Cloud Logging, ...) can index fields
// without a parser. Levels respect LOG_LEVEL (default: info in prod, debug
// elsewhere). Never log secrets — callers must scrub tokens/keys before
// passing them in.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function envLevel() {
  const raw = (process.env.LOG_LEVEL || '').toLowerCase();
  if (LEVELS[raw]) return LEVELS[raw];
  return process.env.NODE_ENV === 'production' ? LEVELS.info : LEVELS.debug;
}

const THRESHOLD = envLevel();
const SERVICE = process.env.LOG_SERVICE || 'english-test-server';

function emit(level, msg, fields) {
  if (LEVELS[level] < THRESHOLD) return;
  const rec = {
    ts: new Date().toISOString(),
    level,
    service: SERVICE,
    msg,
    ...(fields || {}),
  };
  const line = JSON.stringify(rec);
  if (level === 'error' || level === 'warn') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

export const log = {
  debug: (msg, fields) => emit('debug', msg, fields),
  info:  (msg, fields) => emit('info',  msg, fields),
  warn:  (msg, fields) => emit('warn',  msg, fields),
  error: (msg, fields) => emit('error', msg, fields),
};

// Per-request middleware: assigns/propagates a request id, stamps `req.log`
// with the id pre-bound, and emits an access log line on response finish with
// method, path, status, latency, and any attempt_id the handler attached via
// `res.locals.attempt_id`.
export function requestLogger(req, res, next) {
  const reqId = req.get('x-request-id') || randomUUID();
  res.set('x-request-id', reqId);
  req.id = reqId;
  req.log = {
    debug: (msg, f) => log.debug(msg, { req_id: reqId, ...f }),
    info:  (msg, f) => log.info (msg, { req_id: reqId, ...f }),
    warn:  (msg, f) => log.warn (msg, { req_id: reqId, ...f }),
    error: (msg, f) => log.error(msg, { req_id: reqId, ...f }),
  };

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const fields = {
      req_id: reqId,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      duration_ms: Math.round(ms * 100) / 100,
      ip: req.ip,
    };
    if (res.locals.attempt_id) fields.attempt_id = res.locals.attempt_id;
    if (res.locals.paper_id)   fields.paper_id   = res.locals.paper_id;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    emit(level, 'http_request', fields);
  });

  next();
}
