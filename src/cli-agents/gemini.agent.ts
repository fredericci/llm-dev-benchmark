import { ExecutionRequest } from '../execution/base.executor';
import { CLIAgent, CLIAgentUsage } from './base.agent';

/**
 * Gemini CLI agent — uses the `gemini` binary.
 * Flags: --prompt @file, --json for structured output
 */
export class GeminiCLIAgent implements CLIAgent {
  id = 'gemini-cli';
  binary = 'gemini';
  provider = 'cli-google';
  modelId = 'gemini-cli-agent';
  displayName = 'Gemini CLI';
  timeoutMs = 120_000;
  env: Record<string, string> = {};

  // ─── Agentic mode ─────────────────────────────────────────
  supportsAgenticMode = true;
  agenticTimeoutMs = 300_000;

  buildArgs(promptFile: string, _request: ExecutionRequest): string[] {
    return ['--prompt', `@${promptFile}`, '--json'];
  }

  buildAgenticArgs(promptFile: string, _request: ExecutionRequest): string[] {
    return ['--approval-mode=yolo', '--output-format', 'json', `@${promptFile}`];
  }

  extractContent(stdout: string): string {
    try {
      const parsed = JSON.parse(stdout);
      return parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? stdout;
    } catch {
      return stdout;
    }
  }

  extractUsage(stdout: string, _stderr: string): CLIAgentUsage | null {
    try {
      const parsed = JSON.parse(stdout);
      const usage = parsed.usageMetadata;
      if (usage) {
        return {
          inputTokens: usage.promptTokenCount,
          outputTokens: usage.candidatesTokenCount,
        };
      }
    } catch {
      // fall through
    }
    return null;
  }
}
