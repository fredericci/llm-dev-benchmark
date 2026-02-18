import { ChartConfiguration } from 'chart.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { AnalysisResult, ChartBuffers, Locale } from './types';
import { tr } from './i18n';

const CHART_WIDTH = 800;
const CHART_HEIGHT = 450;

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: '#E07A5F',
  'anthropic-foundry': '#E07A5F',
  openai: '#81B29A',
  'openai-responses': '#81B29A',
  google: '#4A90D9',
  'cli-anthropic': '#E07A5F',
  'cli-google': '#4A90D9',
  'cli-openai': '#81B29A',
};

const FALLBACK_COLOR = '#999999';

function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider] ?? FALLBACK_COLOR;
}

function createCanvas(width = CHART_WIDTH, height = CHART_HEIGHT): ChartJSNodeCanvas {
  return new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: '#FFFFFF',
  });
}

async function renderChart(config: ChartConfiguration, width?: number, height?: number): Promise<Buffer> {
  const canvas = createCanvas(width, height);
  return await canvas.renderToBuffer(config as any);
}

async function renderPassRateBar(analysis: AnalysisResult, locale: Locale): Promise<Buffer> {
  const models = analysis.overallRanking.slice(0, 20);
  const labels = models.map((m) => m.displayName);
  const data = models.map((m) => +(m.passRate * 100).toFixed(1));
  const colors = models.map((m) => getProviderColor(m.provider));

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: tr('table.passRate', locale),
        data,
        backgroundColor: colors,
        borderWidth: 0,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: false,
      plugins: {
        title: { display: true, text: tr('section.overview', locale), font: { size: 16 } },
        legend: { display: false },
      },
      scales: {
        x: { beginAtZero: true, max: 100, title: { display: true, text: '%' } },
        y: { ticks: { font: { size: 11 } } },
      },
    },
  };

  return renderChart(config, CHART_WIDTH, Math.max(CHART_HEIGHT, models.length * 28 + 80));
}

async function renderCostEfficiencyBar(analysis: AnalysisResult, locale: Locale): Promise<Buffer> {
  const entries = analysis.costEfficiency
    .filter((e) => !e.isZeroCost && isFinite(e.costEfficiency))
    .slice(0, 15);
  const labels = entries.map((e) => e.model.displayName);
  const data = entries.map((e) => +e.costEfficiency.toFixed(2));
  const colors = entries.map((e) => getProviderColor(e.model.provider));

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: tr('table.costEfficiency', locale),
        data,
        backgroundColor: colors,
        borderWidth: 0,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: false,
      plugins: {
        title: { display: true, text: tr('section.costEfficiency', locale), font: { size: 16 } },
        legend: { display: false },
      },
      scales: {
        x: { beginAtZero: true, title: { display: true, text: 'Score / $' } },
        y: { ticks: { font: { size: 11 } } },
      },
    },
  };

  return renderChart(config, CHART_WIDTH, Math.max(CHART_HEIGHT, entries.length * 28 + 80));
}

async function renderSpeedQualityScatter(analysis: AnalysisResult, locale: Locale): Promise<Buffer> {
  // Group data points by provider for color-coded datasets
  const providerGroups = new Map<string, { x: number; y: number; label: string }[]>();
  for (const entry of analysis.speedAccuracy) {
    const m = entry.model;
    const provider = m.provider;
    if (!providerGroups.has(provider)) providerGroups.set(provider, []);
    providerGroups.get(provider)!.push({
      x: m.avgLatencyMs,
      y: m.avgQualityScore,
      label: m.displayName,
    });
  }

  const datasets = Array.from(providerGroups.entries()).map(([provider, points]) => ({
    label: provider,
    data: points.map((p) => ({ x: p.x, y: p.y })),
    backgroundColor: getProviderColor(provider),
    pointRadius: 6,
    pointHoverRadius: 8,
  }));

  const config: ChartConfiguration = {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: false,
      plugins: {
        title: { display: true, text: tr('section.speedAccuracy', locale), font: { size: 16 } },
        legend: { display: true, position: 'bottom' },
      },
      scales: {
        x: { title: { display: true, text: 'Latency (ms)' }, beginAtZero: true },
        y: { title: { display: true, text: 'Quality Score (0-5)' }, beginAtZero: true, max: 5.5 },
      },
    },
  };

  return renderChart(config);
}

