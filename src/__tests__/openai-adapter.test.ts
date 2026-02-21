import { OpenAIAdapter } from '../adapters/openai.adapter';

// Mock the OpenAI SDK before importing the adapter
const mockCreate = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

function makeApiResponse(content: string, inputTokens = 100, outputTokens = 50, model = 'gpt-4o') {
  return {
    choices: [{ message: { content } }],
    usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens },
    model,
  };
}

describe('OpenAIAdapter', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  describe('constructor', () => {
    it('sets provider to openai', () => {
      const adapter = new OpenAIAdapter('gpt-4o', 'GPT-4o');
      expect(adapter.provider).toBe('openai');
    });

    it('exposes modelId and displayName', () => {
      const adapter = new OpenAIAdapter('gpt-4o-mini', 'GPT-4o Mini');
      expect(adapter.modelId).toBe('gpt-4o-mini');
      expect(adapter.displayName).toBe('GPT-4o Mini');
    });
  });

  describe('complete() — regular models', () => {
    it('uses max_tokens and temperature for regular models', async () => {
      mockCreate.mockResolvedValue(makeApiResponse('result'));
      const adapter = new OpenAIAdapter('gpt-4o', 'GPT-4o', 'test-key');

      await adapter.complete({ systemPrompt: '', userPrompt: 'hello', maxTokens: 1024, temperature: 0 });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs).toHaveProperty('max_tokens', 1024);
      expect(callArgs).toHaveProperty('temperature', 0);
      expect(callArgs).not.toHaveProperty('max_completion_tokens');
    });

    it('uses default maxTokens of 4096 when not provided', async () => {
      mockCreate.mockResolvedValue(makeApiResponse('result'));
      const adapter = new OpenAIAdapter('gpt-4o', 'GPT-4o', 'test-key');

      await adapter.complete({ systemPrompt: '', userPrompt: 'hello' });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.max_tokens).toBe(4096);
    });

    it('includes system prompt as system role message when provided', async () => {
      mockCreate.mockResolvedValue(makeApiResponse('result'));
      const adapter = new OpenAIAdapter('gpt-4o', 'GPT-4o', 'test-key');

      await adapter.complete({ systemPrompt: 'You are helpful', userPrompt: 'hello' });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0]).toEqual({ role: 'system', content: 'You are helpful' });
      expect(callArgs.messages[1]).toEqual({ role: 'user', content: 'hello' });
    });

    it('omits system message when systemPrompt is empty string', async () => {
      mockCreate.mockResolvedValue(makeApiResponse('result'));
      const adapter = new OpenAIAdapter('gpt-4o', 'GPT-4o', 'test-key');

      await adapter.complete({ systemPrompt: '', userPrompt: 'hello' });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages).toHaveLength(1);
      expect(callArgs.messages[0]).toEqual({ role: 'user', content: 'hello' });
    });

    it('returns content, inputTokens, and outputTokens from response', async () => {
      mockCreate.mockResolvedValue(makeApiResponse('the answer', 150, 75, 'gpt-4o'));
      const adapter = new OpenAIAdapter('gpt-4o', 'GPT-4o', 'test-key');

      const result = await adapter.complete({ systemPrompt: '', userPrompt: 'hello' });

      expect(result.content).toBe('the answer');
      expect(result.inputTokens).toBe(150);
      expect(result.outputTokens).toBe(75);
    });

    it('returns empty string when response content is null', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
        usage: { prompt_tokens: 10, completion_tokens: 0 },
        model: 'gpt-4o',
      });
      const adapter = new OpenAIAdapter('gpt-4o', 'GPT-4o', 'test-key');

      const result = await adapter.complete({ systemPrompt: '', userPrompt: 'hello' });
      expect(result.content).toBe('');
    });

    it('returns 0 tokens when usage is missing', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'hi' } }],
        usage: undefined,
        model: 'gpt-4o',
      });
      const adapter = new OpenAIAdapter('gpt-4o', 'GPT-4o', 'test-key');

      const result = await adapter.complete({ systemPrompt: '', userPrompt: 'hello' });
      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
    });
  });

  describe('complete() — reasoning models', () => {
    const reasoningModelIds = ['o1', 'o1-mini', 'o3', 'o3-mini', 'o4-mini', 'gpt-5'];

    it.each(reasoningModelIds)(
      'uses max_completion_tokens (not max_tokens) for model %s',
      async (modelId) => {
        mockCreate.mockResolvedValue(makeApiResponse('result', 200, 100, modelId));
        const adapter = new OpenAIAdapter(modelId, modelId, 'test-key');

        await adapter.complete({ systemPrompt: '', userPrompt: 'hello', maxTokens: 2048 });

        const callArgs = mockCreate.mock.calls[0][0];
        expect(callArgs).toHaveProperty('max_completion_tokens', 2048);
        expect(callArgs).not.toHaveProperty('max_tokens');
      }
    );

    it.each(reasoningModelIds)(
      'does not include temperature parameter for model %s',
      async (modelId) => {
        mockCreate.mockResolvedValue(makeApiResponse('result', 200, 100, modelId));
        const adapter = new OpenAIAdapter(modelId, modelId, 'test-key');

        await adapter.complete({ systemPrompt: '', userPrompt: 'hello', temperature: 0 });

        const callArgs = mockCreate.mock.calls[0][0];
        expect(callArgs).not.toHaveProperty('temperature');
      }
    );

    it('identifies gpt-5 prefix as a reasoning model', async () => {
      mockCreate.mockResolvedValue(makeApiResponse('result'));
      const adapter = new OpenAIAdapter('gpt-5-turbo', 'GPT-5 Turbo', 'test-key');

      await adapter.complete({ systemPrompt: '', userPrompt: 'hello' });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs).toHaveProperty('max_completion_tokens');
      expect(callArgs).not.toHaveProperty('temperature');
    });

    it('does not identify gpt-4o as a reasoning model', async () => {
      mockCreate.mockResolvedValue(makeApiResponse('result'));
      const adapter = new OpenAIAdapter('gpt-4o', 'GPT-4o', 'test-key');

      await adapter.complete({ systemPrompt: '', userPrompt: 'hello' });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs).toHaveProperty('max_tokens');
      expect(callArgs).toHaveProperty('temperature');
      expect(callArgs).not.toHaveProperty('max_completion_tokens');
    });
  });
});
