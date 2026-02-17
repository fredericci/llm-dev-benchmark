import { ExecutionRequest } from '../execution/base.executor';
import { CLIAgent, CLIAgentUsage } from './base.agent';

/**
 * Claude Code CLI agent — uses the `claude` binary.
 * Flags: --print (non-interactive), --output-format json (structured output with usage metadata)
 */
export class ClaudeCodeAgent implements CLIAgent {
  id = 'claude-code';
  binary = 'claude';
  provider = 'cli-anthropic';
  modelId = 'claude-code-agent';
  displayName = 'Claude Code (CLI)';
  timeoutMs = 120_000;
  env: Record<string, string> = {};

  buildArgs(promptFile: string, _request: ExecutionRequest): string[] {
    return [
      '--print',                    // non-interactive mode
      '--output-format', 'json',    // structured output for usage metadata extraction
      '--message', `@${promptFile}`, // read prompt from temp file
    ];
  }

  extractContent(stdout: string): string {
    try {
      const parsed = JSON.parse(stdout);
      return parsed.result ?? parsed.content ?? stdout;
    } catch {
      return stdout;
    }
  }

  extractUsage(stdout: string, _stderr: string): CLIAgentUsage | null {
    try {
      const parsed = JSON.parse(stdout);
      if (parsed.usage) {
        return {
          inputTokens: parsed.usage.input_tokens,
          outputTokens: parsed.usage.output_tokens,
        };
      }
    } catch {
      // fall through
    }
    return null;
  }
}
