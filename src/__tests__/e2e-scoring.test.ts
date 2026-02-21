import { scoreForTurn } from '../utils/e2e-scoring';

describe('scoreForTurn', () => {
  describe('all tests passed', () => {
    it('returns 5 when all pass on turn 1', () => {
      expect(scoreForTurn(1, 5, 5)).toBe(5);
    });

    it('returns 3 when all pass on turn 2', () => {
      expect(scoreForTurn(2, 5, 5)).toBe(3);
    });

    it('returns 1 when all pass on turn 3', () => {
      expect(scoreForTurn(3, 5, 5)).toBe(1);
    });

    it('returns 1 (default cap) when all pass on turn 4+', () => {
      expect(scoreForTurn(4, 5, 5)).toBe(1);
      expect(scoreForTurn(10, 5, 5)).toBe(1);
    });

    it('returns 5 for single test passing on turn 1', () => {
      expect(scoreForTurn(1, 1, 1)).toBe(5);
    });

    it('returns 3 for single test passing on turn 2', () => {
      expect(scoreForTurn(2, 1, 1)).toBe(3);
    });
  });

  describe('partial pass', () => {
    it('returns partial score on turn 1 (no cap applies below 5)', () => {
      // 3/5 passed → partial = round(3/5 * 5) = 3; turnCap = 5 → min(3, 5) = 3
      expect(scoreForTurn(1, 5, 3)).toBe(3);
    });

    it('caps partial score by turn 2 cap of 3', () => {
      // 4/5 passed → partial = round(4/5 * 5) = 4; turnCap = 3 → min(4, 3) = 3
      expect(scoreForTurn(2, 5, 4)).toBe(3);
    });

    it('caps partial score by turn 3 cap of 1', () => {
      // 4/5 passed → partial = 4; turnCap = 1 → min(4, 1) = 1
      expect(scoreForTurn(3, 5, 4)).toBe(1);
    });

    it('rounds partial score to nearest integer', () => {
      // 1/3 passed → partial = round(1/3 * 5) = round(1.67) = 2; turnCap = 5
      expect(scoreForTurn(1, 3, 1)).toBe(2);
    });

    it('rounds down for midpoint below 0.5', () => {
      // 1/6 passed → partial = round(1/6 * 5) = round(0.833) = 1; turnCap = 5
      expect(scoreForTurn(1, 6, 1)).toBe(1);
    });
  });

  describe('no tests pass', () => {
    it('returns 0 when 0 of 5 tests pass on turn 1', () => {
      expect(scoreForTurn(1, 5, 0)).toBe(0);
    });

    it('returns 0 when 0 of 5 tests pass on turn 2', () => {
      expect(scoreForTurn(2, 5, 0)).toBe(0);
    });

    it('returns 0 when 0 of 1 test passes', () => {
      expect(scoreForTurn(1, 1, 0)).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('returns 0 when totalTests is 0 (prevents divide by zero)', () => {
      expect(scoreForTurn(1, 0, 0)).toBe(0);
    });

    it('uses max(totalTests, 1) to avoid division by zero', () => {
      // passedTests = 0, totalTests = 0 → partial = round(0/1 * 5) = 0
      expect(scoreForTurn(1, 0, 0)).toBe(0);
    });

    it('allPassed requires totalTests > 0', () => {
      // Even if passedTests === totalTests === 0, allPassed is false
      // So it returns partial score 0 not turnCap
      expect(scoreForTurn(1, 0, 0)).toBe(0);
    });
  });
});
