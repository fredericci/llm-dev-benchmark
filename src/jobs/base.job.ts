export type Language = 'nodejs' | 'java' | 'dotnet';
export type EvaluationType = 'test-execution' | 'rubric' | 'hybrid';
export type ExecutionMode = 'api' | 'cli';

export interface JobInput {
  language: Language;
  fixtureCode: string;
  additionalContext?: string;
}

/**
 * JobResult is the contract that maps 1:1 to a CSV row.
 * Identical shape regardless of execution mode.
 */
export interface JobResult {
  // Identification
  timestamp: string;           // ISO 8601
  jobId: string;               // 'j01'
  jobName: string;             // 'Code Generation - REST API'
  language: Language;
  runNumber: number;

  // Execution mode
  executionMode: ExecutionMode; // 'api' | 'cli'
  provider: string;             // 'anthropic' | 'openai' | 'google' | 'cli-anthropic' | 'cli-google'
  modelId: string;              // Technical model ID or CLI agent name
  modelDisplayName: string;     // Human-readable name

  // Token and cost metrics
  inputTokens: number;          // Exact (API) or estimated (CLI)
  outputTokens: number;         // Exact (API) or estimated (CLI)
  totalTokens: number;
  costUSD: number;              // Calculated or estimated
  tokensSource: 'exact' | 'estimated'; // Origin of token counts

  // Execution metrics
  latencyMs: number;
  turns: number;                // Conversation rounds

  // Quality results
  passed: boolean;
  qualityScore: number;         // 0–5
  qualityNotes: string;
  errorMessage?: string;

  // Audit trail
  rawPrompt: string;            // Exact prompt sent
  rawResponse: string;          // Full response received
}

/**
 * Job interface — every benchmark job implements this.
 * buildPrompt() MUST return the same string for both API and CLI modes.
 */
export interface Job {
  id: string;
  name: string;
  description: string;
  supportedLanguages: Language[];
  evaluationType: EvaluationType;
  maxTurns: number;
  systemPrompt?: string;

  /** Returns the prompt string — IDENTICAL for API and CLI execution */
  buildPrompt(input: JobInput): string;

  evaluate(
    response: string,
    input: JobInput,
  ): Promise<{ passed: boolean; score: number; notes: string }>;
}
