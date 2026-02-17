# llm-dev-bench

A benchmark that measures the **cost-efficiency of LLMs on real software development tasks**.

Supports two interchangeable execution modes producing identical CSV output:

| Mode | How it works | Token counts |
|------|-------------|--------------|
| **API Direct** | Calls models via SDKs (`@anthropic-ai/sdk`, `openai`, `@google/generative-ai`) | Exact (from API response) |
| **CLI Agent** | Invokes local binaries (`claude`, `gemini`, `codex`) via `child_process` | Estimated (character/4) or exact if agent provides metadata |

Both modes use **the exact same prompt** per job. Zero transformation between modes — guaranteeing full comparability.

---

## Installation

```bash
git clone <repo>
cd llm-dev-benchmark
npm install
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
JUDGE_MODEL_ID=claude-haiku-4-5-20251001
```

The `JUDGE_MODEL_ID` is used for rubric-based evaluation (requires Anthropic API).

---

## Running the Benchmark

### Quick validation (1 job, 1 model, 1 run)
```bash
npx ts-node -r tsconfig-paths/register src/cli.ts run \
  --mode api \
  --jobs j01 \
  --models claude-haiku-3-5 \
  --languages nodejs \
  --runs 1
```

### Full API benchmark
```bash
npx ts-node -r tsconfig-paths/register src/cli.ts run \
  --mode api \
  --models claude-sonnet-4,gpt-4o,gemini-flash-2 \
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

---

## The 20 Jobs

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
| `provider` | `anthropic`, `openai`, `google`, `cli-anthropic`, etc. |
| `model_id` | Technical model ID |
| `model_display_name` | Human-readable model name |
| `run_number` | 1-based run index |
| `input_tokens` | Prompt tokens (exact or estimated) |
| `output_tokens` | Completion tokens (exact or estimated) |
| `total_tokens` | Sum of input + output |
| `tokens_source` | `exact` (API) or `estimated` (CLI heuristic) |
| `cost_usd` | Calculated cost |
| `latency_ms` | End-to-end wall time |
| `turns` | Conversation rounds (always 1 for single-turn jobs) |
| `passed` | `true` \| `false` |
| `quality_score` | 0–5 |
| `quality_notes` | Evaluation details |
| `error_message` | Empty if no error |
| `raw_prompt_chars` | Character count of the prompt sent |
| `raw_response_chars` | Character count of the response received |

> **Important:** When comparing API vs CLI modes, always group or filter by `tokens_source`. Estimated token counts have ~20% error margin.

---

## Adding a New Job

1. Create `src/jobs/jNN-name/index.ts` implementing the `Job` interface:
   ```typescript
   import { Job, JobInput, Language } from '../base.job';

   export class MyNewJob implements Job {
     id = 'j21';
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
   import j21 from './j21-my-new-job';
   // ... add to ALL_JOBS array
   ```

3. Optionally add a fixture: `fixtures/nodejs/j21/fixture.js`

**No other file needs to change.**

---

## Adding a New API Model

Add one entry to `config/models.yaml`:
```yaml
- id: my-new-model
  provider: anthropic  # or openai | google
  displayName: "My Model"
  modelId: "actual-api-model-id"
  pricing:
    inputPerMToken: 1.00
    outputPerMToken: 5.00
```

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
├── adapters/           SDK wrappers (one per provider)
├── cli-agents/         CLI agent configs (one per binary)
├── jobs/               20 benchmark jobs + registry
└── utils/              token-estimator, cost-calculator, code-runner, rubric-scorer
```

### Key invariants
- `job.buildPrompt()` returns the **same string** for API and CLI — no conditional logic
- A failed job writes an error row to CSV and **never interrupts** other jobs
- CSV rows are written **one at a time** as jobs complete — no data loss on crash
