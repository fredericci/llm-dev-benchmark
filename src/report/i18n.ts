import { Locale } from './types';

const dict: Record<string, Record<Locale, string>> = {
  // Cover page
  'cover.title': {
    en: 'LLM Dev Benchmark Report',
    'pt-br': 'Relatório do Benchmark LLM Dev',
  },
  'cover.subtitle': {
    en: 'Cost-Efficiency Analysis of LLMs on Software Engineering Tasks',
    'pt-br': 'Análise de Custo-Eficiência de LLMs em Tarefas de Engenharia de Software',
  },
  'cover.generated': {
    en: 'Generated on',
    'pt-br': 'Gerado em',
  },
  'cover.source': {
    en: 'Source',
    'pt-br': 'Fonte',
  },
  'cover.models': {
    en: 'Models evaluated',
    'pt-br': 'Modelos avaliados',
  },
  'cover.jobs': {
    en: 'Tasks evaluated',
    'pt-br': 'Tarefas avaliadas',
  },
  'cover.runs': {
    en: 'Total runs',
    'pt-br': 'Total de execuções',
  },
  'cover.validRuns': {
    en: 'Valid runs',
    'pt-br': 'Execuções válidas',
  },
  'cover.errorRuns': {
    en: 'Error runs (excluded)',
    'pt-br': 'Execuções com erro (excluídas)',
  },

  // TOC
  'toc.title': {
    en: 'Table of Contents',
    'pt-br': 'Sumário',
  },

  // Section titles
  'section.overview': {
    en: 'Executive Overview',
    'pt-br': 'Visão Geral Executiva',
  },
  'section.overview.desc': {
    en: 'All models ranked by pass rate across all tasks.',
    'pt-br': 'Todos os modelos classificados por taxa de aprovação em todas as tarefas.',
  },
  'section.costEfficiency': {
    en: 'Best Cost-Efficiency',
    'pt-br': 'Melhor Custo-Eficiência',
  },
  'section.costEfficiency.desc': {
    en: 'Models ranked by quality score per dollar spent. Higher is better.',
    'pt-br': 'Modelos classificados por pontuação de qualidade por dólar gasto. Quanto maior, melhor.',
  },
  'section.costPerSuccess': {
    en: 'Cost per Resolved Task',
    'pt-br': 'Custo por Tarefa Resolvida',
  },
  'section.costPerSuccess.desc': {
    en: 'Total cost divided by number of successfully passed tasks. Includes cost of failed attempts. Lower is better.',
    'pt-br': 'Custo total dividido pelo número de tarefas aprovadas. Inclui custo de tentativas que falharam. Menor é melhor.',
  },
  'table.costPerSuccess': {
    en: 'Cost/Success',
    'pt-br': 'Custo/Sucesso',
  },
  'table.passedRuns': {
    en: 'Passed',
    'pt-br': 'Aprovados',
  },
  'table.totalCost': {
    en: 'Total Cost',
    'pt-br': 'Custo Total',
  },
  'section.scoreVsCost': {
    en: 'Quality vs Cost Analysis',
    'pt-br': 'Análise Qualidade vs Custo',
  },
  'section.scoreVsCost.desc': {
    en: 'Score-vs-cost scatter showing the value proposition of each model. Top-left quadrant = best value (high quality, low cost).',
    'pt-br': 'Gráfico de dispersão qualidade-vs-custo mostrando a proposta de valor de cada modelo. Quadrante superior esquerdo = melhor valor (alta qualidade, baixo custo).',
  },
  'section.perLanguage': {
    en: 'Best per Language',
    'pt-br': 'Melhor por Linguagem',
  },
  'section.perLanguage.desc': {
    en: 'Top models for each programming language tested.',
    'pt-br': 'Melhores modelos para cada linguagem de programação testada.',
  },
  'section.speedAccuracy': {
    en: 'Fastest with Good Accuracy',
    'pt-br': 'Mais Rápido com Boa Precisão',
  },
  'section.speedAccuracy.desc': {
    en: 'Models with average quality score >= 3.0 (60%), sorted by latency.',
    'pt-br': 'Modelos com pontuação de qualidade média >= 3.0 (60%), ordenados por latência.',
  },
  'section.apiOnly': {
    en: 'Best via API Mode',
    'pt-br': 'Melhor via Modo API',
  },
  'section.apiOnly.desc': {
    en: 'Rankings filtered to API execution mode only.',
    'pt-br': 'Rankings filtrados apenas para modo de execução API.',
  },
  'section.tokens': {
    en: 'Average Tokens per Problem',
    'pt-br': 'Tokens Médios por Problema',
  },
  'section.tokens.desc': {
    en: 'Per-model average input, output, and total token usage.',
    'pt-br': 'Uso médio de tokens de entrada, saída e total por modelo.',
  },
  'section.categories': {
    en: 'Category Analysis',
    'pt-br': 'Análise por Categoria',
  },
  'section.categories.desc': {
    en: 'Performance breakdown by task category.',
    'pt-br': 'Análise de desempenho por categoria de tarefa.',
  },
  'section.difficulty': {
    en: 'Task Difficulty Ranking',
    'pt-br': 'Ranking de Dificuldade das Tarefas',
  },
  'section.difficulty.desc': {
    en: 'Tasks ranked by failure rate across all models. Higher failure rate = harder task.',
    'pt-br': 'Tarefas classificadas por taxa de falha entre todos os modelos. Maior taxa de falha = tarefa mais difícil.',
  },
  'section.heatmap': {
    en: 'Model × Task Heatmap',
    'pt-br': 'Heatmap Modelo × Tarefa',
  },
  'section.heatmap.desc': {
    en: 'Color-coded matrix showing each model\'s average score per task. Red = 0, Yellow = 2.5, Green = 5.0.',
    'pt-br': 'Matriz colorida mostrando a nota média de cada modelo por tarefa. Vermelho = 0, Amarelo = 2.5, Verde = 5.0.',
  },
  'section.retry': {
    en: 'Retry Analysis',
    'pt-br': 'Análise de Retry',
  },
  'section.retry.desc': {
    en: 'Multi-turn retry performance analysis. Shows which models benefit most from re-prompting with feedback.',
    'pt-br': 'Análise de desempenho com retry multi-turno. Mostra quais modelos mais se beneficiam de re-prompting com feedback.',
  },
  'section.taskCoverage': {
    en: 'Task Coverage',
    'pt-br': 'Cobertura de Tarefas',
  },
  'section.taskCoverage.desc': {
    en: 'All 25 benchmark tasks organized by domain and skill type.',
    'pt-br': 'Todas as 25 tarefas do benchmark organizadas por domínio e tipo de habilidade.',
  },
  'section.introduction': {
    en: 'Introduction',
    'pt-br': 'Introdução',
  },
  'section.conclusion': {
    en: 'Conclusion',
    'pt-br': 'Conclusão',
  },
  'section.methodology': {
    en: 'Methodology',
    'pt-br': 'Metodologia',
  },

  // Table headers
  'table.rank': { en: 'Rank', 'pt-br': 'Pos.' },
  'table.model': { en: 'Model', 'pt-br': 'Modelo' },
  'table.provider': { en: 'Provider', 'pt-br': 'Provedor' },
  'table.mode': { en: 'Mode', 'pt-br': 'Modo' },
  'table.passRate': { en: 'Pass Rate', 'pt-br': 'Taxa Aprov.' },
  'table.avgScore': { en: 'Avg Score', 'pt-br': 'Nota Média' },
  'table.avgCost': { en: 'Avg Cost', 'pt-br': 'Custo Médio' },
  'table.avgLatency': { en: 'Avg Latency', 'pt-br': 'Latência Média' },
  'table.p50Latency': { en: 'p50 Latency', 'pt-br': 'Latência p50' },
  'table.costEfficiency': { en: 'Cost Efficiency', 'pt-br': 'Custo-Eficiência' },
  'table.inputTokens': { en: 'Input Tokens', 'pt-br': 'Tokens Entrada' },
  'table.outputTokens': { en: 'Output Tokens', 'pt-br': 'Tokens Saída' },
  'table.totalTokens': { en: 'Total Tokens', 'pt-br': 'Tokens Total' },
  'table.runs': { en: 'Runs', 'pt-br': 'Execuções' },
  'table.language': { en: 'Language', 'pt-br': 'Linguagem' },
  'table.domain': { en: 'Domain', 'pt-br': 'Domínio' },
  'table.understand': { en: 'Understand', 'pt-br': 'Entender' },
  'table.create': { en: 'Create', 'pt-br': 'Criar' },
  'table.modify': { en: 'Modify', 'pt-br': 'Modificar' },
  'table.diagnose': { en: 'Diagnose', 'pt-br': 'Diagnosticar' },
  'table.id': { en: 'ID', 'pt-br': 'ID' },
  'table.name': { en: 'Name', 'pt-br': 'Nome' },
  'table.type': { en: 'Type', 'pt-br': 'Tipo' },
  'table.description': { en: 'Description', 'pt-br': 'Descrição' },
  'table.failRate': { en: 'Fail Rate', 'pt-br': 'Taxa Falha' },
  'table.failedModels': { en: 'Failed Models', 'pt-br': 'Modelos Falharam' },
  'table.avgTurns': { en: 'Avg Turns', 'pt-br': 'Turnos Médios' },
  'table.retryBenefit': { en: 'Retry Benefit', 'pt-br': 'Benefício Retry' },
  'table.firstTurnPass': { en: '1st Turn Pass', 'pt-br': 'Aprov. 1º Turno' },
  'table.finalPass': { en: 'Final Pass', 'pt-br': 'Aprov. Final' },

  // Cost efficiency
  'costEfficiency.zeroCost': {
    en: '* Zero-cost models (preview/free tier) are ranked first but cost-efficiency ratio is not applicable.',
    'pt-br': '* Modelos sem custo (preview/free tier) são classificados primeiro, mas a razão custo-eficiência não se aplica.',
  },
  'costEfficiency.formula': {
    en: 'Formula: Average Quality Score / Average Cost (USD)',
    'pt-br': 'Fórmula: Pontuação de Qualidade Média / Custo Médio (USD)',
  },

  // Speed accuracy
  'speedAccuracy.threshold': {
    en: 'Threshold: Average quality score >= 3.0 (60%)',
    'pt-br': 'Limite: Pontuação de qualidade média >= 3.0 (60%)',
  },
  'speedAccuracy.noModels': {
    en: 'No models met the quality threshold.',
    'pt-br': 'Nenhum modelo atingiu o limite de qualidade.',
  },

  // Score vs Cost
  'quadrant.bestValue': {
    en: 'Best Value',
    'pt-br': 'Melhor Valor',
  },
  'quadrant.premium': {
    en: 'Premium',
    'pt-br': 'Premium',
  },
  'scoreVsCost.zeroCostNote': {
    en: '* Zero-cost models are excluded from the chart but listed in the table below.',
    'pt-br': '* Modelos sem custo são excluídos do gráfico mas listados na tabela abaixo.',
  },
  'scoreVsCost.bestQuadrant': {
    en: 'Best Value Quadrant (High Quality, Below Median Cost)',
    'pt-br': 'Quadrante Melhor Valor (Alta Qualidade, Custo Abaixo da Mediana)',
  },
  'scoreVsCost.noBestQuadrant': {
    en: 'No models fell in the best-value quadrant.',
    'pt-br': 'Nenhum modelo ficou no quadrante de melhor valor.',
  },
  'chart.avgCostUsd': {
    en: 'Average Cost per Run (USD)',
    'pt-br': 'Custo Médio por Execução (USD)',
  },
  'chart.qualityScore': {
    en: 'Average Quality Score (0-5)',
    'pt-br': 'Nota de Qualidade Média (0-5)',
  },

  // Retry
  'retry.noData': {
    en: 'No multi-turn retry data available.',
    'pt-br': 'Nenhum dado de retry multi-turno disponível.',
  },

  // Categories
  'category.codeWriting': { en: 'Code Writing', 'pt-br': 'Escrita de Código' },
  'category.codeWriting.desc': {
    en: 'REST API generation, test generation, scaffolding, feature from issue, seed data',
    'pt-br': 'Geração de API REST, geração de testes, scaffolding, feature a partir de issue, dados seed',
  },
  'category.codeFixing': { en: 'Code Fixing', 'pt-br': 'Correção de Código' },
  'category.codeFixing.desc': {
    en: 'Refactoring, bug fix, migration, debugging, sync-to-async, CI failure',
    'pt-br': 'Refatoração, correção de bug, migração, debugging, sync-to-async, falha de CI',
  },
  'category.codeAnalysis': { en: 'Code Analysis', 'pt-br': 'Análise de Código' },
  'category.codeAnalysis.desc': {
    en: 'Security review, N+1 detection, codebase explanation, PR impact, performance diagnosis',
    'pt-br': 'Revisão de segurança, detecção N+1, explicação de codebase, impacto de PR, diagnóstico de performance',
  },
  'category.devopsArch': { en: 'DevOps & Architecture', 'pt-br': 'DevOps e Arquitetura' },
  'category.devopsArch.desc': {
    en: 'Architecture decision, documentation, CI/CD pipeline, database migration',
    'pt-br': 'Decisão de arquitetura, documentação, pipeline CI/CD, migração de banco de dados',
  },
  'category.frontend': { en: 'Frontend', 'pt-br': 'Frontend' },
  'category.frontend.desc': {
    en: 'Accessible components, debounced search, multi-step forms, optimistic updates, async state management',
    'pt-br': 'Componentes acessíveis, busca com debounce, formulários multi-step, updates otimistas, gestão de estado async',
  },

  // Methodology
  'methodology.text': {
    en: `This benchmark evaluates LLM performance across 25 real software engineering tasks spanning code writing, code fixing, code analysis, DevOps/architecture, and frontend categories.

Evaluation Methods:
- Test Execution: Model-generated code is run against pre-written test suites. Three test frameworks are supported: Node.js (Jest), Java (Maven + JUnit 5), and .NET Core (xUnit). Fixture files are pre-written in fixtures/{nodejs,java,dotnet}/ — the model writes code that is tested against these existing suites.
- Rubric Scoring: Claude Haiku judges responses against defined criteria (0-5 scale)
- Hybrid: Combination of both methods

Scoring:
- Quality Score: 0 to 5 scale (5 = perfect)
- Pass Rate: Percentage of runs where the model passed all tests / met rubric criteria
- Cost: Calculated from actual API token usage and published pricing
- Cost Efficiency: Average Quality Score divided by Average Cost (USD)
- Cost per Resolved Task: Total cost (including failed attempts) divided by the number of successfully passed runs. This metric captures the true cost of getting work done, penalizing models that require multiple retries or fail frequently, as the cost of failed attempts is factored into the total

Multi-Turn Retry:
When configured with --max-iterations N (N > 1), failed tasks are re-prompted with feedback that includes the previous response, evaluation score, and error details. Input and output tokens are accumulated across all turns, as is latency. The CSV records iteration_scores (comma-separated scores per turn) and passed_on_turn (1-based turn where the task first passed, or 0 if it never passed).

Error Handling:
Executions that fail due to infrastructure issues (API errors, timeouts, invalid credentials) are identified by the error_message field and excluded from all report metrics. Error counts are displayed separately on the cover page. This ensures that averages reflect the actual capability of models rather than being skewed by infrastructure failures.

Configuration:
- Temperature: 0 (deterministic)
- Max Output Tokens: 4096 (configurable via MAX_OUTPUT_TOKENS)
- Multiple runs per combination to account for variance
- Concurrent execution capped to avoid rate limits

Limitations & Potential Biases:
- Fixed temperature of 0 — does not capture model variability at higher temperatures
- Rubric scoring uses Claude Haiku as judge — potential bias in favor of Anthropic models
- Max output tokens capped at 4096 — may penalize models that produce longer responses
- Tasks are single-file — does not evaluate multi-file editing capabilities
- CLI agent token counts are estimated (chars/4 heuristic) — not as precise as API token counts`,
    'pt-br': `Este benchmark avalia o desempenho de LLMs em 25 tarefas reais de engenharia de software, abrangendo escrita de código, correção de código, análise de código, DevOps/arquitetura e frontend.

Métodos de Avaliação:
- Execução de Testes: Código gerado pelo modelo é executado contra suítes de testes pré-escritas. Três frameworks são suportados: Node.js (Jest), Java (Maven + JUnit 5) e .NET Core (xUnit). Fixtures são pré-escritas em fixtures/{nodejs,java,dotnet}/ — o modelo escreve código que é testado contra essas suítes existentes.
- Pontuação por Rubrica: Claude Haiku julga as respostas contra critérios definidos (escala 0-5)
- Híbrido: Combinação de ambos os métodos

Pontuação:
- Nota de Qualidade: escala de 0 a 5 (5 = perfeito)
- Taxa de Aprovação: Porcentagem de execuções onde o modelo passou em todos os testes / atendeu critérios da rubrica
- Custo: Calculado a partir do uso real de tokens da API e preços publicados
- Custo-Eficiência: Pontuação de Qualidade Média dividida pelo Custo Médio (USD)
- Custo por Tarefa Resolvida: Custo total (incluindo tentativas falhadas) dividido pelo número de execuções aprovadas. Esta métrica captura o custo real de obter trabalho feito, penalizando modelos que precisam de múltiplas tentativas ou falham frequentemente, pois o custo das tentativas falhadas é considerado no total

Retry Multi-Turno:
Quando configurado com --max-iterations N (N > 1), tarefas que falharam são re-promptadas com feedback incluindo a resposta anterior, score e detalhes do erro. Tokens de entrada e saída são acumulados entre todos os turnos, assim como a latência. O CSV registra iteration_scores (scores separados por vírgula por turno) e passed_on_turn (turno 1-based onde a tarefa passou pela primeira vez, ou 0 se nunca passou).

Tratamento de Erros:
Execuções que falham por problemas de infraestrutura (erros de API, timeouts, credenciais inválidas) são identificadas pelo campo error_message e excluídas de todas as métricas do relatório. A contagem de erros é exibida separadamente na capa. Isso garante que as médias reflitam a capacidade real dos modelos e não sejam distorcidas por falhas de infraestrutura.

Configuração:
- Temperatura: 0 (determinístico)
- Máximo de Tokens de Saída: 4096 (configurável via MAX_OUTPUT_TOKENS)
- Múltiplas execuções por combinação para compensar variância
- Execução concorrente limitada para evitar rate limits

Limitações e Vieses Potenciais:
- Temperatura fixa em 0 — não captura variabilidade do modelo em temperaturas maiores
- Pontuação por rubrica usa Claude Haiku como juiz — potencial viés a favor de modelos Anthropic
- Máximo de tokens de saída limitado a 4096 — pode penalizar modelos que produzem respostas mais longas
- Tarefas são single-file — não avalia capacidade de edição multi-arquivo
- Contagem de tokens de agentes CLI é estimada (heurística chars/4) — não é tão precisa quanto tokens da API`,
  },

  // Misc
  'page': { en: 'Page', 'pt-br': 'Página' },
  'noData': { en: 'No data available', 'pt-br': 'Nenhum dado disponível' },
  'estimated': { en: '(estimated)', 'pt-br': '(estimado)' },
};

export function tr(key: string, locale: Locale): string {
  const entry = dict[key];
  if (!entry) return key;
  return entry[locale] ?? entry['en'] ?? key;
}
