import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function createOpaqueToken() {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function securelyMatches(left, right) {
  const first = Buffer.from(String(left || ''));
  const second = Buffer.from(String(right || ''));
  return first.length === second.length && timingSafeEqual(first, second);
}

// Short-lived HMAC-signed "view token": lets the parent site open a read-only
// result page in the candidate-facing frontend without sharing the attempt
// token. Stateless — payload carries the attempt id + expiry, the signature
// makes it tamper-proof, so nothing is stored in the database.
export function createViewToken(attemptId, ttlMs, secret) {
  const payload = Buffer
    .from(JSON.stringify({ a: attemptId, exp: Date.now() + ttlMs }))
    .toString('base64url');
  return `${payload}.${signViewPayload(payload, secret)}`;
}

// Returns the attempt id when the token is authentic and unexpired; null otherwise.
export function verifyViewToken(token, secret) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;
  if (!securelyMatches(signature, signViewPayload(payload, secret))) return null;
  try {
    const { a, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof a !== 'string' || typeof exp !== 'number' || exp < Date.now()) return null;
    return a;
  } catch {
    return null;
  }
}

function signViewPayload(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}
