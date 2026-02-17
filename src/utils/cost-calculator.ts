import { estimateCost } from './token-estimator';

export interface PricingConfig {
  inputPerMToken: number;
  outputPerMToken: number;
}

/**
 * Calculate exact cost from token counts and pricing config.
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  pricing: PricingConfig,
): number {
  return estimateCost(inputTokens, outputTokens, pricing);
}

/**
 * Format cost as a USD string with appropriate precision.
 */
export function formatCostUSD(costUSD: number): string {
  if (costUSD === 0) return '$0.0000';
  if (costUSD < 0.0001) return `$${costUSD.toExponential(2)}`;
  return `$${costUSD.toFixed(4)}`;
}
