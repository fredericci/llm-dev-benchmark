import { AnthropicVertexAdapter } from '../adapters/anthropic-vertex.adapter';
import { AnalysisResult, Locale } from '../report/types';

export interface NarrativeResult {
  introduction: string;
  conclusion: string;
}

const SYSTEM_PROMPT = `You are a senior technology analyst writing a professional benchmark report about LLM performance on software engineering tasks. Write in a clear, data-driven style. Cite specific numbers from the data. Be objective — do not speculate or make claims not supported by the data. Do not use markdown formatting (no #, **, -, etc.) — write in plain paragraphs suitable for a PDF report.`;

function buildDataSummary(analysis: AnalysisResult): string {
  const lines: string[] = [];

  // Overview
  lines.push('BENCHMARK OVERVIEW:');
  lines.push(`- Models evaluated: ${analysis.totalModels}`);
  lines.push(`- Tasks evaluated: ${analysis.totalJobs}`);
  lines.push(`- Valid runs: ${analysis.totalRuns}`);
  lines.push(`- Error runs excluded: ${analysis.totalErrors}`);
  lines.push(`- Median cost per run: $${analysis.medianCostUsd.toFixed(4)}`);

  // Top 5 models
  lines.push('');
  lines.push('TOP 5 MODELS (by pass rate, then quality score):');
  for (const m of analysis.overallRanking.slice(0, 5)) {
    lines.push(`- ${m.displayName} (${m.provider}) — Pass Rate: ${(m.passRate * 100).toFixed(1)}%, Avg Score: ${m.avgQualityScore.toFixed(1)}/5, Avg Cost: $${m.avgCostUsd.toFixed(4)}`);
  }

  // Top 3 cost-efficient
  const paidEfficiency = analysis.costEfficiency.filter(e => !e.isZeroCost && isFinite(e.costEfficiency));
  if (paidEfficiency.length > 0) {
    lines.push('');
    lines.push('TOP 3 COST-EFFICIENT MODELS:');
    for (const e of paidEfficiency.slice(0, 3)) {
      lines.push(`- ${e.model.displayName} — ${e.costEfficiency.toFixed(2)} score/$ (Score: ${e.model.avgQualityScore.toFixed(1)}/5, Cost: $${e.model.avgCostUsd.toFixed(4)})`);
    }
  }

  // Best value quadrant
  const bestValue = analysis.scoreVsCost.filter(
    e => !e.isZeroCost && e.model.avgQualityScore >= 3.0 && e.model.avgCostUsd <= analysis.medianCostUsd
  );
  lines.push('');
  lines.push('BEST VALUE QUADRANT (quality >= 3.0 AND cost <= median):');
  if (bestValue.length === 0) {
    lines.push('- No models qualified');
  } else {
    for (const e of bestValue) {
      lines.push(`- ${e.model.displayName}: score=${e.model.avgQualityScore.toFixed(1)}, cost=$${e.model.avgCostUsd.toFixed(4)}`);
    }
  }

  // Category performance
  const scoredCategories = analysis.categoryRankings.filter(
    cr => cr.models.some(m => m.avgQualityScore > 0)
  );
  if (scoredCategories.length > 0) {
    lines.push('');
    lines.push('PERFORMANCE BY CATEGORY:');
    for (const cr of scoredCategories) {
      const best = cr.models[0];
      if (best) {
        lines.push(`- ${cr.category.name}: Best = ${best.displayName} (${(best.passRate * 100).toFixed(1)}%, ${best.avgQualityScore.toFixed(1)}/5)`);
      }
    }
  }

  // Hardest tasks
  if (analysis.jobDifficulty.length > 0) {
    lines.push('');
    lines.push('TOP 3 HARDEST TASKS:');
    for (const j of analysis.jobDifficulty.slice(0, 3)) {
      lines.push(`- ${j.jobId} ${j.jobName}: ${((1 - j.passRate) * 100).toFixed(1)}% fail rate, ${j.failedModels}/${j.totalModels} models failed`);
    }
  }

  // Speed analysis
  const fastGood = analysis.speedAccuracy.filter(e => e.meetsThreshold);
  if (fastGood.length > 0) {
    const fastest = fastGood[0];
    const slowest = analysis.speedAccuracy[analysis.speedAccuracy.length - 1];
    lines.push('');
    lines.push('SPEED ANALYSIS:');
    lines.push(`- Fastest model with quality >= 3.0: ${fastest.model.displayName} (${fastest.model.avgLatencyMs}ms)`);
    if (slowest) {
      lines.push(`- Slowest model: ${slowest.model.displayName} (${slowest.model.avgLatencyMs}ms)`);
    }
  }

  // Cost per resolved task
  const modelsWithPasses = analysis.overallRanking
    .filter(m => m.passedRuns > 0 && Number.isFinite(m.costPerSuccess))
    .sort((a, b) => a.costPerSuccess - b.costPerSuccess);
  if (modelsWithPasses.length > 0) {
    lines.push('');
    lines.push('COST PER RESOLVED TASK (total cost / passed runs, lower = better):');
    for (const m of modelsWithPasses.slice(0, 5)) {
      lines.push(`- ${m.displayName} (${m.provider}): $${m.costPerSuccess.toFixed(4)}/success (${m.passedRuns}/${m.totalRuns} passed, total cost $${m.totalCostUsd.toFixed(2)})`);
    }
    if (modelsWithPasses.length > 5) {
      const worst = modelsWithPasses[modelsWithPasses.length - 1];
      lines.push(`- Most expensive: ${worst.displayName}: $${worst.costPerSuccess.toFixed(4)}/success`);
    }
  }

  // Retry data
  if (analysis.retryAnalysis.length > 0) {
    const topRetry = analysis.retryAnalysis[0];
    lines.push('');
    lines.push('RETRY DATA:');
    lines.push(`- Models with retry data: ${analysis.retryAnalysis.length}`);
    lines.push(`- Highest retry benefit: ${topRetry.model.displayName} (+${(topRetry.retryBenefit * 100).toFixed(1)}% improvement)`);
  }

  return lines.join('\n');
}

