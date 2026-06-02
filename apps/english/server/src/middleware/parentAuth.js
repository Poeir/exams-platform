// Shared-secret auth for server-to-server calls from the parent site.
// The parent sends `X-API-Key: <PARENT_API_KEY>` on requests that create or
// inspect attempts. Same secret is used to sign result webhooks (HMAC), so
// the parent can verify deliveries came from this engine.

import { log } from '../logger.js';

export function requireParentAuth(req, res, next) {
  const expected = process.env.PARENT_API_KEY;
  if (!expected) {
    log.error('parent_auth_misconfigured', { req_id: req.id, path: req.originalUrl.split('?')[0] });
    return res.status(503).json({ error: 'PARENT_API_KEY not configured on the server' });
  }
  const got = req.get('x-api-key');
  if (!got || got !== expected) {
    log.warn('parent_auth_failed', {
      req_id: req.id,
      path: req.originalUrl.split('?')[0],
      ip: req.ip,
      reason: got ? 'invalid_key' : 'missing_key',
    });
    return res.status(401).json({ error: 'Invalid or missing X-API-Key' });
  }
  next();
}
