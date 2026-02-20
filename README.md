# llm-dev-bench

A benchmark that measures the **cost-efficiency of LLMs on real software development tasks**.

Supports two interchangeable execution modes producing identical CSV output:

| Mode | How it works | Token counts |
|------|-------------|--------------|
| **API Direct** | Calls models via SDKs (`@anthropic-ai/sdk`, `@anthropic-ai/vertex-sdk`, `openai`, `@google/generative-ai`) | Exact (from API response) |
| **CLI Agent** | Invokes local binaries (`claude`, `gemini`, `codex`) via `child_process` | Estimated (character/4) or exact if agent provides metadata |

Both modes use **the exact same prompt** per job. Zero transformation between modes — guaranteeing full comparability.

---

## Installation

```bash
git clone <repo>
cd llm-dev-benchmark
npm install

# Install Jest and test deps for all fixture test directories
# Required before running any test-execution jobs
npm run setup
```

---

## API Key Setup

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...

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

The `JUDGE_MODEL_ID` is used for rubric-based evaluation (requires Anthropic API).

---

## Running the Benchmark

### Quick validation (1 job, 1 model, 1 run)
```bash
npm run dev -- run \
  --mode api \
  --jobs j01 \
  --models claude-haiku-4-5 \
  --languages nodejs \
  --runs 1
```

### Full API benchmark
```bash
npm run dev -- run \
  --mode api \
  --models claude-sonnet-4,gpt-4o,gemini-flash-2-0 \
  --jobs all \
  --languages nodejs \
  --runs 3
```

### CLI agent mode
```bash
npm run dev -- run \
  --mode cli \
  --agents claude-code,gemini-cli \
  --jobs j01,j03,j05 \
  --languages nodejs \
  --runs 3
```

### Mixed mode (API + CLI comparison)
```bash
npm run dev -- run \
  --mode both \
  --models claude-sonnet-4,gpt-4o \
  --agents claude-code,gemini-cli \
  --jobs j01,j05,j10 \
  --languages nodejs,java \
  --runs 3 \
  --output ./results
```

### Multi-turn retry (re-prompt on failure)
```bash
npm run dev -- run \
  --mode api \
  --jobs j01 \
  --models claude-haiku-4-5 \
  --languages nodejs \
  --runs 1 \
  --max-iterations 3
```

When `--max-iterations N` is set (N > 1), failed jobs are re-prompted with feedback including the previous response, evaluation score, and error details. Token counts and latency are accumulated across all turns.

### Dry run (estimate cost without calling APIs)
```bash
npm run dev -- run \
  --mode both \
  --jobs all \
  --models claude-sonnet-4 \
  --agents claude-code \
  --dry-run
```

### Run all models from a provider
```bash
npm run dev -- run \
  --mode api \
  --providers anthropic \
  --jobs j01 \
  --languages nodejs \
  --runs 1
```

You can combine `--models` and `--providers` (union of both):
```bash
npm run dev -- run \
  --mode api \
  --models gpt-4o \
  --providers anthropic \
  --jobs j01 \
  --languages nodejs \
  --runs 1
```

### Concurrency control

By default, up to 3 jobs run concurrently. Override with `--concurrent`:
```bash
npm run dev -- run \
  --mode api --jobs all --models claude-haiku-4-5 \
  --languages nodejs --runs 1 --concurrent 5
```

### Fullstack benchmark (j26-j31)

Fullstack jobs test CLI agents on a real NestJS + React project. Agents run in agentic mode (editing files) and results are verified with Playwright e2e tests.

**Run locally** (requires CLI agents installed):
```bash
npm run dev -- run \
  --mode cli --agents claude-code --jobs j26 \
  --runs 1 --max-iterations 3
```

**Run via Docker** (recommended):
```bash
# Build the fullstack image (includes Playwright + Chromium)
npm run docker:build:fullstack

# Run all fullstack benchmarks in parallel
npm run docker:bench:fullstack
```

