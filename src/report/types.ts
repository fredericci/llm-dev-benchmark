export type Locale = 'en' | 'pt-br';

export interface BenchmarkRow {
  timestamp: string;
  jobId: string;
  jobName: string;
  language: string;
  executionMode: string;
  provider: string;
  modelId: string;
  modelDisplayName: string;
  runNumber: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  tokensSource: string;
  costUsd: number;
  latencyMs: number;
  turns: number;
  passed: boolean;
  qualityScore: number;
  qualityNotes: string;
  errorMessage: string;
  rawPromptChars: number;
  rawResponseChars: number;
  iterationScores: string;
  passedOnTurn: number;
}

export interface ModelSummary {
  modelId: string;
  displayName: string;
  provider: string;
  executionMode: string;
  totalRuns: number;
  passedRuns: number;
  passRate: number;
  avgQualityScore: number;
  avgCostUsd: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  avgTotalTokens: number;
  hasEstimatedTokens: boolean;
  costPerSuccess: number;
}

export interface LanguageRanking {
  language: string;
  models: ModelSummary[];
}

export interface CategoryDefinition {
  id: string;
  name: string;
  description: string;
  jobIds: string[];
}

export interface CategoryRanking {
  category: CategoryDefinition;
  models: ModelSummary[];
}

export interface CostEfficiencyEntry {
  model: ModelSummary;
  costEfficiency: number;
  isZeroCost: boolean;
}

export interface SpeedAccuracyEntry {
  model: ModelSummary;
  meetsThreshold: boolean;
}

export interface ScoreVsCostEntry {
  model: ModelSummary;
  isZeroCost: boolean;
}

export interface JobDifficulty {
  jobId: string;
  jobName: string;
  totalRuns: number;
  passRate: number;
  avgScore: number;
  failedModels: number;
  totalModels: number;
}

export interface HeatmapCell {
  modelDisplayName: string;
  jobId: string;
  avgScore: number;
  passed: boolean;
  isMiss: boolean;
}

export interface HeatmapData {
  models: string[];
  jobs: string[];
  cells: HeatmapCell[][];
}

export interface RetryAnalysisEntry {
  model: ModelSummary;
  avgTurnsUsed: number;
  retryBenefit: number;
  passRateFirstTurn: number;
  passRateFinal: number;
}

export interface AnalysisResult {
  // Raw data
  rows: BenchmarkRow[];
  totalModels: number;
  totalJobs: number;
  totalRuns: number;
  totalErrors: number;
  totalMisses: number;
  totalRunsIncludingErrors: number;
  sourceFile: string;
  generatedAt: string;

  // Rankings
  overallRanking: ModelSummary[];
  costEfficiency: CostEfficiencyEntry[];
  languageRankings: LanguageRanking[];
  speedAccuracy: SpeedAccuracyEntry[];
  scoreVsCost: ScoreVsCostEntry[];
  medianCostUsd: number;
  apiOnlyRanking: ModelSummary[];
  tokenAnalysis: ModelSummary[];
  categoryRankings: CategoryRanking[];
  jobDifficulty: JobDifficulty[];
  heatmapData: HeatmapData;
  retryAnalysis: RetryAnalysisEntry[];
}

export interface ChartBuffers {
  passRateBar: Buffer;
  costEfficiencyBar: Buffer;
  speedQualityScatter: Buffer;
  scoreVsCostScatter: Buffer;
  tokenStackedBar: Buffer;
  categoryGroupedBar: Buffer;
  difficultyBar: Buffer;
  costPerSuccessBar: Buffer;
}
