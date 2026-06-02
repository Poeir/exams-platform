import { createHmac } from 'node:crypto';
import { config } from './config.js';
import { prisma } from './db.js';
import { logger } from './logger.js';

// Best-effort POST of the scored result back to the parent's callbackUrl —
// the same contract english-test uses (server/src/webhook.js there): body is
// JSON, X-Signature is `sha256=` + HMAC-SHA256(rawBody, parent key), retries
// are capped by deliveryAttempts, resultDeliveredAt stamps success so the
// filtered idx_attempts_undelivered index drains.
//
// Run "fire-and-forget" from the completion path — the candidate sees their
// result immediately and the parent gets the push on a separate timeline.

function sign(bodyString, secret) {
  return 'sha256=' + createHmac('sha256', secret).update(bodyString).digest('hex');
}

export async function deliverResult(attemptId) {
  const secret = config.parentApiKey;
  if (!secret) {
    logger.warn('webhook_skipped', { attemptId, reason: 'no_parent_api_key' });
    return false;
  }

  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { subject: true },
  });
  if (!attempt) {
    logger.warn('webhook_skipped', { attemptId, reason: 'attempt_not_found' });
    return false;
  }
  if (!attempt.callbackUrl || attempt.status !== 'completed') {
    logger.warn('webhook_skipped', {
      attemptId,
      reason: !attempt.callbackUrl ? 'no_callback_url' : `status_${attempt.status}`,
    });
    return false;
  }
  if (attempt.resultDeliveredAt) return true;
  if ((attempt.deliveryAttempts || 0) >= config.webhookMaxAttempts) {
    logger.warn('webhook_skipped', {
      attemptId,
      reason: 'max_attempts_exhausted',
      deliveryAttempts: attempt.deliveryAttempts,
    });
    return false;
  }

  // Same identity keys the english webhook sends (snake-free camelCase, this
  // service's convention). Raw question responses are deliberately omitted.
  const payload = {
    attemptId: attempt.id,
    subjectId: attempt.subjectId,
    sourceSystem: attempt.subject.sourceSystem,
    externalUserId: attempt.subject.externalUserId,
    status: attempt.status,
    completedAt: attempt.completedAt,
    result: {
      code: attempt.mbtiCode,
      softCode: attempt.softCode,
      axes: JSON.parse(attempt.axesJson),
      bars: JSON.parse(attempt.barsJson),
      confidence: JSON.parse(attempt.confidenceJson),
      midzones: JSON.parse(attempt.midzonesJson),
      facets: JSON.parse(attempt.facetsJson),
    },
    engineVersion: attempt.engineVersion,
  };
  const body = JSON.stringify(payload);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.webhookTimeoutMs);
  const attemptNo = (attempt.deliveryAttempts || 0) + 1;
  let ok = false;
  let status = 0;
  let errMessage = null;
  try {
    const response = await fetch(attempt.callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': sign(body, secret),
        'X-Attempt-Id': attempt.id,
      },
      body,
      signal: controller.signal,
    });
    status = response.status;
    ok = response.ok;
  } catch (error) {
    errMessage = (error && error.message) || 'fetch_failed';
  } finally {
    clearTimeout(timer);
  }

  const fields = {
    attemptId: attempt.id,
    callbackHost: safeHost(attempt.callbackUrl),
    status,
    deliveryAttempts: attemptNo,
    maxAttempts: config.webhookMaxAttempts,
  };
  if (errMessage) fields.errMessage = errMessage;
  if (ok) logger.info('webhook_delivered', fields);
  else logger.error('webhook_failed', fields);

  await prisma.assessmentAttempt.update({
    where: { id: attemptId },
    data: {
      deliveryAttempts: { increment: 1 },
      ...(ok ? { resultDeliveredAt: new Date() } : {}),
    },
  });

  return ok;
}

function safeHost(url) {
  try { return new URL(url).host; } catch { return null; }
}
