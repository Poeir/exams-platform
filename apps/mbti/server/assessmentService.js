import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { prisma } from './db.js';
import { HttpError } from './httpError.js';
import { createOpaqueToken, createViewToken, hashToken, verifyViewToken } from './security.js';
import { deliverResult } from './webhook.js';
import { logger } from './logger.js';
import { scoreResponses } from '../src/lib/scoring.js';

export async function createAssessmentAttempt(subjectInput) {
  validateSubjectInput(subjectInput);

  const attemptToken = createOpaqueToken();
  const attemptId = randomUUID();
  const expiresAt = new Date(Date.now() + config.attemptTtlMinutes * 60 * 1000);

  const subject = await prisma.$transaction(async (tx) => {
    // Upsert keeps the latest non-empty identity snapshot from the parent
    // service without clobbering an existing value with null.
    const storedSubject = await tx.assessmentSubject.upsert({
      where: {
        sourceSystem_externalUserId: {
          sourceSystem: subjectInput.sourceSystem,
          externalUserId: subjectInput.externalUserId,
        },
      },
      create: {
        sourceSystem: subjectInput.sourceSystem,
        externalUserId: subjectInput.externalUserId,
        emailSnapshot: subjectInput.email || null,
        displayNameSnapshot: subjectInput.displayName || null,
      },
      update: {
        ...(subjectInput.email ? { emailSnapshot: subjectInput.email } : {}),
        ...(subjectInput.displayName ? { displayNameSnapshot: subjectInput.displayName } : {}),
      },
    });

    await tx.assessmentAttempt.create({
      data: {
        id: attemptId,
        subjectId: storedSubject.id,
        attemptTokenHash: hashToken(attemptToken),
        status: 'started',
        expiresAt,
        // Optional result webhook target — the scored result is POSTed here
        // on completion (see webhook.js), like english-test's callback_url.
        callbackUrl: isString(subjectInput.callbackUrl) ? subjectInput.callbackUrl : null,
      },
    });

    return storedSubject;
  });

  const launchUrl = new URL(config.frontendUrl);
  launchUrl.searchParams.set('attempt_id', attemptId);
  launchUrl.searchParams.set('attempt_token', attemptToken);

  return {
    id: attemptId,
    attemptToken,
    userId: subject.externalUserId,
    subjectId: subject.id,
    status: 'started',
    expiresAt: expiresAt.toISOString(),
    // `launchUrl` is the unified field name across both assessment engines
    // (was `testUrl` here before english-test aligned its contract).
    launchUrl: launchUrl.toString(),
  };
}

export async function completeAssessmentAttempt(attemptId, attemptToken, payload) {
  if (!payload || payload.version !== '1.0' || !payload.responses) {
    throw new HttpError(400, 'A versioned responses payload is required.');
  }

  let scored;
  try {
    scored = scoreResponses(payload.responses);
  } catch (error) {
    throw new HttpError(400, error.message);
  }

  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: attemptId, attemptTokenHash: hashToken(attemptToken) },
    include: { subject: true },
  });

  if (!attempt) throw new HttpError(401, 'Attempt token is invalid.');
  if (attempt.status !== 'started') throw new HttpError(409, 'Attempt is already completed.');
  if (attempt.expiresAt.getTime() < Date.now()) {
    throw new HttpError(410, 'Attempt has expired.');
  }

  const completedAt = new Date();
  // Result lives on the attempt row, so completion is one UPDATE. The
  // status='started' filter guards against a concurrent double-complete (the
  // job the old assessment_results.attempt_id unique constraint did): the
  // losing writer matches zero rows instead of overwriting the result.
  const updated = await prisma.assessmentAttempt.updateMany({
    where: { id: attempt.id, status: 'started' },
    data: {
      status: 'completed',
      completedAt,
      mbtiCode: scored.code,
      softCode: scored.softCode,
      axesJson: JSON.stringify(scored.axes),
      barsJson: JSON.stringify(scored.bars),
      confidenceJson: JSON.stringify(scored.confidence),
      midzonesJson: JSON.stringify(scored.midzones),
      facetsJson: JSON.stringify(scored.facets),
      responsesJson: JSON.stringify(payload.responses),
      engineVersion: config.engineVersion,
    },
  });
  if (updated.count === 0) throw new HttpError(409, 'Attempt is already completed.');

  const completed = await prisma.assessmentAttempt.findUnique({ where: { id: attempt.id } });

  // Fire-and-forget webhook push — the candidate gets their result now, the
  // parent gets the POST on a separate timeline (deliverResult no-ops when no
  // callbackUrl was supplied).
  if (completed.callbackUrl) {
    deliverResult(completed.id).catch((error) =>
      logger.error('webhook_dispatch_error', { attemptId: completed.id, message: error.message }));
  }

  return toResultRecord(completed, attempt.subject);
}

