import { describe, it, expect } from 'vitest';
import { buildExam, partsBySection, totalsBySection, getOptionLetters, unansweredItems, paperVariant } from './exam.js';

// A small bundle in the API's GET /api/papers/:id shape: { paper, sections }.
function makeBundle() {
  return {
    paper: { id: 'p1', name: 'Sample' },
    sections: [
      {
        id: 's1', name: 'Part 1', cefr: 'A2', section_time_min: 5,
        items: [{ id: 'i1' }, { id: 'i2' }],
      },
      {
        id: 's5', name: 'Part 5', cefr: 'B1', section_time_min: 10,
        items: [{ id: 'i3', cefr_level: 'B2' }],
      },
      {
        id: 's7', name: 'Part 7', cefr: 'B2', section_time_min: 15,
        passage_content: 'A passage', items: [{ id: 'i4' }, { id: 'i5' }],
      },
    ],
  };
}

describe('buildExam', () => {
  it('returns null for a missing bundle or missing paper', () => {
    expect(buildExam(null)).toBeNull();
    expect(buildExam({})).toBeNull();
    expect(buildExam({ sections: [] })).toBeNull();
  });

  it('builds parts ordered by part number with correct metadata', () => {
    const exam = buildExam(makeBundle());
    expect(exam.parts.map((p) => p.number)).toEqual([1, 5, 7]);
    expect(exam.parts[0]).toMatchObject({ title: 'Photographs', skill: 'listening', section: 'listening' });
    expect(exam.parts[2]).toMatchObject({ title: 'Reading Comprehension', section: 'reading' });
  });

  it('attaches audio paths only to listening parts that have them', () => {
    const exam = buildExam(makeBundle());
    expect(exam.parts.find((p) => p.number === 1).audio).toBe('/voice/03_photograph.mp3');
    expect(exam.parts.find((p) => p.number === 5).audio).toBeNull();
  });

  it('makes one group per item for non-passage parts', () => {
    const exam = buildExam(makeBundle());
    const part5 = exam.parts.find((p) => p.number === 5);
    expect(part5.showPassage).toBe(false);
    expect(part5.groups).toHaveLength(1);
    expect(part5.groups[0].items).toHaveLength(1);
    // item-level cefr_level overrides the section cefr
    expect(part5.groups[0].cefr).toBe('B2');
  });

  it('makes one group per section (passage + items) for passage parts', () => {
    const exam = buildExam(makeBundle());
    const part7 = exam.parts.find((p) => p.number === 7);
    expect(part7.showPassage).toBe(true);
    expect(part7.groups).toHaveLength(1);
    expect(part7.groups[0].passage).toBe('A passage');
    expect(part7.groups[0].items).toHaveLength(2);
  });

  it('computes totalItems and timeMin per part', () => {
    const exam = buildExam(makeBundle());
    expect(exam.parts.find((p) => p.number === 1)).toMatchObject({ totalItems: 2, timeMin: 5 });
    expect(exam.parts.find((p) => p.number === 7)).toMatchObject({ totalItems: 2, timeMin: 15 });
  });

  it('ignores sections whose name has no part number', () => {
    const bundle = makeBundle();
    bundle.sections.push({ id: 'sx', name: 'Warmup', items: [{ id: 'ix' }] });
    const exam = buildExam(bundle);
    expect(exam.parts.map((p) => p.number)).toEqual([1, 5, 7]);
  });

  it('flattens items with their partNumber attached', () => {
    const exam = buildExam(makeBundle());
    expect(exam.flat).toHaveLength(5);
    expect(exam.flat.find((it) => it.id === 'i3').partNumber).toBe(5);
    expect(exam.flat.find((it) => it.id === 'i4').partNumber).toBe(7);
  });

  it('defaults timeMin to 0 when section_time_min is missing', () => {
    const bundle = { paper: { id: 'p' }, sections: [{ id: 's', name: 'Part 1', items: [{ id: 'i' }] }] };
    expect(buildExam(bundle).parts[0].timeMin).toBe(0);
  });

  // Native-structure papers (the short placement paper): no section name has
  // a part number, so each section becomes its own part, in bundle order,
  // keeping the paper's real structure instead of the TOEIC part folding.
  describe('native structure (no "Part N" section names)', () => {
    const nativeBundle = () => ({
      paper: { id: 'p-native', name: 'Quick Placement Test (15 min) - Short' },
      sections: [
        { id: 's1', name: 'Grammar A2', skill: 'grammar', cefr: 'A2', section_time_min: 2, passage_content: '', items: [{ id: 'g1' }, { id: 'g2' }] },
        { id: 's2', name: 'Reading B1', skill: 'reading', cefr: 'B1', section_time_min: 3, passage_content: 'A memo', items: [{ id: 'r1' }, { id: 'r2' }] },
        { id: 's3', name: 'Grammar C1', skill: 'grammar', cefr: 'C1', section_time_min: 3, passage_content: '', items: [{ id: 'g3' }] },
      ],
    });

    it('keeps the bundle order and titles parts by skill (no CEFR band shown)', () => {
      const exam = buildExam(nativeBundle());
      expect(exam.parts.map((p) => [p.number, p.title])).toEqual([
        [1, 'Grammar'], [2, 'Reading'], [3, 'Grammar'],
      ]);
      // The real section name (with its band) stays on the group for
      // internal use — it is never shown as a candidate-facing title.
      expect(exam.parts[0].groups[0].label).toBe('Grammar A2');
    });

    it('takes skill from the section row, never attaches audio, and lands in the reading section', () => {
      const exam = buildExam(nativeBundle());
      expect(exam.parts.map((p) => p.skill)).toEqual(['grammar', 'reading', 'grammar']);
      expect(exam.parts.every((p) => p.audio === null)).toBe(true);
      expect(partsBySection(exam, 'listening')).toEqual([]);
      expect(partsBySection(exam, 'reading')).toHaveLength(3);
    });

    it('groups passage sections as one passage+items group, others one item per group', () => {
      const exam = buildExam(nativeBundle());
      const [grammar, reading] = exam.parts;
      expect(grammar.showPassage).toBe(false);
      expect(grammar.groups).toHaveLength(2);
      expect(grammar.groups[0].items).toHaveLength(1);
      expect(reading.showPassage).toBe(true);
      expect(reading.groups).toHaveLength(1);
      expect(reading.groups[0].passage).toBe('A memo');
      expect(reading.groups[0].items).toHaveLength(2);
    });

    it('uses each section\'s own time and item totals', () => {
      const exam = buildExam(nativeBundle());
      expect(exam.parts.map((p) => p.timeMin)).toEqual([2, 3, 3]);
      expect(exam.parts.map((p) => p.totalItems)).toEqual([2, 2, 1]);
      expect(exam.flat).toHaveLength(5);
    });
  });

  // The short, reading-only paper: ExamContext derives version='short' from
  // partsBySection(exam, 'listening') being empty.
  it('builds a reading-only exam (no listening parts) from a Part 5–7 bundle', () => {
    const bundle = {
      paper: { id: 'p-short', name: 'Short' },
      sections: [
        { id: 's5', name: 'Part 5', items: [{ id: 'a' }] },
        { id: 's7', name: 'Part 7', passage_content: 'P', items: [{ id: 'b' }] },
      ],
    };
    const exam = buildExam(bundle);
    expect(exam.parts.map((p) => p.number)).toEqual([5, 7]);
    expect(partsBySection(exam, 'listening')).toEqual([]);
    expect(partsBySection(exam, 'reading').map((p) => p.number)).toEqual([5, 7]);
  });
});

