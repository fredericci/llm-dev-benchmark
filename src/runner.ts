import * as fs from 'fs';
import * as path from 'path';
import pLimit from 'p-limit';
import { Executor, ExecutionResult } from './execution/base.executor';
import { Job, JobInput, JobResult, Language } from './jobs/base.job';
import { calculateCost } from './utils/cost-calculator';
import { PricingConfig } from './utils/cost-calculator';
import { Evaluator, EvaluationResult } from './evaluator';
import { Reporter } from './reporter';

export interface ModelConfig {
  id: string;
  provider: string;
  displayName: string;
  modelId: string;
  pricing: PricingConfig;
  executor: Executor;
}

export interface AgentConfig {
  id: string;
  displayName: string;
  provider: string;
  estimatedPricing: PricingConfig;
  executor: Executor;
}

export interface RunConfig {
  jobs: string[];
  models: ModelConfig[];
  agents: AgentConfig[];
  languages: Language[];
  runsPerCombo: number;
  maxConcurrent: number;
  outputDir: string;
  dryRun?: boolean;
  maxIterations: number;  // 1 = no retry (default); N > 1 = allow up to N attempts per job
}

interface ExecutorEntry {
  displayName: string;
  provider: string;
  modelId: string;
  pricing: PricingConfig;
  isEstimated: boolean;
  executor: Executor;
}

const FIXTURE_FILENAME: Record<Language, string> = {
  nodejs: 'fixture.js',
  java: 'Fixture.java',
  dotnet: 'Fixture.cs',
};

async function loadFixture(language: Language, jobId: string): Promise<string> {
  const fixturePath = path.join(
    process.cwd(),
    'fixtures',
    language,
    jobId,
    FIXTURE_FILENAME[language],
  );
  try {
    return await fs.promises.readFile(fixturePath, 'utf-8');
  } catch {
    return ''; // Some jobs (j06, j11, j14, j19) don't have fixture files
  }
}

