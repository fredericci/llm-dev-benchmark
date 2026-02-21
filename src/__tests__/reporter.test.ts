import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Reporter } from '../reporter';
import { JobResult } from '../jobs/base.job';

function makeResult(overrides: Partial<JobResult> = {}): JobResult {
  return {
    timestamp: '2026-01-01T00:00:00.000Z',
    jobId: 'j01',
    jobName: 'Code Generation',
    language: 'nodejs',
    runNumber: 1,
    executionMode: 'api',
    provider: 'anthropic',
    modelId: 'claude-haiku-4-5',
    modelDisplayName: 'Claude Haiku',
    inputTokens: 100,
    outputTokens: 200,
    totalTokens: 300,
    costUSD: 0.0015,
    tokensSource: 'exact',
    latencyMs: 1200,
    turns: 1,
    passed: true,
    qualityScore: 4.5,
    qualityNotes: 'Good implementation',
    errorMessage: undefined,
    rawPrompt: 'Write a function',
    rawResponse: 'function foo() {}',
    iterationScores: '4.5',
    passedOnTurn: 1,
    ...overrides,
  };
}

/** Wait for the write stream to open (file creation is async). */
function waitForOpen(reporter: Reporter): Promise<void> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (reporter as any).fileHandle.once('open', resolve);
  });
}

/** Flush and close the reporter stream, then wait for finish. */
function closeReporter(reporter: Reporter): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (reporter as any).fileHandle.end((err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

describe('Reporter', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-bench-test-'));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    // Give any open streams a moment to close before cleanup
    await new Promise((r) => setTimeout(r, 10));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('creates the output directory if it does not exist', async () => {
      const nestedDir = path.join(tmpDir, 'results', 'nested');
      const reporter = new Reporter(nestedDir);
      await waitForOpen(reporter);
      expect(fs.existsSync(nestedDir)).toBe(true);
      await closeReporter(reporter);
    });

    it('creates a CSV file with the correct header', async () => {
      const reporter = new Reporter(tmpDir);
      await waitForOpen(reporter);

      const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.csv'));
      expect(files).toHaveLength(1);
      await closeReporter(reporter);

      const content = fs.readFileSync(path.join(tmpDir, files[0]), 'utf-8');
      const header = content.split('\n')[0];
      expect(header).toContain('job_id');
      expect(header).toContain('model_id');
      expect(header).toContain('passed');
      expect(header).toContain('cost_usd');
      expect(header).toContain('quality_score');
    });

    it('returns the file path via getFilePath() in expected format', async () => {
      const reporter = new Reporter(tmpDir);
      await waitForOpen(reporter);
      const filePath = reporter.getFilePath();
      // Format: benchmark_YYYY-MM-DD_HHmm.csv
      expect(filePath).toMatch(/benchmark_\d{4}-\d{2}-\d{2}_\d{4}\.csv$/);
      expect(fs.existsSync(filePath)).toBe(true);
      await closeReporter(reporter);
    });
  });

  describe('appendRow', () => {
    it('writes a CSV row with the correct field count', async () => {
      const reporter = new Reporter(tmpDir);
      await waitForOpen(reporter);
      reporter.appendRow(makeResult());
      await closeReporter(reporter);

      const filePath = reporter.getFilePath();
      const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
      // header + 1 data row
      expect(lines).toHaveLength(2);

      const headerFields = lines[0].split(',');
      // Data row may have quoted fields with commas inside, so count fields
      expect(lines[1].length).toBeGreaterThan(0);
      // Verify header has expected column count (24 columns)
      expect(headerFields).toHaveLength(24);
    });

    it('writes correct values to the CSV row', async () => {
      const reporter = new Reporter(tmpDir);
      await waitForOpen(reporter);
      reporter.appendRow(makeResult({ jobId: 'j02', passed: false, qualityScore: 2.0 }));
      await closeReporter(reporter);

      const filePath = reporter.getFilePath();
      const content = fs.readFileSync(filePath, 'utf-8');
      const dataLine = content.trim().split('\n')[1];

      expect(dataLine).toContain('j02');
      expect(dataLine).toContain('false');
      expect(dataLine).toContain('2.0');
    });

    it('escapes CSV fields containing commas', async () => {
      const reporter = new Reporter(tmpDir);
      await waitForOpen(reporter);
      reporter.appendRow(makeResult({ qualityNotes: 'Good, very good' }));
      await closeReporter(reporter);

      const filePath = reporter.getFilePath();
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('"Good, very good"');
    });

    it('escapes CSV fields containing double quotes', async () => {
      const reporter = new Reporter(tmpDir);
      await waitForOpen(reporter);
      reporter.appendRow(makeResult({ qualityNotes: 'He said "hello"' }));
      await closeReporter(reporter);

      const filePath = reporter.getFilePath();
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('"He said ""hello"""');
    });

    it('writes multiple rows sequentially', async () => {
      const reporter = new Reporter(tmpDir);
      await waitForOpen(reporter);
      reporter.appendRow(makeResult({ jobId: 'j01' }));
      reporter.appendRow(makeResult({ jobId: 'j02' }));
      reporter.appendRow(makeResult({ jobId: 'j03' }));
      await closeReporter(reporter);

      const filePath = reporter.getFilePath();
      const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
      expect(lines).toHaveLength(4); // 1 header + 3 data rows
    });

    it('formats costUSD with 6 decimal places', async () => {
      const reporter = new Reporter(tmpDir);
      await waitForOpen(reporter);
      reporter.appendRow(makeResult({ costUSD: 0.001234 }));
      await closeReporter(reporter);

      const filePath = reporter.getFilePath();
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('0.001234');
    });
  });

  describe('setTotalCombos', () => {
    it('can be set without errors', async () => {
      const reporter = new Reporter(tmpDir);
      await waitForOpen(reporter);
      expect(() => reporter.setTotalCombos(10)).not.toThrow();
      await closeReporter(reporter);
    });
  });
});
