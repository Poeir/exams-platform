// Notify the embedding parent site (empeo) that the assessment finished,
// carrying the server-scored result so the parent can persist its own copy —
// used when the app runs inside an <iframe> the parent embeds, in place of the
// callback_url webhook. The result here is what the server returned on complete
// (already scored server-side); the iframe only relays it.
//
// We never post to '*': the target/sender origin is matched against a hardcoded
// allowlist. document.referrer (the embedding page's URL) decides which allowed
// origin to send to. A no-op outside an iframe or when the embedder isn't
// allowlisted, so standalone runs and unknown hosts never receive anything.
const ALLOWED_PARENT_ORIGINS = [
  'https://app.empeo.com', // prod  (TODO: confirm the real empeo origin)
  'https://uat.empeo.com', // uat   (TODO)
  'http://localhost:3000', // local gateway / dev
  'http://localhost:8080', // local dev (TODO: confirm the real dev origin)
];

function resolveParentOrigin() {
  try {
    const ref = document.referrer ? new URL(document.referrer).origin : '';
    return ALLOWED_PARENT_ORIGINS.includes(ref) ? ref : null;
  } catch {
    return null;
  }
}

export function notifyParentCompleted(attemptId, result) {
  if (typeof window === 'undefined' || window.parent === window) return; // not embedded
  const target = resolveParentOrigin();
  if (!target) return; // embedder not allowlisted → don't leak
  window.parent.postMessage({ type: 'EXAM_COMPLETED', attemptId, result }, target);
}