async function renderTokenStackedBar(analysis: AnalysisResult, locale: Locale): Promise<Buffer> {
  const models = analysis.tokenAnalysis.slice(0, 15);
  const labels = models.map((m) => m.displayName);

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: tr('table.inputTokens', locale),
          data: models.map((m) => m.avgInputTokens),
          backgroundColor: '#4A90D9',
        },
        {
          label: tr('table.outputTokens', locale),
          data: models.map((m) => m.avgOutputTokens),
          backgroundColor: '#E07A5F',
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: { display: true, text: tr('section.tokens', locale), font: { size: 16 } },
        legend: { display: true, position: 'bottom' },
      },
      scales: {
        x: { stacked: true, ticks: { font: { size: 10 }, maxRotation: 45 } },
        y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Tokens' } },
      },
    },
  };

  return renderChart(config, CHART_WIDTH, CHART_HEIGHT);
}

async function renderCategoryGroupedBar(analysis: AnalysisResult, locale: Locale): Promise<Buffer> {
  // Show top 5 models per category
  const categories = analysis.categoryRankings;
  if (categories.length === 0) {
    return renderChart({
      type: 'bar',
      data: { labels: ['No data'], datasets: [{ label: 'N/A', data: [0] }] },
      options: { responsive: false },
    });
  }

  // Get all unique model names across top 5 of each category
  const topN = 5;
  const modelSet = new Set<string>();
  for (const cr of categories) {
    for (const m of cr.models.slice(0, topN)) {
      modelSet.add(m.displayName);
    }
  }
  const modelNames = Array.from(modelSet);

  // Get provider for color lookup
  const providerMap = new Map<string, string>();
  for (const cr of categories) {
    for (const m of cr.models) {
      providerMap.set(m.displayName, m.provider);
    }
  }

  const categoryLabels = categories.map((cr) => cr.category.name);

  const datasets = modelNames.map((modelName) => {
    const data = categories.map((cr) => {
      const m = cr.models.find((ms) => ms.displayName === modelName);
      return m ? +m.avgQualityScore.toFixed(2) : 0;
    });
    return {
      label: modelName,
      data,
      backgroundColor: getProviderColor(providerMap.get(modelName) ?? ''),
    };
  });

  const config: ChartConfiguration = {
    type: 'bar',
    data: { labels: categoryLabels, datasets },
    options: {
      responsive: false,
      plugins: {
        title: { display: true, text: tr('section.categories', locale), font: { size: 16 } },
        legend: { display: true, position: 'bottom', labels: { font: { size: 9 } } },
      },
      scales: {
        y: { beginAtZero: true, max: 5.5, title: { display: true, text: 'Avg Quality Score' } },
      },
    },
  };

  return renderChart(config, CHART_WIDTH, 500);
}

export async function renderAllCharts(analysis: AnalysisResult, locale: Locale): Promise<ChartBuffers> {
  const [passRateBar, costEfficiencyBar, speedQualityScatter, tokenStackedBar, categoryGroupedBar] =
    await Promise.all([
      renderPassRateBar(analysis, locale),
      renderCostEfficiencyBar(analysis, locale),
      renderSpeedQualityScatter(analysis, locale),
      renderTokenStackedBar(analysis, locale),
      renderCategoryGroupedBar(analysis, locale),
    ]);

  return {
    passRateBar,
    costEfficiencyBar,
    speedQualityScatter,
    tokenStackedBar,
    categoryGroupedBar,
  };
}
