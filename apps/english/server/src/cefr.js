// Mirrors LEVEL_GUIDE in src/screens/Results.jsx so the server-side snapshot
// stored on an attempt matches what the candidate sees on the results screen.
// Bands are inclusive on both ends and key off total correct (out of 50).
const LEVELS = [
  { level: 1, min: 0,  max: 15, label: 'Beginner' },
  { level: 2, min: 16, max: 24, label: 'Elementary' },
  { level: 3, min: 25, max: 33, label: 'Intermediate' },
  { level: 4, min: 34, max: 41, label: 'Upper-Intermediate' },
  { level: 5, min: 42, max: 50, label: 'Advanced' },
];

export function levelFor(correctTotal) {
  const n = Number(correctTotal) || 0;
  return LEVELS.find((l) => n >= l.min && n <= l.max) || LEVELS[0];
}
