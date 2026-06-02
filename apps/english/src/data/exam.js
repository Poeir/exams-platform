// Pure transforms and helpers for exam content. Data comes from the API
// (see src/data/examRepo.js); this module is data-shape only.
import { withBase } from '../lib/base.js';

// Public mp3s referenced by absolute string paths, so they must be prefixed
// with the build-time base by hand (Vite only rewrites imported assets).
const PART_AUDIO = {
  1: withBase('/voice/03_photograph.mp3'),
  2: withBase('/voice/04_qa.mp3'),
  3: withBase('/voice/05_conversation.mp3'),
  4: withBase('/voice/06_short_talk.mp3'),
};

const PART_META = {
  1: { title: 'Photographs',           skill: 'listening', section: 'listening', showPassage: false },
  2: { title: 'Question — Response',   skill: 'listening', section: 'listening', showPassage: false },
  3: { title: 'Conversations',         skill: 'listening', section: 'listening', showPassage: true  },
  4: { title: 'Short Talks',           skill: 'listening', section: 'listening', showPassage: true  },
  5: { title: 'Vocabulary',            skill: 'vocabulary',section: 'reading',   showPassage: false },
  6: { title: 'Grammar',               skill: 'grammar',   section: 'reading',   showPassage: false },
  7: { title: 'Reading Comprehension', skill: 'reading',   section: 'reading',   showPassage: true  },
};

function parsePartNumber(name) {
  const m = name.match(/Part (\d+)/);
  return m ? Number(m[1]) : null;
}

// Build an `exam` object from a paper bundle in the same shape as the JSON file
// (`{ paper, sections }`). The API's GET /api/papers/:id returns exactly this shape.
export function buildExam(bundle) {
  if (!bundle || !bundle.paper) return null;
  const sections = bundle.sections || [];

  const byPart = {};
  for (const s of sections) {
    const part = parsePartNumber(s.name);
    if (!part) continue;
    byPart[part] = byPart[part] || [];
    byPart[part].push(s);
  }

  const parts = Object.keys(PART_META)
    .map(Number)
    .filter((n) => byPart[n])
    .map((n) => {
      const meta = PART_META[n];
      const sectionsForPart = byPart[n];

      const groups = meta.showPassage
        ? sectionsForPart.map((s) => ({
            id: s.id,
            label: s.name,
            cefr: s.cefr,
            passage: s.passage_content || null,
            items: s.items,
          }))
        : sectionsForPart.flatMap((s) =>
            s.items.map((it) => ({
              id: it.id,
              label: s.name,
              cefr: it.cefr_level || s.cefr,
              passage: null,
              items: [it],
            }))
          );

      const totalItems = groups.reduce((acc, g) => acc + g.items.length, 0);
      const timeMin = sectionsForPart.reduce((acc, s) => acc + (s.section_time_min || 0), 0);

      return {
        number: n,
        title: meta.title,
        skill: meta.skill,
        section: meta.section,
        showPassage: meta.showPassage,
        audio: PART_AUDIO[n] || null,
        groups,
        totalItems,
        timeMin,
      };
    });

  return {
    meta: bundle.paper,
    parts,
    flat: parts.flatMap((p) => p.groups.flatMap((g) => g.items.map((it) => ({ ...it, partNumber: p.number })))),
  };
}

export function partsBySection(exam, section) {
  if (!exam) return [];
  return exam.parts.filter((p) => p.section === section);
}

export function totalsBySection(exam, section) {
  const parts = partsBySection(exam, section);
  return {
    items: parts.reduce((s, p) => s + p.totalItems, 0),
    timeMin: parts.reduce((s, p) => s + p.timeMin, 0),
    parts: parts.length,
  };
}

export function getOptionLetters(item) {
  return Object.keys(item.options).filter((k) => k !== '_extras');
}

// Questions the test taker has not answered yet. `items` is a flat list of
// objects with an `id`; returns the ids (in order) that have no answer in
// `answers`. Used to warn before the final submit. A falsy value (missing or
// empty string) counts as unanswered, matching the question navigator's
// `answered` indicator (`!!answers[id]`).
export function unansweredItems(items, answers = {}) {
  if (!items) return [];
  return items.filter((it) => !answers[it.id]).map((it) => it.id);
}

// Scoring lives on the server (POST /api/papers/:id/score) so the answer key
// never reaches the client. See scorePaper() in src/data/examRepo.js.
