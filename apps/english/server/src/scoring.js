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
// their section: { id, correct_answer, section_name, section_skill }.
//
// Two paper structures are scored (mirrors buildExam in src/data/exam.js):
// - TOEIC-style: section names carry "Part N" → folded into PART_META parts.
// - Native (e.g. the short placement paper): no part number in the name, so
//   the skill comes from the section row and each section is its own entry in
//   the parts breakdown, in row order.
export function scoreAnswers(rows, answers = {}) {
  const parts = new Map(); // part number | section name -> entry
  let order = 0;
  const skills = {
    listening:  { correct: 0, total: 0 },
    vocabulary: { correct: 0, total: 0 },
    grammar:    { correct: 0, total: 0 },
    reading:    { correct: 0, total: 0 },
  };

  for (const row of rows) {
    const part = parsePartNumber(row.section_name);
    const meta = part ? PART_META[part] : null;
    const skillKey = meta ? meta.skill : row.section_skill;
    const sk = skills[skillKey];
    if (!sk) continue; // neither a known part nor a known skill — not scored

    const isCorrect = answers[row.id] != null && answers[row.id] === row.correct_answer;

    const key = meta ? part : row.section_name;
    if (!parts.has(key)) {
      parts.set(key, {
        part: meta ? part : null,
        title: meta ? meta.title : row.section_name,
        section: (meta ? meta.section : skillKey) === 'listening' ? 'Listening' : 'Reading',
        correct: 0,
        total: 0,
        // Numbered parts sort by part number; native sections keep row order
        // (the route orders rows by section order_index) after any numbered ones.
        order: meta ? part : 1000 + order++,
      });
    }
    const pe = parts.get(key);
    pe.total += 1;
    if (isCorrect) pe.correct += 1;

    sk.total += 1;
    if (isCorrect) sk.correct += 1;
  }

  const partsArr = [...parts.values()]
    .sort((a, b) => a.order - b.order)
    .map((v, i) => ({
      id: v.part ?? i + 1,
      title: v.title,
      section: v.section,
      correct: v.correct,
      total: v.total,
    }));

  skills.total = {
    correct: skills.listening.correct + skills.vocabulary.correct + skills.grammar.correct + skills.reading.correct,
    total:   skills.listening.total   + skills.vocabulary.total   + skills.grammar.total   + skills.reading.total,
  };

  return { parts: partsArr, skills };
}
