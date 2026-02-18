import * as fs from 'fs';
import { BenchmarkRow } from './types';

/**
 * State-machine CSV parser that handles quoted fields with embedded
 * commas, newlines, and escaped double-quotes (RFC 4180).
 */
function parseCSVLine(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < content.length && content[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(field);
        field = '';
        i++;
      } else if (ch === '\n') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
        i++;
      } else if (ch === '\r') {
        if (i + 1 < content.length && content[i + 1] === '\n') {
          i++; // skip \r, will handle \n next iteration
        } else {
          row.push(field);
          field = '';
          rows.push(row);
          row = [];
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Last field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

const EXPECTED_COLUMNS = [
  'timestamp', 'job_id', 'job_name', 'language', 'execution_mode',
  'provider', 'model_id', 'model_display_name', 'run_number',
  'input_tokens', 'output_tokens', 'total_tokens', 'tokens_source', 'cost_usd',
  'latency_ms', 'turns', 'passed', 'quality_score', 'quality_notes',
  'error_message', 'raw_prompt_chars', 'raw_response_chars',
  'iteration_scores', 'passed_on_turn',
];

export function parseBenchmarkCSV(filePath: string): BenchmarkRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const allRows = parseCSVLine(content);

  if (allRows.length < 2) {
    throw new Error(`CSV file has no data rows: ${filePath}`);
  }

  const header = allRows[0];

  // Validate header matches expected columns
  for (let i = 0; i < EXPECTED_COLUMNS.length; i++) {
    if (header[i] !== EXPECTED_COLUMNS[i]) {
      throw new Error(
        `CSV header mismatch at column ${i}: expected "${EXPECTED_COLUMNS[i]}" but got "${header[i]}"`
      );
    }
  }

  const rows: BenchmarkRow[] = [];
  for (let i = 1; i < allRows.length; i++) {
    const cols = allRows[i];
    if (cols.length < EXPECTED_COLUMNS.length) continue; // skip malformed rows

    rows.push({
      timestamp: cols[0],
      jobId: cols[1],
      jobName: cols[2],
      language: cols[3],
      executionMode: cols[4],
      provider: cols[5],
      modelId: cols[6],
      modelDisplayName: cols[7],
      runNumber: parseInt(cols[8]) || 0,
      inputTokens: parseInt(cols[9]) || 0,
      outputTokens: parseInt(cols[10]) || 0,
      totalTokens: parseInt(cols[11]) || 0,
      tokensSource: cols[12],
      costUsd: parseFloat(cols[13]) || 0,
      latencyMs: parseInt(cols[14]) || 0,
      turns: parseInt(cols[15]) || 0,
      passed: cols[16] === 'true',
      qualityScore: parseFloat(cols[17]) || 0,
      qualityNotes: cols[18],
      errorMessage: cols[19],
      rawPromptChars: parseInt(cols[20]) || 0,
      rawResponseChars: parseInt(cols[21]) || 0,
      iterationScores: cols[22],
      passedOnTurn: parseInt(cols[23]) || 0,
    });
  }

  return rows;
}
