import { createHmac } from 'node:crypto';
import { prisma } from './db.js';
import { fromDbJson } from './json.js';
import { log } from './logger.js';

const TIMEOUT_MS = () => Number(process.env.WEBHOOK_TIMEOUT_MS) || 8000;
const MAX_ATTEMPTS = () => Number(process.env.WEBHOOK_MAX_ATTEMPTS) || 5;

function sign(bodyString, secret) {
  return 'sha256=' + createHmac('sha256', secret).update(bodyString).digest('hex');
}

// Best-effort POST of the result snapshot back to the parent's callback_url.
// Bumps delivery_attempts every try; stamps result_delivered_at on success so
// the partial index idx_attempts_undelivered drains. Returns true on 2xx.
//
// Run "fire-and-forget" from the submit route — the candidate sees their
// result immediately and the parent gets the push on a separate timeline.
export async function deliverResult(attemptId) {
  const secret = process.env.PARENT_API_KEY;
  if (!secret) {
    log.warn('webhook_skipped', { attempt_id: attemptId, reason: 'no_parent_api_key' });
    return false;
  }

  const a = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { subject: true },
  });
  if (!a) {
    log.warn('webhook_skipped', { attempt_id: attemptId, reason: 'attempt_not_found' });
    return false;
  }
  if (!a.callback_url || a.status !== 'submitted') {
    log.warn('webhook_skipped', {
      attempt_id: attemptId,
      reason: !a.callback_url ? 'no_callback_url' : `status_${a.status}`,
    });
    return false;
  }
  if (a.result_delivered_at) return true;
  if ((a.delivery_attempts || 0) >= MAX_ATTEMPTS()) {
    log.warn('webhook_skipped', {
      attempt_id: attemptId,
      reason: 'max_attempts_exhausted',
      delivery_attempts: a.delivery_attempts,
    });
    return false;
  }

  const payload = {
    attempt_id: a.id,
    paper_id: a.paper_id,
    // Candidate identity (shared.subjects) — null for anonymous attempts.
    // Parents correlate primarily by attempt_id (returned at session create).
    subject_id: a.subject_id,
    source_system: a.subject ? a.subject.source_system : null,
    external_user_id: a.subject ? a.subject.external_user_id : null,
    status: a.status,
    submitted_at: a.submitted_at,
    correct_total: a.correct_total,
    max_total: a.max_total,
    cefr_level: a.cefr_level,
    cefr_label: a.cefr_label,
    result: fromDbJson(a.result, null),
  };
  const body = JSON.stringify(payload);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS());
  const start = process.hrtime.bigint();
  const attemptNo = (a.delivery_attempts || 0) + 1;
  let ok = false;
  let status = 0;
  let errMessage = null;
  try {
    const res = await fetch(a.callback_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': sign(body, secret),
        'X-Attempt-Id': a.id,
      },
      body,
      signal: controller.signal,
    });
    status = res.status;
    ok = res.ok;
  } catch (e) {
    ok = false;
    errMessage = (e && e.message) || 'fetch_failed';
  } finally {
    clearTimeout(timer);
  }

  const duration_ms = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
  const fields = {
    attempt_id: a.id,
    paper_id: a.paper_id,
    callback_host: safeHost(a.callback_url),
    status,
    duration_ms,
    delivery_attempts: attemptNo,
    max_attempts: MAX_ATTEMPTS(),
  };
  if (errMessage) fields.err_message = errMessage;
  if (ok) log.info('webhook_delivered', fields);
  else log.error('webhook_failed', fields);

  await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      delivery_attempts: { increment: 1 },
      ...(ok ? { result_delivered_at: new Date() } : {}),
    },
  });

  return ok;
}

function safeHost(url) {
  try { return new URL(url).host; } catch { return null; }
}
