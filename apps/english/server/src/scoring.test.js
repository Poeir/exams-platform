import { describe, it, expect } from 'vitest';
import { scoreAnswers } from './scoring.js';

// Minimal row helper: an item joined to its section name, as the route passes in.
const item = (id, correct_answer, section_name) => ({ id, correct_answer, section_name });

describe('scoreAnswers', () => {
  it('returns all-zero totals for empty rows', () => {
    const { parts, skills } = scoreAnswers([], {});
    expect(parts).toEqual([]);
    expect(skills.total).toEqual({ correct: 0, total: 0 });
    expect(skills.listening).toEqual({ correct: 0, total: 0 });
  });

  it('defaults answers to {} when omitted (every item scored as wrong)', () => {
    const rows = [item('a', 'A', 'Part 1')];
    const { parts, skills } = scoreAnswers(rows);
    expect(parts[0]).toMatchObject({ correct: 0, total: 1 });
    expect(skills.total).toEqual({ correct: 0, total: 1 });
  });

  it('scores a fully correct submission', () => {
    const rows = [
      item('a', 'A', 'Part 1'),
      item('b', 'B', 'Part 1'),
    ];
    const { parts, skills } = scoreAnswers(rows, { a: 'A', b: 'B' });
    expect(parts[0]).toMatchObject({ id: 1, correct: 2, total: 2 });
    expect(skills.listening).toEqual({ correct: 2, total: 2 });
    expect(skills.total).toEqual({ correct: 2, total: 2 });
  });

  it('counts a missing answer as wrong but still in total', () => {
    const rows = [
      item('a', 'A', 'Part 1'),
      item('b', 'B', 'Part 1'), // no answer submitted for b
    ];
    const { parts } = scoreAnswers(rows, { a: 'A' });
    expect(parts[0]).toMatchObject({ correct: 1, total: 2 });
  });

  it('counts a wrong answer as wrong', () => {
    const rows = [item('a', 'A', 'Part 1')];
    const { parts } = scoreAnswers(rows, { a: 'C' });
    expect(parts[0]).toMatchObject({ correct: 0, total: 1 });
  });

  it('does not treat null/empty answer as a match against a null key', () => {
    // Guards the `answers[id] != null` check on line 34.
    const rows = [item('a', null, 'Part 1')];
    expect(scoreAnswers(rows, { a: null }).parts[0]).toMatchObject({ correct: 0, total: 1 });
    expect(scoreAnswers(rows, {}).parts[0]).toMatchObject({ correct: 0, total: 1 });
  });

  it('aggregates each skill independently (vocabulary vs grammar vs reading)', () => {
    const rows = [
      item('l', 'A', 'Part 1'),  // listening
      item('v', 'A', 'Part 5'),  // vocabulary
      item('g', 'A', 'Part 6'),  // grammar
      item('r', 'A', 'Part 7'),  // reading
    ];
    const { skills } = scoreAnswers(rows, { l: 'A', v: 'A', g: 'X', r: 'A' });
    expect(skills.listening).toEqual({ correct: 1, total: 1 });
    expect(skills.vocabulary).toEqual({ correct: 1, total: 1 });
    expect(skills.grammar).toEqual({ correct: 0, total: 1 });
    expect(skills.reading).toEqual({ correct: 1, total: 1 });
    expect(skills.total).toEqual({ correct: 3, total: 4 });
  });

  it('maps part number to the right section label', () => {
    const rows = [
      item('a', 'A', 'Part 4'), // listening
      item('b', 'A', 'Part 5'), // reading
    ];
    const parts = scoreAnswers(rows, {}).parts;
    expect(parts.find((p) => p.id === 4).section).toBe('Listening');
    expect(parts.find((p) => p.id === 5).section).toBe('Reading');
  });

  it('returns parts sorted ascending by part number regardless of input order', () => {
    const rows = [
      item('a', 'A', 'Part 7'),
      item('b', 'A', 'Part 1'),
      item('c', 'A', 'Part 5'),
    ];
    const ids = scoreAnswers(rows, {}).parts.map((p) => p.id);
    expect(ids).toEqual([1, 5, 7]);
  });

  it('skips rows whose section name has no recognizable part number', () => {
    const rows = [
      item('a', 'A', 'Warmup'),
      item('b', 'A', 'Part 99'), // no PART_META entry -> skipped
      item('c', 'A', 'Part 1'),
    ];
    const { parts, skills } = scoreAnswers(rows, { a: 'A', b: 'A', c: 'A' });
    expect(parts).toHaveLength(1);
    expect(parts[0].id).toBe(1);
    expect(skills.total).toEqual({ correct: 1, total: 1 });
  });

  it('never leaks per-item correctness in the result (anti-bruteforce)', () => {
    const rows = [item('secret', 'A', 'Part 1')];
    const result = scoreAnswers(rows, { secret: 'A' });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('correct_answer');
    // Only aggregate shape is exposed.
    expect(Object.keys(result)).toEqual(['parts', 'skills']);
  });

  it('groups multiple sections that map to the same part', () => {
    const rows = [
      item('a', 'A', 'Part 3 — Conversation 1'),
      item('b', 'A', 'Part 3 — Conversation 2'),
    ];
    const { parts } = scoreAnswers(rows, { a: 'A', b: 'A' });
    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({ id: 3, correct: 2, total: 2 });
  });
});

// Native-structure papers (the short placement paper): section names carry no
// "Part N", so the skill comes from the section row and each section is its
// own entry in the parts breakdown, in row order.
describe('scoreAnswers (native structure)', () => {
  const nat = (id, correct_answer, section_name, section_skill) =>
    ({ id, correct_answer, section_name, section_skill });

  const rows = [
    nat('g1', 'A', 'Grammar A2', 'grammar'),
    nat('g2', 'B', 'Grammar A2', 'grammar'),
    nat('r1', 'C', 'Reading B1', 'reading'),
    nat('g3', 'D', 'Grammar C1', 'grammar'),
  ];

  it('buckets skills from the section skill column', () => {
    const { skills } = scoreAnswers(rows, { g1: 'A', g2: 'X', r1: 'C', g3: 'D' });
    expect(skills.grammar).toEqual({ correct: 2, total: 3 });
    expect(skills.reading).toEqual({ correct: 1, total: 1 });
    expect(skills.listening).toEqual({ correct: 0, total: 0 });
    expect(skills.total).toEqual({ correct: 3, total: 4 });
  });

  it('keeps one parts entry per section, in row order, titled by section name', () => {
    const { parts } = scoreAnswers(rows, {});
    expect(parts).toEqual([
      { id: 1, title: 'Grammar A2', section: 'Reading', correct: 0, total: 2 },
      { id: 2, title: 'Reading B1', section: 'Reading', correct: 0, total: 1 },
      { id: 3, title: 'Grammar C1', section: 'Reading', correct: 0, total: 1 },
    ]);
  });

  it('still skips rows with neither a known part nor a known skill', () => {
    const { skills } = scoreAnswers([nat('x', 'A', 'Warmup', 'mystery')], { x: 'A' });
    expect(skills.total).toEqual({ correct: 0, total: 0 });
  });
});
