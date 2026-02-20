import {
  BenchmarkRow,
  ModelSummary,
  AnalysisResult,
  CategoryDefinition,
  CategoryRanking,
  CostEfficiencyEntry,
  SpeedAccuracyEntry,
  ScoreVsCostEntry,
  LanguageRanking,
  JobDifficulty,
  HeatmapData,
  HeatmapCell,
  RetryAnalysisEntry,
} from './types';

const CATEGORIES: CategoryDefinition[] = [
  {
    id: 'codeWriting',
    name: 'Code Writing',
    description: 'REST API generation, test generation, scaffolding, feature from issue, seed data',
    jobIds: ['j01', 'j04', 'j11', 'j13', 'j19'],
  },
  {
    id: 'codeFixing',
    name: 'Code Fixing',
    description: 'Refactoring, bug fix, migration, debugging, sync-to-async, CI failure',
    jobIds: ['j02', 'j03', 'j08', 'j09', 'j16', 'j20'],
  },
  {
    id: 'codeAnalysis',
    name: 'Code Analysis',
    description: 'Security review, N+1 detection, codebase explanation, PR impact, performance diagnosis',
    jobIds: ['j05', 'j10', 'j12', 'j15', 'j18'],
  },
  {
    id: 'devopsArch',
    name: 'DevOps & Architecture',
    description: 'Architecture decision, documentation, CI/CD pipeline, database migration',
    jobIds: ['j06', 'j07', 'j14', 'j17'],
  },
  {
    id: 'frontend',
    name: 'Frontend',
    description: 'Accessible components, debounced search, multi-step forms, optimistic updates, async state management',
    jobIds: ['j21', 'j22', 'j23', 'j24', 'j25'],
  },
];

function buildModelSummary(modelKey: string, rows: BenchmarkRow[]): ModelSummary {
  const first = rows[0];
  const passedCount = rows.filter((r) => r.passed).length;
  const latencies = rows.map((r) => r.latencyMs).sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length / 2)] ?? 0;

  return {
    modelId: first.modelId,
    displayName: first.modelDisplayName,
    provider: first.provider,
    executionMode: first.executionMode,
    totalRuns: rows.length,
    passedRuns: passedCount,
    passRate: rows.length > 0 ? passedCount / rows.length : 0,
    avgQualityScore: rows.reduce((s, r) => s + r.qualityScore, 0) / rows.length,
    avgCostUsd: rows.reduce((s, r) => s + r.costUsd, 0) / rows.length,
    totalCostUsd: rows.reduce((s, r) => s + r.costUsd, 0),
    avgLatencyMs: Math.round(rows.reduce((s, r) => s + r.latencyMs, 0) / rows.length),
    p50LatencyMs: p50,
    avgInputTokens: Math.round(rows.reduce((s, r) => s + r.inputTokens, 0) / rows.length),
    avgOutputTokens: Math.round(rows.reduce((s, r) => s + r.outputTokens, 0) / rows.length),
    avgTotalTokens: Math.round(rows.reduce((s, r) => s + r.totalTokens, 0) / rows.length),
    hasEstimatedTokens: rows.some((r) => r.tokensSource === 'estimated'),
    costPerSuccess: passedCount > 0
      ? rows.reduce((s, r) => s + r.costUsd, 0) / passedCount
      : Infinity,
  };
}