// Mirrors paperVariant() in server/src/shape.js — same name convention.
describe('paperVariant', () => {
  it('marks papers named with the word "short" (or Thai สั้น) as short', () => {
    expect(paperVariant('Quick Placement Test (15 min) - Short')).toBe('short');
    expect(paperVariant('ข้อสอบฉบับสั้น 15 นาที')).toBe('short');
  });
  it('treats everything else (and null) as full', () => {
    expect(paperVariant('English Competency Test')).toBe('full');
    expect(paperVariant('Shortlist Assessment')).toBe('full');
    expect(paperVariant(null)).toBe('full');
  });
});

describe('partsBySection', () => {
  it('returns [] when exam is null', () => {
    expect(partsBySection(null, 'listening')).toEqual([]);
  });

  it('filters parts by section', () => {
    const exam = buildExam(makeBundle());
    expect(partsBySection(exam, 'listening').map((p) => p.number)).toEqual([1]);
    expect(partsBySection(exam, 'reading').map((p) => p.number)).toEqual([5, 7]);
  });
});

describe('totalsBySection', () => {
  it('aggregates item count, time, and part count for a section', () => {
    const exam = buildExam(makeBundle());
    expect(totalsBySection(exam, 'reading')).toEqual({ items: 3, timeMin: 25, parts: 2 });
    expect(totalsBySection(exam, 'listening')).toEqual({ items: 2, timeMin: 5, parts: 1 });
  });
});

describe('getOptionLetters', () => {
  it('returns option keys excluding _extras', () => {
    const item = { options: { A: 'x', B: 'y', C: 'z', _extras: { note: 1 } } };
    expect(getOptionLetters(item)).toEqual(['A', 'B', 'C']);
  });

  it('returns [] when there are no options', () => {
    expect(getOptionLetters({ options: {} })).toEqual([]);
  });
});

describe('unansweredItems', () => {
  const items = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];

  it('returns [] when every item is answered', () => {
    expect(unansweredItems(items, { q1: 'A', q2: 'B', q3: 'C' })).toEqual([]);
  });

  it('returns the ids of items with no answer, in order', () => {
    expect(unansweredItems(items, { q2: 'B' })).toEqual(['q1', 'q3']);
  });

  it('treats every item as unanswered when answers is empty or omitted', () => {
    expect(unansweredItems(items, {})).toEqual(['q1', 'q2', 'q3']);
    expect(unansweredItems(items)).toEqual(['q1', 'q2', 'q3']);
  });

  it('treats an empty-string answer as unanswered (matches the qnav indicator)', () => {
    expect(unansweredItems(items, { q1: '', q2: 'B', q3: 'C' })).toEqual(['q1']);
  });

  it('returns [] for null/empty item lists', () => {
    expect(unansweredItems(null, {})).toEqual([]);
    expect(unansweredItems([], { q1: 'A' })).toEqual([]);
  });
});
