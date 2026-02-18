# llm-dev-bench

A benchmark that measures the **cost-efficiency of LLMs on real software development tasks**.

Supports two interchangeable execution modes producing identical CSV output:

| Mode | How it works | Token counts |
|------|-------------|--------------|
| **API Direct** | Calls models via SDKs (`@anthropic-ai/sdk`, `@anthropic-ai/foundry-sdk`, `openai`, `@google/generative-ai`) | Exact (from API response) |
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

# Azure AI Foundry (for anthropic-foundry provider)
ANTHROPIC_FOUNDRY_API_KEY=...
ANTHROPIC_FOUNDRY_RESOURCE=...        # resource name from endpoint URL
# ANTHROPIC_FOUNDRY_BASE_URL=...      # optional: override full base URL

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
npx ts-node -r tsconfig-paths/register src/cli.ts run \
  --mode api \
  --jobs j01 \
  --models claude-haiku-4-5 \
  --languages nodejs \
  --runs 1
```

### Full API benchmark
```bash
npx ts-node -r tsconfig-paths/register src/cli.ts run \
  --mode api \
  --models claude-sonnet-4,gpt-4o,gemini-flash-2-0 \
  --jobs all \
  --languages nodejs \
  --runs 3
```

### CLI agent mode
```bash
npx ts-node -r tsconfig-paths/register src/cli.ts run \
  --mode cli \
  --agents claude-code,gemini-cli \
  --jobs j01,j03,j05 \
  --languages nodejs \
  --runs 3
```

### Mixed mode (API + CLI comparison)
```bash
npx ts-node -r tsconfig-paths/register src/cli.ts run \
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
npx ts-node -r tsconfig-paths/register src/cli.ts run \
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
npx ts-node -r tsconfig-paths/register src/cli.ts run \
  --mode both \
  --jobs all \
  --models claude-sonnet-4 \
  --agents claude-code \
  --dry-run
```

### Check available CLI agents
```bash
npx ts-node -r tsconfig-paths/register src/cli.ts check-agents
```

### List all jobs
```bash
npx ts-node -r tsconfig-paths/register src/cli.ts list-jobs
```

### Generate PDF report from results
```bash
npx ts-node -r tsconfig-paths/register src/cli.ts report \
  --input results/benchmark_2026-02-18_1551.csv \
  --output ./results \
  --lang both
```

The `--lang` flag supports `en`, `pt-br`, or `both` (default). Reports include rankings, cost-efficiency analysis, charts, and per-category breakdowns.

---

## API Providers

Five providers are supported, each with a dedicated adapter:

| Provider | Adapter | SDK | Notes |
|---|---|---|---|
| `anthropic` | `anthropic.adapter.ts` | `@anthropic-ai/sdk` | Direct Anthropic API |
| `anthropic-foundry` | `anthropic-foundry.adapter.ts` | `@anthropic-ai/foundry-sdk` | Claude via Azure AI Foundry |
| `openai` | `openai.adapter.ts` | `openai` | Chat Completions API |
| `openai-responses` | `openai-responses.adapter.ts` | `openai` | Responses API (for Codex models) |
| `google` | `google.adapter.ts` | `@google/generative-ai` | Google Generative AI |

Reasoning models (o3, o4-mini) do not support temperature; the OpenAI adapter handles this automatically. Codex models (gpt-5-codex, gpt-5.2-codex) use the Responses API instead of Chat Completions.

---

## The 25 Jobs

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
| `provider` | `anthropic`, `anthropic-foundry`, `openai`, `openai-responses`, `google`, `cli-anthropic`, etc. |
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
     id = 'j26';
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
   import j26 from './j26-my-new-job';
   // ... add to ALL_JOBS array
   ```

3. Optionally add a fixture: `fixtures/nodejs/j26/fixture.js`

**No other file needs to change.**

---

## Adding a New API Model

Add one entry to `config/models.yaml`:
```yaml
- id: my-new-model
  provider: anthropic  # or anthropic-foundry | openai | openai-responses | google
  displayName: "My Model"
  modelId: "actual-api-model-id"
  pricing:
    inputPerMToken: 1.00
    outputPerMToken: 5.00
```

For `anthropic-foundry` models, you can optionally set `foundryResource` per model to override the `ANTHROPIC_FOUNDRY_RESOURCE` env var.

Then use `--models my-new-model` in the CLI.

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
│   ├── base.executor.ts     Executor interface
│   ├── api-executor.ts      Mode A: SDK calls
│   └── cli-executor.ts      Mode B: child_process spawn
│
├── adapters/           SDK wrappers (5 providers)
├── cli-agents/         CLI agent configs (one per binary)
├── jobs/               25 benchmark jobs + registry
├── report/             Report types (analysis, charts, PDF export)
└── utils/              token-estimator, cost-calculator, code-runner, rubric-scorer
```

### Key invariants
- `job.buildPrompt()` returns the **same string** for API and CLI — no conditional logic
- A failed job writes an error row to CSV and **never interrupts** other jobs
- CSV rows are written **one at a time** as jobs complete — no data loss on crash
- Temperature is always 0 for determinism (except reasoning models that don't support it)
- Multi-turn retry accumulates tokens and latency across iterations