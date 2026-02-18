export function scoreForTurn(turn: number, totalTests: number, passedTests: number): number {
  const allPassed = passedTests === totalTests && totalTests > 0;
  const maxScoreByTurn: Record<number, number> = { 1: 5, 2: 3, 3: 1 };
  const turnCap = maxScoreByTurn[turn] ?? 1;
  if (allPassed) return turnCap;
  const partial = Math.round((passedTests / Math.max(totalTests, 1)) * 5);
  return Math.min(partial, turnCap);
}
