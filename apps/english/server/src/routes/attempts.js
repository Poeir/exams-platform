import { Router } from 'express';
import { randomUUID, randomBytes } from 'node:crypto';
import { prisma } from '../db.js';
import { rowToPaper, rowToSection, rowToItem, publicItem, paperVariant } from '../shape.js';
import { toDbJson, fromDbJson } from '../json.js';
import { scoreAnswers } from '../scoring.js';
import { levelFor } from '../cefr.js';
import { requireParentAuth } from '../middleware/parentAuth.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { deliverResult } from '../webhook.js';
import { createViewToken, verifyViewToken, viewLinkTtlMs } from '../viewToken.js';
import { log } from '../logger.js';

const router = Router();

const ttlMin = () => Number(process.env.LAUNCH_TOKEN_TTL_MIN) || 30;
const defaultLimit = () => Number(process.env.DEFAULT_TIME_LIMIT_MIN) || 60;
// Public URL of THIS engine as seen by browsers, used to mint launch/view
// links. Resolution order: explicit ENGINE_PUBLIC_URL → gateway-wide
// PUBLIC_BASE_URL + /english (the mount prefix) → standalone-dev Vite origin.
const enginePublicUrl = () => (
  process.env.ENGINE_PUBLIC_URL
  || (process.env.PUBLIC_BASE_URL && `${process.env.PUBLIC_BASE_URL.replace(/\/$/, '')}/english`)
  || 'http://localhost:5175'
).replace(/\/$/, '');

function rowToAttempt(row) {
  return {
    id: row.id,
    paper_id: row.paper_id,
    subject_id: row.subject_id,
    // Identity lives on shared.subjects — populated when the query joined the
    // `subject` relation (admin/parent views); null on candidate-facing rows.
    source_system: row.subject ? row.subject.source_system : null,
    external_user_id: row.subject ? row.subject.external_user_id : null,
    status: row.status,
    answers: fromDbJson(row.answers, {}),
    correct_total: row.correct_total,
    max_total: row.max_total,
    cefr_level: row.cefr_level,
    cefr_label: row.cefr_label,
    result: fromDbJson(row.result, null),
    time_limit_min: row.time_limit_min,
    started_at: row.started_at,
    submitted_at: row.submitted_at,
    expires_at: row.expires_at,
  };
}

// Loads the paper with its sections + items in the same shape GET /api/papers/:id
// uses. `withAnswers=false` strips the answer key / explanation for taker view.
async function loadPaper(paperId, withAnswers) {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    include: {
      sections: {
        orderBy: [{ part_number: 'asc' }, { order_index: 'asc' }, { id: 'asc' }],
        include: { items: { orderBy: [{ order_index: 'asc' }, { id: 'asc' }] } },
      },
    },
  });
  if (!paper) return null;

  const shapeItems = (items) => {
    const shaped = items.map(rowToItem);
    return withAnswers ? shaped : shaped.map(publicItem);
  };
  const sections = paper.sections.map((s) => rowToSection(s, shapeItems(s.items)));
  return { paper: rowToPaper(paper), sections };
}

// Items + their section name for scoring. The answer key never leaves the server.
async function loadAnswerKey(paperId, client = prisma) {
  const items = await client.item.findMany({
    where: { section: { paper_id: paperId } },
    select: { id: true, correct_answer: true, section: { select: { name: true } } },
  });
  return items.map((i) => ({ id: i.id, correct_answer: i.correct_answer, section_name: i.section.name }));
}

