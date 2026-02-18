import { ModelAdapter } from '../adapters/base.adapter';
import { Executor, ExecutionRequest, ExecutionResult } from './base.executor';

/**
 * Mode A executor — calls model SDKs directly.
 * Token counts come from the API response: tokensSource is always 'exact'.
 */
export class APIExecutor implements Executor {
  constructor(private adapter: ModelAdapter) {}

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const start = Date.now();

    const response = await this.adapter.complete({
      systemPrompt: request.systemPrompt ?? '',
      userPrompt: request.prompt,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
    });

    return {
      content: response.content,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      latencyMs: Date.now() - start,
      tokensSource: 'exact',
      executionMode: 'api',
      modelId: response.model,
      provider: this.adapter.provider,
      displayName: this.adapter.displayName,
    };
  }
}