Scoring: 3 iterations allowed. Turn 1 pass = 5 pts, turn 2 = 3 pts, turn 3 = 1 pt, fail = 0 pts.

### Docker (parallel benchmark runs)

Run standard benchmarks (j01-j25) in parallel Docker containers:
```bash
# Build the image
npm run docker:build

# Run benchmarks in parallel containers
npm run docker:bench

# Merge results from multiple container runs into a single CSV
npm run docker:merge
```

Run fullstack benchmarks (j26-j31) with Docker:
```bash
# Build fullstack image (Playwright + Chromium)
npm run docker:build:fullstack

# Run fullstack benchmarks
npm run docker:bench:fullstack
```

### Check available CLI agents
```bash
npm run dev -- check-agents
```

### List all jobs
```bash
npm run dev -- list-jobs
```

### Summarize results
```bash
npm run dev -- summarize \
  results/benchmark_2026-02-18_1551.csv
```

Prints a summary table from an existing CSV file — no API calls needed.

### Generate PDF report
```bash
npm run dev -- report \
  --input results/benchmark_2026-02-18_1551.csv \
  --output ./results \
  --lang both
```

Or via npm script (builds first):
```bash
npm run report -- --input results/benchmark_2026-02-18_1551.csv --output ./results
```

**Flags:**
- `--input` — path to the benchmark CSV file (required)
- `--output` — output directory for the PDF (default: `./results`)
- `--lang` — `en`, `pt-br`, or `both` (default: `both`)

**PDF report features:**
- Overall ranking table with pass rate, avg score, cost, and latency
- 8 charts: pass rate ranking, cost efficiency, cost per resolved task, quality vs cost scatter, speed vs quality scatter, token usage, category performance, task difficulty
- **AI narration below every chart** — each interpretation is cumulative, meaning chart N's narration has full context of charts 1..N and can surface cross-chart correlations
- AI-generated introduction and conclusion (global benchmark summary)
- Per-category breakdowns with detailed scoring
- Multi-turn retry analysis (iteration scores, pass-on-turn distribution)
- Full i18n support (English and Brazilian Portuguese); all AI content auto-translated to pt-br

---

## API Providers

Five adapters are supported:

| Provider | Adapter | SDK | Notes |
|---|---|---|---|
| `anthropic` | `anthropic.adapter.ts` | `@anthropic-ai/sdk` | Direct Anthropic API (`ANTHROPIC_BACKEND=api`) |
| `anthropic` | `anthropic-vertex.adapter.ts` | `@anthropic-ai/vertex-sdk` | Claude via Google Vertex AI (`ANTHROPIC_BACKEND=vertex`) |
| `openai` | `openai.adapter.ts` | `openai` | Chat Completions API |
| `openai-responses` | `openai-responses.adapter.ts` | `openai` | Responses API (for Codex models) |
| `google` | `google.adapter.ts` | `@google/generative-ai` | Google Generative AI |

The Anthropic backend is selected via the `ANTHROPIC_BACKEND` env var (`api` or `vertex`). Both backends share the same `provider: anthropic` in `models.yaml`.

Reasoning models (o3, o4-mini) do not support temperature; the OpenAI adapter handles this automatically. Codex models (gpt-5-codex, gpt-5.2-codex) use the Responses API instead of Chat Completions.

---

## The 31 Jobs

### Isolated tasks (j01-j25)