// 1. Parent backend → POST /api/sessions
//    Creates a pending attempt + one-time launch_token. Returns the launch_url
//    the parent should open in a new tab for the candidate.
router.post('/sessions', requireParentAuth, async (req, res, next) => {
  try {
    const {
      paper_id,
      // Candidate identity in the parent's system (mirrors the mbti engine's
      // contract). Parents that launch both engines should send the SAME
      // source_system + external_user_id to both, so one person maps to one
      // shared.subjects row across services. `user_ref` is accepted as a
      // legacy alias for external_user_id from pre-Phase-2 integrations.
      external_user_id: externalUserIdInput = null,
      user_ref = null,
      source_system = 'english',
      email = null,
      display_name = null,
      callback_url = null,
      time_limit_min,
    } = req.body || {};
    if (!paper_id) return res.status(400).json({ error: 'paper_id is required' });
    const external_user_id = externalUserIdInput || user_ref;

    const paper = await prisma.paper.findUnique({
      where: { id: paper_id },
      select: { id: true, time_limit_min: true },
    });
    if (!paper) return res.status(404).json({ error: 'Paper not found' });

    // Cross-service identity (shared.subjects): one row per
    // (source_system, external_user_id). The upsert keeps the latest
    // non-empty snapshot without clobbering an existing value with null —
    // same behaviour as the mbti engine.
    let subject = null;
    if (external_user_id) {
      subject = await prisma.subject.upsert({
        where: {
          source_system_external_user_id: { source_system, external_user_id },
        },
        update: {
          ...(email ? { email_snapshot: email } : {}),
          ...(display_name ? { display_name_snapshot: display_name } : {}),
        },
        create: {
          source_system,
          external_user_id,
          email_snapshot: email,
          display_name_snapshot: display_name,
        },
      });
    }

    const id = randomUUID();
    const token = randomBytes(24).toString('base64url');
    const limit = Number.isFinite(Number(time_limit_min))
      ? Number(time_limit_min)
      : (paper.time_limit_min || defaultLimit());

    const expires = new Date(Date.now() + ttlMin() * 60_000);

    const attempt = await prisma.attempt.create({
      data: {
        id,
        paper_id,
        subject_id: subject ? subject.id : null,
        status: 'pending',
        launch_token: token,
        launch_token_expires_at: expires,
        callback_url,
        time_limit_min: limit,
      },
    });

    res.locals.attempt_id = id;
    res.locals.paper_id = paper_id;
    req.log.info('session_created', {
      attempt_id: id,
      paper_id,
      source_system,
      external_user_id,
      time_limit_min: limit,
      has_callback: !!callback_url,
      expires_at: expires.toISOString(),
    });

    res.status(201).json({
      attempt: rowToAttempt({ ...attempt, subject }),
      launch_token: token,
      launch_token_expires_at: expires.toISOString(),
      launch_url: `${enginePublicUrl()}/exam?t=${encodeURIComponent(token)}`,
    });
  } catch (err) { next(err); }
});

// Anonymous attempt: a candidate walked in via the public URL (no parent
// hand-off). Same row shape as a launched attempt but subject_id/callback_url
// stay null, no launch_token is involved, and status drops straight to
// 'in_progress'. paper_id is optional — defaults to the most recent FULL
// paper (variant keyed off the paper name, see paperVariant) so seeding the
// short paper later can't silently flip the public landing page; falls back
// to the most recent paper of any kind when no full paper exists.
router.post('/attempts/anonymous', async (req, res, next) => {
  try {
    let paperId = req.body && req.body.paper_id;
    let limit;
    if (paperId) {
      const p = await prisma.paper.findUnique({ where: { id: paperId }, select: { id: true, time_limit_min: true } });
      if (!p) return res.status(404).json({ error: 'Paper not found' });
      limit = p.time_limit_min || defaultLimit();
    } else {
      const candidates = await prisma.paper.findMany({
        orderBy: { created_at: 'desc' },
        select: { id: true, name: true, time_limit_min: true },
      });
      if (candidates.length === 0) return res.status(404).json({ error: 'No papers available' });
      const p = candidates.find((c) => paperVariant(c.name) === 'full') || candidates[0];
      paperId = p.id;
      limit = p.time_limit_min || defaultLimit();
    }

    const id = randomUUID();
    const started = new Date();
    const expiresAt = new Date(started.getTime() + limit * 60_000);

    const attempt = await prisma.attempt.create({
      data: {
        id,
        paper_id: paperId,
        status: 'in_progress',
        started_at: started,
        expires_at: expiresAt,
        time_limit_min: limit,
      },
    });

    const paper = await loadPaper(paperId, false);
    res.locals.attempt_id = id;
    res.locals.paper_id = paperId;
    req.log.info('attempt_started_anonymous', {
      attempt_id: id,
      paper_id: paperId,
      time_limit_min: limit,
      expires_at: expiresAt.toISOString(),
    });
    res.status(201).json({ attempt: rowToAttempt(attempt), paper });
  } catch (err) { next(err); }
});

