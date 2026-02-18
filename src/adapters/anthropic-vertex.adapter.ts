import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';
import { ModelAdapter, AdapterCompleteRequest, AdapterCompleteResponse } from './base.adapter';

export class AnthropicVertexAdapter implements ModelAdapter {
  private client: AnthropicVertex;
  provider = 'anthropic';

  constructor(
    public modelId: string,
    public displayName: string,
    projectId?: string,
    region?: string,
  ) {
    const resolvedRegion = region ?? process.env.CLOUD_ML_REGION ?? 'global';

    // The TypeScript SDK incorrectly builds "https://global-aiplatform.googleapis.com/v1"
    // for region "global". The correct endpoint is "https://aiplatform.googleapis.com/v1".
    const baseURL = resolvedRegion === 'global'
      ? 'https://aiplatform.googleapis.com/v1'
      : undefined;

    this.client = new AnthropicVertex({
      projectId: projectId ?? process.env.ANTHROPIC_VERTEX_PROJECT_ID ?? undefined,
      region: resolvedRegion,
      ...(baseURL ? { baseURL } : {}),
    });
  }

  async complete(request: AdapterCompleteRequest): Promise<AdapterCompleteResponse> {
    // Vertex AI uses @ separator for version dates (e.g. claude-haiku-4-5@20251001)
    // while direct API uses - (e.g. claude-haiku-4-5-20251001)
    const vertexModelId = this.modelId.replace(/-(\d{8})$/, '@$1');

    const response = await this.client.messages.create({
      model: vertexModelId,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0,
      system: request.systemPrompt || undefined,
      messages: [{ role: 'user', content: request.userPrompt }],
    });

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => 'text' in block ? block.text : '')
      .join('');

    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
    };
  }
}
