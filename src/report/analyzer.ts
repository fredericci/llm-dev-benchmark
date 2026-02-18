import {
  BenchmarkRow,
  ModelSummary,
  AnalysisResult,
  CategoryDefinition,
  CategoryRanking,
  CostEfficiencyEntry,
  SpeedAccuracyEntry,
  LanguageRanking,
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

export function analyze(rows: BenchmarkRow[], sourceFile: string): AnalysisResult {
  const summaries = buildSummaries(rows);

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

  // Language rankings
  const languages = [...new Set(rows.map((r) => r.language))].sort();
  const languageRankings: LanguageRanking[] = languages.map((lang) => {
    const langRows = rows.filter((r) => r.language === lang);
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
  const apiRows = rows.filter((r) => r.executionMode === 'api');
  const apiOnlyRanking = buildSummaries(apiRows).sort((a, b) =>
    b.passRate - a.passRate || b.avgQualityScore - a.avgQualityScore
  );

  // Token analysis: sorted by total tokens desc
  const tokenAnalysis = [...summaries].sort((a, b) =>
    b.avgTotalTokens - a.avgTotalTokens
  );

  // Category rankings
  const categoryRankings: CategoryRanking[] = CATEGORIES.map((cat) => {
    const catRows = rows.filter((r) => cat.jobIds.includes(r.jobId));
    const catSummaries = buildSummaries(catRows);
    return {
      category: cat,
      models: catSummaries.sort((a, b) =>
        b.passRate - a.passRate || b.avgQualityScore - a.avgQualityScore
      ),
    };
  }).filter((cr) => cr.models.length > 0);

  const uniqueJobs = new Set(rows.map((r) => r.jobId));

  return {
    rows,
    totalModels: summaries.length,
    totalJobs: uniqueJobs.size,
    totalRuns: rows.length,
    sourceFile,
    generatedAt: new Date().toISOString(),
    overallRanking,
    costEfficiency,
    languageRankings,
    speedAccuracy,
    apiOnlyRanking,
    tokenAnalysis,
    categoryRankings,
  };
}

export { CATEGORIES };
