import { parsePartNumber } from './shape.js';

// Part → display title / skill / section. Labels only (not secret); mirrors
// PART_META in src/data/exam.js so the scored result matches the client's
// expected shape. Parts 1–4 are Listening, 5 Vocabulary, 6 Grammar, 7 Reading.
const PART_META = {
  1: { title: 'Photographs',           skill: 'listening',  section: 'listening' },
  2: { title: 'Question — Response',   skill: 'listening',  section: 'listening' },
  3: { title: 'Conversations',         skill: 'listening',  section: 'listening' },
  4: { title: 'Short Talks',           skill: 'listening',  section: 'listening' },
  5: { title: 'Vocabulary',            skill: 'vocabulary', section: 'reading'   },
  6: { title: 'Grammar',               skill: 'grammar',    section: 'reading'   },
  7: { title: 'Reading Comprehension', skill: 'reading',    section: 'reading'   },
};

// Compare submitted answers against the keys held in the DB and return only
// aggregate totals — never per-item correctness, so a test taker cannot
// brute-force the key by submitting repeatedly. `rows` are item rows joined to
// their section name: { id, correct_answer, section_name }.
export function scoreAnswers(rows, answers = {}) {
  const parts = new Map(); // partNumber -> { correct, total }
  const skills = {
    listening:  { correct: 0, total: 0 },
    vocabulary: { correct: 0, total: 0 },
    grammar:    { correct: 0, total: 0 },
    reading:    { correct: 0, total: 0 },
  };

  for (const row of rows) {
    const part = parsePartNumber(row.section_name);
    const meta = PART_META[part];
    if (!meta) continue;

    const isCorrect = answers[row.id] != null && answers[row.id] === row.correct_answer;

    if (!parts.has(part)) parts.set(part, { correct: 0, total: 0 });
    const pe = parts.get(part);
    pe.total += 1;
    if (isCorrect) pe.correct += 1;

    const sk = skills[meta.skill];
    if (sk) {
      sk.total += 1;
      if (isCorrect) sk.correct += 1;
    }
  }

  const partsArr = [...parts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([n, v]) => ({
      id: n,
      title: PART_META[n].title,
      section: PART_META[n].section === 'listening' ? 'Listening' : 'Reading',
      correct: v.correct,
      total: v.total,
    }));

  skills.total = {
    correct: skills.listening.correct + skills.vocabulary.correct + skills.grammar.correct + skills.reading.correct,
    total:   skills.listening.total   + skills.vocabulary.total   + skills.grammar.total   + skills.reading.total,
  };

  return { parts: partsArr, skills };
}