async function generateSectionEN(
  adapter: AnthropicVertexAdapter,
  dataSummary: string,
  section: 'introduction' | 'conclusion',
): Promise<string> {
  const introPrompt = `Based on the benchmark data below, write an introduction section (2-3 paragraphs) for the report. The introduction should:
1. Briefly describe what this benchmark measures (LLM cost-efficiency on real software engineering tasks)
2. Summarize the scope (number of models, tasks, runs)
3. Highlight the key initial finding (which provider/model leads)
4. Set expectations for what the reader will find in the report

Write in English. Do not use markdown formatting.

DATA:
${dataSummary}`;

  const conclusionPrompt = `Based on the benchmark data below, write a conclusion section (2-3 paragraphs) for the report. The conclusion should:
1. Summarize the main findings (best overall model, best cost-efficiency, hardest tasks)
2. Highlight the cost-vs-quality tradeoff between providers
3. Note any limitations of the current benchmark run (e.g., error rates, categories with no valid scores)
4. Suggest what these results mean for practitioners choosing an LLM

Write in English. Do not use markdown formatting.

DATA:
${dataSummary}`;

  const response = await adapter.complete({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: section === 'introduction' ? introPrompt : conclusionPrompt,
    maxTokens: 2048,
    temperature: 0.7,
  });

  return response.content.trim();
}

async function translateToPtBr(
  adapter: AnthropicVertexAdapter,
  text: string,
): Promise<string> {
  const response = await adapter.complete({
    systemPrompt: 'You are a professional translator. Translate the following text from English to Brazilian Portuguese. Maintain the same tone, style, and level of detail. Do not add or remove any information. Do not use markdown formatting.',
    userPrompt: text,
    maxTokens: 2048,
    temperature: 0.3,
  });

  return response.content.trim();
}

// Cache English narratives to reuse across locales
const narrativeCache = new Map<string, NarrativeResult>();

export async function generateReportNarrative(
  analysis: AnalysisResult,
  locale: Locale,
): Promise<NarrativeResult> {
  const modelId = process.env.REPORT_NARRATOR_MODEL_ID ?? 'claude-opus-4-6';

  try {
    const adapter = new AnthropicVertexAdapter(modelId, 'Report Narrator');
    const dataSummary = buildDataSummary(analysis);

    // Generate English version first (or use cache)
    let enNarrative = narrativeCache.get('en');
    if (!enNarrative) {
      console.log(`  Generating narrative with ${modelId} (en)...`);
      const [introduction, conclusion] = await Promise.all([
        generateSectionEN(adapter, dataSummary, 'introduction'),
        generateSectionEN(adapter, dataSummary, 'conclusion'),
      ]);
      enNarrative = { introduction, conclusion };
      narrativeCache.set('en', enNarrative);
    }

    if (locale === 'en') {
      return enNarrative;
    }

    // Translate to pt-br
    const cachedPtBr = narrativeCache.get('pt-br');
    if (cachedPtBr) return cachedPtBr;

    console.log(`  Translating narrative to pt-br...`);
    const [introduction, conclusion] = await Promise.all([
      translateToPtBr(adapter, enNarrative.introduction),
      translateToPtBr(adapter, enNarrative.conclusion),
    ]);
    const ptBrNarrative = { introduction, conclusion };
    narrativeCache.set('pt-br', ptBrNarrative);

    return ptBrNarrative;
  } catch (err) {
    console.warn(`  Narrative generation failed: ${err instanceof Error ? err.message : String(err)}`);
    return { introduction: '', conclusion: '' };
  }
}
