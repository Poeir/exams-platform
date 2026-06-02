// ============================================================
// Result export — transport-agnostic
// ------------------------------------------------------------
// The engine computes a result and hands it off; HOW it leaves
// (iframe postMessage / REST POST / redirect) is decided by the
// host app, which registers a transport via setResultTransport().
// Until one is registered, emitResult() is a safe no-op (logs in dev).
//
// Example wiring done once at app startup by the host integration:
//
//   import { setResultTransport } from './lib/resultExport.js';
//   // iframe embed:
//   setResultTransport((p) => window.parent.postMessage(
//     { type: 'mbti:result', payload: p }, MAIN_SITE_ORIGIN));
//   // or REST:
//   setResultTransport((p) => fetch(API_URL, {
//     method: 'POST', headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(p) }));
// ============================================================

import { scoreAnswers, overrideScoreCode } from './scoring.js';
import { RESULT_PAYLOAD_VERSION } from './resultContract.js';

export const PAYLOAD_VERSION = RESULT_PAYLOAD_VERSION;

// Build a serializable, transport-agnostic result payload.
// `meta` carries host-supplied context: { attemptId, userId, resultCodeOverride }.
export function buildExportPayload(answers, meta = {}) {
  const scored = meta.resultCodeOverride
    ? overrideScoreCode(scoreAnswers(answers), meta.resultCodeOverride)
    : scoreAnswers(answers);

  return {
    version: PAYLOAD_VERSION,
    attemptId: meta.attemptId ?? null,
    sessionId: meta.sessionId ?? null,
    userId: meta.userId ?? null,
    completedAt: new Date().toISOString(),
    result: {
      code: scored.code,
      softCode: scored.softCode,
      axes: scored.axes,
      bars: scored.bars,
      confidence: scored.confidence,
      midzones: scored.midzones,
      facets: scored.facets,
    },
    responses: summarizeResponses(answers),
  };
}

// Condense raw answers to just what an audit needs — drop hidden weights.
// mcq/chat → optionId string; slider → { distribution }.
function summarizeResponses(answers = {}) {
  const out = {};
  for (const [qid, ans] of Object.entries(answers)) {
    if (!ans) continue;
    out[qid] = ans.distribution ? { distribution: ans.distribution } : ans.optionId;
  }
  return out;
}

// --- Pluggable transport (registered by the host app) ---
let transport = null;

// Register how completed payloads leave the engine. Returns an unsubscribe fn.
export function setResultTransport(fn) {
  transport = typeof fn === 'function' ? fn : null;
  return () => {
    if (transport === fn) transport = null;
  };
}

// Send a completed result through the registered transport.
// No-ops safely (logs in dev) until a transport is set, so the
// quiz flow never breaks when integration isn't wired yet.
export function emitResult(payload) {
  if (transport) return transport(payload);
  if (import.meta.env.DEV) {
    console.info('[result-export] no transport registered; payload ready:', payload);
  }
  return undefined;
}
