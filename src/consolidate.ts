import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { JobResult, Language } from './jobs/base.job';
import { getAllJobs } from './jobs/registry';

// ─── CSV Parsing (reused from reporter.ts) ─────────────────────────────────────

const CSV_HEADER = [
  'timestamp', 'job_id', 'job_name', 'language', 'execution_mode',
  'provider', 'model_id', 'model_display_name', 'run_number',
  'input_tokens', 'output_tokens', 'total_tokens', 'tokens_source', 'cost_usd',
  'latency_ms', 'turns', 'passed', 'quality_score', 'quality_notes',
  'error_message', 'raw_prompt_chars', 'raw_response_chars',
  'iteration_scores', 'passed_on_turn',
].join(',');

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current); current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseCsvFile(filePath: string): JobResult[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  return lines.slice(1)
    .map((line: string) => parseCSVLine(line))
    .filter((f: string[]) => f.length >= 22 && f[6] !== '')
    .map((f: string[]) => ({
      timestamp:        f[0],
      jobId:            f[1],
      jobName:          f[2],
      language:         f[3] as Language,
      executionMode:    f[4] as 'api' | 'cli',
      provider:         f[5],
      modelId:          f[6],
      modelDisplayName: f[7],
      runNumber:        parseInt(f[8])  || 1,
      inputTokens:      parseInt(f[9])  || 0,
      outputTokens:     parseInt(f[10]) || 0,
      totalTokens:      parseInt(f[11]) || 0,
      tokensSource:     f[12] as 'exact' | 'estimated',
      costUSD:          parseFloat(f[13]) || 0,
      latencyMs:        parseInt(f[14]) || 0,
      turns:            parseInt(f[15]) || 1,
      passed:           f[16] === 'true',
      qualityScore:     parseFloat(f[17]) || 0,
      qualityNotes:     f[18],
      errorMessage:     f[19] || undefined,
      rawPrompt:        f[20] || '',
      rawResponse:      f[21] || '',
      iterationScores:  f[22] || '',
      passedOnTurn:     parseInt(f[23]) || 0,
    }));
}

function escapeCsv(value: string | number | boolean | undefined): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function resultToRow(r: JobResult): string {
  return [
    r.timestamp,
    r.jobId,
    escapeCsv(r.jobName),
    r.language,
    r.executionMode,
    r.provider,
    r.modelId,
    escapeCsv(r.modelDisplayName),
    r.runNumber,
    r.inputTokens,
    r.outputTokens,
    r.totalTokens,
    r.tokensSource,
    r.costUSD.toFixed(6),
    r.latencyMs,
    r.turns,
    r.passed,
    r.qualityScore.toFixed(1),
    escapeCsv(r.qualityNotes),
    escapeCsv(r.errorMessage ?? ''),
    r.rawPrompt.length,
    r.rawResponse.length,
    escapeCsv(r.iterationScores),
    r.passedOnTurn,
  ].join(',');
}

// ─── Consolidation Logic ────────────────────────────────────────────────────────

type ComboKey = string; // Format: "job_id::model_id::language::execution_mode"

function comboKey(r: JobResult): ComboKey {
  return `${r.jobId}::${r.modelId}::${r.language}::${r.executionMode}`;
}

function parseComboKey(key: ComboKey): { jobId: string; modelId: string; language: Language; executionMode: 'api' | 'cli' } {
  const [jobId, modelId, language, executionMode] = key.split('::');
  return { jobId, modelId, language: language as Language, executionMode: executionMode as 'api' | 'cli' };
}

function parseMultipleCSVs(files: string[]): JobResult[] {
  const allResults: JobResult[] = [];

  for (const file of files) {
    const resolved = path.resolve(file);
    if (!fs.existsSync(resolved)) {
      console.warn(`  ⚠ File not found: ${file} (skipped)`);
      continue;
    }

    const results = parseCsvFile(resolved);
    console.log(`  + ${path.basename(file)} — ${results.length} rows`);
    allResults.push(...results);
  }

  return allResults;
}

function groupByCombo(results: JobResult[]): Map<ComboKey, JobResult[]> {
  const groups = new Map<ComboKey, JobResult[]>();

  for (const result of results) {
    const key = comboKey(result);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(result);
  }

  return groups;
}

function selectBest(group: JobResult[]): JobResult {
  const sorted = group.sort((a, b) => {
    // 1. Passed wins over failed
    if (a.passed !== b.passed) return a.passed ? -1 : 1;

    // 2. Higher quality score wins
    if (a.qualityScore !== b.qualityScore) return b.qualityScore - a.qualityScore;

    // 3. Lower cost wins (tie-breaker)
    if (a.costUSD !== b.costUSD) return a.costUSD - b.costUSD;

    // 4. Lower latency wins (final tie-breaker)
    return a.latencyMs - b.latencyMs;
  });

  // Mark as merged by setting runNumber to 0
  const best = { ...sorted[0] };
  best.runNumber = 0;
  return best;
}

