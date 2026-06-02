import { describe, it, expect } from 'vitest';
import { levelFor } from './cefr.js';

describe('levelFor (full, 50 items)', () => {
  it('maps 0 → L1 Beginner', () => {
    expect(levelFor(0)).toMatchObject({ level: 1, label: 'Beginner' });
  });
  it('maps boundary 15 → L1, 16 → L2', () => {
    expect(levelFor(15).level).toBe(1);
    expect(levelFor(16).level).toBe(2);
  });
  it('maps boundary 24 → L2, 25 → L3', () => {
    expect(levelFor(24).level).toBe(2);
    expect(levelFor(25).level).toBe(3);
  });
  it('maps boundary 33 → L3, 34 → L4', () => {
    expect(levelFor(33).level).toBe(3);
    expect(levelFor(34).level).toBe(4);
  });
  it('maps boundary 41 → L4, 42 → L5', () => {
    expect(levelFor(41).level).toBe(4);
    expect(levelFor(42).level).toBe(5);
  });
  it('caps at L5 for max score', () => {
    expect(levelFor(50)).toMatchObject({ level: 5, label: 'Advanced' });
  });
  it('falls back to L1 for non-numeric / null', () => {
    expect(levelFor(null).level).toBe(1);
    expect(levelFor(undefined).level).toBe(1);
    expect(levelFor('nope').level).toBe(1);
  });
  it('treats an unknown variant as full', () => {
    expect(levelFor(42, 'something-else').level).toBe(5);
  });
});

// The short 20-item placement paper: 0–6 Beginner, 7–15 Intermediate,
// 16–20 Advanced (assessment team's banding).
describe('levelFor (short, 20 items)', () => {
  it('maps 0 → L1 Beginner', () => {
    expect(levelFor(0, 'short')).toMatchObject({ level: 1, label: 'Beginner' });
  });
  it('maps boundary 6 → L1, 7 → L2', () => {
    expect(levelFor(6, 'short')).toMatchObject({ level: 1, label: 'Beginner' });
    expect(levelFor(7, 'short')).toMatchObject({ level: 2, label: 'Intermediate' });
  });
  it('maps boundary 15 → L2, 16 → L3', () => {
    expect(levelFor(15, 'short')).toMatchObject({ level: 2, label: 'Intermediate' });
    expect(levelFor(16, 'short')).toMatchObject({ level: 3, label: 'Advanced' });
  });
  it('caps at L3 Advanced for a perfect 20/20', () => {
    expect(levelFor(20, 'short')).toMatchObject({ level: 3, label: 'Advanced' });
  });
  it('falls back to L1 for non-numeric / null', () => {
    expect(levelFor(null, 'short').level).toBe(1);
  });
});
