import { ExecutionRequest } from '../execution/base.executor';

export interface CLIAgentUsage {
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * CLIAgent defines how a specific CLI binary is invoked.
 * Add a new agent by creating a new file implementing this interface
 * and adding an entry in config/agents.yaml.
 */
export interface CLIAgent {
  id: string;          // e.g. 'claude-code', 'gemini-cli', 'codex-cli'
  binary: string;      // e.g. 'claude', 'gemini', 'codex'
  provider: string;    // e.g. 'cli-anthropic'
  modelId: string;     // e.g. 'claude-code-agent'
  displayName: string; // e.g. 'Claude Code (CLI)'
  timeoutMs: number;
  env: Record<string, string>;

  /** Build CLI arguments. promptFile contains the full prompt text. */
  buildArgs(promptFile: string, request: ExecutionRequest): string[];

  /** Strip banners/logs from stdout and return the useful content */
  extractContent(stdout: string): string;

  /** Parse usage metadata from agent output. Returns null if unavailable. */
  extractUsage(stdout: string, stderr: string): CLIAgentUsage | null;

  // ─── Agentic mode (fullstack benchmarks) ────────────────────

  /** Whether this agent supports agentic/file-editing mode */
  supportsAgenticMode?: boolean;

  /** Timeout for agentic mode (default: 300_000 ms = 5 min) */
  agenticTimeoutMs?: number;

  /**
   * Build CLI arguments for agentic mode (file-editing in a project directory).
   * The agent will be spawned with cwd set to the project directory.
   */
  buildAgenticArgs?(promptFile: string, request: ExecutionRequest): string[];
}
