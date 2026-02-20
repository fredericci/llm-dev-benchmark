import { AnthropicVertexAdapter } from '../adapters/anthropic-vertex.adapter';
import { AnalysisResult, ChartNarrations, Locale } from '../report/types';

export interface NarrativeResult {
  introduction: string;
  conclusion: string;
  chartNarrations: ChartNarrations;
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

// ─── Chart-specific data context builders ────────────────────────────────────

function buildChart1Context(analysis: AnalysisResult): string {
  const lines: string[] = [];
  lines.push('BENCHMARK OVERVIEW:');
  lines.push(`- Models evaluated: ${analysis.totalModels}`);
  lines.push(`- Tasks evaluated: ${analysis.totalJobs}`);
  lines.push(`- Valid runs: ${analysis.totalRuns}`);
  lines.push(`- Error runs excluded: ${analysis.totalErrors}`);
  lines.push('');
  lines.push('CHART 1 — OVERALL PASS RATE RANKING (all models ranked by % tasks passed):');
  for (const m of analysis.overallRanking.slice(0, 10)) {
    lines.push(`- ${m.displayName} (${m.provider}, ${m.executionMode}): ${(m.passRate * 100).toFixed(1)}% pass rate, avg score ${m.avgQualityScore.toFixed(1)}/5`);
  }
  if (analysis.overallRanking.length > 10) {
    const last = analysis.overallRanking[analysis.overallRanking.length - 1];
    lines.push(`- ... lowest ranked: ${last.displayName}: ${(last.passRate * 100).toFixed(1)}% pass rate`);
  }
  return lines.join('\n');
}

function buildChart2Context(analysis: AnalysisResult): string {
  const lines: string[] = [buildChart1Context(analysis)];
  lines.push('');
  lines.push('CHART 2 — COST EFFICIENCY (quality score per dollar spent, higher = better):');
  const paidEfficiency = analysis.costEfficiency.filter(e => !e.isZeroCost && isFinite(e.costEfficiency));
  for (const e of paidEfficiency.slice(0, 10)) {
    lines.push(`- ${e.model.displayName}: ${e.costEfficiency.toFixed(2)} score/$ (score ${e.model.avgQualityScore.toFixed(1)}/5, cost $${e.model.avgCostUsd.toFixed(4)})`);
  }
  const zeroCost = analysis.costEfficiency.filter(e => e.isZeroCost);
  if (zeroCost.length > 0) {
    lines.push(`- Zero-cost models (not ranked): ${zeroCost.map(e => e.model.displayName).join(', ')}`);
  }
  return lines.join('\n');
}

function buildChart3Context(analysis: AnalysisResult): string {
  const lines: string[] = [buildChart2Context(analysis)];
  lines.push('');
  lines.push('CHART 3 — COST PER RESOLVED TASK (total cost / passed runs, lower = better):');
  const modelsWithPasses = analysis.overallRanking
    .filter(m => m.passedRuns > 0 && Number.isFinite(m.costPerSuccess))
    .sort((a, b) => a.costPerSuccess - b.costPerSuccess);
  for (const m of modelsWithPasses.slice(0, 10)) {
    lines.push(`- ${m.displayName} (${m.provider}): $${m.costPerSuccess.toFixed(4)}/task (${m.passedRuns}/${m.totalRuns} passed, total spent $${m.totalCostUsd.toFixed(2)})`);
  }
  return lines.join('\n');
}

function buildChart4Context(analysis: AnalysisResult): string {
  const lines: string[] = [buildChart3Context(analysis)];
  lines.push('');
  lines.push(`CHART 4 — QUALITY VS COST SCATTER (median cost = $${analysis.medianCostUsd.toFixed(4)}, quality threshold = 3.0/5):`);
  const bestQuadrant = analysis.scoreVsCost.filter(
    e => !e.isZeroCost && e.model.avgQualityScore >= 3.0 && e.model.avgCostUsd <= analysis.medianCostUsd
  );
  lines.push(`- Best value quadrant (high quality + low cost): ${bestQuadrant.length} models`);
  for (const e of bestQuadrant) {
    lines.push(`  • ${e.model.displayName}: score ${e.model.avgQualityScore.toFixed(1)}/5, cost $${e.model.avgCostUsd.toFixed(4)}`);
  }
  const highQualHighCost = analysis.scoreVsCost.filter(
    e => !e.isZeroCost && e.model.avgQualityScore >= 3.0 && e.model.avgCostUsd > analysis.medianCostUsd
  );
  lines.push(`- High quality but above-median cost: ${highQualHighCost.length} models`);
  const lowQual = analysis.scoreVsCost.filter(
    e => !e.isZeroCost && e.model.avgQualityScore < 3.0
  );
  lines.push(`- Below quality threshold (< 3.0): ${lowQual.length} models`);
  return lines.join('\n');
}

function buildChart5Context(analysis: AnalysisResult): string {
  const lines: string[] = [buildChart4Context(analysis)];
  lines.push('');
  lines.push('CHART 5 — SPEED vs QUALITY SCATTER (qualified = quality >= 3.0):');
  const qualified = analysis.speedAccuracy.filter(e => e.meetsThreshold);
  for (const e of qualified.slice(0, 8)) {
    lines.push(`- ${e.model.displayName}: avg ${e.model.avgLatencyMs.toLocaleString()}ms, p50 ${e.model.p50LatencyMs.toLocaleString()}ms, score ${e.model.avgQualityScore.toFixed(1)}/5`);
  }
  const unqualified = analysis.speedAccuracy.filter(e => !e.meetsThreshold);
  if (unqualified.length > 0) {
    lines.push(`- Did not meet quality threshold: ${unqualified.length} models`);
  }
  return lines.join('\n');
}

function buildChart6Context(analysis: AnalysisResult): string {
  const lines: string[] = [buildChart5Context(analysis)];
  lines.push('');
  lines.push('CHART 6 — TOKEN USAGE PER PROBLEM (avg input + output tokens):');
  for (const m of analysis.tokenAnalysis.slice(0, 10)) {
    const est = m.hasEstimatedTokens ? '~' : '';
    lines.push(`- ${m.displayName}: ${est}${m.avgInputTokens.toLocaleString()} input + ${est}${m.avgOutputTokens.toLocaleString()} output = ${est}${m.avgTotalTokens.toLocaleString()} total tokens`);
  }
  return lines.join('\n');
}

function buildChart7Context(analysis: AnalysisResult): string {
  const lines: string[] = [buildChart6Context(analysis)];
  lines.push('');
  lines.push('CHART 7 — PERFORMANCE BY TASK CATEGORY:');
  for (const cr of analysis.categoryRankings) {
    const top3 = cr.models.slice(0, 3);
    lines.push(`- ${cr.category.name} (${cr.category.jobIds.length} tasks): top models — ${top3.map(m => `${m.displayName} ${(m.passRate * 100).toFixed(0)}%`).join(', ')}`);
  }
  return lines.join('\n');
}

function buildChart8Context(analysis: AnalysisResult): string {
  const lines: string[] = [buildChart7Context(analysis)];
  lines.push('');
  lines.push('CHART 8 — TASK DIFFICULTY (sorted by fail rate, hardest first):');
  for (const j of analysis.jobDifficulty) {
    lines.push(`- ${j.jobId} "${j.jobName}": ${((1 - j.passRate) * 100).toFixed(1)}% fail rate, avg score ${j.avgScore.toFixed(1)}/5, ${j.failedModels}/${j.totalModels} models failed`);
  }
  return lines.join('\n');
}

// ─── Chart narration prompt builders ─────────────────────────────────────────

const CHART_NARRATION_PROMPTS: Array<{
  key: keyof ChartNarrations;
  contextFn: (a: AnalysisResult) => string;
  instruction: string;
}> = [
  {
    key: 'passRateBar',
    contextFn: buildChart1Context,
    instruction: `Interpret Chart 1 (Overall Pass Rate Ranking). In 2-4 sentences, describe which models lead, the spread between top and bottom performers, and any notable provider trends. Focus on what the pass rate distribution tells us about overall model capabilities.`,
  },
  {
    key: 'costEfficiencyBar',
    contextFn: buildChart2Context,
    instruction: `Interpret Chart 2 (Cost Efficiency). In 2-4 sentences, describe which models deliver the best quality per dollar, and whether the models that scored highest in pass rate (Chart 1) are also the most cost-efficient. Note any surprising inversions where lower-ranked models offer better value.`,
  },
  {
    key: 'costPerSuccessBar',
    contextFn: buildChart3Context,
    instruction: `Interpret Chart 3 (Cost per Resolved Task). In 2-4 sentences, explain what this metric measures (total spend divided by tasks passed, including failed attempts) and which models achieve the lowest cost to actually resolve a task. Note any correlation or divergence from the pass rate (Chart 1) and cost efficiency (Chart 2) rankings.`,
  },
  {
    key: 'scoreVsCostScatter',
    contextFn: buildChart4Context,
    instruction: `Interpret Chart 4 (Quality vs Cost Scatter). In 2-4 sentences, describe how models distribute across the four quadrants, which models sit in the best-value zone (high quality + below-median cost), and how this compares with the cost-per-success findings from Chart 3. Mention any models that are expensive despite low quality.`,
  },
  {
    key: 'speedQualityScatter',
    contextFn: buildChart5Context,
    instruction: `Interpret Chart 5 (Speed vs Quality Scatter). In 2-4 sentences, highlight which qualified models (quality >= 3.0) are fastest, and whether fast models also tend to be cost-efficient (referencing Charts 2-4). Note any speed-quality tradeoffs visible in the data.`,
  },
  {
    key: 'tokenStackedBar',
    contextFn: buildChart6Context,
    instruction: `Interpret Chart 6 (Token Usage). In 2-4 sentences, describe the range of token consumption across models and whether high token usage correlates with better quality (referencing Chart 1) or higher cost (referencing Charts 2-3). Note if any models are notably verbose or concise.`,
  },
  {
    key: 'categoryGroupedBar',
    contextFn: buildChart7Context,
    instruction: `Interpret Chart 7 (Category Performance). In 2-4 sentences, identify which task categories are hardest across models, which models show specialization in certain categories versus consistent performance, and whether category strengths align with overall rankings from Chart 1.`,
  },
  {
    key: 'difficultyBar',
    contextFn: buildChart8Context,
    instruction: `Interpret Chart 8 (Task Difficulty). In 2-4 sentences, identify the hardest and easiest tasks, explain what the difficulty distribution implies about benchmark coverage, and connect this to category weaknesses from Chart 7 and overall model performance from Chart 1. Note any tasks where all or almost all models failed.`,
  },
];

async function generateChartNarrationsEN(
  adapter: AnthropicVertexAdapter,
  analysis: AnalysisResult,
): Promise<ChartNarrations> {
  const results = await Promise.all(
    CHART_NARRATION_PROMPTS.map(async ({ contextFn, instruction }) => {
      const context = contextFn(analysis);
      const response = await adapter.complete({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: `${instruction}\n\nWrite in English. Do not use markdown formatting. Keep it to 2-4 sentences.\n\nDATA:\n${context}`,
        maxTokens: 512,
        temperature: 0.7,
      });
      return response.content.trim();
    })
  );

  return {
    passRateBar: results[0],
    costEfficiencyBar: results[1],
    costPerSuccessBar: results[2],
    scoreVsCostScatter: results[3],
    speedQualityScatter: results[4],
    tokenStackedBar: results[5],
    categoryGroupedBar: results[6],
    difficultyBar: results[7],
  };
}

async function translateChartNarrationsToPtBr(
  adapter: AnthropicVertexAdapter,
  narrations: ChartNarrations,
): Promise<ChartNarrations> {
  const keys = Object.keys(narrations) as (keyof ChartNarrations)[];
  const translations = await Promise.all(
    keys.map(async (key) => {
      const response = await adapter.complete({
        systemPrompt: 'You are a professional translator. Translate the following text from English to Brazilian Portuguese. Maintain the same tone, style, and level of detail. Do not add or remove any information. Do not use markdown formatting.',
        userPrompt: narrations[key],
        maxTokens: 512,
        temperature: 0.3,
      });
      return response.content.trim();
    })
  );

  const result = {} as ChartNarrations;
  keys.forEach((key, i) => { result[key] = translations[i]; });
  return result;
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
      const [introduction, conclusion, chartNarrations] = await Promise.all([
        generateSectionEN(adapter, dataSummary, 'introduction'),
        generateSectionEN(adapter, dataSummary, 'conclusion'),
        generateChartNarrationsEN(adapter, analysis),
      ]);
      enNarrative = { introduction, conclusion, chartNarrations };
      narrativeCache.set('en', enNarrative);
    }

    if (locale === 'en') {
      return enNarrative;
    }

    // Translate to pt-br
    const cachedPtBr = narrativeCache.get('pt-br');
    if (cachedPtBr) return cachedPtBr;

    console.log(`  Translating narrative to pt-br...`);
    const [introduction, conclusion, chartNarrations] = await Promise.all([
      translateToPtBr(adapter, enNarrative.introduction),
      translateToPtBr(adapter, enNarrative.conclusion),
      translateChartNarrationsToPtBr(adapter, enNarrative.chartNarrations),
    ]);
    const ptBrNarrative = { introduction, conclusion, chartNarrations };
    narrativeCache.set('pt-br', ptBrNarrative);

    return ptBrNarrative;
  } catch (err) {
    console.warn(`  Narrative generation failed: ${err instanceof Error ? err.message : String(err)}`);
    const empty: ChartNarrations = {
      passRateBar: '',
      costEfficiencyBar: '',
      costPerSuccessBar: '',
      scoreVsCostScatter: '',
      speedQualityScatter: '',
      tokenStackedBar: '',
      categoryGroupedBar: '',
      difficultyBar: '',
    };
    return { introduction: '', conclusion: '', chartNarrations: empty };
  }
}
