// Default API base follows the build-time base path ('' standalone, '/mbti'
// under the exam gateway); VITE_MBTI_API_BASE_URL still overrides for dev.
import { BASE } from './base.js';

const API_BASE_URL = import.meta.env.VITE_MBTI_API_BASE_URL || BASE;
const DEV_PARENT_SERVICE_KEY = import.meta.env.DEV
  ? import.meta.env.VITE_PARENT_API_KEY || 'dev-parent-key'
  : '';

export async function createServiceAttempt(user) {
  assertDevelopmentParentCall();
  return request('/api/v1/assessment-attempts', {
    method: 'POST',
    headers: { 'X-API-Key': DEV_PARENT_SERVICE_KEY },
    body: JSON.stringify({
      sourceSystem: 'main_web',
      externalUserId: user.id,
      email: user.email,
      displayName: user.name,
    }),
  });
}

export async function completeServiceAttempt(attempt, payload) {
  return request(`/api/v1/assessment-attempts/${encodeURIComponent(attempt.id)}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${attempt.attemptToken}` },
    body: JSON.stringify(payload),
  });
}

export async function getServiceResult(resultId, attemptToken) {
  return request(`/api/v1/assessment-results/${encodeURIComponent(resultId)}`, {
    headers: { Authorization: `Bearer ${attemptToken}` },
  });
}

// Read-only result fetch via a short-lived signed link issued to the parent
// site (POST /assessment-attempts/:id/view-link) — no attempt token involved.
export async function getServiceResultByViewToken(viewToken) {
  return request(`/api/v1/assessment-results/view?token=${encodeURIComponent(viewToken)}`);
}

export async function getServiceResultsForUser(userId) {
  assertDevelopmentParentCall();
  const payload = await request(`/api/v1/subjects/main_web/${encodeURIComponent(userId)}/results`, {
    headers: { 'X-API-Key': DEV_PARENT_SERVICE_KEY },
  });
  return payload.results;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Service request failed (${response.status}).`);
  }
  return payload;
}

function assertDevelopmentParentCall() {
  if (!import.meta.env.DEV) {
    throw new Error('Parent service calls must be issued by the authenticated parent website.');
  }
}
