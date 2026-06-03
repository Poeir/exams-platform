// Banding tables keyed off RAW total correct, per paper variant (see
// paperVariant() in shape.js — variant comes from the paper NAME).
//
// full — labels mirror LEVEL_GUIDE in src/screens/Results.jsx so the
// server-side snapshot stored on an attempt (and pushed to the parent via
// webhook) matches what the candidate/HR sees on the results screen. The
// screen bands on the normalized 0–100 score; the equivalent raw cutoffs out
// of 50 are below (raw r → percent 2r, so the level numbers line up exactly).
// Bands are inclusive on both ends.
const FULL_LEVELS = [
  { level: 1, min: 0,  max: 15, label: 'Novice' },
  { level: 2, min: 16, max: 24, label: 'Beginner' },
  { level: 3, min: 25, max: 33, label: 'Intermediate' },
  { level: 4, min: 34, max: 41, label: 'Advanced' },
  { level: 5, min: 42, max: 50, label: 'Expert' },
];

// short — the 20-item placement paper's 3-band mapping (assessment team's
// rule): 0–6 Beginner, 7–15 Intermediate, 16–20 Advanced. Mirrors
// SHORT_LEVEL_GUIDE in src/screens/Results.jsx.
const SHORT_LEVELS = [
  { level: 1, min: 0,  max: 6,  label: 'Beginner' },
  { level: 2, min: 7,  max: 15, label: 'Intermediate' },
  { level: 3, min: 16, max: 20, label: 'Advanced' },
];

export function levelFor(correctTotal, variant = 'full') {
  const levels = variant === 'short' ? SHORT_LEVELS : FULL_LEVELS;
  const n = Number(correctTotal) || 0;
  return levels.find((l) => n >= l.min && n <= l.max) || levels[0];
}
