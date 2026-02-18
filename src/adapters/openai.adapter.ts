import OpenAI from 'openai';
import { ModelAdapter, AdapterCompleteRequest, AdapterCompleteResponse } from './base.adapter';

export class OpenAIAdapter implements ModelAdapter {
  private client: OpenAI;
  provider = 'openai';

  constructor(
    public modelId: string,
    public displayName: string,
    private apiKey?: string,
  ) {
    this.client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });
  }

  async complete(request: AdapterCompleteRequest): Promise<AdapterCompleteResponse> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.userPrompt });

    const response = await this.client.chat.completions.create({
      model: this.modelId,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0,
      messages,
    });

    const content = response.choices[0]?.message?.content ?? '';

    return {
      content,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      model: response.model,
    };
  }
}
