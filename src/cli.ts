#!/usr/bin/env node
import 'dotenv/config';
import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';

import { Language } from './jobs/base.job';
import { resolveJobs, getAllJobs } from './jobs/registry';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { GoogleAdapter } from './adapters/google.adapter';
import { APIExecutor } from './execution/api-executor';
import { CLIExecutor } from './execution/cli-executor';
import { ClaudeCodeAgent } from './cli-agents/claude-code.agent';
import { GeminiCLIAgent } from './cli-agents/gemini.agent';
import { CodexCLIAgent } from './cli-agents/codex.agent';
import { Runner, ModelConfig, AgentConfig } from './runner';
import { Reporter, printSummaryFromCSV } from './reporter';

// ─── YAML config types ──────────────────────────────────────────────────────

interface ModelYaml {
  id: string;
  provider: string;
  displayName: string;
  modelId: string;
  pricing: { inputPerMToken: number; outputPerMToken: number };
}

interface AgentYaml {
  id: string;
  displayName: string;
  binary: string;
  provider: string;
  estimatedPricing: { inputPerMToken: number; outputPerMToken: number };
  checkCommand: string;
}

function loadModelsConfig(): ModelYaml[] {
  const file = path.join(process.cwd(), 'config', 'models.yaml');
  const raw = yaml.load(fs.readFileSync(file, 'utf-8')) as { models: ModelYaml[] };
  return raw.models;
}

function loadAgentsConfig(): AgentYaml[] {
  const file = path.join(process.cwd(), 'config', 'agents.yaml');
  const raw = yaml.load(fs.readFileSync(file, 'utf-8')) as { agents: AgentYaml[] };
  return raw.agents;
}

function buildModelConfigs(ids: string[], allModels: ModelYaml[]): ModelConfig[] {
  return ids.map((id) => {
    const cfg = allModels.find((m) => m.id === id);
    if (!cfg) throw new Error(`Unknown model: ${id}. Check config/models.yaml.`);

    let executor;
    if (cfg.provider === 'anthropic') {
      executor = new APIExecutor(new AnthropicAdapter(cfg.modelId, cfg.displayName));
    } else if (cfg.provider === 'openai') {
      executor = new APIExecutor(new OpenAIAdapter(cfg.modelId, cfg.displayName));
    } else if (cfg.provider === 'google') {
      executor = new APIExecutor(new GoogleAdapter(cfg.modelId, cfg.displayName));
    } else {
      throw new Error(`Unknown provider: ${cfg.provider}`);
    }

    return {
      id: cfg.id,
      provider: cfg.provider,
      displayName: cfg.displayName,
      modelId: cfg.modelId,
      pricing: cfg.pricing,
      executor,
    };
  });
}

function buildAgentConfigs(ids: string[], allAgents: AgentYaml[]): AgentConfig[] {
  const agentMap: Record<string, () => AgentConfig> = {
    'claude-code': () => {
      const cfg = allAgents.find((a) => a.id === 'claude-code')!;
      return {
        id: cfg.id,
        displayName: cfg.displayName,
        provider: cfg.provider,
        estimatedPricing: cfg.estimatedPricing,
        executor: new CLIExecutor(new ClaudeCodeAgent()),
      };
    },
    'gemini-cli': () => {
      const cfg = allAgents.find((a) => a.id === 'gemini-cli')!;
      return {
        id: cfg.id,
        displayName: cfg.displayName,
        provider: cfg.provider,
        estimatedPricing: cfg.estimatedPricing,
        executor: new CLIExecutor(new GeminiCLIAgent()),
      };
    },
    'codex-cli': () => {
      const cfg = allAgents.find((a) => a.id === 'codex-cli')!;
      return {
        id: cfg.id,
        displayName: cfg.displayName,
        provider: cfg.provider,
        estimatedPricing: cfg.estimatedPricing,
        executor: new CLIExecutor(new CodexCLIAgent()),
      };
    },
  };

  return ids.map((id) => {
    if (!agentMap[id]) throw new Error(`Unknown agent: ${id}. Check config/agents.yaml.`);
    const cfg = allAgents.find((a) => a.id === id);
    if (!cfg) throw new Error(`Agent ${id} missing from agents.yaml`);
    return agentMap[id]();
  });
}

// ─── CLI setup ───────────────────────────────────────────────────────────────

program
  .name('llm-dev-bench')
  .description('Benchmark LLMs on real software development tasks')
  .version('1.0.0');

// ─── run command ─────────────────────────────────────────────────────────────

