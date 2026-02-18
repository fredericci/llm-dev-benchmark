const { calculateDiscount } = require('./calculateDiscount');

describe('calculateDiscount', () => {
  test('returns 5% discount for quantity 20 and non-VIP (happy path)', () => {
    expect(calculateDiscount(20, false)).toBeCloseTo(0.05);
  });

  test('returns 25% discount for quantity 60 and VIP (happy path)', () => {
    expect(calculateDiscount(60, true)).toBeCloseTo(0.25);
  });

  test('returns 0% discount for quantity 0 and non-VIP (boundary: min valid/zero)', () => {
    expect(calculateDiscount(0, false)).toBeCloseTo(0);
  });

  test('returns 10% discount for quantity 0 and VIP (boundary: zero with VIP)', () => {
    expect(calculateDiscount(0, true)).toBeCloseTo(0.10);
  });

  test('caps discount at 30% for max valid quantity and VIP (boundary: max valid)', () => {
    expect(calculateDiscount(Number.MAX_SAFE_INTEGER, true)).toBeCloseTo(0.30);
  });

  test('throws TypeError for empty string quantity (boundary: empty)', () => {
    expect(() => calculateDiscount('', false)).toThrow(TypeError);
  });

  test('throws TypeError for quantity null (invalid: null)', () => {
    expect(() => calculateDiscount(null, false)).toThrow(TypeError);
  });

  test('throws TypeError for quantity undefined (invalid: undefined)', () => {
    expect(() => calculateDiscount(undefined, false)).toThrow(TypeError);
  });

  test('throws TypeError for quantity string type (invalid: wrong type)', () => {
    expect(() => calculateDiscount('10', false)).toThrow(TypeError);
  });

  test('throws TypeError for quantity boolean type (invalid: wrong type)', () => {
    expect(() => calculateDiscount(true, false)).toThrow(TypeError);
  });

  test('throws RangeError for negative quantity (invalid: out-of-range)', () => {
    expect(() => calculateDiscount(-1, false)).toThrow(RangeError);
  });

  test('returns 0% discount for quantity 10 and non-VIP (business rule: lower threshold not exceeded)', () => {
    expect(calculateDiscount(10, false)).toBeCloseTo(0);
  });

  test('returns 5% discount for quantity 50 and non-VIP (business rule: upper threshold not exceeded)', () => {
    expect(calculateDiscount(50, false)).toBeCloseTo(0.05);
  });

  test('returns 15% discount for quantity 51 and non-VIP (business rule: just above upper threshold)', () => {
    expect(calculateDiscount(51, false)).toBeCloseTo(0.15);
  });

  test('returns 10% discount for VIP with quantity 1 and no base discount (business rule: VIP adds without base)', () => {
    expect(calculateDiscount(1, true)).toBeCloseTo(0.10);
  });

  test('caps discount at 30% for quantity 100 and VIP (business rule: max discount cap)', () => {
    expect(calculateDiscount(100, true)).toBeCloseTo(0.30);
  });

  test('returns 5% discount for quantity 10.1 and non-VIP (business rule: non-integer above threshold)', () => {
    expect(calculateDiscount(10.1, false)).toBeCloseTo(0.05);
  });
});