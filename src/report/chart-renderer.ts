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

// Inline plugin to draw model name labels on scatter chart points
function createScatterLabelPlugin(labelMap: Map<string, { x: number; y: number; label: string }[]>) {
  return {
    id: 'scatterLabels',
    afterDatasetsDraw(chart: any) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = '9px Helvetica';
      ctx.fillStyle = '#333333';
      ctx.textBaseline = 'bottom';

      for (const [, points] of labelMap) {
        for (const point of points) {
          const xScale = chart.scales.x;
          const yScale = chart.scales.y;
          const px = xScale.getPixelForValue(point.x);
          const py = yScale.getPixelForValue(point.y);
          ctx.fillText(point.label, px + 8, py - 2);
        }
      }
      ctx.restore();
    },
  };
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

  const labelPlugin = createScatterLabelPlugin(providerGroups);

  const allScores = analysis.speedAccuracy.map((e) => e.model.avgQualityScore);
  const allLatencies = analysis.speedAccuracy.map((e) => e.model.avgLatencyMs);
  const maxScoreSpeed = allScores.length > 0 ? Math.max(...allScores) : 5;
  const yMaxSpeed = Math.max(3.5, maxScoreSpeed * 1.3);

  // Median latency for vertical quadrant line
  const sortedLatencies = [...allLatencies].sort((a, b) => a - b);
  const medianLatency = sortedLatencies.length > 0
    ? (sortedLatencies.length % 2 === 0
        ? (sortedLatencies[sortedLatencies.length / 2 - 1] + sortedLatencies[sortedLatencies.length / 2]) / 2
        : sortedLatencies[Math.floor(sortedLatencies.length / 2)])
    : 0;
  const qualityThresholdSpeed = 3.0;

  const speedQuadrantPlugin = {
    id: 'speedQuadrantLines',
    afterDraw(chart: any) {
      const { ctx, chartArea, scales } = chart;
      const xScale = scales.x;
      const yScale = scales.y;

      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#999999';

      // Horizontal line at quality threshold (y = 3.0)
      const yPixel = yScale.getPixelForValue(qualityThresholdSpeed);
      ctx.beginPath();
      ctx.moveTo(chartArea.left, yPixel);
      ctx.lineTo(chartArea.right, yPixel);
      ctx.stroke();

      // Vertical line at median latency
      if (medianLatency > 0) {
        const xPixel = xScale.getPixelForValue(medianLatency);
        ctx.beginPath();
        ctx.moveTo(xPixel, chartArea.top);
        ctx.lineTo(xPixel, chartArea.bottom);
        ctx.stroke();
      }

      ctx.restore();

      // Quadrant labels
      ctx.save();
      ctx.font = '10px Helvetica';
      ctx.fillStyle = '#AAAAAA';
      const pad = 6;
      // Top-left = Fast & Good
      ctx.textAlign = 'left';
      ctx.fillText('Fast & Good', chartArea.left + pad, yPixel - pad);
      // Top-right = Slow & Good
      ctx.textAlign = 'right';
      ctx.fillText('Slow & Good', chartArea.right - pad, yPixel - pad);
      ctx.restore();
    },
  };

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
        y: { title: { display: true, text: 'Quality Score (0-5)' }, beginAtZero: true, max: yMaxSpeed },
      },
    },
    plugins: [speedQuadrantPlugin, labelPlugin] as any,
  };

  return renderChart(config);
}

