import Anthropic from '@anthropic-ai/sdk';
import { ModelAdapter, AdapterCompleteRequest, AdapterCompleteResponse } from './base.adapter';

export class AnthropicAdapter implements ModelAdapter {
  private client: Anthropic;
  provider = 'anthropic';

  constructor(
    public modelId: string,
    public displayName: string,
    private apiKey?: string,
  ) {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });
  }

  async complete(request: AdapterCompleteRequest): Promise<AdapterCompleteResponse> {
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: request.userPrompt },
    ];

    const response = await this.client.messages.create({
      model: this.modelId,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0,
      system: request.systemPrompt || undefined,
      messages,
    });

    const content = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
    };
  }
}