async function loadAdditionalContext(language: Language, jobId: string): Promise<string | undefined> {
  const contextPath = path.join(
    process.cwd(),
    'fixtures',
    language,
    jobId,
    'context.txt',
  );
  try {
    return await fs.promises.readFile(contextPath, 'utf-8');
  } catch {
    return undefined;
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes('429') || err.message.toLowerCase().includes('rate limit'));
      if (!isRateLimit || attempt === maxAttempts - 1) throw err;
      const waitMs = Math.pow(2, attempt + 1) * 1000;
      console.log(`  Rate limited. Retrying in ${waitMs}ms...`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}

function buildRetryPrompt(
  originalPrompt: string,
  previousResponse: string,
  evalResult: EvaluationResult,
): string {
  const errorLine = evalResult.errorMessage ? `\n- Error: ${evalResult.errorMessage}` : '';
  return `${originalPrompt}

---
Your previous solution did not pass. Here is what you submitted:

${previousResponse}

Evaluation result:
- Score: ${evalResult.score}/5
- Feedback: ${evalResult.notes}${errorLine}

Please review the feedback above and provide a corrected solution.`;
}

export class Runner {
  private evaluator = new Evaluator();
  private allResults: JobResult[] = [];

  async run(jobs: Job[], config: RunConfig, reporter: Reporter): Promise<JobResult[]> {
    const executors: ExecutorEntry[] = [
      ...config.models.map((m) => ({
        displayName: m.displayName,
        provider: m.provider,
        modelId: m.modelId,
        pricing: m.pricing,
        isEstimated: false,
        executor: m.executor,
      })),
      ...config.agents.map((a) => ({
        displayName: a.displayName,
        provider: a.provider,
        modelId: a.id,
        pricing: a.estimatedPricing,
        isEstimated: true,
        executor: a.executor,
      })),
    ];

    type Combo = { job: Job; exec: ExecutorEntry; language: Language; run: number };
    const combos: Combo[] = [];

    for (const job of jobs) {
      for (const exec of executors) {
        const langs = config.languages.filter((l) => job.supportedLanguages.includes(l));
        for (const language of langs) {
          for (let run = 1; run <= config.runsPerCombo; run++) {
            combos.push({ job, exec, language, run });
          }
        }
      }
    }

    reporter.setTotalCombos(combos.length);

    if (config.dryRun) {
      console.log(`\nDry run: ${combos.length} combos would execute`);
      for (const { job, exec, language, run } of combos) {
        console.log(`  ${job.id} | ${exec.displayName} | ${language} | run ${run}`);
      }
      return [];
    }

    const providerLimiters = new Map<string, ReturnType<typeof pLimit>>();
    function getProviderLimiter(provider: string) {
      let limiter = providerLimiters.get(provider);
      if (!limiter) {
        limiter = pLimit(config.maxConcurrent);
        providerLimiters.set(provider, limiter);
      }
      return limiter;
    }

    await Promise.all(
      combos.map(({ job, exec, language, run }) =>
        getProviderLimiter(exec.provider)(async () => {
          const result = await this.runSingle(job, exec, language, run, config);
          reporter.appendRow(result);
          this.allResults.push(result);
        })
      )
    );

    return this.allResults;
  }

  private async runSingle(
    job: Job,
    exec: ExecutorEntry,
    language: Language,
    runNumber: number,
    config: RunConfig,
  ): Promise<JobResult> {
    const timestamp = new Date().toISOString();
    const maxIter = config.maxIterations;

    try {
      const fixtureCode = await loadFixture(language, job.id);
      const additionalContext = await loadAdditionalContext(language, job.id);
      const input: JobInput = { language, fixtureCode, additionalContext };
      const originalPrompt = job.buildPrompt(input);

      let currentPrompt = originalPrompt;
      let lastExecResult: ExecutionResult | undefined;
      let lastEvalResult: EvaluationResult | undefined;
      let cumulativeInputTokens = 0;
      let cumulativeOutputTokens = 0;
      let cumulativeLatencyMs = 0;
      const iterationScores: number[] = [];
      let passedOnTurn = 0;

      for (let turn = 1; turn <= maxIter; turn++) {
        const execResult = await withRetry(() =>
          exec.executor.execute({
            prompt: currentPrompt,
            systemPrompt: job.systemPrompt,
            maxTokens: Number.parseInt(process.env.MAX_OUTPUT_TOKENS ?? '4096'),
            temperature: 0,
          })
        );

        const evalResult = await this.evaluator.evaluate(job, execResult.content, input);

        cumulativeInputTokens += execResult.inputTokens;
        cumulativeOutputTokens += execResult.outputTokens;
        cumulativeLatencyMs += execResult.latencyMs;
        iterationScores.push(evalResult.score);
        lastExecResult = execResult;
        lastEvalResult = evalResult;

        if (evalResult.passed) {
          passedOnTurn = turn;
          break;
        }

        if (turn < maxIter) {
          currentPrompt = buildRetryPrompt(originalPrompt, execResult.content, evalResult);
        }
      }

      const costUSD = calculateCost(cumulativeInputTokens, cumulativeOutputTokens, exec.pricing);

      return {
        timestamp,
        jobId: job.id,
        jobName: job.name,
        language,
        runNumber,
        executionMode: lastExecResult!.executionMode,
        provider: exec.provider,
        modelId: lastExecResult!.modelId,
        modelDisplayName: exec.displayName,
        inputTokens: cumulativeInputTokens,
        outputTokens: cumulativeOutputTokens,
        totalTokens: cumulativeInputTokens + cumulativeOutputTokens,
        costUSD,
        tokensSource: lastExecResult!.tokensSource,
        latencyMs: cumulativeLatencyMs,
        turns: iterationScores.length,
        passed: lastEvalResult!.passed,
        qualityScore: lastEvalResult!.score,
        qualityNotes: lastEvalResult!.notes,
        errorMessage: lastEvalResult!.errorMessage,
        rawPrompt: originalPrompt,
        rawResponse: lastExecResult!.content,
        iterationScores: iterationScores.join(','),
        passedOnTurn,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        timestamp,
        jobId: job.id,
        jobName: job.name,
        language,
        runNumber,
        executionMode: 'api',
        provider: exec.provider,
        modelId: exec.modelId,
        modelDisplayName: exec.displayName,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUSD: 0,
        tokensSource: 'estimated',
        latencyMs: 0,
        turns: 0,
        passed: false,
        qualityScore: 0,
        qualityNotes: '',
        errorMessage,
        rawPrompt: '',
        rawResponse: '',
        iterationScores: '',
        passedOnTurn: 0,
      };
    }
  }
}
