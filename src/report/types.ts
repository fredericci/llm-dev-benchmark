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

export interface AnalysisResult {
  // Raw data
  rows: BenchmarkRow[];
  totalModels: number;
  totalJobs: number;
  totalRuns: number;
  sourceFile: string;
  generatedAt: string;

  // Rankings
  overallRanking: ModelSummary[];
  costEfficiency: CostEfficiencyEntry[];
  languageRankings: LanguageRanking[];
  speedAccuracy: SpeedAccuracyEntry[];
  apiOnlyRanking: ModelSummary[];
  tokenAnalysis: ModelSummary[];
  categoryRankings: CategoryRanking[];
}

export interface ChartBuffers {
  passRateBar: Buffer;
  costEfficiencyBar: Buffer;
  speedQualityScatter: Buffer;
  tokenStackedBar: Buffer;
  categoryGroupedBar: Buffer;
}