// Mark an in-flight anonymous attempt as 'expired' — called by the browser
// when it's about to spin up a fresh attempt (page refresh inside /exam).
// Restricted to anonymous rows: parent-launched attempts (subject_id or
// callback_url set) must NOT be discarded by an unauthenticated caller, since
// abandoning would skip the result webhook the parent is waiting on.
// No-op on rows that are already terminal (submitted/expired).
router.post('/attempts/:id/abandon', async (req, res, next) => {
  try {
    const { count } = await prisma.attempt.updateMany({
      where: { id: req.params.id, status: 'in_progress', subject_id: null, callback_url: null },
      data: { status: 'expired' },
    });
    res.locals.attempt_id = req.params.id;
    req.log.info('attempt_abandoned', { attempt_id: req.params.id, abandoned: count > 0 });
    res.json({ abandoned: count > 0 });
  } catch (err) { next(err); }
});

// 2 + 3. Engine consumes the token → in_progress.
//    The candidate's browser POSTs the token here on landing at /exam?t=...
//    Returns the attempt id + the paper in taker view. The token is single-use:
//    cleared on success so a refresh can't restart the attempt. The status guard
//    in the updateMany is an atomic compare-and-set, so two concurrent consumes
//    can't both win.
router.post('/attempts/consume', async (req, res, next) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token is required' });

    const result = await prisma.$transaction(async (tx) => {
      // findFirst, not findUnique: launch_token's uniqueness is enforced by a
      // FILTERED unique index (WHERE launch_token IS NOT NULL) that Prisma's
      // schema language can't express, so the column carries no @unique.
      const a = await tx.attempt.findFirst({ where: { launch_token: token } });
      if (!a) return { error: 'invalid_token' };
      if (a.status !== 'pending') return { error: 'token_already_used' };
      if (a.launch_token_expires_at && new Date(a.launch_token_expires_at) < new Date()) {
        await tx.attempt.update({
          where: { id: a.id },
          data: { status: 'expired', launch_token: null },
        });
        return { error: 'token_expired' };
      }

      const started = new Date();
      const expiresAt = a.time_limit_min
        ? new Date(started.getTime() + a.time_limit_min * 60_000)
        : null;

      const upd = await tx.attempt.updateMany({
        where: { id: a.id, status: 'pending' },
        data: {
          status: 'in_progress',
          started_at: started,
          expires_at: expiresAt,
          launch_token: null,
          launch_token_expires_at: null,
        },
      });
      if (upd.count === 0) return { error: 'token_already_used' };

      const attempt = await tx.attempt.findUnique({ where: { id: a.id } });
      return { attempt };
    });

    if (result.error) {
      req.log.warn('attempt_consume_failed', { reason: result.error });
      const code = result.error === 'invalid_token' ? 404 : 410;
      return res.status(code).json({ error: result.error });
    }

    const paper = await loadPaper(result.attempt.paper_id, false);
    res.locals.attempt_id = result.attempt.id;
    res.locals.paper_id = result.attempt.paper_id;
    req.log.info('attempt_consumed', {
      attempt_id: result.attempt.id,
      paper_id: result.attempt.paper_id,
      subject_id: result.attempt.subject_id,
      expires_at: result.attempt.expires_at,
    });
    res.json({ attempt: rowToAttempt(result.attempt), paper });
  } catch (err) { next(err); }
});

