import OpenAI from 'openai';
import { ModelAdapter, AdapterCompleteRequest, AdapterCompleteResponse } from './base.adapter';

type ResponseInput = OpenAI.Responses.ResponseInput;

export class OpenAIResponsesAdapter implements ModelAdapter {
  private client: OpenAI;
  provider = 'openai-responses';

  constructor(
    public modelId: string,
    public displayName: string,
    private apiKey?: string,
  ) {
    this.client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });
  }

  async complete(request: AdapterCompleteRequest): Promise<AdapterCompleteResponse> {
    const input: ResponseInput = [
      ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
      { role: 'user' as const, content: request.userPrompt },
    ];

    const response = await this.client.responses.create({
      model: this.modelId,
      input,
      max_output_tokens: request.maxTokens ?? 4096,
      store: false,
    });

    // Extract text from output blocks (skip reasoning blocks)
    const content = response.output
      .filter((block) => block.type === 'message')
      .flatMap((block) => (block as { type: 'message'; content: { type: string; text?: string }[] }).content)
      .filter((c) => c.type === 'output_text' && c.text)
      .map((c) => c.text!)
      .join('');

    return {
      content,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
      model: response.model,
    };
  }
}