program
  .command('run')
  .description('Run the benchmark')
  .requiredOption('--mode <mode>', 'Execution mode: api | cli | both')
  .option('--models <ids>', 'Comma-separated model IDs from config/models.yaml')
  .option('--agents <ids>', 'Comma-separated agent IDs from config/agents.yaml')
  .option('--jobs <ids>', 'Comma-separated job IDs or "all" (default: all)', 'all')
  .option('--languages <langs>', 'Comma-separated languages: nodejs,java,dotnet (default: nodejs)', 'nodejs')
  .option('--runs <n>', 'Runs per combination (default: 3)', '3')
  .option('--concurrent <n>', 'Max concurrent executions (default: 3)', '3')
  .option('--output <dir>', 'Output directory for CSV results', process.env.RESULTS_DIR ?? './results')
  .option('--dry-run', 'Show what would run without calling any model')
  .action(async (opts) => {
    const mode: string = opts.mode;
    const jobIds: string[] = opts.jobs.split(',').map((s: string) => s.trim());
    const languages: Language[] = opts.languages.split(',').map((s: string) => s.trim() as Language);
    const runsPerCombo = parseInt(opts.runs);
    const maxConcurrent = parseInt(opts.concurrent);
    const dryRun: boolean = opts.dryRun ?? false;

    const allModels = loadModelsConfig();
    const allAgentsCfg = loadAgentsConfig();

    const modelIds: string[] = (opts.models ?? '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const agentIds: string[] = (opts.agents ?? '').split(',').map((s: string) => s.trim()).filter(Boolean);

    if (mode === 'api' && modelIds.length === 0) {
      console.error('--models is required for mode=api');
      process.exit(1);
    }
    if (mode === 'cli' && agentIds.length === 0) {
      console.error('--agents is required for mode=cli');
      process.exit(1);
    }
    if (mode === 'both' && modelIds.length === 0 && agentIds.length === 0) {
      console.error('--models and/or --agents required for mode=both');
      process.exit(1);
    }

    const models = mode !== 'cli' ? buildModelConfigs(modelIds, allModels) : [];
    const agents = mode !== 'api' ? buildAgentConfigs(agentIds, allAgentsCfg) : [];

    const jobs = resolveJobs(jobIds);

    console.log(`\nLLM Dev Bench`);
    console.log(`Mode: ${mode}  |  Jobs: ${jobs.length}  |  Languages: ${languages.join(', ')}`);
    console.log(`Models: ${models.map((m) => m.displayName).join(', ') || 'none'}`);
    console.log(`Agents: ${agents.map((a) => a.displayName).join(', ') || 'none'}`);
    console.log(`Runs per combo: ${runsPerCombo}  |  Max concurrent: ${maxConcurrent}`);
    console.log('');

    const reporter = new Reporter(opts.output);
    const runner = new Runner();

    const allResults = await runner.run(jobs, {
      jobs: jobIds,
      models,
      agents,
      languages,
      runsPerCombo,
      maxConcurrent,
      outputDir: opts.output,
      dryRun,
    }, reporter);

    if (!dryRun) {
      reporter.printSummary(allResults);
    }
  });

// ─── check-agents command ─────────────────────────────────────────────────────

program
  .command('check-agents')
  .description('Check which CLI agents are available in PATH')
  .action(() => {
    const allAgents = loadAgentsConfig();
    console.log('\nCLI Agent Availability:\n');

    for (const agent of allAgents) {
      try {
        const version = execSync(`${agent.binary} --version 2>&1`, {
          timeout: 5000,
          encoding: 'utf-8',
        }).trim();
        const shortVersion = version.split('\n')[0].slice(0, 60);
        console.log(`  ✓ ${agent.displayName.padEnd(25)} ${shortVersion}`);
      } catch {
        console.log(`  ✗ ${agent.displayName.padEnd(25)} not found (install ${agent.binary})`);
      }
    }
    console.log('');
  });

// ─── list-jobs command ────────────────────────────────────────────────────────

program
  .command('list-jobs')
  .description('List all registered benchmark jobs')
  .action(() => {
    const jobs = getAllJobs();
    console.log(`\nRegistered Jobs (${jobs.length} total):\n`);
    for (const job of jobs) {
      const langs = job.supportedLanguages.join(', ');
      console.log(`  ${job.id.padEnd(5)} ${job.name.padEnd(45)} [${job.evaluationType}] langs: ${langs}`);
    }
    console.log('');
  });

// ─── summarize command ────────────────────────────────────────────────────────

program
  .command('summarize <csvFile>')
  .description('Print a summary table from an existing benchmark CSV (useful after Docker runs)')
  .action((csvFile: string) => {
    printSummaryFromCSV(csvFile);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
