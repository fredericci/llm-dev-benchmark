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
  'section.taskCoverage': {
    en: 'Task Coverage',
    'pt-br': 'Cobertura de Tarefas',
  },
  'section.taskCoverage.desc': {
    en: 'All 25 benchmark tasks organized by domain and skill type.',
    'pt-br': 'Todas as 25 tarefas do benchmark organizadas por domínio e tipo de habilidade.',
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
- Test Execution: Model-generated code is run against pre-written Jest test suites
- Rubric Scoring: Claude Haiku judges responses against defined criteria (0-5 scale)
- Hybrid: Combination of both methods

Scoring:
- Quality Score: 0 to 5 scale (5 = perfect)
- Pass Rate: Percentage of runs where the model passed all tests / met rubric criteria
- Cost: Calculated from actual API token usage and published pricing
- Cost Efficiency: Average Quality Score divided by Average Cost (USD)

Configuration:
- Temperature: 0 (deterministic)
- Max Output Tokens: 4096 (configurable via MAX_OUTPUT_TOKENS)
- Multiple runs per combination to account for variance
- Concurrent execution capped to avoid rate limits`,
    'pt-br': `Este benchmark avalia o desempenho de LLMs em 25 tarefas reais de engenharia de software, abrangendo escrita de código, correção de código, análise de código, DevOps/arquitetura e frontend.

Métodos de Avaliação:
- Execução de Testes: Código gerado pelo modelo é executado contra suítes de testes Jest pré-escritas
- Pontuação por Rubrica: Claude Haiku julga as respostas contra critérios definidos (escala 0-5)
- Híbrido: Combinação de ambos os métodos

Pontuação:
- Nota de Qualidade: escala de 0 a 5 (5 = perfeito)
- Taxa de Aprovação: Porcentagem de execuções onde o modelo passou em todos os testes / atendeu critérios da rubrica
- Custo: Calculado a partir do uso real de tokens da API e preços publicados
- Custo-Eficiência: Pontuação de Qualidade Média dividida pelo Custo Médio (USD)

Configuração:
- Temperatura: 0 (determinístico)
- Máximo de Tokens de Saída: 4096 (configurável via MAX_OUTPUT_TOKENS)
- Múltiplas execuções por combinação para compensar variância
- Execução concorrente limitada para evitar rate limits`,
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
