// Runtime config fetched from the server at load time. Nothing is baked into
// the static bundle — the server owns all env (see GET /api/config). The fetch
// promise is cached so repeated callers share one request.
import { withBase } from '../lib/base.js';

let cached;

export function getRuntimeConfig() {
  if (!cached) {
    cached = fetch(withBase('/api/config'))
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}));
  }
  return cached;
}
