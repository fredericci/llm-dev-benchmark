import * as fs from 'fs';
import * as path from 'path';
import { JobResult } from './jobs/base.job';

const CSV_HEADER = [
  'timestamp', 'job_id', 'job_name', 'language', 'execution_mode',
  'provider', 'model_id', 'model_display_name', 'run_number',
  'input_tokens', 'output_tokens', 'total_tokens', 'tokens_source', 'cost_usd',
  'latency_ms', 'turns', 'passed', 'quality_score', 'quality_notes',
  'error_message', 'raw_prompt_chars', 'raw_response_chars',
].join(',');

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
  ].join(',');
}

interface SummaryEntry {
  displayName: string;
  mode: string;
  provider: string;
  results: JobResult[];
}

export class Reporter {
  private filePath: string;
  private fileHandle: fs.WriteStream;
  private startTime: number;
  private totalCombos = 0;
  private completedCombos = 0;
  private failedCombos = 0;

  constructor(outputDir: string) {
    fs.mkdirSync(outputDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', '_').slice(0, 15);
    this.filePath = path.join(outputDir, `benchmark_${timestamp}.csv`);
    this.fileHandle = fs.createWriteStream(this.filePath, { flags: 'a', encoding: 'utf-8' });
    this.fileHandle.write(CSV_HEADER + '\n');
    this.startTime = Date.now();
  }

  setTotalCombos(n: number): void {
    this.totalCombos = n;
  }

  /** Append a single result row immediately — no buffering */
  appendRow(result: JobResult): void {
    const row = resultToRow(result);
    this.fileHandle.write(row + '\n');
    this.completedCombos++;
    if (!result.passed || result.errorMessage) this.failedCombos++;

    const pct = this.totalCombos > 0
      ? ` (${Math.round((this.completedCombos / this.totalCombos) * 100)}%)`
      : '';
    const status = result.errorMessage ? 'ERROR' : (result.passed ? 'PASS' : 'FAIL');
    const cost = result.tokensSource === 'estimated'
      ? `~$${result.costUSD.toFixed(4)}`
      : `$${result.costUSD.toFixed(4)}`;
    console.log(
      `  [${status}] ${result.jobId} | ${result.modelDisplayName} | ${result.language} | run ${result.runNumber} | ${result.latencyMs}ms | ${cost}${pct}`
    );
  }

  /** Print the summary table to stdout and close the file */
  printSummary(allResults: JobResult[]): void {
    this.fileHandle.end();

    const durationMs = Date.now() - this.startTime;
    const durationStr = formatDuration(durationMs);

    // Group results by model/agent
    const groups = new Map<string, SummaryEntry>();
    for (const r of allResults) {
      const key = `${r.modelId}::${r.executionMode}`;
      if (!groups.has(key)) {
        groups.set(key, {
          displayName: r.modelDisplayName,
          mode: r.executionMode,
          provider: r.provider,
          results: [],
        });
      }
      groups.get(key)!.results.push(r);
    }

    const entries = Array.from(groups.values()).sort((a, b) => {
      const aPass = a.results.filter((r) => r.passed).length / a.results.length;
      const bPass = b.results.filter((r) => r.passed).length / b.results.length;
      return aPass - bPass;
    });

    let apiCost = 0;
    let cliCost = 0;
    for (const r of allResults) {
      if (r.executionMode === 'api') apiCost += r.costUSD;
      else cliCost += r.costUSD;
    }

    console.log('\n');
    const line = '═'.repeat(89);
    const hline = '╬'.repeat(1);
    console.log(`╔${line}╗`);
    console.log(`║${'  LLM DEV BENCHMARK — SUMMARY'.padEnd(89)}║`);
    console.log(`╠${'════════════════════'.padEnd(20, '═')}╦${'══════'.padEnd(6, '═')}╦${'════════════'.padEnd(12, '═')}╦${'═══════════'.padEnd(11, '═')}╦${'══════════'.padEnd(10, '═')}╦${'═══════════'.padEnd(11, '═')}╦${'════════'.padEnd(8, '═')}╣`);
    console.log(`║ ${'Model / Agent'.padEnd(19)}║ ${'Mode'.padEnd(5)}║ ${'Pass Rate'.padEnd(11)}║ ${'Avg Score'.padEnd(10)}║ ${'Avg Cost'.padEnd(9)}║ ${'Avg Tokens'.padEnd(10)}║ ${'p50 ms'.padEnd(7)}║`);
    console.log(`╠${'════════════════════'.padEnd(20, '═')}╬${'══════'.padEnd(6, '═')}╬${'════════════'.padEnd(12, '═')}╬${'═══════════'.padEnd(11, '═')}╬${'══════════'.padEnd(10, '═')}╬${'═══════════'.padEnd(11, '═')}╬${'════════'.padEnd(8, '═')}╣`);

    for (const entry of entries) {
      const { results, displayName, mode } = entry;
      const passCount = results.filter((r) => r.passed).length;
      const passRate = `${((passCount / results.length) * 100).toFixed(1)}%`;
      const avgScore = (results.reduce((s, r) => s + r.qualityScore, 0) / results.length).toFixed(1);
      const avgCost = results.reduce((s, r) => s + r.costUSD, 0) / results.length;
      const hasEstimated = results.some((r) => r.tokensSource === 'estimated');
      const costStr = `${hasEstimated ? '~' : ''}$${avgCost.toFixed(4)}`;
      const avgTokens = Math.round(results.reduce((s, r) => s + r.totalTokens, 0) / results.length);
      const tokenStr = `${hasEstimated ? '~' : ''}${avgTokens.toLocaleString()}`;
      const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
      const p50 = latencies[Math.floor(latencies.length / 2)];
      const p50Str = p50 ? p50.toLocaleString() : 'N/A';

      const name = displayName.slice(0, 19).padEnd(19);
      console.log(
        `║ ${name}║ ${mode.padEnd(5)}║ ${passRate.padEnd(11)}║ ${`${avgScore}/5`.padEnd(10)}║ ${costStr.padEnd(9)}║ ${tokenStr.padEnd(10)}║ ${p50Str.padEnd(7)}║`
      );
    }

    console.log(`╚${'════════════════════'.padEnd(20, '═')}╩${'══════'.padEnd(6, '═')}╩${'════════════'.padEnd(12, '═')}╩${'═══════════'.padEnd(11, '═')}╩${'══════════'.padEnd(10, '═')}╩${'═══════════'.padEnd(11, '═')}╩${'════════'.padEnd(8, '═')}╝`);

    if (allResults.some((r) => r.tokensSource === 'estimated')) {
      console.log('~ = estimated (CLI mode, tokens not available from agent)');
    }

    console.log(`\nResults: ${this.filePath}`);
    console.log(
      `API cost: $${apiCost.toFixed(2)}  |  CLI cost (estimated): ~$${cliCost.toFixed(2)}  |  Total: ~$${(apiCost + cliCost).toFixed(2)}`
    );
    console.log(
      `Duration: ${durationStr}  |  Combos: ${this.completedCombos}  |  Failed: ${this.failedCombos}`
    );
  }

  getFilePath(): string {
    return this.filePath;
  }
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