// A result is addressed by its attempt id (results merged onto attempts).
export async function getResultByAttemptToken(resultId, attemptToken) {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: {
      id: resultId,
      attemptTokenHash: hashToken(attemptToken),
      status: 'completed',
    },
    include: { subject: true },
  });
  if (!attempt) throw new HttpError(404, 'Assessment result was not found.');
  return toResultRecord(attempt, attempt.subject);
}

// Parent-site flow: "open result in a new tab". The parent backend exchanges
// its service key for a short-lived signed URL it can hand to a browser; the
// frontend then loads the result through getResultByViewToken without ever
// seeing the candidate's attempt token.
export async function createResultViewLink(attemptId) {
  const attempt = await prisma.assessmentAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.status !== 'completed') {
    throw new HttpError(404, 'Completed assessment result was not found.');
  }

  const ttlMs = config.viewLinkTtlMinutes * 60 * 1000;
  const token = createViewToken(attempt.id, ttlMs, config.viewLinkSecret);
  const viewUrl = new URL(config.frontendUrl);
  viewUrl.searchParams.set('view_token', token);

  return {
    attemptId: attempt.id,
    viewUrl: viewUrl.toString(),
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
  };
}

// Convenience for parents that don't track attempt ids: resolve the
// subject's LATEST completed attempt and mint a view link for it.
export async function createLatestResultViewLink(sourceSystem, externalUserId) {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { status: 'completed', subject: { sourceSystem, externalUserId } },
    orderBy: { completedAt: 'desc' },
    select: { id: true, completedAt: true },
  });
  if (!attempt) throw new HttpError(404, 'No completed assessment result for this subject.');

  const link = await createResultViewLink(attempt.id);
  return { ...link, completedAt: attempt.completedAt.toISOString() };
}

export async function getResultByViewToken(viewToken) {
  const attemptId = verifyViewToken(viewToken, config.viewLinkSecret);
  if (!attemptId) throw new HttpError(401, 'View link is invalid or has expired.');

  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: attemptId, status: 'completed' },
    include: { subject: true },
  });
  if (!attempt) throw new HttpError(404, 'Assessment result was not found.');

  // Read-only HR view: same record shape minus the raw question responses.
  const { responses, ...record } = toResultRecord(attempt, attempt.subject);
  return { ...record, viewOnly: true };
}

export async function listSubjectResults(sourceSystem, externalUserId) {
  const attempts = await prisma.assessmentAttempt.findMany({
    where: { status: 'completed', subject: { sourceSystem, externalUserId } },
    include: { subject: true },
    orderBy: { completedAt: 'desc' },
  });
  return attempts.map((attempt) => toResultRecord(attempt, attempt.subject));
}

function validateSubjectInput(input) {
  if (!input || !isString(input.sourceSystem) || !isString(input.externalUserId)) {
    throw new HttpError(400, 'sourceSystem and externalUserId are required.');
  }
}

function isString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// Maps a completed AssessmentAttempt (+ its subject) to the API response
// shape. `id` and `attemptId` are both the attempt id — kept as separate keys
// so the response shape survives the results-table merge unchanged. The
// *_json columns are NVARCHAR(MAX) strings on SQL Server, so they are parsed
// back into objects here.
function toResultRecord(result, subject) {
  return {
    id: result.id,
    attemptId: result.id,
    userId: subject.externalUserId,
    user: {
      id: subject.externalUserId,
      email: subject.emailSnapshot,
      name: subject.displayNameSnapshot,
    },
    source: 'service-api',
    completedAt: result.completedAt.toISOString(),
    result: {
      code: result.mbtiCode,
      softCode: result.softCode,
      axes: JSON.parse(result.axesJson),
      bars: JSON.parse(result.barsJson),
      confidence: JSON.parse(result.confidenceJson),
      midzones: JSON.parse(result.midzonesJson),
      facets: JSON.parse(result.facetsJson),
    },
    responses: JSON.parse(result.responsesJson),
  };
}
