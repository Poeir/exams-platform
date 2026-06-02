import { timingSafeEqual } from 'node:crypto';
import { log } from '../logger.js';

// HTTP Basic auth for admin-only endpoints. Credentials come from ENV
// (ADMIN_USERNAME / ADMIN_PASSWORD). The browser handles the prompt natively
// on a 401 + WWW-Authenticate response, so the admin SPA needs no extra UI.

function safeEqual(a, b) {
  const ba = Buffer.from(a || '', 'utf8');
  const bb = Buffer.from(b || '', 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function requireAdmin(req, res, next) {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) {
    return res.status(503).json({ error: 'ADMIN_USERNAME / ADMIN_PASSWORD not configured' });
  }

  const header = req.get('authorization') || '';
  const match = /^Basic\s+(.+)$/i.exec(header);
  if (!match) {
    res.set('WWW-Authenticate', 'Basic realm="english-test admin", charset="UTF-8"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  let decoded = '';
  try {
    decoded = Buffer.from(match[1], 'base64').toString('utf8');
  } catch {
    res.set('WWW-Authenticate', 'Basic realm="english-test admin", charset="UTF-8"');
    return res.status(401).json({ error: 'Malformed credentials' });
  }
  const sep = decoded.indexOf(':');
  const u = sep >= 0 ? decoded.slice(0, sep) : decoded;
  const p = sep >= 0 ? decoded.slice(sep + 1) : '';

  if (!safeEqual(u, user) || !safeEqual(p, pass)) {
    log.warn('admin_auth_failed', {
      req_id: req.id,
      path: req.originalUrl.split('?')[0],
      ip: req.ip,
      user: u,
    });
    res.set('WWW-Authenticate', 'Basic realm="english-test admin", charset="UTF-8"');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  next();
}
