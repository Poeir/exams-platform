// ============================================================
// Quiz path — computes the ordered list of scenarios the user
// will see, given their current answers.
//
// The path is fixed except at q9, which branches based on the
// `next` field carried on Q8's selected option.
// ============================================================
import { SCENARIOS } from '../data.js';

const LINEAR_ORDER = [
  'q1', 'q15', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7',
  'q8', 'q9-stress', 'q10', 'q17', 'q11', 'q16', 'q12', 'q18', 'q13', 'q14',
];

const BRANCH_AT = 'q9-stress';
const BRANCH_FROM = 'q8';

export function buildPath(answers) {
  const byId = Object.fromEntries(SCENARIOS.map(s => [s.id, s]));
  const path = [];
  const seen = new Set();

  for (const id of LINEAR_ORDER) {
    if (seen.has(id)) continue;
    if (id === BRANCH_AT) {
      const nextId = answers[BRANCH_FROM]?.next || BRANCH_AT;
      path.push(byId[nextId]);
      seen.add(nextId);
    } else {
      path.push(byId[id]);
      seen.add(id);
    }
  }
  return path;
}
