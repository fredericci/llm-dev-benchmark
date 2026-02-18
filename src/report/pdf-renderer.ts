import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import {
  AnalysisResult,
  ChartBuffers,
  Locale,
  ModelSummary,
  CostEfficiencyEntry,
  SpeedAccuracyEntry,
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

export async function renderPDF(
  analysis: AnalysisResult,
  charts: ChartBuffers,
  locale: Locale,
  outputPath: string,
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

    // Helper: draw a data table
    function drawTable(
      headers: string[],
      rows: string[][],
      colWidths: number[],
    ): void {
      const totalWidth = colWidths.reduce((a, b) => a + b, 0);
      const startX = MARGIN;

      // Header
      ensureSpace(TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT);
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
      `${tr('cover.runs', locale)}: ${analysis.totalRuns}`,
    ];
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

    // ─── 3. Executive Overview ───────────────────────────────────────────
    doc.addPage();
    sectionHeader(tr('section.overview', locale), tr('section.overview.desc', locale));
    embedChart(charts.passRateBar);

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
    doc.addPage();
    sectionHeader(tr('section.costEfficiency', locale), tr('section.costEfficiency.desc', locale));

    doc.fontSize(FONT_SIZE_BODY).font('Helvetica-Oblique').fillColor('#666666');
    doc.text(tr('costEfficiency.formula', locale), MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor('#000000');

    embedChart(charts.costEfficiencyBar);

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

    // ─── 5. Best per Language ────────────────────────────────────────────
    doc.addPage();
    sectionHeader(tr('section.perLanguage', locale), tr('section.perLanguage.desc', locale));

    for (const lr of analysis.languageRankings) {
      ensureSpace(60);
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

    // ─── 6. Fastest with Good Accuracy ───────────────────────────────────
    doc.addPage();
    sectionHeader(tr('section.speedAccuracy', locale), tr('section.speedAccuracy.desc', locale));

    doc.fontSize(FONT_SIZE_BODY).font('Helvetica-Oblique').fillColor('#666666');
    doc.text(tr('speedAccuracy.threshold', locale), MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor('#000000');

    embedChart(charts.speedQualityScatter);

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

    // ─── 7. API-Only Ranking ─────────────────────────────────────────────
    if (analysis.apiOnlyRanking.length > 0) {
      doc.addPage();
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

    // ─── 8. Token Analysis ───────────────────────────────────────────────
    doc.addPage();
    sectionHeader(tr('section.tokens', locale), tr('section.tokens.desc', locale));
    embedChart(charts.tokenStackedBar);

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

    // ─── 9. Category Analysis ────────────────────────────────────────────
    doc.addPage();
    sectionHeader(tr('section.categories', locale), tr('section.categories.desc', locale));
    embedChart(charts.categoryGroupedBar);

    for (const cr of analysis.categoryRankings) {
      ensureSpace(80);
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

    // ─── 10. Task Coverage ──────────────────────────────────────────────
    doc.addPage();
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

    // Coverage map table
    ensureSpace(60);
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

    // ─── 11. Methodology ─────────────────────────────────────────────────
    doc.addPage();
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