// Parent backend → short-lived signed URL for "open result in a new tab".
// Mirrors the mbti engine's POST /assessment-attempts/:id/view-link.
router.post('/attempts/:id/view-link', requireParentAuth, async (req, res, next) => {
  try {
    const attempt = await prisma.attempt.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true },
    });
    if (!attempt || attempt.status !== 'submitted') {
      return res.status(404).json({ error: 'submitted attempt not found' });
    }

    const token = createViewToken(attempt.id);
    req.log.info('result_view_link_created', { attempt_id: attempt.id });
    res.status(201).json({
      attempt_id: attempt.id,
      view_url: `${enginePublicUrl()}/result?vt=${encodeURIComponent(token)}`,
      expires_at: new Date(Date.now() + viewLinkTtlMs()).toISOString(),
    });
  } catch (err) { next(err); }
});

// Browser (opened by the parent site) → read-only result via the signed token.
// Declared before /attempts/:id so 'view' is not swallowed by the param route.
// Returns a display summary only — no answer key, no raw answer map.
router.get('/attempts/view', async (req, res, next) => {
  try {
    const attemptId = verifyViewToken(req.query.vt);
    if (!attemptId) return res.status(401).json({ error: 'view link is invalid or has expired' });

    const row = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        subject: true,
        paper: { select: { name: true } },
      },
    });
    if (!row || row.status !== 'submitted') {
      return res.status(404).json({ error: 'submitted attempt not found' });
    }

    res.json({
      view_only: true,
      attempt_id: row.id,
      paper_id: row.paper_id,
      paper_name: row.paper ? row.paper.name : null,
      display_name: row.subject ? row.subject.display_name_snapshot : null,
      external_user_id: row.subject ? row.subject.external_user_id : null,
      source_system: row.subject ? row.subject.source_system : null,
      submitted_at: row.submitted_at,
      correct_total: row.correct_total,
      max_total: row.max_total,
      cefr_level: row.cefr_level,
      cefr_label: row.cefr_label,
      result: fromDbJson(row.result, null),
    });
  } catch (err) { next(err); }
});

// Resume / status check. The browser hits this on reload to recover the
// in-flight attempt (answers + remaining time).
router.get('/attempts/:id', async (req, res, next) => {
  try {
    const attempt = await prisma.attempt.findUnique({ where: { id: req.params.id } });
    if (!attempt) return res.status(404).json({ error: 'attempt not found' });
    res.json({ attempt: rowToAttempt(attempt) });
  } catch (err) { next(err); }
});

// 4. Autosave answers (replace the whole map — small, < 200 keys typically).
//    Rejects writes once the attempt is no longer in_progress or has expired.
router.patch('/attempts/:id/answers', async (req, res, next) => {
  try {
    const { answers } = req.body || {};
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'answers object required' });
    }

    const cur = await prisma.attempt.findUnique({
      where: { id: req.params.id },
      select: { status: true, expires_at: true },
    });
    if (!cur) return res.status(404).json({ error: 'attempt not found' });
    if (cur.status !== 'in_progress') {
      return res.status(409).json({ error: `attempt is ${cur.status}` });
    }
    if (cur.expires_at && new Date(cur.expires_at) < new Date()) {
      return res.status(409).json({ error: 'attempt expired' });
    }

    const attempt = await prisma.attempt.update({
      where: { id: req.params.id },
      data: { answers: toDbJson(answers) },
    });
    res.locals.attempt_id = req.params.id;
    req.log.debug('answers_autosaved', {
      attempt_id: req.params.id,
      answers_count: Object.keys(answers).length,
    });
    res.json({ attempt: rowToAttempt(attempt) });
  } catch (err) { next(err); }
});

