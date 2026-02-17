import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { ModelAdapter, AdapterCompleteRequest, AdapterCompleteResponse } from './base.adapter';

export class GoogleAdapter implements ModelAdapter {
  private client: GoogleGenerativeAI;
  provider = 'google';

  constructor(
    public modelId: string,
    public displayName: string,
    private apiKey?: string,
  ) {
    this.client = new GoogleGenerativeAI(apiKey ?? process.env.GOOGLE_API_KEY ?? '');
  }

  async complete(request: AdapterCompleteRequest): Promise<AdapterCompleteResponse> {
    const model = this.client.getGenerativeModel({
      model: this.modelId,
      systemInstruction: request.systemPrompt || undefined,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0,
      },
    });

    const result = await model.generateContent(request.userPrompt);
    const response = result.response;
    const content = response.text();

    const usageMeta = response.usageMetadata;

    return {
      content,
      inputTokens: usageMeta?.promptTokenCount ?? 0,
      outputTokens: usageMeta?.candidatesTokenCount ?? 0,
      model: this.modelId,
    };
  }
}
