import { ExecutionRequest } from '../execution/base.executor';
import { CLIAgent, CLIAgentUsage } from './base.agent';

/**
 * OpenAI Codex CLI agent — uses the `codex` binary.
 * Flags: --quiet (suppress banners), --full-auto
 * Usage metadata not exposed by default — tokens will be estimated.
 */
export class CodexCLIAgent implements CLIAgent {
  id = 'codex-cli';
  binary = 'codex';
  provider = 'cli-openai';
  modelId = 'codex-cli-agent';
  displayName = 'Codex CLI (OpenAI)';
  timeoutMs = 120_000;
  env: Record<string, string> = {};

  buildArgs(promptFile: string, _request: ExecutionRequest): string[] {
    return ['--quiet', '--full-auto', `@${promptFile}`];
  }

  extractContent(stdout: string): string {
    // Codex may return markdown with code blocks — return raw trimmed output
    return stdout.trim();
  }

  extractUsage(_stdout: string, _stderr: string): CLIAgentUsage | null {
    // Codex CLI does not expose usage metadata by default — will be estimated
    return null;
  }
}
