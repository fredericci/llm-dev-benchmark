import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CLIAgent } from '../cli-agents/base.agent';
import { estimateTokens } from '../utils/token-estimator';
import { Executor, ExecutionRequest, ExecutionResult, FullstackExecutionResult } from './base.executor';
import { writeTempFile, spawnWithTimeout } from './cli-executor';

/**
 * Fullstack CLI executor — copies a base project to a temp directory,
 * then runs the CLI agent in agentic mode inside that directory.
 *
 * The agent modifies files directly instead of returning text output.
 * Result includes the projectDir so the evaluator can run Playwright tests.
 */
export class FullstackCLIExecutor implements Executor {
  constructor(private agent: CLIAgent) {
    if (!agent.supportsAgenticMode || !agent.buildAgenticArgs) {
      throw new Error(`Agent ${agent.id} does not support agentic mode`);
    }
  }

  /**
   * Copy the base project, run the agent in it, return result with projectDir.
   * The baseProjectDir is passed via request.systemPrompt (reusing existing field).
   */
  async execute(request: ExecutionRequest): Promise<FullstackExecutionResult> {
    const baseProjectDir = request.systemPrompt;
    if (!baseProjectDir) {
      throw new Error('FullstackCLIExecutor requires systemPrompt to contain the base project path');
    }

    const tmpDir = this.copyProject(baseProjectDir);
    return this.executeInDir(request, tmpDir);
  }

  /**
   * Execute the agent in an existing project directory (used for retry turns).
   */
  async executeInProject(request: ExecutionRequest, projectDir: string): Promise<FullstackExecutionResult> {
    return this.executeInDir(request, projectDir);
  }

  private async executeInDir(request: ExecutionRequest, projectDir: string): Promise<FullstackExecutionResult> {
    const start = Date.now();
    let promptFile: string | null = null;

    try {
      promptFile = await writeTempFile(request.prompt);
      const timeoutMs = this.agent.agenticTimeoutMs ?? 300_000;

      const args = this.agent.buildAgenticArgs!(promptFile, request);
      // Append prompt as positional argument for agents that use it (e.g. Claude Code)
      args.push(request.prompt);

      const { stdout, stderr } = await spawnWithTimeout(
        this.agent.binary,
        args,
        this.agent.env,
        timeoutMs,
        projectDir, // cwd = project directory
      );

      const latencyMs = Date.now() - start;
      const content = this.agent.extractContent(stdout);
      const usageFromAgent = this.agent.extractUsage(stdout, stderr);

      const inputTokens = usageFromAgent?.inputTokens ?? estimateTokens(request.prompt);
      const outputTokens = usageFromAgent?.outputTokens ?? estimateTokens(content);
      const tokensSource: 'exact' | 'estimated' = usageFromAgent ? 'exact' : 'estimated';

      return {
        content,
        projectDir,
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
        fs.promises.unlink(promptFile).catch(() => {});
      }
    }
  }

  private copyProject(sourceDir: string): string {
    const tmpDir = path.join(
      os.tmpdir(),
      `llm-bench-project-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    execSync(`cp -a "${sourceDir}" "${tmpDir}"`);
    return tmpDir;
  }

  /**
   * Clean up the temporary project directory.
   */
  static cleanup(projectDir: string): void {
    try {
      execSync(`rm -rf "${projectDir}"`);
    } catch {
      // ignore cleanup errors
    }
  }
}
