export interface AdapterCompleteRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AdapterCompleteResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/**
 * ModelAdapter wraps a provider SDK.
 * Add a new provider by implementing this interface.
 */
export interface ModelAdapter {
  provider: string;
  displayName: string;
  modelId: string;

  complete(request: AdapterCompleteRequest): Promise<AdapterCompleteResponse>;
}
