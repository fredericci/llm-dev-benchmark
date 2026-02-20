import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { ModelAdapter, AdapterCompleteRequest, AdapterCompleteResponse } from './base.adapter';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function withRetry<T>(fn: () => Promise<T>, modelId: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable = /fetch failed|503|429|rate|quota|overloaded|unavailable/i.test(msg);
      if (!isRetryable || attempt === MAX_RETRIES) break;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`[google] ${modelId} attempt ${attempt + 1} failed (${msg.slice(0, 80)}), retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

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

    const result = await withRetry(() => model.generateContent(request.userPrompt), this.modelId);
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
