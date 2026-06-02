import { describe, it, expect } from 'vitest';
import {
  rowToPaper,
  rowToSection,
  rowToItem,
  publicItem,
  splitOptions,
  parsePartNumber,
  paperVariant,
} from './shape.js';

describe('parsePartNumber', () => {
  it('extracts the number from a "Part N" name', () => {
    expect(parsePartNumber('Part 1')).toBe(1);
    expect(parsePartNumber('Part 7 — Reading')).toBe(7);
  });

  it('returns null for names without a part number', () => {
    expect(parsePartNumber('Warmup')).toBeNull();
    expect(parsePartNumber('')).toBeNull();
  });

  it('tolerates null/undefined input', () => {
    expect(parsePartNumber(null)).toBeNull();
    expect(parsePartNumber(undefined)).toBeNull();
  });
});

describe('paperVariant', () => {
  it('marks papers named with the word "short" as the short set', () => {
    expect(paperVariant('Short Screening')).toBe('short');
    expect(paperVariant('English Test — SHORT version')).toBe('short');
  });

  it('matches the Thai word "สั้น" too', () => {
    expect(paperVariant('ข้อสอบฉบับสั้น 15 นาที')).toBe('short');
  });

  it('treats everything else as the full set', () => {
    expect(paperVariant('English Competency Test')).toBe('full');
    // whole-word match only — "short" inside another word does not count
    expect(paperVariant('Shortlist Assessment')).toBe('full');
  });

  it('defaults to full for empty/missing names', () => {
    expect(paperVariant('')).toBe('full');
    expect(paperVariant(null)).toBe('full');
  });
});

describe('splitOptions', () => {
  it('separates _extras from the answer options', () => {
    const result = splitOptions({ A: 'foo', B: 'bar', _extras: { note: 'x' } });
    expect(result.options).toEqual({ A: 'foo', B: 'bar' });
    expect(result.extras).toEqual({ note: 'x' });
  });

  it('returns empty extras when _extras is absent', () => {
    expect(splitOptions({ A: 'foo' })).toEqual({ options: { A: 'foo' }, extras: {} });
  });

  it('returns empty objects for null/undefined/non-object input', () => {
    expect(splitOptions(null)).toEqual({ options: {}, extras: {} });
    expect(splitOptions(undefined)).toEqual({ options: {}, extras: {} });
    expect(splitOptions('nope')).toEqual({ options: {}, extras: {} });
  });
});

describe('publicItem', () => {
  it('drops correct_answer and explanation but keeps everything else', () => {
    const full = {
      id: 'q1',
      stem: 'What?',
      options: { A: 'x', B: 'y' },
      correct_answer: 'A',
      explanation: 'because',
    };
    const pub = publicItem(full);
    expect(pub).not.toHaveProperty('correct_answer');
    expect(pub).not.toHaveProperty('explanation');
    expect(pub).toMatchObject({ id: 'q1', stem: 'What?', options: { A: 'x', B: 'y' } });
  });

  it('does not mutate the original item', () => {
    const full = { id: 'q1', correct_answer: 'A', explanation: 'x' };
    publicItem(full);
    expect(full.correct_answer).toBe('A');
  });
});

describe('rowToItem', () => {
  const baseRow = {
    id: 'q1',
    stem: 'Q?',
    question_type: 'mcq',
    options: { A: 'x', B: 'y' },
    extras: { hint: 'h' },
    cefr_level: 'B1',
    difficulty_band: 'mid',
    score_weight: '2',
    objective: 'obj',
    tags: ['t1'],
    correct_answer: 'A',
    explanation: 'because',
    judge_score: '0.5',
  };

  it('nests extras under options._extras', () => {
    const out = rowToItem(baseRow);
    expect(out.options).toEqual({ A: 'x', B: 'y', _extras: { hint: 'h' } });
  });

  it('coerces numeric string weights to numbers', () => {
    const out = rowToItem(baseRow);
    expect(out.score_weight).toBe(2);
    expect(out.judge_score).toBe(0.5);
  });

  it('keeps null weights as null rather than coercing to 0', () => {
    const out = rowToItem({ ...baseRow, score_weight: null, judge_score: null });
    expect(out.score_weight).toBeNull();
    expect(out.judge_score).toBeNull();
  });

  it('defaults missing options/extras/tags to empty containers', () => {
    const out = rowToItem({ id: 'q2' });
    expect(out.options).toEqual({ _extras: {} });
    expect(out.tags).toEqual([]);
  });
});

describe('rowToPaper / rowToSection', () => {
  it('rowToPaper maps the expected fields', () => {
    const row = {
      id: 'p1', name: 'Paper', description: 'd', status: 'published',
      total_score: 100, time_limit_min: 60, created_at: 't0', completed_at: null,
    };
    expect(rowToPaper(row)).toEqual(row);
  });

  it('rowToSection defaults items to an empty array', () => {
    const out = rowToSection({ id: 's1', name: 'Part 1' });
    expect(out.items).toEqual([]);
  });

  it('rowToSection attaches the provided items', () => {
    const items = [{ id: 'q1' }];
    expect(rowToSection({ id: 's1', name: 'Part 1' }, items).items).toBe(items);
  });
});