| ID | Name | Type | Description |
|----|------|------|-------------|
| j01 | Code Generation | test-execution | POST /users endpoint with validation |
| j02 | Refactoring | test-execution | Eliminate code smells without changing behavior |
| j03 | Bug Fix | test-execution | Fix a race condition in concurrent code |
| j04 | Test Generation | test-execution | Generate edge-case tests for a discount function |
| j05 | Security Review | rubric | Find 5 planted vulnerabilities |
| j06 | Architecture | rubric | Recommend pattern for e-commerce scaling |
| j07 | Documentation | rubric | Add JSDoc to 5 undocumented functions |
| j08 | Migration | test-execution | Migrate axios 0.27 → 1.x breaking changes |
| j09 | Debugging | test-execution | Diagnose production bug from stack trace |
| j10 | Performance | hybrid | Identify and fix N+1 query problem |
| j11 | Scaffold | rubric | Generate complete Notification Service microservice |
| j12 | Codebase Explain | rubric | Explain an e-commerce codebase to a new engineer |
| j13 | Feature from Issue | test-execution | Implement password expiry notification |
| j14 | CI/CD Pipeline | rubric | Generate GitHub Actions pipeline |
| j15 | PR Impact | rubric | Review a diff with 4 planted problems |
| j16 | Sync to Async | test-execution | Convert nested callbacks to async/await |
| j17 | DB Migration | rubric | Generate PostgreSQL migration for subscriptions |
| j18 | Performance Diagnosis | rubric | Diagnose slow query and pool exhaustion |
| j19 | Seed Data | rubric | Create test factories for 5 related models |
| j20 | CI Failure | test-execution | Fix a broken CI pipeline |
| j21 | Accessible Dropdown | test-execution | Create a fully accessible dropdown menu React component |
| j22 | Debounce Search | test-execution | Search-as-you-type with debounce and cancellation |
| j23 | Multi-step Form | test-execution | 3-step checkout form with conditional validation |
| j24 | Optimistic Update | test-execution | Task list with optimistic UI updates and rollback |
| j25 | Async State Management | test-execution | Handle all async states: loading, success, empty, error, retry |

### Fullstack tasks (j26-j31)

Fullstack jobs test CLI agents on a real NestJS + React project (`fixtures/fullstack/base-project/`). Unlike j01-j25, agents run in agentic mode (editing files in a project directory) and results are verified with Playwright e2e tests. These jobs only run in CLI mode (`--mode cli`).

| ID | Name | Type | Description |
|----|------|------|-------------|
| j26 | Login Page | e2e | Login form + auth endpoint + JWT |
| j27 | Avatar Menu | e2e | User avatar dropdown menu with auth + header UI |
| j28 | Dark Mode | e2e | Dark mode toggle with CSS variables + localStorage |
| j29 | Data Table | e2e | Data table with server-side pagination + sorting |
| j30 | Toast Notifications | e2e | React context-based toast notifications + auto-dismiss |
| j31 | Contact Form | e2e | Contact form with client + server validation |

**Scoring:** 3 iterations allowed. Turn 1 pass = 5 pts, turn 2 = 3 pts, turn 3 = 1 pt, fail = 0 pts.

### Coverage Map

```
                    ENTENDER        CRIAR                          MODIFICAR      DIAGNOSTICAR
Backend             j12             j01,j11,j13                    j02,j08,j16   j03,j09,j18,j20
Frontend            -               j21,j23,j24,j25                j22            -
SQL/Dados           -               j17                            j10            -
DevOps/Infra        -               j14                            -              j20
Seguranca           -               -                              -              j05
Teste/QA            -               j04,j19                        -              -
Arquitetura         j06             -                              -              -
Review/Docs         j15             j07                            -              -
Fullstack (e2e)     -               j26,j27,j28,j29,j30,j31       -              -
```

---

## Output Format

Results are written to `results/benchmark_YYYYMMDD_HHMMSS.csv` — one row per execution, written immediately as each job completes (crash-safe).

### CSV Columns

