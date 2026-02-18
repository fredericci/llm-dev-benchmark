import * as path from 'path';
import * as fs from 'fs';
import { Locale } from './types';
import { parseBenchmarkCSV } from './csv-parser';
import { analyze } from './analyzer';
import { renderAllCharts } from './chart-renderer';
import { renderPDF } from './pdf-renderer';

export interface ReportOptions {
  inputFile: string;
  outputDir: string;
  locales: Locale[];
}

export async function generateReport(options: ReportOptions): Promise<string[]> {
  const { inputFile, outputDir, locales } = options;

  // Validate input
  if (!fs.existsSync(inputFile)) {
    throw new Error(`Input CSV file not found: ${inputFile}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Parsing CSV: ${inputFile}`);
  const rows = parseBenchmarkCSV(inputFile);
  console.log(`  Parsed ${rows.length} rows`);

  if (rows.length === 0) {
    throw new Error('CSV file contains no data rows');
  }

  console.log('Analyzing data...');
  const analysis = analyze(rows, inputFile);
  console.log(`  ${analysis.totalModels} models, ${analysis.totalJobs} jobs, ${analysis.totalRuns} runs`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', '_').slice(0, 15);
  const outputFiles: string[] = [];

  for (const locale of locales) {
    console.log(`Rendering charts (${locale})...`);
    const charts = await renderAllCharts(analysis, locale);

    const filename = `benchmark_report_${timestamp}_${locale}.pdf`;
    const outputPath = path.join(outputDir, filename);

    console.log(`Generating PDF (${locale}): ${outputPath}`);
    await renderPDF(analysis, charts, locale, outputPath);

    outputFiles.push(outputPath);
    console.log(`  Done: ${outputPath}`);
  }

  return outputFiles;
}
