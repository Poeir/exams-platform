// The frontend is always served same-origin by the API server, so the API base
// follows the build-time base path ('' standalone, '/english' under the exam
// gateway) — still no runtime env needed.
import { withBase } from '../lib/base.js';

const API = withBase('/api');

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body == null ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${path} → ${res.status} ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Papers
export const listPapers = () => request('/papers');
// Exam-taker fetch: the server omits the answer key + explanation.
export const getPaper = (id) => request(`/papers/${encodeURIComponent(id)}`);
// Admin/editor fetch: full item shape including correct_answer + explanation.
export const getPaperFull = (id) =>
  request(`/papers/${encodeURIComponent(id)}?withAnswers=1`);
// Submit answers for server-side scoring; returns aggregate totals only.
export const scorePaper = (id, answers) =>
  request(`/papers/${encodeURIComponent(id)}/score`, { method: 'POST', body: { answers } });
export const createPaper = (body) => request('/papers', { method: 'POST', body });
export const updatePaper = (id, body) =>
  request(`/papers/${encodeURIComponent(id)}`, { method: 'PATCH', body });
export const deletePaper = (id) =>
  request(`/papers/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Sections
export const createSection = (paperId, body) =>
  request(`/papers/${encodeURIComponent(paperId)}/sections`, { method: 'POST', body });
export const updateSection = (id, body) =>
  request(`/sections/${encodeURIComponent(id)}`, { method: 'PATCH', body });
export const deleteSection = (id) =>
  request(`/sections/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Items
export const createItem = (sectionId, body) =>
  request(`/sections/${encodeURIComponent(sectionId)}/items`, { method: 'POST', body });
export const updateItem = (id, body) =>
  request(`/items/${encodeURIComponent(id)}`, { method: 'PATCH', body });
export const deleteItem = (id) =>
  request(`/items/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Seed
export const seedFromServer = () => request('/seed', { method: 'POST' });

// Admin — attempt history (Basic auth; browser handles the prompt and reuses
// credentials across requests once the user has signed in).
export const listAdminAttempts = (limit) =>
  request(`/admin/attempts${limit ? `?limit=${encodeURIComponent(limit)}` : ''}`);
export const getAdminAttempt = (id) =>
  request(`/admin/attempts/${encodeURIComponent(id)}`);

// HTTP Basic has no logout — browsers cache the credentials per-realm until the
// tab closes. Trick the cache by hitting a protected endpoint with bogus creds
// via XHR: most browsers (Chrome/Firefox/Edge) then store the new (wrong)
// credentials, so the next admin request re-prompts.
export function clearAdminAuth() {
  return new Promise((resolve) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `${API}/admin/attempts?limit=1`, true, 'logout', `logout-${Date.now()}`);
      xhr.onloadend = () => resolve();
      xhr.onerror = () => resolve();
      xhr.send();
    } catch {
      resolve();
    }
  });
}

// Session-mode attempt flow — used when the parent site launches a candidate
// via /exam?t=<launch_token>. Each attempt is server-backed; the candidate's
// browser hits these endpoints instead of localStorage.

// Browser side of the handshake: trades the one-time launch_token for an
// attempt id + the paper bundle. Marks the attempt 'in_progress' server-side.
export const consumeLaunchToken = (token) =>
  request('/attempts/consume', { method: 'POST', body: { token } });

// Anonymous walk-in: no parent launch, no subject. The server creates an
// in_progress attempt against the default paper and hands back the same
// `{ attempt, paper }` shape as consume.
export const createAnonymousAttempt = (paperId) =>
  request('/attempts/anonymous', { method: 'POST', body: paperId ? { paper_id: paperId } : {} });

// Mark a stale anonymous attempt as 'expired' — used on page refresh so the
// row doesn't linger as in_progress. No-op server-side for non-anonymous or
// already-terminal rows.
export const abandonAttempt = (id) =>
  request(`/attempts/${encodeURIComponent(id)}/abandon`, { method: 'POST' });

// Resume / status check.
export const getAttempt = (id) => request(`/attempts/${encodeURIComponent(id)}`);

// Autosave the answers map. Server rejects once the attempt is no longer
// in_progress (submitted / expired) → callers can fall through silently.
export const saveAttemptAnswers = (id, answers) =>
  request(`/attempts/${encodeURIComponent(id)}/answers`, { method: 'PATCH', body: { answers } });

// Final submit. Server scores against the answer key and snapshots the result
// into the attempt row (and pushes to the parent's callback_url out-of-band).
// Idempotent: re-submitting returns the original snapshot.
export const submitAttempt = (id, answers) =>
  request(`/attempts/${encodeURIComponent(id)}/submit`, { method: 'POST', body: { answers } });
