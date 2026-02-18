# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install
npm run setup        # installs npm deps in all fixture test directories

# Development
npm run dev          # run CLI via ts-node (no build required)
npm run build        # compile TypeScript to dist/
npm run bench        # shortcut for 'node dist/cli.js run' (auto-builds first)
npm start            # run compiled CLI

# Type checking & linting
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src --ext .ts

# Docker (parallel benchmark runs)
npm run docker:build   # docker build -t llm-dev-bench .
npm run docker:bench   # run benchmarks in parallel Docker containers
npm run docker:merge   # merge results from multiple container runs

# Run a quick single benchmark (fastest validation)
npx ts-node -r tsconfig-paths/register src/cli.ts run \
  --mode api --jobs j01 --models claude-haiku-4-5 \
  --languages nodejs --runs 1

# Dry-run (estimate costs, no API calls)
npx ts-node -r tsconfig-paths/register src/cli.ts run \
  --mode api --jobs all --models claude-haiku-4-5 --dry-run

# Run all models from a provider
npx ts-node -r tsconfig-paths/register src/cli.ts run \
  --mode api --providers anthropic --jobs j01 \
  --languages nodejs --runs 1

# Combine --models and --providers (union)
npx ts-node -r tsconfig-paths/register src/cli.ts run \
  --mode api --models gpt-4o --providers anthropic \
  --jobs j01 --languages nodejs --runs 1

# Run with retry iterations (re-prompt on failure, up to N attempts)
npx ts-node -r tsconfig-paths/register src/cli.ts run \
  --mode api --jobs j01 --models claude-haiku-4-5 \
  --languages nodejs --runs 1 --max-iterations 3

# List available jobs and check installed CLI agents
npx ts-node -r tsconfig-paths/register src/cli.ts list-jobs
npx ts-node -r tsconfig-paths/register src/cli.ts check-agents

# Print summary table from existing CSV results
npx ts-node -r tsconfig-paths/register src/cli.ts summarize \
  results/benchmark_2026-02-18_1551.csv

# Generate PDF report from benchmark CSV results
npx ts-node -r tsconfig-paths/register src/cli.ts report \
  --input results/benchmark_2026-02-18_1551.csv \
  --output ./results --lang both
```

## Architecture

The project is a cost-efficiency benchmark that measures LLM performance on 25 real software engineering tasks. Both execution modes produce identical CSV output for direct comparability.

### Execution Modes

- **API mode** (`--mode api`): calls model SDKs directly (Anthropic, OpenAI, Google); exact token counts from API response
- **CLI agent mode** (`--mode cli`): spawns local binaries (claude, gemini, codex); token counts estimated via char/4 heuristic
- **Both** (`--mode both`): runs all models and agents; both modes use identical prompts per job

### Core Data Flow

```
cli.ts → runner.ts → executor (api/cli) → adapter (per provider)
                   ↓
              evaluator.ts → job.evaluate()
                              ├── code-runner.ts (runs Jest/Maven/dotnet in fixture dir)
                              └── rubric-scorer.ts (Claude Haiku as judge)
                   ↓                    ↑
                   ↓          (retry loop if --max-iterations > 1)
                   ↓
              reporter.ts → CSV row (written immediately, crash-safe)