// 5. Submit → score against the key, snapshot into result/cefr/totals, mark
//    submitted, then push to callback_url out-of-band. Idempotent: submitting
//    an already-submitted attempt returns the existing snapshot. The
//    status-guarded updateMany is an atomic compare-and-set against double-submit.
router.post('/attempts/:id/submit', async (req, res, next) => {
  try {
    const id = req.params.id;
    const incomingAnswers = req.body && req.body.answers && typeof req.body.answers === 'object'
      ? req.body.answers
      : null;

    const snapshot = await prisma.$transaction(async (tx) => {
      const a = await tx.attempt.findUnique({ where: { id } });
      if (!a) return { error: 'not_found' };
      if (a.status === 'submitted') return { already: true, attempt: a };
      if (a.status !== 'in_progress') return { error: `attempt is ${a.status}` };

      const finalAnswers = incomingAnswers || fromDbJson(a.answers, {});

      const keyRows = await loadAnswerKey(a.paper_id, tx);
      const result = scoreAnswers(keyRows, finalAnswers);
      const correctTotal = result.skills.total.correct;
      const maxTotal = result.skills.total.total;
      const lvl = levelFor(correctTotal);

      const upd = await tx.attempt.updateMany({
        where: { id, status: 'in_progress' },
        data: {
          status: 'submitted',
          answers: toDbJson(finalAnswers),
          result: toDbJson(result),
          correct_total: correctTotal,
          max_total: maxTotal,
          cefr_level: lvl.level,
          cefr_label: lvl.label,
          submitted_at: new Date(),
        },
      });
      // Lost the race to a concurrent submit — return whatever the winner wrote.
      if (upd.count === 0) {
        const cur = await tx.attempt.findUnique({ where: { id } });
        if (cur && cur.status === 'submitted') return { already: true, attempt: cur };
        return { error: `attempt is ${cur ? cur.status : 'not_found'}` };
      }

      const attempt = await tx.attempt.findUnique({ where: { id } });
      return { attempt };
    });

    if (snapshot.error) {
      req.log.warn('attempt_submit_failed', { attempt_id: id, reason: snapshot.error });
      const code = snapshot.error === 'not_found' ? 404 : 409;
      return res.status(code).json({ error: snapshot.error });
    }

    res.locals.attempt_id = snapshot.attempt.id;
    res.locals.paper_id = snapshot.attempt.paper_id;
    if (snapshot.already) {
      req.log.info('attempt_submit_idempotent', { attempt_id: snapshot.attempt.id });
    } else {
      req.log.info('attempt_submitted', {
        attempt_id: snapshot.attempt.id,
        paper_id: snapshot.attempt.paper_id,
        subject_id: snapshot.attempt.subject_id,
        correct_total: snapshot.attempt.correct_total,
        max_total: snapshot.attempt.max_total,
        cefr_level: snapshot.attempt.cefr_level,
        has_callback: !!snapshot.attempt.callback_url,
      });
    }

    // Fire-and-forget webhook on the first submit. On idempotent re-submits we
    // skip — the original delivery already drained (or is being retried).
    if (!snapshot.already && snapshot.attempt.callback_url) {
      deliverResult(snapshot.attempt.id).catch((e) =>
        log.error('webhook_dispatch_error', {
          attempt_id: snapshot.attempt.id,
          err_message: e && e.message,
        })
      );
    }

    res.json({ attempt: rowToAttempt(snapshot.attempt) });
  } catch (err) { next(err); }
});

// Parent-triggered webhook retry. Useful when the parent missed the first push
// (e.g. their endpoint was down). Auth-gated since it triggers outbound POSTs.
router.post('/attempts/:id/redeliver', requireParentAuth, async (req, res, next) => {
  try {
    res.locals.attempt_id = req.params.id;
    req.log.info('webhook_redeliver_requested', { attempt_id: req.params.id });
    const ok = await deliverResult(req.params.id);
    res.json({ delivered: ok });
  } catch (err) { next(err); }
});

