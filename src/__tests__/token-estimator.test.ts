import { estimateTokens, estimateCost } from '../utils/token-estimator';

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('returns 1 for 1 character (ceil division)', () => {
    expect(estimateTokens('a')).toBe(1);
  });

  it('returns 1 for exactly 4 characters', () => {
    expect(estimateTokens('abcd')).toBe(1);
  });

  it('returns 2 for 5 characters (ceil of 5/4)', () => {
    expect(estimateTokens('abcde')).toBe(2);
  });

  it('returns 2 for 8 characters', () => {
    expect(estimateTokens('abcdefgh')).toBe(2);
  });

  it('returns 3 for 9 characters', () => {
    expect(estimateTokens('123456789')).toBe(3);
  });

  it('returns 1000 for 4000 characters', () => {
    expect(estimateTokens('a'.repeat(4000))).toBe(1000);
  });

  it('returns 1001 for 4001 characters', () => {
    expect(estimateTokens('a'.repeat(4001))).toBe(1001);
  });

  it('handles multiline code-like text', () => {
    const code = 'function add(a, b) {\n  return a + b;\n}';
    expect(estimateTokens(code)).toBe(Math.ceil(code.length / 4));
  });

  it('handles unicode characters', () => {
    const text = 'héllo wörld'; // 11 chars
    expect(estimateTokens(text)).toBe(Math.ceil(text.length / 4));
  });
});

describe('estimateCost', () => {
  const pricing = { inputPerMToken: 1.0, outputPerMToken: 2.0 };

  it('returns 0 for zero input and output tokens', () => {
    expect(estimateCost(0, 0, pricing)).toBe(0);
  });

  it('calculates cost for 1M input tokens only', () => {
    expect(estimateCost(1_000_000, 0, pricing)).toBeCloseTo(1.0);
  });

  it('calculates cost for 1M output tokens only', () => {
    expect(estimateCost(0, 1_000_000, pricing)).toBeCloseTo(2.0);
  });

  it('sums input and output costs correctly', () => {
    expect(estimateCost(1_000_000, 1_000_000, pricing)).toBeCloseTo(3.0);
  });

  it('calculates cost for fractional millions', () => {
    expect(estimateCost(500_000, 500_000, pricing)).toBeCloseTo(1.5);
  });

  it('handles different pricing tiers (claude-sonnet style)', () => {
    const sonetPricing = { inputPerMToken: 3.0, outputPerMToken: 15.0 };
    const cost = estimateCost(1_000_000, 1_000_000, sonetPricing);
    expect(cost).toBeCloseTo(18.0);
  });

  it('handles small token counts', () => {
    // 100 input + 200 output tokens at $1/$2 per M
    const cost = estimateCost(100, 200, pricing);
    expect(cost).toBeCloseTo(0.0001 + 0.0004);
  });

  it('applies correct formula: (input/1M * inputRate) + (output/1M * outputRate)', () => {
    const p = { inputPerMToken: 5.0, outputPerMToken: 10.0 };
    const expected = (2_000_000 / 1_000_000) * 5.0 + (3_000_000 / 1_000_000) * 10.0;
    expect(estimateCost(2_000_000, 3_000_000, p)).toBeCloseTo(expected);
  });
});
