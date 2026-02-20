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
import { AnthropicVertexAdapter } from './adapters/anthropic-vertex.adapter';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { OpenAIResponsesAdapter } from './adapters/openai-responses.adapter';
import { GoogleAdapter } from './adapters/google.adapter';
import { APIExecutor } from './execution/api-executor';
import { CLIExecutor } from './execution/cli-executor';
import { FullstackCLIExecutor } from './execution/fullstack-cli-executor';
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

// Provider groups: maps user-facing provider names to internal provider values.
// --providers openai includes both openai (Chat Completions) and openai-responses (Codex).
const PROVIDER_GROUPS: Record<string, string[]> = {
  anthropic: ['anthropic'],
  openai: ['openai', 'openai-responses'],
  google: ['google'],
};

function resolveProviderModels(providerIds: string[], allModels: ModelYaml[]): ModelYaml[] {
  const expandedProviders: string[] = [];
  for (const pid of providerIds) {
    const group = PROVIDER_GROUPS[pid];
    if (!group) {
      throw new Error(
        `Unknown provider: ${pid}. Available providers: ${Object.keys(PROVIDER_GROUPS).join(', ')}`
      );
    }
    expandedProviders.push(...group);
  }
  return allModels.filter((m) => expandedProviders.includes(m.provider));
}

