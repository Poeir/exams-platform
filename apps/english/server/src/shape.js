import { fromDbJson } from './json.js';

export function rowToPaper(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    total_score: row.total_score,
    time_limit_min: row.time_limit_min,
    created_at: row.created_at,
    completed_at: row.completed_at,
  };
}

export function rowToSection(row, items = []) {
  return {
    id: row.id,
    name: row.name,
    skill: row.skill,
    cefr: row.cefr,
    topic: row.topic,
    passage_length: row.passage_length,
    item_count: row.item_count,
    section_score: row.section_score,
    section_time_min: row.section_time_min,
    passage_id: row.passage_id,
    passage_content: row.passage_content,
    items,
  };
}

export function rowToItem(row) {
  const options = fromDbJson(row.options, {});
  const extras = fromDbJson(row.extras, {});
  return {
    id: row.id,
    stem: row.stem,
    question_type: row.question_type,
    options: { ...options, _extras: extras },
    cefr_level: row.cefr_level,
    difficulty_band: row.difficulty_band,
    score_weight: row.score_weight == null ? null : Number(row.score_weight),
    objective: row.objective,
    tags: fromDbJson(row.tags, []),
    correct_answer: row.correct_answer,
    explanation: row.explanation,
    judge_score: row.judge_score == null ? null : Number(row.judge_score),
  };
}

// Exam-taker view of an item: drop the answer key and the explanation so they
// never reach the client during a test. Admin fetches keep the full shape.
export function publicItem(item) {
  const { correct_answer, explanation, ...rest } = item;
  return rest;
}

export function splitOptions(rawOptions) {
  if (!rawOptions || typeof rawOptions !== 'object') {
    return { options: {}, extras: {} };
  }
  const { _extras, ...rest } = rawOptions;
  return { options: rest, extras: _extras || {} };
}

export function parsePartNumber(name) {
  const m = (name || '').match(/Part (\d+)/);
  return m ? Number(m[1]) : null;
}

// Which question set a paper is, keyed off its NAME — same convention as
// sections, whose "Part N" names are likewise load-bearing. A paper named
// with the word "short" (or Thai "สั้น") is the short set; everything else is
// the full set. Renaming a paper therefore changes which set it is — the
// /exam/short error message spells out the rule for admins.
export function paperVariant(name) {
  const n = name || '';
  return /\bshort\b/i.test(n) || n.includes('สั้น') ? 'short' : 'full';
}
