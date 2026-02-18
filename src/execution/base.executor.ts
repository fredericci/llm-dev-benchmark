import { ExecutionMode } from '../jobs/base.job';

export interface ExecutionRequest {
  /** Prompt built by Job.buildPrompt() — identical for API and CLI modes */
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ExecutionResult {
  content: string;              // Model response
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  tokensSource: 'exact' | 'estimated';
  executionMode: ExecutionMode;
  modelId: string;
  provider: string;
  displayName: string;
}

/** Both APIExecutor and CLIExecutor implement this interface */
export interface Executor {
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
}
