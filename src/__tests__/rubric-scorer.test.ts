import { normalizeScore } from '../utils/rubric-scorer';

describe('normalizeScore', () => {
  it('returns 0 when maxTotal is 0', () => {
    expect(normalizeScore(0, 0)).toBe(0);
  });

  it('returns 0 when total is 0 and maxTotal is non-zero', () => {
    expect(normalizeScore(0, 10)).toBe(0);
  });

  it('returns 5 when total equals maxTotal (full score)', () => {
    expect(normalizeScore(10, 10)).toBe(5);
    expect(normalizeScore(5, 5)).toBe(5);
    expect(normalizeScore(1, 1)).toBe(5);
  });

  it('returns 2.5 for exactly half of maxTotal', () => {
    expect(normalizeScore(5, 10)).toBe(2.5);
    expect(normalizeScore(3, 6)).toBe(2.5);
  });

  it('rounds to one decimal place', () => {
    // 7/10 * 5 = 3.5 → stays 3.5 (Math.round(35) / 10)
    expect(normalizeScore(7, 10)).toBe(3.5);
  });

  it('rounds correctly for 1/3 of max', () => {
    // 1/3 * 5 = 1.6666... → Math.round(1.6666 * 10) / 10 = 17/10 = 1.7
    expect(normalizeScore(1, 3)).toBe(1.7);
  });

  it('rounds correctly for 2/3 of max', () => {
    // 2/3 * 5 = 3.3333... → Math.round(3.333 * 10) / 10 = 33/10 = 3.3
    expect(normalizeScore(2, 3)).toBe(3.3);
  });

  it('handles non-standard maxTotal values', () => {
    // 8/20 * 5 = 2.0
    expect(normalizeScore(8, 20)).toBe(2);
  });

  it('returns 0 even when total is passed as non-zero but maxTotal is 0', () => {
    // Guard: maxTotal === 0 returns 0 regardless of total
    expect(normalizeScore(5, 0)).toBe(0);
  });

  it('scales correctly across the 0-5 range', () => {
    const maxTotal = 10;
    expect(normalizeScore(0, maxTotal)).toBe(0);
    expect(normalizeScore(2, maxTotal)).toBe(1);
    expect(normalizeScore(4, maxTotal)).toBe(2);
    expect(normalizeScore(6, maxTotal)).toBe(3);
    expect(normalizeScore(8, maxTotal)).toBe(4);
    expect(normalizeScore(10, maxTotal)).toBe(5);
  });
});
