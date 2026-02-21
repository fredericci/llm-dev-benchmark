import { calculateCost, formatCostUSD, PricingConfig } from '../utils/cost-calculator';

describe('calculateCost', () => {
  const pricing: PricingConfig = { inputPerMToken: 3.0, outputPerMToken: 15.0 };

  it('returns 0 for zero tokens', () => {
    expect(calculateCost(0, 0, pricing)).toBe(0);
  });

  it('calculates input-only cost correctly', () => {
    expect(calculateCost(1_000_000, 0, pricing)).toBeCloseTo(3.0);
  });

  it('calculates output-only cost correctly', () => {
    expect(calculateCost(0, 1_000_000, pricing)).toBeCloseTo(15.0);
  });

  it('sums input and output costs', () => {
    expect(calculateCost(1_000_000, 1_000_000, pricing)).toBeCloseTo(18.0);
  });

  it('handles fractional million token counts', () => {
    // 500k input at $3/M = $1.50, 250k output at $15/M = $3.75
    expect(calculateCost(500_000, 250_000, pricing)).toBeCloseTo(5.25);
  });

  it('uses different input and output rates', () => {
    const inputCost = calculateCost(1_000_000, 0, pricing);
    const outputCost = calculateCost(0, 1_000_000, pricing);
    expect(outputCost / inputCost).toBeCloseTo(5.0); // output is 5x more expensive
  });

  it('handles low-cost models (haiku-style pricing)', () => {
    const haikuPricing: PricingConfig = { inputPerMToken: 0.8, outputPerMToken: 4.0 };
    expect(calculateCost(1_000_000, 1_000_000, haikuPricing)).toBeCloseTo(4.8);
  });
});

describe('formatCostUSD', () => {
  it('formats zero as $0.0000', () => {
    expect(formatCostUSD(0)).toBe('$0.0000');
  });

  it('formats values below 0.0001 in exponential notation', () => {
    const result = formatCostUSD(0.000001);
    expect(result).toMatch(/^\$1\.00e-6$/);
  });

  it('formats 0.00009 in exponential notation', () => {
    const result = formatCostUSD(0.00009);
    expect(result).toContain('e');
    expect(result.startsWith('$')).toBe(true);
  });

  it('formats 0.0001 as fixed notation with 4 decimals', () => {
    expect(formatCostUSD(0.0001)).toBe('$0.0001');
  });

  it('formats typical costs with 4 decimal places', () => {
    expect(formatCostUSD(0.1234)).toBe('$0.1234');
  });

  it('formats cost of exactly $1.00', () => {
    expect(formatCostUSD(1.0)).toBe('$1.0000');
  });

  it('formats larger costs with 4 decimal places', () => {
    expect(formatCostUSD(12.5678)).toBe('$12.5678');
  });

  it('rounds at the 4th decimal place', () => {
    // 0.00016 rounds up at 4th decimal (unambiguous in IEEE 754)
    expect(formatCostUSD(0.00016)).toBe('$0.0002');
  });

  it('always starts with $', () => {
    [0, 0.000001, 0.0001, 0.5, 100].forEach((v) => {
      expect(formatCostUSD(v).startsWith('$')).toBe(true);
    });
  });
});
