// Notify the embedding parent site (empeo) that the assessment finished,
// carrying the server-scored result so the parent can persist its own copy —
// used when the app runs inside an <iframe> the parent embeds, in place of the
// callback_url webhook. The result here is what the server returned on complete
// (already scored server-side); the iframe only relays it.
//
// We never post to '*': the target/sender origin is matched against a hardcoded
// allowlist. document.referrer (the embedding page's URL) decides which allowed
// origin to send to. A no-op outside an iframe, so standalone runs never receive
// anything. Empty allowlist = allow every embedder (open for now — fill in
// before locking down).
const ALLOWED_PARENT_ORIGINS = [
  // 'https://app.empeo.com', // prod
  // 'https://uat.empeo.com', // uat
  // 'http://localhost:3000', // local gateway / dev
];

function resolveParentOrigin() {
  try {
    const ref = document.referrer ? new URL(document.referrer).origin : '';
    if (!ref) return null;
    // Empty allowlist = trust whatever origin embedded us.
    if (ALLOWED_PARENT_ORIGINS.length === 0) return ref;
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