async function renderScoreVsCostScatter(analysis: AnalysisResult, locale: Locale): Promise<Buffer> {
  // Filter out zero-cost models (they cluster at x=0 and distort the chart)
  const entries = analysis.scoreVsCost.filter((e) => !e.isZeroCost);

  if (entries.length === 0) {
    return renderChart({
      type: 'scatter',
      data: { datasets: [] },
      options: { responsive: false },
    });
  }

  const medianCost = analysis.medianCostUsd;
  const qualityThreshold = 3.0;

  // Group by provider for color coding
  const providerGroups = new Map<string, { x: number; y: number; label: string }[]>();
  for (const entry of entries) {
    const m = entry.model;
    const provider = m.provider;
    if (!providerGroups.has(provider)) providerGroups.set(provider, []);
    providerGroups.get(provider)!.push({
      x: m.avgCostUsd,
      y: m.avgQualityScore,
      label: m.displayName,
    });
  }

  const datasets: any[] = Array.from(providerGroups.entries()).map(([provider, points]) => ({
    label: provider,
    data: points.map((p) => ({ x: p.x, y: p.y })),
    backgroundColor: getProviderColor(provider),
    pointRadius: 7,
    pointHoverRadius: 9,
  }));

  const maxCost = Math.max(...entries.map((e) => e.model.avgCostUsd)) * 1.15;
  const maxScore = Math.max(...entries.map((e) => e.model.avgQualityScore));
  const yMax = Math.max(qualityThreshold + 0.5, maxScore * 1.3);

  // Inline plugin to draw quadrant lines
  const quadrantPlugin = {
    id: 'quadrantLines',
    afterDraw(chart: any) {
      const { ctx, chartArea, scales } = chart;
      const xScale = scales.x;
      const yScale = scales.y;

      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#999999';

      // Horizontal line at quality threshold (y = 3.0)
      const yPixel = yScale.getPixelForValue(qualityThreshold);
      ctx.beginPath();
      ctx.moveTo(chartArea.left, yPixel);
      ctx.lineTo(chartArea.right, yPixel);
      ctx.stroke();

      // Vertical line at median cost
      if (medianCost > 0) {
        const xPixel = xScale.getPixelForValue(medianCost);
        ctx.beginPath();
        ctx.moveTo(xPixel, chartArea.top);
        ctx.lineTo(xPixel, chartArea.bottom);
        ctx.stroke();
      }

      ctx.restore();

      // Quadrant labels
      ctx.save();
      ctx.font = '10px Helvetica';
      ctx.fillStyle = '#AAAAAA';
      const pad = 6;
      ctx.textAlign = 'left';
      ctx.fillText(tr('quadrant.bestValue', locale), chartArea.left + pad, yPixel - pad);
      ctx.textAlign = 'right';
      ctx.fillText(tr('quadrant.premium', locale), chartArea.right - pad, yPixel - pad);
      ctx.restore();
    },
  };

  const labelPlugin = createScatterLabelPlugin(providerGroups);

  const config: ChartConfiguration = {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: false,
      plugins: {
        title: { display: true, text: tr('section.scoreVsCost', locale), font: { size: 16 } },
        legend: { display: true, position: 'bottom' },
      },
      scales: {
        x: {
          title: { display: true, text: tr('chart.avgCostUsd', locale) },
          beginAtZero: true,
          max: maxCost,
        },
        y: {
          title: { display: true, text: tr('chart.qualityScore', locale) },
          beginAtZero: true,
          max: yMax,
        },
      },
    },
    plugins: [quadrantPlugin, labelPlugin] as any,
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
  // Filter out categories where all models scored 0 (no useful evaluation data)
  const categories = analysis.categoryRankings.filter(
    (cr) => cr.models.some((m) => m.avgQualityScore > 0)
  );
  if (categories.length === 0) {
    return renderChart({
      type: 'bar',
      data: { labels: ['No data'], datasets: [{ label: 'N/A', data: [0] }] },
      options: { responsive: false },
    });
  }

  // Get top 3 models per category, then ensure at least 1 from each provider
  const topN = 3;
  const modelSet = new Set<string>();
  const providerMap = new Map<string, string>();

  for (const cr of categories) {
    for (const m of cr.models) {
      providerMap.set(m.displayName, m.provider);
    }
    for (const m of cr.models.slice(0, topN)) {
      modelSet.add(m.displayName);
    }
  }

  // Ensure at least the best model from each provider is represented
  const representedProviders = new Set<string>();
  for (const name of modelSet) {
    const prov = providerMap.get(name);
    if (prov) representedProviders.add(prov);
  }
  for (const cr of categories) {
    for (const m of cr.models) {
      if (!representedProviders.has(m.provider)) {
        modelSet.add(m.displayName);
        representedProviders.add(m.provider);
      }
    }
  }

  const modelNames = Array.from(modelSet);
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
        y: { beginAtZero: true, title: { display: true, text: 'Avg Quality Score' } },
      },
    },
  };

  return renderChart(config, CHART_WIDTH, 500);
}