function groupByModel(rows: BenchmarkRow[]): Map<string, BenchmarkRow[]> {
  const groups = new Map<string, BenchmarkRow[]>();
  for (const row of rows) {
    const key = `${row.modelId}::${row.executionMode}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  return groups;
}

function buildSummaries(rows: BenchmarkRow[]): ModelSummary[] {
  const groups = groupByModel(rows);
  return Array.from(groups.entries()).map(([key, groupRows]) =>
    buildModelSummary(key, groupRows)
  );
}

function computeMedianCost(summaries: ModelSummary[]): number {
  const paidCosts = summaries
    .filter((m) => m.avgCostUsd > 0)
    .map((m) => m.avgCostUsd)
    .sort((a, b) => a - b);
  if (paidCosts.length === 0) return 0;
  if (paidCosts.length % 2 === 0) {
    return (paidCosts[paidCosts.length / 2 - 1] + paidCosts[paidCosts.length / 2]) / 2;
  }
  return paidCosts[Math.floor(paidCosts.length / 2)];
}

function buildJobDifficulty(validRows: BenchmarkRow[]): JobDifficulty[] {
  const jobGroups = new Map<string, BenchmarkRow[]>();
  for (const row of validRows) {
    if (!jobGroups.has(row.jobId)) jobGroups.set(row.jobId, []);
    jobGroups.get(row.jobId)!.push(row);
  }

  return Array.from(jobGroups.entries())
    .map(([jobId, rows]) => {
      const passedCount = rows.filter((r) => r.passed).length;
      const modelGroups = groupByModel(rows);
      const failedModelCount = Array.from(modelGroups.values()).filter(
        (modelRows) => !modelRows.some((r) => r.passed)
      ).length;

      return {
        jobId,
        jobName: rows[0].jobName,
        totalRuns: rows.length,
        passRate: rows.length > 0 ? passedCount / rows.length : 0,
        avgScore: rows.reduce((s, r) => s + r.qualityScore, 0) / rows.length,
        failedModels: failedModelCount,
        totalModels: modelGroups.size,
      };
    })
    .sort((a, b) => a.passRate - b.passRate || a.avgScore - b.avgScore);
}

function buildHeatmapData(validRows: BenchmarkRow[], missRows: BenchmarkRow[], overallRanking: ModelSummary[]): HeatmapData {
  const jobs = [...new Set(validRows.map((r) => r.jobId))].sort();
  const models = overallRanking.slice(0, 15).map((m) => m.displayName);

  const cells: HeatmapCell[][] = models.map((modelName) => {
    return jobs.map((jobId) => {
      const matchingRows = validRows.filter(
        (r) => r.modelDisplayName === modelName && r.jobId === jobId
      );
      const avgScore = matchingRows.length > 0
        ? matchingRows.reduce((s, r) => s + r.qualityScore, 0) / matchingRows.length
        : -1;
      const passed = matchingRows.length > 0 && matchingRows.some((r) => r.passed);
      const isMiss = matchingRows.length === 0 &&
        missRows.some((r) => r.modelDisplayName === modelName && r.jobId === jobId);

      return { modelDisplayName: modelName, jobId, avgScore, passed, isMiss };
    });
  });

  return { models, jobs, cells };
}

function buildRetryAnalysis(validRows: BenchmarkRow[], summaries: ModelSummary[]): RetryAnalysisEntry[] {
  const retryRows = validRows.filter((r) => r.turns > 1);
  if (retryRows.length === 0) return [];

  const modelGroups = groupByModel(retryRows);
  const entries: RetryAnalysisEntry[] = [];

  for (const [key, rows] of modelGroups) {
    const summary = summaries.find(
      (m) => `${m.modelId}::${m.executionMode}` === key
    );
    if (!summary) continue;

    const avgTurnsUsed = rows.reduce((s, r) => s + r.turns, 0) / rows.length;
    const firstTurnPassed = rows.filter((r) => r.passedOnTurn === 1).length;
    const finalPassed = rows.filter((r) => r.passed).length;
    const passRateFirstTurn = rows.length > 0 ? firstTurnPassed / rows.length : 0;
    const passRateFinal = rows.length > 0 ? finalPassed / rows.length : 0;

    entries.push({
      model: summary,
      avgTurnsUsed: +avgTurnsUsed.toFixed(1),
      passRateFirstTurn,
      passRateFinal,
      retryBenefit: passRateFinal - passRateFirstTurn,
    });
  }

  return entries.sort((a, b) => b.retryBenefit - a.retryBenefit);
}

export function analyze(rows: BenchmarkRow[], sourceFile: string): AnalysisResult {
  // Separate miss rows (not executed), infrastructure errors, and valid rows
  const allRows = rows;
  const missRows = rows.filter((r) => r.errorMessage === 'Not executed');
  const validRows = rows.filter((r) => !r.errorMessage || r.errorMessage.trim() === '');
  const errorCount = allRows.length - validRows.length - missRows.length;

  // Build summaries from valid rows only
  const summaries = buildSummaries(validRows);

  // Overall ranking by pass rate desc, then avg quality score desc
  const overallRanking = [...summaries].sort((a, b) =>
    b.passRate - a.passRate || b.avgQualityScore - a.avgQualityScore
  );

  // Cost efficiency: qualityScore / cost (zero-cost first)
  const costEfficiency: CostEfficiencyEntry[] = summaries
    .map((m) => ({
      model: m,
      costEfficiency: m.avgCostUsd > 0 ? m.avgQualityScore / m.avgCostUsd : Infinity,
      isZeroCost: m.avgCostUsd === 0,
    }))
    .sort((a, b) => {
      if (a.isZeroCost && !b.isZeroCost) return -1;
      if (!a.isZeroCost && b.isZeroCost) return 1;
      if (a.isZeroCost && b.isZeroCost) return b.model.avgQualityScore - a.model.avgQualityScore;
      return b.costEfficiency - a.costEfficiency;
    });

  // Score vs Cost
  const scoreVsCost: ScoreVsCostEntry[] = summaries
    .map((m) => ({
      model: m,
      isZeroCost: m.avgCostUsd === 0,
    }))
    .sort((a, b) => b.model.avgQualityScore - a.model.avgQualityScore);

  const medianCostUsd = computeMedianCost(summaries);

  // Language rankings
  const languages = [...new Set(validRows.map((r) => r.language))].sort();
  const languageRankings: LanguageRanking[] = languages.map((lang) => {
    const langRows = validRows.filter((r) => r.language === lang);
    const langSummaries = buildSummaries(langRows);
    return {
      language: lang,
      models: langSummaries.sort((a, b) =>
        b.passRate - a.passRate || b.avgQualityScore - a.avgQualityScore
      ),
    };
  });

  // Speed + accuracy: quality >= 3.0, sorted by latency asc
  const speedAccuracy: SpeedAccuracyEntry[] = summaries
    .map((m) => ({
      model: m,
      meetsThreshold: m.avgQualityScore >= 3.0,
    }))
    .sort((a, b) => {
      if (a.meetsThreshold && !b.meetsThreshold) return -1;
      if (!a.meetsThreshold && b.meetsThreshold) return 1;
      return a.model.avgLatencyMs - b.model.avgLatencyMs;
    });

  // API-only ranking
  const apiRows = validRows.filter((r) => r.executionMode === 'api');
  const apiOnlyRanking = buildSummaries(apiRows).sort((a, b) =>
    b.passRate - a.passRate || b.avgQualityScore - a.avgQualityScore
  );

  // Token analysis: sorted by total tokens desc
  const tokenAnalysis = [...summaries].sort((a, b) =>
    b.avgTotalTokens - a.avgTotalTokens
  );

  // Category rankings
  const categoryRankings: CategoryRanking[] = CATEGORIES.map((cat) => {
    const catRows = validRows.filter((r) => cat.jobIds.includes(r.jobId));
    const catSummaries = buildSummaries(catRows);
    return {
      category: cat,
      models: catSummaries.sort((a, b) =>
        b.passRate - a.passRate || b.avgQualityScore - a.avgQualityScore
      ),
    };
  }).filter((cr) => cr.models.length > 0);

  // Job difficulty
  const jobDifficulty = buildJobDifficulty(validRows);

  // Heatmap
  const heatmapData = buildHeatmapData(validRows, missRows, overallRanking);

  // Retry analysis
  const retryAnalysis = buildRetryAnalysis(validRows, summaries);

  const uniqueJobs = new Set(validRows.map((r) => r.jobId));

  return {
    rows: validRows,
    totalModels: summaries.length,
    totalJobs: uniqueJobs.size,
    totalRuns: validRows.length,
    totalErrors: errorCount,
    totalMisses: missRows.length,
    totalRunsIncludingErrors: allRows.length,
    sourceFile,
    generatedAt: new Date().toISOString(),
    overallRanking,
    costEfficiency,
    languageRankings,
    speedAccuracy,
    scoreVsCost,
    medianCostUsd,
    apiOnlyRanking,
    tokenAnalysis,
    categoryRankings,
    jobDifficulty,
    heatmapData,
    retryAnalysis,
  };
}

export { CATEGORIES };