cli.ts report     → report/ → PDF (charts + analysis, en/pt-br)
cli.ts summarize  → prints summary table from existing CSV
```

### Key Directories

- `src/jobs/` — 25 benchmark jobs (j01–j25) plus a registry; each job is self-contained
- `src/execution/` — `APIExecutor` and `CLIExecutor` share the same interface
- `src/adapters/` — thin SDK wrappers per provider (Anthropic, Anthropic Vertex, OpenAI, OpenAI Responses, Google)
- `src/cli-agents/` — CLI agent wrappers (claude-code, gemini-cli, codex-cli)
- `src/utils/` — `code-runner.ts`, `rubric-scorer.ts`, `token-estimator.ts`, `cost-calculator.ts`
- `src/report/` — PDF report generator with analysis, charts, and i18n (en/pt-br)
- `config/` — `models.yaml` (27 API models with pricing) and `agents.yaml` (3 CLI agents)
- `fixtures/{nodejs,java,dotnet}/jNN/tests/` — pre-written test suites (Jest / JUnit 5 / xUnit); model output is written here and executed
- `scripts/` — `setup-fixtures.sh`, `docker-bench.sh`, `merge-results.sh`

### Providers and Adapters

Five API adapters in `src/adapters/`:

| Provider | Adapter | SDK | Notes |
|---|---|---|---|
| `anthropic` | `anthropic.adapter.ts` | `@anthropic-ai/sdk` | Direct Anthropic API (`ANTHROPIC_BACKEND=api`) |
| `anthropic` | `anthropic-vertex.adapter.ts` | `@anthropic-ai/vertex-sdk` | Claude via Google Vertex AI (`ANTHROPIC_BACKEND=vertex`) |
| `openai` | `openai.adapter.ts` | `openai` | Chat Completions API |
| `openai-responses` | `openai-responses.adapter.ts` | `openai` | Responses API (for Codex models) |
| `google` | `google.adapter.ts` | `@google/generative-ai` | Google Generative AI |

The Anthropic backend is selected via the `ANTHROPIC_BACKEND` env var (`api` or `vertex`). Both backends share the same `provider: anthropic` in `models.yaml`.

### Job Evaluation Types

- **test-execution**: model writes code, tests run against pre-written suites in `fixtures/`
  - Node.js: Jest
  - Java: Maven + JUnit 5 (Surefire XML reports)
  - .NET Core: dotnet test + xUnit
- **rubric**: Claude Haiku judges the response against criteria defined in the job
- **hybrid**: both approaches combined (e.g., j10)

Test execution is fully implemented for all three languages. Fixture files are language-aware: `fixture.js`, `Fixture.java`, `Fixture.cs`.

### Multi-Turn Retry

When `--max-iterations N` is set (N > 1), failed jobs are re-prompted with feedback including the previous response, evaluation score, and error details. Token counts and latency are accumulated across all turns. The CSV records `iteration_scores` (comma-separated per turn) and `passed_on_turn` (1-based, 0 if never passed).

### Extending the Benchmark

**Add a new job**: create `src/jobs/jNN-name/index.ts` implementing the `Job` interface, then add it to `src/jobs/registry.ts`. No other files change.

**Add an API model**: add an entry to `config/models.yaml` with pricing; reference via `--models <id>`.

**Add a CLI agent**: implement `CLIAgent` in `src/cli-agents/`, add to `config/agents.yaml`, register in `buildAgentConfigs()` in `src/cli.ts`.

### Important Invariants

- Temperature is always 0 for determinism; max output tokens is 4096 (override via `MAX_OUTPUT_TOKENS` env)
- Reasoning models (o3, o4-mini) do not support temperature; the OpenAI adapter handles this automatically
- CSV rows are appended immediately per result — safe to interrupt and resume
- Rubric scoring always uses the judge model configured in `JUDGE_MODEL_ID` (default: Claude Haiku)
- Concurrent executions are capped at 3 by default (`--concurrent` flag) to avoid rate limits
- Path alias `@/*` maps to `src/*` (configured in `tsconfig.json` + `tsconfig-paths` at runtime)

### Coverage Map

```
                    ENTENDER        CRIAR             MODIFICAR      DIAGNOSTICAR
Backend             j12             j01,j11,j13       j02,j08,j16   j03,j09,j18,j20
Frontend            -               j21,j23,j24,j25   j22            -
SQL/Dados           -               j17               j10            -
DevOps/Infra        -               j14               -              j20
Seguranca           -               -                 -              j05
Teste/QA            -               j04,j19           -              -
Arquitetura         j06             -                 -              -
Review/Docs         j15             j07               -              -
```

### Environment Variables

Copy `.env.example` to `.env` and populate:

```
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_API_KEY=...

# Anthropic connection backend: api | vertex
ANTHROPIC_BACKEND=api

# Required when ANTHROPIC_BACKEND=vertex:
# ANTHROPIC_VERTEX_PROJECT_ID=my-gcp-project   # auto-resolved from ADC if not set
CLOUD_ML_REGION=global                          # or a specific region (e.g. us-east5)

JUDGE_MODEL_ID=claude-haiku-4-5-20251001
MAX_OUTPUT_TOKENS=4096
REQUEST_TIMEOUT_MS=60000
CLI_AGENT_TIMEOUT_MS=120000
RESULTS_DIR=./results
```

Results are written to `results/benchmark_YYYYMMDD_HHMMSS.csv` (excluded from git).
