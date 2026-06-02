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

const SKILLS = new Set(['listening', 'vocabulary', 'grammar', 'reading']);

// Candidate-facing titles for native-structure parts: the skill only — the
// section's CEFR band (e.g. "Grammar A2") stays internal so the test taker
// can't see the difficulty ramp. Admin/result breakdowns keep the full name.
const SKILL_TITLES = {
  listening: 'Listening',
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  reading: 'Reading',
};

// Build an `exam` object from a paper bundle in the same shape as the JSON file
// (`{ paper, sections }`). The API's GET /api/papers/:id returns exactly this shape.
//
// Two structures are supported, keyed off the section NAMES:
// - TOEIC-style (the full paper): section names carry "Part N" and are folded
//   into the fixed PART_META parts (audio, titles, ordering by part number).
// - Native (the short placement paper): no section has a part number, so each
//   section becomes its own part, in bundle order, titled by its real section
//   name and skilled by its `skill` column. Sections with a passage render as
//   one passage+items group; the rest get one item per group.
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

  const parts = Object.keys(byPart).length > 0
    ? Object.keys(PART_META)
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
        })
    : sections.map((s, i) => {
        const skill = SKILLS.has(s.skill) ? s.skill : 'reading';
        const showPassage = !!(s.passage_content && String(s.passage_content).trim());

        const groups = showPassage
          ? [{
              id: s.id,
              label: s.name,
              cefr: s.cefr,
              passage: s.passage_content,
              items: s.items,
            }]
          : (s.items || []).map((it) => ({
              id: it.id,
              label: s.name,
              cefr: it.cefr_level || s.cefr,
              passage: null,
              items: [it],
            }));

        return {
          number: i + 1,
          title: SKILL_TITLES[skill],
          skill,
          section: skill === 'listening' ? 'listening' : 'reading',
          showPassage,
          audio: null,
          groups,
          totalItems: groups.reduce((acc, g) => acc + g.items.length, 0),
          timeMin: s.section_time_min || 0,
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

// Which question set a paper is, keyed off its NAME — mirrors paperVariant()
// in server/src/shape.js. A paper named with the word "short" (or Thai
// "สั้น") is the short set; everything else is the full set. Used to pick the
// score-band guide on the result screens.
export function paperVariant(name) {
  const n = name || '';
  return /\bshort\b/i.test(n) || n.includes('สั้น') ? 'short' : 'full';
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