// Per-person result history — mirrors the mbti engine's
// GET /api/v1/subjects/:sourceSystem/:externalUserId/results, so the parent
// can query both engines symmetrically. Submitted attempts only, newest first.
router.get('/subjects/:source_system/:external_user_id/results', requireParentAuth, async (req, res, next) => {
  try {
    const rows = await prisma.attempt.findMany({
      where: {
        status: 'submitted',
        subject: {
          source_system: req.params.source_system,
          external_user_id: req.params.external_user_id,
        },
      },
      orderBy: { submitted_at: 'desc' },
      include: { subject: true },
    });
    res.json({ results: rows.map(rowToAttempt) });
  } catch (err) { next(err); }
});

// Attempt-id-free "view result" — mints a view link for the subject's LATEST
// submitted attempt, so a parent only ever needs its own user id. Mirrors the
// mbti engine's POST /subjects/.../view-link.
router.post('/subjects/:source_system/:external_user_id/view-link', requireParentAuth, async (req, res, next) => {
  try {
    const attempt = await prisma.attempt.findFirst({
      where: {
        status: 'submitted',
        subject: {
          source_system: req.params.source_system,
          external_user_id: req.params.external_user_id,
        },
      },
      orderBy: { submitted_at: 'desc' },
      select: { id: true, submitted_at: true },
    });
    if (!attempt) return res.status(404).json({ error: 'no submitted attempt for this subject' });

    const token = createViewToken(attempt.id);
    req.log.info('subject_view_link_created', {
      attempt_id: attempt.id,
      source_system: req.params.source_system,
    });
    res.status(201).json({
      attempt_id: attempt.id,
      submitted_at: attempt.submitted_at,
      view_url: `${enginePublicUrl()}/result?vt=${encodeURIComponent(token)}`,
      expires_at: new Date(Date.now() + viewLinkTtlMs()).toISOString(),
    });
  } catch (err) { next(err); }
});

// Admin / debugging — list recent attempts. Parent-auth gated since attempts
// carry candidate identity and scores.
router.get('/attempts', requireParentAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const attempts = await prisma.attempt.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      include: { subject: true },
    });
    res.json(attempts.map(rowToAttempt));
  } catch (err) { next(err); }
});

// Admin SPA — list attempts with paper name joined for the history view.
// Basic-auth gated (same creds as the rest of the admin endpoints).
router.get('/admin/attempts', requireAdmin, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const attempts = await prisma.attempt.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      select: {
        id: true, paper_id: true, subject_id: true, status: true,
        correct_total: true, max_total: true, cefr_level: true, cefr_label: true,
        time_limit_min: true, created_at: true, started_at: true, submitted_at: true, expires_at: true,
        paper: { select: { name: true } },
        subject: { select: { source_system: true, external_user_id: true, display_name_snapshot: true } },
      },
    });
    res.json(attempts.map(({ paper, subject, ...a }) => ({
      ...a,
      paper_name: paper ? paper.name : null,
      source_system: subject ? subject.source_system : null,
      external_user_id: subject ? subject.external_user_id : null,
      display_name: subject ? subject.display_name_snapshot : null,
    })));
  } catch (err) { next(err); }
});

// Admin SPA — full attempt detail: the row + the paper bundle with full items
// (including correct_answer + explanation), so the UI can render a Q-by-Q
// right/wrong breakdown of what the candidate submitted.
router.get('/admin/attempts/:id', requireAdmin, async (req, res, next) => {
  try {
    const row = await prisma.attempt.findUnique({
      where: { id: req.params.id },
      include: { subject: true },
    });
    if (!row) return res.status(404).json({ error: 'attempt not found' });
    const attempt = rowToAttempt(row);
    const bundle = await loadPaper(attempt.paper_id, true);
    res.json({ attempt, paper: bundle?.paper || null, sections: bundle?.sections || [] });
  } catch (err) { next(err); }
});

export default router;
