import { createHmac, timingSafeEqual } from 'node:crypto';

// Short-lived HMAC-signed "view token": lets the parent site open a read-only
// result page in a new tab without sharing admin credentials. Stateless — the
// payload carries the attempt id + expiry and the signature makes it
// tamper-proof, so nothing is stored in the database. Mirrors the mbti
// engine's view-link implementation (mbti-personality/server/security.js).

const ttlMin = () => Number(process.env.VIEW_LINK_TTL_MIN) || 15;
const secret = () => process.env.VIEW_LINK_SECRET
  || `view-link:${process.env.PARENT_API_KEY || ''}`;

export function viewLinkTtlMs() {
  return ttlMin() * 60_000;
}

// `avatarUrl` and `role` (both optional) are parent-supplied candidate identity,
// baked into the signed payload so the read-only result page can show them
// WITHOUT the engine storing them in the database. The HMAC signature makes them
// tamper-proof. `role` is the candidate's job position shown under their name.
export function createViewToken(attemptId, { avatarUrl, role } = {}) {
  const payload = Buffer
    .from(JSON.stringify({
      a: attemptId,
      exp: Date.now() + viewLinkTtlMs(),
      ...(avatarUrl ? { av: avatarUrl } : {}),
      ...(role ? { r: role } : {}),
    }))
    .toString('base64url');
  return `${payload}.${sign(payload)}`;
}

// Returns { attemptId, avatarUrl, role } when the token is authentic and
// unexpired; null otherwise. avatarUrl / role are null when the token carried none.
export function verifyViewToken(token) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const got = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const { a, exp, av, r } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof a !== 'string' || typeof exp !== 'number' || exp < Date.now()) return null;
    return {
      attemptId: a,
      avatarUrl: typeof av === 'string' ? av : null,
      role: typeof r === 'string' ? r : null,
    };
  } catch {
    return null;
  }
}

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}