function generateCompleteMatrix(): Set<ComboKey> {
  const matrix = new Set<ComboKey>();

  // Load all jobs
  const allJobs = getAllJobs();

  // Load all models
  const modelsPath = path.join(process.cwd(), 'config', 'models.yaml');
  const modelsYaml = yaml.load(fs.readFileSync(modelsPath, 'utf-8')) as { models: Array<{ id: string; provider: string; displayName: string }> };
  const allModels = modelsYaml.models;

  // Load all CLI agents
  const agentsPath = path.join(process.cwd(), 'config', 'agents.yaml');
  const agentsYaml = yaml.load(fs.readFileSync(agentsPath, 'utf-8')) as { agents: Array<{ id: string; provider: string; displayName: string }> };
  const allAgents = agentsYaml.agents;

  // Generate matrix: jobs × (models + agents) × languages × execution_mode
  for (const job of allJobs) {
    // Check if job is fullstack (e2e)
    const isFullstack = job.id.match(/^j(26|27|28|29|30|31)$/);

    // API models (skip fullstack jobs)
    if (!isFullstack) {
      for (const model of allModels) {
        for (const language of job.supportedLanguages) {
          const key = `${job.id}::${model.id}::${language}::api`;
          matrix.add(key);
        }
      }
    }

    // CLI agents (all jobs)
    for (const agent of allAgents) {
      for (const language of job.supportedLanguages) {
        const key = `${job.id}::${agent.id}::${language}::cli`;
        matrix.add(key);
      }
    }
  }

  return matrix;
}

function fillMissingCombos(existing: Map<ComboKey, JobResult>, fullMatrix: Set<ComboKey>): JobResult[] {
  const misses: JobResult[] = [];

  // Load jobs, models, agents for lookups
  const allJobs = getAllJobs();
  const jobsMap = new Map(allJobs.map(j => [j.id, j]));

  const modelsPath = path.join(process.cwd(), 'config', 'models.yaml');
  const modelsYaml = yaml.load(fs.readFileSync(modelsPath, 'utf-8')) as { models: Array<{ id: string; provider: string; displayName: string }> };
  const modelsMap = new Map(modelsYaml.models.map(m => [m.id, m]));

  const agentsPath = path.join(process.cwd(), 'config', 'agents.yaml');
  const agentsYaml = yaml.load(fs.readFileSync(agentsPath, 'utf-8')) as { agents: Array<{ id: string; provider: string; displayName: string }> };
  const agentsMap = new Map(agentsYaml.agents.map(a => [a.id, a]));

  for (const key of fullMatrix) {
    if (!existing.has(key)) {
      const { jobId, modelId, language, executionMode } = parseComboKey(key);

      const job = jobsMap.get(jobId);
      if (!job) continue;

      let displayName = '';
      let provider = '';

      if (executionMode === 'api') {
        const model = modelsMap.get(modelId);
        if (!model) continue;
        displayName = model.displayName;
        provider = model.provider;
      } else {
        const agent = agentsMap.get(modelId);
        if (!agent) continue;
        displayName = agent.displayName;
        provider = agent.provider;
      }

      const miss: JobResult = {
        timestamp: new Date().toISOString(),
        jobId,
        jobName: job.name,
        language,
        executionMode,
        provider,
        modelId,
        modelDisplayName: displayName,
        runNumber: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        tokensSource: 'estimated',
        costUSD: 0,
        latencyMs: 0,
        turns: 0,
        passed: false,
        qualityScore: 0,
        qualityNotes: '',
        errorMessage: 'Not executed',
        rawPrompt: '',
        rawResponse: '',
        iterationScores: '',
        passedOnTurn: 0,
      };

      misses.push(miss);
    }
  }

  return misses;
}

function writeMergedCSV(results: JobResult[], outputPath: string): void {
  // Sort by: job_id, model_id, language, execution_mode
  const sorted = results.sort((a, b) => {
    if (a.jobId !== b.jobId) return a.jobId.localeCompare(b.jobId);
    if (a.modelId !== b.modelId) return a.modelId.localeCompare(b.modelId);
    if (a.language !== b.language) return a.language.localeCompare(b.language);
    return a.executionMode.localeCompare(b.executionMode);
  });

  const rows = sorted.map(resultToRow);
  const content = CSV_HEADER + '\n' + rows.join('\n') + '\n';

  fs.writeFileSync(outputPath, content, 'utf-8');
}

// ─── CLI Entry Point ────────────────────────────────────────────────────────────

export function consolidateCLI(inputs: string[], output: string, completeMatrix: boolean): void {
  if (inputs.length === 0) {
    console.error('Error: No input files specified');
    console.error('\nUsage:');
    console.error('  npm run dev -- consolidate --inputs file1.csv,file2.csv --output merged.csv');
    process.exit(1);
  }

  console.log(`\nConsolidating ${inputs.length} CSV file(s)...\n`);

  // Step 1: Parse all CSVs
  const allResults = parseMultipleCSVs(inputs);
  if (allResults.length === 0) {
    console.error('\nError: No valid results found in input files');
    process.exit(1);
  }

  // Step 2: Group by combo
  const grouped = groupByCombo(allResults);
  console.log(`\n  Grouped into ${grouped.size} unique combos`);

  // Step 3: Select best per combo
  const bestResults = new Map<ComboKey, JobResult>();
  for (const [key, group] of grouped) {
    bestResults.set(key, selectBest(group));
  }

  let finalResults = Array.from(bestResults.values());

  // Step 4: Fill missing combos (if requested)
  if (completeMatrix) {
    console.log(`  Generating complete matrix...`);
    const fullMatrix = generateCompleteMatrix();
    const misses = fillMissingCombos(bestResults, fullMatrix);
    console.log(`  Added ${misses.length} missing combos`);
    finalResults.push(...misses);
  }

  // Step 5: Write merged CSV
  writeMergedCSV(finalResults, output);

  // Print summary
  const passCount = finalResults.filter(r => r.passed).length;
  const totalCost = finalResults.reduce((s, r) => s + r.costUSD, 0);
  const executed = finalResults.filter(r => r.errorMessage !== 'Not executed').length;
  const missed = finalResults.length - executed;

  console.log(`\n✓ Consolidated ${finalResults.length} combos → ${output}`);
  console.log(`  Executed: ${executed} | Missed: ${missed} | Passed: ${passCount}/${executed} | Total cost: ~$${totalCost.toFixed(2)}\n`);
}