| Column | Description |
|--------|-------------|
| `timestamp` | ISO 8601 execution time |
| `job_id` | e.g. `j01` |
| `job_name` | Human-readable name |
| `language` | `nodejs` \| `java` \| `dotnet` |
| `execution_mode` | `api` \| `cli` |
| `provider` | `anthropic`, `openai`, `openai-responses`, `google`, `cli-anthropic`, etc. |
| `model_id` | Technical model ID |
| `model_display_name` | Human-readable model name |
| `run_number` | 1-based run index |
| `input_tokens` | Prompt tokens (exact or estimated) |
| `output_tokens` | Completion tokens (exact or estimated) |
| `total_tokens` | Sum of input + output |
| `tokens_source` | `exact` (API) or `estimated` (CLI heuristic) |
| `cost_usd` | Calculated cost |
| `latency_ms` | End-to-end wall time |
| `turns` | Conversation rounds (1 for single-turn, >1 with `--max-iterations`) |
| `passed` | `true` \| `false` |
| `quality_score` | 0–5 |
| `quality_notes` | Evaluation details |
| `error_message` | Empty if no error |
| `raw_prompt_chars` | Character count of the prompt sent |
| `raw_response_chars` | Character count of the response received |
| `iteration_scores` | Comma-separated scores per turn (e.g. `2.5,4.0,5.0`) |
| `passed_on_turn` | 1-based turn where it first passed; 0 if never passed |

> **Important:** When comparing API vs CLI modes, always group or filter by `tokens_source`. Estimated token counts have ~20% error margin.

---

## Adding a New Job

1. Create `src/jobs/jNN-name/index.ts` implementing the `Job` interface:
   ```typescript
   import { Job, JobInput, Language } from '../base.job';

   export class MyNewJob implements Job {
     id = 'jNN';
     name = 'My New Job';
     description = '...';
     supportedLanguages: Language[] = ['nodejs'];
     evaluationType = 'rubric' as const;
     maxTurns = 1;

     buildPrompt(input: JobInput): string {
       return `...${input.fixtureCode}...`;
     }

     async evaluate(response: string, input: JobInput) {
       // use rubric-scorer or code-runner
     }
   }

   export default new MyNewJob();
   ```

2. Add one line to `src/jobs/registry.ts`:
   ```typescript
   import jNN from './jNN-my-new-job';
   // ... add to ALL_JOBS array
   ```

3. Optionally add a fixture: `fixtures/nodejs/jNN/fixture.js`

**No other file needs to change.**

---

## Adding a New API Model

Add one entry to `config/models.yaml`:
```yaml
- id: my-new-model
  provider: anthropic  # or openai | openai-responses | google
  displayName: "My Model"
  modelId: "actual-api-model-id"
  pricing:
    inputPerMToken: 1.00
    outputPerMToken: 5.00
```

Then use `--models my-new-model` in the CLI. For Anthropic models, set `ANTHROPIC_BACKEND` to choose between direct API and Vertex AI.

---

## Adding a New CLI Agent

1. Create `src/cli-agents/my-agent.agent.ts` implementing `CLIAgent`
2. Add an entry to `config/agents.yaml`
3. Register in `src/cli.ts` `buildAgentConfigs()` map

---

## Architecture

```
src/
├── cli.ts              Entrypoint (Commander)
├── runner.ts           Orchestrator — iterates jobs × models × languages × runs
├── evaluator.ts        Dispatches to code-runner or rubric-scorer
├── reporter.ts         Writes CSV rows + prints summary table
│
├── execution/
│   ├── base.executor.ts              Executor interface
│   ├── api-executor.ts               Mode A: SDK calls
│   ├── cli-executor.ts               Mode B: child_process spawn
│   └── fullstack-cli-executor.ts     Fullstack e2e: agent edits + Playwright
│
├── adapters/           SDK wrappers (5 adapters)
├── cli-agents/         CLI agent configs (one per binary)
├── jobs/               31 benchmark jobs (j01-j25 isolated, j26-j31 fullstack) + registry
├── report/             PDF report generator (analysis, charts, i18n)
└── utils/              token-estimator, cost-calculator, code-runner, rubric-scorer,
                        e2e-runner, e2e-scoring
```

### Key invariants
- `job.buildPrompt()` returns the **same string** for API and CLI — no conditional logic
- A failed job writes an error row to CSV and **never interrupts** other jobs
- CSV rows are written **one at a time** as jobs complete — no data loss on crash
- Temperature is always 0 for determinism (except reasoning models that don't support it)
- Multi-turn retry accumulates tokens and latency across iterations