async function renderDifficultyBar(analysis: AnalysisResult, locale: Locale): Promise<Buffer> {
  const jobs = analysis.jobDifficulty;
  if (jobs.length === 0) {
    return renderChart({
      type: 'bar',
      data: { labels: ['No data'], datasets: [{ label: 'N/A', data: [0] }] },
      options: { responsive: false },
    });
  }

  const labels = jobs.map((j) => `${j.jobId} - ${j.jobName}`);
  const data = jobs.map((j) => +((1 - j.passRate) * 100).toFixed(1));

  // Color gradient: green (easy) → red (hard)
  const colors = data.map((failRate) => {
    const ratio = failRate / 100;
    const r = Math.round(220 * ratio + 129 * (1 - ratio));
    const g = Math.round(90 * ratio + 178 * (1 - ratio));
    const b = Math.round(95 * ratio + 154 * (1 - ratio));
    return `rgb(${r}, ${g}, ${b})`;
  });

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: tr('table.failRate', locale),
        data,
        backgroundColor: colors,
        borderWidth: 0,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: false,
      plugins: {
        title: { display: true, text: tr('section.difficulty', locale), font: { size: 16 } },
        legend: { display: false },
      },
      scales: {
        x: { beginAtZero: true, max: 100, title: { display: true, text: '%' } },
        y: { ticks: { font: { size: 10 } } },
      },
    },
  };

  return renderChart(config, CHART_WIDTH, Math.max(CHART_HEIGHT, jobs.length * 24 + 80));
}

async function renderCostPerSuccessBar(analysis: AnalysisResult, locale: Locale): Promise<Buffer> {
  // Only models with at least 1 passed run, sorted by cost/success ascending
  const models = analysis.overallRanking
    .filter((m) => m.passedRuns > 0 && isFinite(m.costPerSuccess))
    .sort((a, b) => a.costPerSuccess - b.costPerSuccess)
    .slice(0, 20);

  if (models.length === 0) {
    return renderChart({
      type: 'bar',
      data: { labels: ['No data'], datasets: [{ label: 'N/A', data: [0] }] },
      options: { responsive: false },
    });
  }

  const labels = models.map((m) => m.displayName);
  const data = models.map((m) => +m.costPerSuccess.toFixed(4));
  const colors = models.map((m) => getProviderColor(m.provider));

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: tr('table.costPerSuccess', locale),
        data,
        backgroundColor: colors,
        borderWidth: 0,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: false,
      plugins: {
        title: { display: true, text: tr('section.costPerSuccess', locale), font: { size: 16 } },
        legend: { display: false },
      },
      scales: {
        x: { beginAtZero: true, title: { display: true, text: 'USD' } },
        y: { ticks: { font: { size: 11 } } },
      },
    },
  };

  return renderChart(config, CHART_WIDTH, Math.max(CHART_HEIGHT, models.length * 28 + 80));
}

export async function renderAllCharts(analysis: AnalysisResult, locale: Locale): Promise<ChartBuffers> {
  const [passRateBar, costEfficiencyBar, speedQualityScatter, scoreVsCostScatter, tokenStackedBar, categoryGroupedBar, difficultyBar, costPerSuccessBar] =
    await Promise.all([
      renderPassRateBar(analysis, locale),
      renderCostEfficiencyBar(analysis, locale),
      renderSpeedQualityScatter(analysis, locale),
      renderScoreVsCostScatter(analysis, locale),
      renderTokenStackedBar(analysis, locale),
      renderCategoryGroupedBar(analysis, locale),
      renderDifficultyBar(analysis, locale),
      renderCostPerSuccessBar(analysis, locale),
    ]);

  return {
    passRateBar,
    costEfficiencyBar,
    speedQualityScatter,
    scoreVsCostScatter,
    tokenStackedBar,
    categoryGroupedBar,
    difficultyBar,
    costPerSuccessBar,
  };
}
