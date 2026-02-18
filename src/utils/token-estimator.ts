/**
 * Heuristic token estimation: ~4 characters per token.
 * Standard for English/code content. Slightly higher factor for Portuguese mixed with code.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost when token counts are estimated (CLI mode without usage metadata).
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  pricing: { inputPerMToken: number; outputPerMToken: number },
): number {
  return (
    (inputTokens / 1_000_000) * pricing.inputPerMToken +
    (outputTokens / 1_000_000) * pricing.outputPerMToken
  );
}
