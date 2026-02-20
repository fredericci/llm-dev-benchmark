import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import {
  AnalysisResult,
  ChartBuffers,
  ChartNarrations,
  Locale,
} from './types';
import { tr } from './i18n';

// Layout constants
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const FONT_SIZE_TITLE = 24;
const FONT_SIZE_H1 = 18;
const FONT_SIZE_H2 = 14;
const FONT_SIZE_BODY = 10;
const FONT_SIZE_TABLE = 8.5;
const LINE_HEIGHT = 1.3;
const TABLE_ROW_HEIGHT = 18;
const TABLE_HEADER_HEIGHT = 22;

interface TocEntry {
  title: string;
  page: number;
}

export interface NarrativeContent {
  introduction: string;
  conclusion: string;
  chartNarrations?: ChartNarrations;
}

export async function renderPDF(
  analysis: AnalysisResult,
  charts: ChartBuffers,
  locale: Locale,
  outputPath: string,
  narrative?: NarrativeContent,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: {
        Title: tr('cover.title', locale),
        Creator: 'llm-dev-bench',
      },
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    stream.on('finish', resolve);
    stream.on('error', reject);

    const toc: TocEntry[] = [];
    let currentPage = 1;

    // Helper: track page numbers
    doc.on('pageAdded', () => { currentPage++; });

    // Helper: draw section header and record TOC entry
    function sectionHeader(title: string, description?: string): void {
      ensureSpace(60);
      toc.push({ title, page: currentPage });
      doc.fontSize(FONT_SIZE_H1).font('Helvetica-Bold').fillColor('#333333');
      doc.text(title, MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.moveDown(0.3);

      // Underline
      const y = doc.y;
      doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor('#4A90D9').lineWidth(2).stroke();
      doc.moveDown(0.5);

      if (description) {
        doc.fontSize(FONT_SIZE_BODY).font('Helvetica-Oblique').fillColor('#666666');
        doc.text(description, MARGIN, doc.y, { width: CONTENT_WIDTH });
        doc.moveDown(0.5);
      }

      doc.font('Helvetica').fillColor('#000000');
    }

    // Helper: ensure minimum vertical space, add page if needed
    function ensureSpace(needed: number): void {
      if (doc.y + needed > PAGE_HEIGHT - MARGIN - 30) {
        doc.addPage();
      }
    }

    // Helper: start a new page only if we're not already at the top of one
    function newPage(): void {
      if (doc.y > MARGIN + 20) {
        doc.addPage();
      }
    }

    // Helper: draw a data table
    function drawTable(
      headers: string[],
      rows: string[][],
      colWidths: number[],
    ): void {
      const totalWidth = colWidths.reduce((a, b) => a + b, 0);
      const startX = MARGIN;

      // Ensure at least header + min(5, total) rows fit on current page
      // to avoid orphaned table headers at page bottom
      const minRowsToShow = Math.min(5, rows.length);
      const minTableHeight = TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT * minRowsToShow;
      ensureSpace(minTableHeight);

      // Header
      let x = startX;
      const headerY = doc.y;
      doc.rect(startX, headerY, totalWidth, TABLE_HEADER_HEIGHT).fill('#4A90D9');
      doc.fontSize(FONT_SIZE_TABLE).font('Helvetica-Bold').fillColor('#FFFFFF');
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], x + 3, headerY + 5, { width: colWidths[i] - 6, height: TABLE_HEADER_HEIGHT, ellipsis: true });
        x += colWidths[i];
      }
      doc.y = headerY + TABLE_HEADER_HEIGHT;

      // Rows
      doc.font('Helvetica').fillColor('#000000');
      for (let r = 0; r < rows.length; r++) {
        ensureSpace(TABLE_ROW_HEIGHT);
        const rowY = doc.y;

        if (r % 2 === 0) {
          doc.rect(startX, rowY, totalWidth, TABLE_ROW_HEIGHT).fill('#F5F5F5');
          doc.fillColor('#000000');
        }

        x = startX;
        for (let c = 0; c < rows[r].length; c++) {
          doc.fontSize(FONT_SIZE_TABLE);
          doc.text(rows[r][c], x + 3, rowY + 4, { width: colWidths[c] - 6, height: TABLE_ROW_HEIGHT, ellipsis: true });
          x += colWidths[c];
        }
        doc.y = rowY + TABLE_ROW_HEIGHT;
      }
      doc.moveDown(0.5);
    }

    // Helper: embed chart image
    function embedChart(buffer: Buffer, maxWidth = CONTENT_WIDTH, maxHeight = 320): void {
      ensureSpace(maxHeight + 20);
      try {
        doc.image(buffer, MARGIN, doc.y, { fit: [maxWidth, maxHeight], align: 'center' });
        doc.y += maxHeight + 10;
      } catch {
        doc.fontSize(FONT_SIZE_BODY).text('[Chart rendering failed]', MARGIN, doc.y);
        doc.moveDown(1);
      }
    }

    // Helper: render AI narration block below a chart
    function embedChartNarration(text: string, currentLocale: Locale): void {
      if (!text) return;
      ensureSpace(60);
      const boxY = doc.y;
      const labelText = tr('chart.aiAnalysis', currentLocale);
      const labelWidth = 80;
      const boxPadX = 10;
      const boxPadY = 8;

      // Measure text height before drawing the box
      const textHeight = doc.heightOfString(text, { width: CONTENT_WIDTH - labelWidth - boxPadX * 2, lineGap: 2 });
      const boxHeight = textHeight + boxPadY * 2;

      // Light blue-grey background box
      doc.rect(MARGIN, boxY, CONTENT_WIDTH, boxHeight).fill('#EEF4FB');

      // Coloured left border accent
      doc.rect(MARGIN, boxY, 3, boxHeight).fill('#4A90D9');

      // "AI Analysis" label pill
      doc.rect(MARGIN + 8, boxY + boxPadY - 2, labelWidth - 4, 14).fill('#4A90D9');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#FFFFFF');
      doc.text(labelText, MARGIN + 10, boxY + boxPadY, { width: labelWidth - 8, height: 14 });

      // Narration text
      doc.fontSize(FONT_SIZE_TABLE).font('Helvetica').fillColor('#333333');
      doc.text(text, MARGIN + labelWidth + boxPadX, boxY + boxPadY, {
        width: CONTENT_WIDTH - labelWidth - boxPadX * 2,
        lineGap: 2,
      });

      doc.y = boxY + boxHeight + 8;
      doc.font('Helvetica').fillColor('#000000');
    }

    // Helper: interpolate color from red (0) → yellow (2.5) → green (5)
    // Returns hex color string compatible with PDFKit
    function scoreToColor(score: number): string {
      if (score < 0) return '#E0E0E0'; // no data
      const clamped = Math.max(0, Math.min(5, score));
      let r: number, g: number, b: number;
      if (clamped <= 2.5) {
        // Red → Yellow
        const t = clamped / 2.5;
        r = Math.round(220 * (1 - t) + 240 * t);
        g = Math.round(80 * (1 - t) + 200 * t);
        b = Math.round(80 * (1 - t) + 80 * t);
      } else {
        // Yellow → Green
        const t = (clamped - 2.5) / 2.5;
        r = Math.round(240 * (1 - t) + 80 * t);
        g = Math.round(200 * (1 - t) + 180 * t);
        b = Math.round(80 * (1 - t) + 80 * t);
      }
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // ─── 1. Cover Page ───────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#1A1A2E');
    doc.fontSize(FONT_SIZE_TITLE + 8).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.text(tr('cover.title', locale), MARGIN, 200, { width: CONTENT_WIDTH, align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(FONT_SIZE_H2).font('Helvetica').fillColor('#CCCCCC');
    doc.text(tr('cover.subtitle', locale), MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' });
    doc.moveDown(3);

    doc.fontSize(FONT_SIZE_BODY).fillColor('#AAAAAA');
    doc.text(`${tr('cover.generated', locale)}: ${new Date().toLocaleDateString(locale === 'pt-br' ? 'pt-BR' : 'en-US')}`, MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' });
    doc.moveDown(0.3);
    doc.text(`${tr('cover.source', locale)}: ${analysis.sourceFile}`, MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' });
    doc.moveDown(1.5);

    // Summary stats
    doc.fontSize(FONT_SIZE_H2).fillColor('#FFFFFF');
    const stats = [
      `${tr('cover.models', locale)}: ${analysis.totalModels}`,
      `${tr('cover.jobs', locale)}: ${analysis.totalJobs}`,
      `${tr('cover.validRuns', locale)}: ${analysis.totalRuns}`,
    ];
    if (analysis.totalErrors > 0) {
      stats.push(`${tr('cover.errorRuns', locale)}: ${analysis.totalErrors}`);
    }
    for (const stat of stats) {
      doc.text(stat, MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' });
      doc.moveDown(0.3);
    }

    // ─── 2. Table of Contents (placeholder — filled at end) ──────────────
    doc.addPage();
    const tocPageStart = currentPage;
    doc.fontSize(FONT_SIZE_H1).font('Helvetica-Bold').fillColor('#333333');
    doc.text(tr('toc.title', locale), MARGIN, MARGIN, { width: CONTENT_WIDTH });
    doc.moveDown(1);
    // TOC content will be rendered after all sections using buffered pages

    // ─── Introduction (AI-generated) ─────────────────────────────────────
    if (narrative?.introduction) {
      doc.addPage();
      sectionHeader(tr('section.introduction', locale));
      doc.fontSize(FONT_SIZE_BODY).font('Helvetica').fillColor('#333333');
      doc.text(narrative.introduction, MARGIN, doc.y, {
        width: CONTENT_WIDTH,
        lineGap: 3,
      });
    }

    // ─── 3. Executive Overview ───────────────────────────────────────────
    doc.addPage();
    sectionHeader(tr('section.overview', locale), tr('section.overview.desc', locale));
    embedChart(charts.passRateBar);
    embedChartNarration(narrative?.chartNarrations?.passRateBar ?? '', locale);

    const overviewHeaders = [
      tr('table.rank', locale),
      tr('table.model', locale),
      tr('table.provider', locale),
      tr('table.mode', locale),
      tr('table.passRate', locale),
      tr('table.avgScore', locale),
      tr('table.avgCost', locale),
    ];
    const overviewRows = analysis.overallRanking.map((m, i) => [
      String(i + 1),
      m.displayName,
      m.provider,
      m.executionMode,
      `${(m.passRate * 100).toFixed(1)}%`,
      `${m.avgQualityScore.toFixed(1)}/5`,
      m.hasEstimatedTokens ? `~$${m.avgCostUsd.toFixed(4)}` : `$${m.avgCostUsd.toFixed(4)}`,
    ]);
    drawTable(overviewHeaders, overviewRows, [30, 120, 80, 35, 60, 55, 60]);

    // ─── 4. Cost Efficiency ──────────────────────────────────────────────
    newPage();
    sectionHeader(tr('section.costEfficiency', locale), tr('section.costEfficiency.desc', locale));

    doc.fontSize(FONT_SIZE_BODY).font('Helvetica-Oblique').fillColor('#666666');
    doc.text(tr('costEfficiency.formula', locale), MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor('#000000');

    embedChart(charts.costEfficiencyBar);
    embedChartNarration(narrative?.chartNarrations?.costEfficiencyBar ?? '', locale);

    // Top-3 callout
    const top3 = analysis.costEfficiency.slice(0, 3);
    if (top3.length > 0) {
      ensureSpace(80);
      doc.rect(MARGIN, doc.y, CONTENT_WIDTH, 60 + top3.length * 16).fill('#F0F7FF');
      doc.fillColor('#333333').font('Helvetica-Bold').fontSize(FONT_SIZE_H2);
      const boxY = doc.y + 8;
      doc.text('Top 3', MARGIN + 10, boxY, { width: CONTENT_WIDTH - 20 });
      doc.font('Helvetica').fontSize(FONT_SIZE_BODY);
      for (let i = 0; i < top3.length; i++) {
        const e = top3[i];
        const effStr = e.isZeroCost ? 'N/A (zero cost)' : e.costEfficiency.toFixed(2);
        doc.text(
          `${i + 1}. ${e.model.displayName} — ${effStr} score/$`,
          MARGIN + 10, boxY + 22 + i * 16, { width: CONTENT_WIDTH - 20 }
        );
      }
      doc.y = boxY + 30 + top3.length * 16;
    }

    if (analysis.costEfficiency.some((e) => e.isZeroCost)) {
      doc.moveDown(0.5);
      doc.fontSize(FONT_SIZE_TABLE).font('Helvetica-Oblique').fillColor('#888888');
      doc.text(tr('costEfficiency.zeroCost', locale), MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.moveDown(0.5);
      doc.font('Helvetica').fillColor('#000000');
    }

    const ceHeaders = [
      tr('table.rank', locale),
      tr('table.model', locale),
      tr('table.avgScore', locale),
      tr('table.avgCost', locale),
      tr('table.costEfficiency', locale),
    ];
    const ceRows = analysis.costEfficiency.map((e, i) => [
      String(i + 1),
      e.model.displayName,
      `${e.model.avgQualityScore.toFixed(1)}/5`,
      e.isZeroCost ? '$0.00' : `$${e.model.avgCostUsd.toFixed(4)}`,
      e.isZeroCost ? 'N/A*' : e.costEfficiency.toFixed(2),
    ]);
    drawTable(ceHeaders, ceRows, [30, 150, 70, 80, 100]);

    // ─── Cost per Resolved Task ────────────────────────────────────────
    newPage();
    sectionHeader(tr('section.costPerSuccess', locale), tr('section.costPerSuccess.desc', locale));
    embedChart(charts.costPerSuccessBar);
    embedChartNarration(narrative?.chartNarrations?.costPerSuccessBar ?? '', locale);

    const cpsModels = analysis.overallRanking
      .filter((m) => m.passedRuns > 0 && Number.isFinite(m.costPerSuccess))
      .sort((a, b) => a.costPerSuccess - b.costPerSuccess);

    if (cpsModels.length > 0) {
      const cpsHeaders = [
        tr('table.rank', locale),
        tr('table.model', locale),
        tr('table.provider', locale),
        tr('table.costPerSuccess', locale),
        tr('table.passRate', locale),
        tr('table.passedRuns', locale),
        tr('table.totalCost', locale),
      ];
      const cpsRows = cpsModels.map((m, i) => [
        String(i + 1),
        m.displayName,
        m.provider,
        `$${m.costPerSuccess.toFixed(4)}`,
        `${(m.passRate * 100).toFixed(1)}%`,
        `${m.passedRuns}/${m.totalRuns}`,
        `$${m.totalCostUsd.toFixed(2)}`,
      ]);
      drawTable(cpsHeaders, cpsRows, [30, 120, 70, 70, 55, 55, 60]);
    }

    // ─── 5. Quality vs Cost Analysis ─────────────────────────────────────
    newPage();
    sectionHeader(tr('section.scoreVsCost', locale), tr('section.scoreVsCost.desc', locale));

    if (analysis.scoreVsCost.some((e) => e.isZeroCost)) {
      doc.fontSize(FONT_SIZE_TABLE).font('Helvetica-Oblique').fillColor('#888888');
      doc.text(tr('scoreVsCost.zeroCostNote', locale), MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.moveDown(0.5);
      doc.font('Helvetica').fillColor('#000000');
    }

    embedChart(charts.scoreVsCostScatter);
    embedChartNarration(narrative?.chartNarrations?.scoreVsCostScatter ?? '', locale);

    // Best quadrant: high quality (>= 3.0) AND below median cost
    const paidModels = analysis.scoreVsCost.filter((e) => !e.isZeroCost);
    const bestQuadrantModels = paidModels.filter(
      (e) => e.model.avgQualityScore >= 3.0 && e.model.avgCostUsd <= analysis.medianCostUsd
    );
    const zeroCostGoodModels = analysis.scoreVsCost.filter(
      (e) => e.isZeroCost && e.model.avgQualityScore >= 3.0
    );

    ensureSpace(80);
    doc.fontSize(FONT_SIZE_H2).font('Helvetica-Bold').fillColor('#4A90D9');
    doc.text(tr('scoreVsCost.bestQuadrant', locale), MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(0.3);
    doc.font('Helvetica').fillColor('#000000');

    const bestValueModels = [...zeroCostGoodModels, ...bestQuadrantModels];
    if (bestValueModels.length === 0) {
      doc.fontSize(FONT_SIZE_BODY).text(tr('scoreVsCost.noBestQuadrant', locale), MARGIN, doc.y, { width: CONTENT_WIDTH });
    } else {
      const bqHeaders = [
        tr('table.rank', locale),
        tr('table.model', locale),
        tr('table.provider', locale),
        tr('table.avgScore', locale),
        tr('table.avgCost', locale),
        tr('table.passRate', locale),
      ];
      const bqRows = bestValueModels
        .sort((a, b) => b.model.avgQualityScore - a.model.avgQualityScore)
        .map((e, i) => [
          String(i + 1),
          e.model.displayName,
          e.model.provider,
          `${e.model.avgQualityScore.toFixed(1)}/5`,
          e.isZeroCost ? '$0.00*' : `$${e.model.avgCostUsd.toFixed(4)}`,
          `${(e.model.passRate * 100).toFixed(1)}%`,
        ]);
      drawTable(bqHeaders, bqRows, [30, 140, 80, 65, 70, 70]);
    }

    // ─── 6. Best per Language ────────────────────────────────────────────
    newPage();
    sectionHeader(tr('section.perLanguage', locale), tr('section.perLanguage.desc', locale));

    for (const lr of analysis.languageRankings) {
      // Ensure sub-header + at least header + 3 table rows fit
      ensureSpace(30 + TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT * 3);
      doc.fontSize(FONT_SIZE_H2).font('Helvetica-Bold').fillColor('#4A90D9');
      doc.text(lr.language.toUpperCase(), MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.moveDown(0.3);
      doc.font('Helvetica').fillColor('#000000');

      const langHeaders = [
        tr('table.rank', locale),
        tr('table.model', locale),
        tr('table.passRate', locale),
        tr('table.avgScore', locale),
        tr('table.avgCost', locale),
        tr('table.p50Latency', locale),
      ];
      const langRows = lr.models.map((m, i) => [
        String(i + 1),
        m.displayName,
        `${(m.passRate * 100).toFixed(1)}%`,
        `${m.avgQualityScore.toFixed(1)}/5`,
        `$${m.avgCostUsd.toFixed(4)}`,
        `${m.p50LatencyMs.toLocaleString()}ms`,
      ]);
      drawTable(langHeaders, langRows, [30, 140, 70, 65, 70, 80]);
      doc.moveDown(0.5);
    }

    // ─── 7. Fastest with Good Accuracy ───────────────────────────────────
    newPage();
    sectionHeader(tr('section.speedAccuracy', locale), tr('section.speedAccuracy.desc', locale));

    doc.fontSize(FONT_SIZE_BODY).font('Helvetica-Oblique').fillColor('#666666');
    doc.text(tr('speedAccuracy.threshold', locale), MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor('#000000');

    embedChart(charts.speedQualityScatter);
    embedChartNarration(narrative?.chartNarrations?.speedQualityScatter ?? '', locale);

    const qualifiedModels = analysis.speedAccuracy.filter((e) => e.meetsThreshold);
    if (qualifiedModels.length === 0) {
      doc.fontSize(FONT_SIZE_BODY).text(tr('speedAccuracy.noModels', locale), MARGIN, doc.y, { width: CONTENT_WIDTH });
    } else {
      const saHeaders = [
        tr('table.rank', locale),
        tr('table.model', locale),
        tr('table.avgScore', locale),
        tr('table.avgLatency', locale),
        tr('table.p50Latency', locale),
        tr('table.avgCost', locale),
      ];
      const saRows = qualifiedModels.map((e, i) => [
        String(i + 1),
        e.model.displayName,
        `${e.model.avgQualityScore.toFixed(1)}/5`,
        `${e.model.avgLatencyMs.toLocaleString()}ms`,
        `${e.model.p50LatencyMs.toLocaleString()}ms`,
        `$${e.model.avgCostUsd.toFixed(4)}`,
      ]);
      drawTable(saHeaders, saRows, [30, 140, 65, 80, 80, 70]);
    }

    // ─── 8. API-Only Ranking ─────────────────────────────────────────────
    if (analysis.apiOnlyRanking.length > 0) {
      newPage();
      sectionHeader(tr('section.apiOnly', locale), tr('section.apiOnly.desc', locale));

      const apiHeaders = [
        tr('table.rank', locale),
        tr('table.model', locale),
        tr('table.provider', locale),
        tr('table.passRate', locale),
        tr('table.avgScore', locale),
        tr('table.avgCost', locale),
        tr('table.p50Latency', locale),
      ];
      const apiRows = analysis.apiOnlyRanking.map((m, i) => [
        String(i + 1),
        m.displayName,
        m.provider,
        `${(m.passRate * 100).toFixed(1)}%`,
        `${m.avgQualityScore.toFixed(1)}/5`,
        `$${m.avgCostUsd.toFixed(4)}`,
        `${m.p50LatencyMs.toLocaleString()}ms`,
      ]);
      drawTable(apiHeaders, apiRows, [30, 120, 75, 60, 55, 65, 70]);
    }

    // ─── 9. Token Analysis ───────────────────────────────────────────────
    newPage();
    sectionHeader(tr('section.tokens', locale), tr('section.tokens.desc', locale));
    embedChart(charts.tokenStackedBar);
    embedChartNarration(narrative?.chartNarrations?.tokenStackedBar ?? '', locale);

    const tokHeaders = [
      tr('table.rank', locale),
      tr('table.model', locale),
      tr('table.inputTokens', locale),
      tr('table.outputTokens', locale),
      tr('table.totalTokens', locale),
    ];
    const tokRows = analysis.tokenAnalysis.map((m, i) => [
      String(i + 1),
      m.displayName,
      `${m.hasEstimatedTokens ? '~' : ''}${m.avgInputTokens.toLocaleString()}`,
      `${m.hasEstimatedTokens ? '~' : ''}${m.avgOutputTokens.toLocaleString()}`,
      `${m.hasEstimatedTokens ? '~' : ''}${m.avgTotalTokens.toLocaleString()}`,
    ]);
    drawTable(tokHeaders, tokRows, [30, 160, 100, 100, 100]);

    // ─── 10. Category Analysis ────────────────────────────────────────────
    newPage();
    sectionHeader(tr('section.categories', locale), tr('section.categories.desc', locale));
    embedChart(charts.categoryGroupedBar);
    embedChartNarration(narrative?.chartNarrations?.categoryGroupedBar ?? '', locale);

    for (const cr of analysis.categoryRankings) {
      // Ensure category sub-header + description + table header + 3 rows fit
      ensureSpace(50 + TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT * 3);
      const catKey = `category.${cr.category.id}`;
      const catName = tr(catKey, locale) !== catKey ? tr(catKey, locale) : cr.category.name;
      const catDesc = tr(`${catKey}.desc`, locale);

      doc.fontSize(FONT_SIZE_H2).font('Helvetica-Bold').fillColor('#4A90D9');
      doc.text(catName, MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.moveDown(0.2);
      doc.fontSize(FONT_SIZE_TABLE).font('Helvetica-Oblique').fillColor('#888888');
      doc.text(catDesc !== `${catKey}.desc` ? catDesc : cr.category.description, MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.moveDown(0.3);
      doc.font('Helvetica').fillColor('#000000');

      const catHeaders = [
        tr('table.rank', locale),
        tr('table.model', locale),
        tr('table.passRate', locale),
        tr('table.avgScore', locale),
        tr('table.runs', locale),
      ];
      const catRows = cr.models.map((m, i) => [
        String(i + 1),
        m.displayName,
        `${(m.passRate * 100).toFixed(1)}%`,
        `${m.avgQualityScore.toFixed(1)}/5`,
        String(m.totalRuns),
      ]);
      drawTable(catHeaders, catRows, [30, 180, 80, 70, 60]);
      doc.moveDown(0.5);
    }

    // ─── 11. Task Difficulty ──────────────────────────────────────────────
    if (analysis.jobDifficulty.length > 0) {
      newPage();
      sectionHeader(tr('section.difficulty', locale), tr('section.difficulty.desc', locale));
      embedChart(charts.difficultyBar);
      embedChartNarration(narrative?.chartNarrations?.difficultyBar ?? '', locale);

      const diffHeaders = [
        tr('table.rank', locale),
        tr('table.id', locale),
        tr('table.name', locale),
        tr('table.failRate', locale),
        tr('table.avgScore', locale),
        tr('table.failedModels', locale),
      ];
      const diffRows = analysis.jobDifficulty.map((j, i) => [
        String(i + 1),
        j.jobId,
        j.jobName,
        `${((1 - j.passRate) * 100).toFixed(1)}%`,
        `${j.avgScore.toFixed(1)}/5`,
        `${j.failedModels}/${j.totalModels}`,
      ]);
      drawTable(diffHeaders, diffRows, [30, 30, 160, 65, 65, 80]);
    }

    // ─── 12. Model × Task Heatmap ────────────────────────────────────────
    if (analysis.heatmapData.models.length > 0 && analysis.heatmapData.jobs.length > 0) {
      newPage();
      sectionHeader(tr('section.heatmap', locale), tr('section.heatmap.desc', locale));

      const heatmap = analysis.heatmapData;
      const jobCount = heatmap.jobs.length;
      const modelCount = heatmap.models.length;

      // Layout: model label column + job columns
      const modelLabelWidth = 120;
      const availableWidth = CONTENT_WIDTH - modelLabelWidth;
      const cellWidth = Math.min(Math.floor(availableWidth / jobCount), 18);
      const cellHeight = 16;
      const headerHeight = 40; // rotated job headers

      // Draw job headers (rotated text)
      ensureSpace(headerHeight + cellHeight * modelCount + 20);
      const startX = MARGIN + modelLabelWidth;
      const startY = doc.y + headerHeight;

      doc.fontSize(6).font('Helvetica-Bold').fillColor('#333333');
      for (let j = 0; j < jobCount; j++) {
        const x = startX + j * cellWidth + cellWidth / 2;
        doc.save();
        doc.translate(x, startY - 4);
        doc.rotate(-60, { origin: [0, 0] });
        doc.text(heatmap.jobs[j], 0, 0, { width: 40, height: 10 });
        doc.restore();
      }

      // Draw rows
      for (let m = 0; m < modelCount; m++) {
        const rowY = startY + m * cellHeight;

        if (rowY + cellHeight > PAGE_HEIGHT - MARGIN - 30) {
          doc.addPage();
          doc.y = MARGIN;
          // We don't re-draw headers on continuation page for simplicity
        }

        // Model label
        doc.fontSize(7).font('Helvetica').fillColor('#333333');
        doc.text(heatmap.models[m], MARGIN, rowY + 3, {
          width: modelLabelWidth - 5,
          height: cellHeight,
          ellipsis: true,
        });

        // Score cells
        for (let j = 0; j < jobCount; j++) {
          const cell = heatmap.cells[m][j];
          const cx = startX + j * cellWidth;
          const color = scoreToColor(cell.avgScore);

          doc.rect(cx, rowY, cellWidth, cellHeight).fill(color);

          if (cell.avgScore >= 0) {
            // Dark text on light background, light text on dark background
            const textColor = cell.avgScore >= 2 && cell.avgScore <= 4 ? '#333333' : '#FFFFFF';
            doc.fontSize(5.5).font('Helvetica').fillColor(textColor);
            doc.text(
              cell.avgScore.toFixed(1),
              cx + 1, rowY + 4,
              { width: cellWidth - 2, height: cellHeight, align: 'center' }
            );
          } else {
            doc.fontSize(5.5).font('Helvetica').fillColor('#999999');
            doc.text('-', cx + 1, rowY + 4, { width: cellWidth - 2, height: cellHeight, align: 'center' });
          }
        }
      }

      doc.y = startY + modelCount * cellHeight + 10;

      // Legend
      ensureSpace(30);
      const legendY = doc.y;
      const legendColors = [
        { score: 0, label: '0' },
        { score: 1.25, label: '' },
        { score: 2.5, label: '2.5' },
        { score: 3.75, label: '' },
        { score: 5, label: '5' },
      ];
      const legendCellW = 30;
      const legendStartX = MARGIN + modelLabelWidth;
      doc.fontSize(7).font('Helvetica').fillColor('#666666');
      doc.text(locale === 'pt-br' ? 'Legenda:' : 'Legend:', MARGIN, legendY + 3, { width: modelLabelWidth - 5 });
      for (let i = 0; i < legendColors.length; i++) {
        const lx = legendStartX + i * legendCellW;
        doc.rect(lx, legendY, legendCellW, 14).fill(scoreToColor(legendColors[i].score));
        if (legendColors[i].label) {
          doc.fontSize(6).font('Helvetica').fillColor('#333333');
          doc.text(legendColors[i].label, lx, legendY + 3, { width: legendCellW, align: 'center' });
        }
      }
      doc.y = legendY + 20;
    }

    // ─── 13. Retry Analysis ──────────────────────────────────────────────
    if (analysis.retryAnalysis.length > 0) {
      newPage();
      sectionHeader(tr('section.retry', locale), tr('section.retry.desc', locale));

      const retryHeaders = [
        tr('table.rank', locale),
        tr('table.model', locale),
        tr('table.avgTurns', locale),
        tr('table.firstTurnPass', locale),
        tr('table.finalPass', locale),
        tr('table.retryBenefit', locale),
      ];
      const retryRows = analysis.retryAnalysis.map((e, i) => [
        String(i + 1),
        e.model.displayName,
        String(e.avgTurnsUsed),
        `${(e.passRateFirstTurn * 100).toFixed(1)}%`,
        `${(e.passRateFinal * 100).toFixed(1)}%`,
        `+${(e.retryBenefit * 100).toFixed(1)}%`,
      ]);
      drawTable(retryHeaders, retryRows, [30, 140, 65, 80, 70, 80]);
    }

    // ─── Conclusion (AI-generated) ─────────────────────────────────────
    if (narrative?.conclusion) {
      newPage();
      sectionHeader(tr('section.conclusion', locale));
      doc.fontSize(FONT_SIZE_BODY).font('Helvetica').fillColor('#333333');
      doc.text(narrative.conclusion, MARGIN, doc.y, {
        width: CONTENT_WIDTH,
        lineGap: 3,
      });
    }

    // ─── 14. Task Coverage ───────────────────────────────────────────────
    newPage();
    sectionHeader(tr('section.taskCoverage', locale), tr('section.taskCoverage.desc', locale));

    // Job list table
    const jobListHeaders = [
      tr('table.id', locale),
      tr('table.name', locale),
      tr('table.type', locale),
      tr('table.description', locale),
    ];

    const allJobs: [string, string, string, string][] = [
      ['j01', 'Code Generation', 'test-execution', 'POST /users endpoint with validation'],
      ['j02', 'Refactoring', 'test-execution', 'Eliminate code smells without changing behavior'],
      ['j03', 'Bug Fix', 'test-execution', 'Fix a race condition in concurrent code'],
      ['j04', 'Test Generation', 'test-execution', 'Generate edge-case tests for a discount function'],
      ['j05', 'Security Review', 'rubric', 'Find 5 planted vulnerabilities'],
      ['j06', 'Architecture', 'rubric', 'Recommend pattern for e-commerce scaling'],
      ['j07', 'Documentation', 'rubric', 'Add JSDoc to undocumented functions'],
      ['j08', 'Migration', 'test-execution', 'Migrate axios 0.27 → 1.x breaking changes'],
      ['j09', 'Debugging', 'test-execution', 'Diagnose production bug from stack trace'],
      ['j10', 'Performance', 'hybrid', 'Identify and fix N+1 query problem'],
      ['j11', 'Scaffold', 'rubric', 'Generate complete microservice from scratch'],
      ['j12', 'Codebase Explain', 'rubric', 'Explain an e-commerce codebase'],
      ['j13', 'Feature from Issue', 'test-execution', 'Implement password expiry notification'],
      ['j14', 'CI/CD Pipeline', 'rubric', 'Generate GitHub Actions pipeline'],
      ['j15', 'PR Impact', 'rubric', 'Review a diff with planted problems'],
      ['j16', 'Sync to Async', 'test-execution', 'Convert callbacks to async/await'],
      ['j17', 'DB Migration', 'rubric', 'Generate PostgreSQL migration'],
      ['j18', 'Perf Diagnosis', 'rubric', 'Diagnose slow query and pool exhaustion'],
      ['j19', 'Seed Data', 'rubric', 'Create test factories for 5 models'],
      ['j20', 'CI Failure', 'test-execution', 'Fix a broken CI pipeline'],
      ['j21', 'Accessible Dropdown', 'test-execution', 'Accessible dropdown menu (React)'],
      ['j22', 'Debounce Search', 'test-execution', 'Search-as-you-type with debounce'],
      ['j23', 'Multi-step Form', 'test-execution', 'Checkout form with conditional validation'],
      ['j24', 'Optimistic Update', 'test-execution', 'Task list with optimistic UI + rollback'],
      ['j25', 'Async State Mgmt', 'test-execution', 'Loading/success/empty/error/retry states'],
    ];
    drawTable(jobListHeaders, allJobs, [30, 110, 75, 280]);

    // Coverage map table — start on new page
    newPage();
    doc.fontSize(FONT_SIZE_H2).font('Helvetica-Bold').fillColor('#4A90D9');
    doc.text(locale === 'pt-br' ? 'Mapa de Cobertura' : 'Coverage Map', MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(0.3);
    doc.font('Helvetica').fillColor('#000000');

    const coverageHeaders = [
      tr('table.domain', locale),
      tr('table.understand', locale),
      tr('table.create', locale),
      tr('table.modify', locale),
      tr('table.diagnose', locale),
    ];
    const coverageRows = [
      ['Backend', 'j12', 'j01,j11,j13', 'j02,j08,j16', 'j03,j09,j18,j20'],
      ['Frontend', '-', 'j21,j23,j24,j25', 'j22', '-'],
      ['SQL/Data', '-', 'j17', 'j10', '-'],
      ['DevOps/Infra', '-', 'j14', '-', 'j20'],
      [locale === 'pt-br' ? 'Segurança' : 'Security', '-', '-', '-', 'j05'],
      [locale === 'pt-br' ? 'Teste/QA' : 'Test/QA', '-', 'j04,j19', '-', '-'],
      [locale === 'pt-br' ? 'Arquitetura' : 'Architecture', 'j06', '-', '-', '-'],
      ['Review/Docs', 'j15', 'j07', '-', '-'],
    ];
    drawTable(coverageHeaders, coverageRows, [80, 60, 120, 110, 125]);

    // ─── 15. Methodology ─────────────────────────────────────────────────
    newPage();
    sectionHeader(tr('section.methodology', locale));
    doc.fontSize(FONT_SIZE_BODY).font('Helvetica').fillColor('#333333');
    doc.text(tr('methodology.text', locale), MARGIN, doc.y, {
      width: CONTENT_WIDTH,
      lineGap: 3,
    });

    // ─── Fill TOC on page 2 ──────────────────────────────────────────────
    const tocPage = doc.bufferedPageRange().start + (tocPageStart - 1);
    doc.switchToPage(tocPage);
    doc.fontSize(FONT_SIZE_BODY).font('Helvetica').fillColor('#333333');
    let tocY = MARGIN + 40;
    for (let i = 0; i < toc.length; i++) {
      const entry = toc[i];
      doc.text(`${i + 1}. ${entry.title}`, MARGIN + 10, tocY, { width: CONTENT_WIDTH - 80, continued: false });
      doc.text(String(entry.page), PAGE_WIDTH - MARGIN - 30, tocY, { width: 30, align: 'right' });
      tocY += 22;
    }

    // ─── Page numbers (footer) ───────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).font('Helvetica').fillColor('#AAAAAA');
      doc.text(
        `${tr('page', locale)} ${i + 1} / ${range.count}`,
        MARGIN,
        PAGE_HEIGHT - 30,
        { width: CONTENT_WIDTH, align: 'center' },
      );
    }

    doc.end();
  });
}