function buildModelConfigs(ids: string[], allModels: ModelYaml[]): ModelConfig[] {
  const resolved = ids.length === 1 && ids[0] === 'all' ? allModels : ids.map((id) => {
    const cfg = allModels.find((m) => m.id === id);
    if (!cfg) throw new Error(`Unknown model: ${id}. Check config/models.yaml.`);
    return cfg;
  });
  return resolved.map((cfg) => {

    let executor;
    if (cfg.provider === 'anthropic') {
      const backend = process.env.ANTHROPIC_BACKEND ?? 'api';
      if (backend === 'vertex') {
        executor = new APIExecutor(new AnthropicVertexAdapter(cfg.modelId, cfg.displayName));
      } else {
        executor = new APIExecutor(new AnthropicAdapter(cfg.modelId, cfg.displayName));
      }
    } else if (cfg.provider === 'openai') {
      executor = new APIExecutor(new OpenAIAdapter(cfg.modelId, cfg.displayName));
    } else if (cfg.provider === 'openai-responses') {
      executor = new APIExecutor(new OpenAIResponsesAdapter(cfg.modelId, cfg.displayName));
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
      const agent = new ClaudeCodeAgent();
      return {
        id: cfg.id,
        displayName: cfg.displayName,
        provider: cfg.provider,
        estimatedPricing: cfg.estimatedPricing,
        executor: new CLIExecutor(agent),
        fullstackExecutor: new FullstackCLIExecutor(agent),
      };
    },
    'gemini-cli': () => {
      const cfg = allAgents.find((a) => a.id === 'gemini-cli')!;
      const agent = new GeminiCLIAgent();
      return {
        id: cfg.id,
        displayName: cfg.displayName,
        provider: cfg.provider,
        estimatedPricing: cfg.estimatedPricing,
        executor: new CLIExecutor(agent),
        fullstackExecutor: new FullstackCLIExecutor(agent),
      };
    },
    'codex-cli': () => {
      const cfg = allAgents.find((a) => a.id === 'codex-cli')!;
      const agent = new CodexCLIAgent();
      return {
        id: cfg.id,
        displayName: cfg.displayName,
        provider: cfg.provider,
        estimatedPricing: cfg.estimatedPricing,
        executor: new CLIExecutor(agent),
        fullstackExecutor: new FullstackCLIExecutor(agent),
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
  .option('--models <ids>', 'Comma-separated model IDs or "all" (from config/models.yaml)')
  .option('--providers <ids>', 'Comma-separated provider names to include all their models (anthropic, openai, google)')
  .option('--agents <ids>', 'Comma-separated agent IDs from config/agents.yaml')
  .option('--jobs <ids>', 'Comma-separated job IDs or "all" (default: all)', 'all')
  .option('--languages <langs>', 'Comma-separated languages or "all": nodejs,java,dotnet (default: nodejs)', 'nodejs')
  .option('--runs <n>', 'Runs per combination (default: 3)', '3')
  .option('--concurrent <n>', 'Max concurrent executions per provider (default: 3)', '3')
  .option('--output <dir>', 'Output directory for CSV results', process.env.RESULTS_DIR ?? './results')
  .option('--dry-run', 'Show what would run without calling any model')
  .option('--max-iterations <n>', 'Max retry iterations per job if it fails (default: 1, no retry)', '1')
  .action(async (opts) => {
    const mode: string = opts.mode;
    const jobIds: string[] = opts.jobs.split(',').map((s: string) => s.trim());
    const ALL_LANGUAGES: Language[] = ['nodejs', 'java', 'dotnet'];
    const languages: Language[] = opts.languages === 'all'
      ? ALL_LANGUAGES
      : opts.languages.split(',').map((s: string) => s.trim() as Language);
    const runsPerCombo = parseInt(opts.runs);
    const maxConcurrent = parseInt(opts.concurrent);
    const maxIterations = parseInt(opts.maxIterations);
    const dryRun: boolean = opts.dryRun ?? false;

    const allModels = loadModelsConfig();
    const allAgentsCfg = loadAgentsConfig();

    const modelIds: string[] = (opts.models ?? '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const providerIds: string[] = (opts.providers ?? '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const agentIds: string[] = (opts.agents ?? '').split(',').map((s: string) => s.trim()).filter(Boolean);

    // Resolve: union of --models and --providers
    let resolvedModelIds: string[] = [];
    if (modelIds.length === 1 && modelIds[0] === 'all') {
      resolvedModelIds = ['all'];
    } else {
      resolvedModelIds = [...modelIds];
      if (providerIds.length > 0) {
        const providerModels = resolveProviderModels(providerIds, allModels);
        for (const pm of providerModels) {
          if (!resolvedModelIds.includes(pm.id)) {
            resolvedModelIds.push(pm.id);
          }
        }
      }
    }

    if (mode === 'api' && resolvedModelIds.length === 0) {
      console.error('--models or --providers is required for mode=api');
      process.exit(1);
    }
    if (mode === 'cli' && agentIds.length === 0) {
      console.error('--agents is required for mode=cli');
      process.exit(1);
    }
    if (mode === 'both' && resolvedModelIds.length === 0 && agentIds.length === 0) {
      console.error('--models, --providers, and/or --agents required for mode=both');
      process.exit(1);
    }

    const models = mode !== 'cli' ? buildModelConfigs(resolvedModelIds, allModels) : [];
    const agents = mode !== 'api' ? buildAgentConfigs(agentIds, allAgentsCfg) : [];

    const jobs = resolveJobs(jobIds);

    console.log(`\nLLM Dev Bench`);
    console.log(`Mode: ${mode}  |  Jobs: ${jobs.length}  |  Languages: ${languages.join(', ')}`);
    console.log(`Models: ${models.map((m) => m.displayName).join(', ') || 'none'}`);
    if (providerIds.length > 0) {
      console.log(`Providers filter: ${providerIds.join(', ')}`);
    }
    console.log(`Agents: ${agents.map((a) => a.displayName).join(', ') || 'none'}`);
    console.log(`Runs per combo: ${runsPerCombo}  |  Max concurrent per provider: ${maxConcurrent}  |  Max iterations: ${maxIterations}`);
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
      maxIterations,
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

// ─── report command ──────────────────────────────────────────────────────────

program
  .command('report')
  .description('Generate PDF report from benchmark CSV results')
  .requiredOption('--input <csv>', 'Path to benchmark CSV file')
  .option('--output <dir>', 'Output directory for PDF reports', process.env.RESULTS_DIR ?? './results')
  .option('--lang <lang>', 'Language: en | pt-br | both (default: both)', 'both')
  .action(async (opts) => {
    const { generateReport } = await import('./report/index');

    const langOpt: string = opts.lang;
    let locales: Array<'en' | 'pt-br'>;
    if (langOpt === 'both') {
      locales = ['en', 'pt-br'];
    } else if (langOpt === 'en' || langOpt === 'pt-br') {
      locales = [langOpt];
    } else {
      console.error(`Invalid --lang value: ${langOpt}. Use: en | pt-br | both`);
      process.exit(1);
    }

    console.log(`\nLLM Dev Bench — Report Generator`);
    console.log(`Input: ${opts.input}`);
    console.log(`Output: ${opts.output}`);
    console.log(`Languages: ${locales.join(', ')}\n`);

    const outputFiles = await generateReport({
      inputFile: opts.input,
      outputDir: opts.output,
      locales,
    });

    console.log(`\nReport generation complete. Files:`);
    for (const f of outputFiles) {
      console.log(`  ${f}`);
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

// ─── consolidate command ──────────────────────────────────────────────────────

program
  .command('consolidate')
  .description('Merge multiple benchmark CSVs and select best result per combo')
  .requiredOption('--inputs <files>', 'Comma-separated CSV file paths')
  .option('--output <file>', 'Output consolidated CSV file')
  .option('--complete-matrix [boolean]', 'Add synthetic rows for untested combos (default: true)', 'true')
  .action(async (opts) => {
    const { consolidateCLI } = await import('./consolidate');

    const inputFiles = opts.inputs.split(',').map((f: string) => f.trim());
    const outputFile = opts.output ||
      path.join(process.env.RESULTS_DIR ?? './results',
                `consolidated_${new Date().toISOString().replace(/[:.]/g, '').replace('T', '_').slice(0, 15)}.csv`);

    // Parse boolean from string
    const completeMatrix = opts.completeMatrix === 'true' || opts.completeMatrix === true;

    consolidateCLI(inputFiles, outputFile, completeMatrix);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
