import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CLIAgent } from '../cli-agents/base.agent';
import { estimateTokens } from '../utils/token-estimator';
import { Executor, ExecutionRequest, ExecutionResult } from './base.executor';

export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function writeTempFile(content: string): Promise<string> {
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `llm-bench-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
  await fs.promises.writeFile(tmpFile, content, 'utf-8');
  return tmpFile;
}

export function spawnWithTimeout(
  binary: string,
  args: string[],
  env: Record<string, string>,
  timeoutMs: number,
  cwd?: string,
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(binary, args, {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
      ...(cwd ? { cwd } : {}),
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`CLI agent timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: exitCode ?? 1 });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Mode B executor — invokes CLI binaries via child_process.
 * Tokens are estimated via heuristic when agent doesn't return usage metadata.
 */
export class CLIExecutor implements Executor {
  constructor(private agent: CLIAgent) {}

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const start = Date.now();
    let promptFile: string | null = null;

    try {
      promptFile = await writeTempFile(request.prompt);

      const { stdout, stderr } = await spawnWithTimeout(
        this.agent.binary,
        this.agent.buildArgs(promptFile, request),
        this.agent.env,
        this.agent.timeoutMs,
      );

      const latencyMs = Date.now() - start;
      const content = this.agent.extractContent(stdout);
      const usageFromAgent = this.agent.extractUsage(stdout, stderr);

      const inputTokens = usageFromAgent?.inputTokens ?? estimateTokens(request.prompt);
      const outputTokens = usageFromAgent?.outputTokens ?? estimateTokens(content);
      const tokensSource: 'exact' | 'estimated' = usageFromAgent ? 'exact' : 'estimated';

      return {
        content,
        inputTokens,
        outputTokens,
        latencyMs,
        tokensSource,
        executionMode: 'cli',
        modelId: this.agent.modelId,
        provider: this.agent.provider,
        displayName: this.agent.displayName,
      };
    } finally {
      if (promptFile) {
        fs.promises.unlink(promptFile).catch(() => {/* ignore cleanup errors */});
      }
    }
  }
}
