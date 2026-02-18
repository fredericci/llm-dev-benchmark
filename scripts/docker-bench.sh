#!/usr/bin/env bash
# =============================================================================
# docker-bench.sh — Parallel Docker benchmark orchestrator
# =============================================================================
#
# Spins up one Docker container per (job × agent) combination, runs them in
# parallel (respecting --parallel), collects partial CSV files from each
# container, then merges everything into a single final CSV.
#
# Usage:
#   bash scripts/docker-bench.sh [OPTIONS]
#
# Options:
#   --agents   <ids>    Comma-separated agent IDs (default: claude-code)
#   --jobs     <ids>    Comma-separated job IDs or "all" (default: all)
#   --runs     <n>      Runs per job (default: 1)
#   --languages <langs> Comma-separated languages (default: nodejs)
#   --parallel  <n>     Max containers running at once (default: 5)
#   --output    <dir>   Host directory for results (default: ./results/docker)
#   --image     <name>  Docker image name (default: llm-dev-bench)
#   --env-file  <file>  Env file to pass to containers (default: .env)
#   --build             Build the Docker image before running
#   --dry-run           Print what would run without launching containers
#
# Examples:
#   # Run all 20 jobs with claude-code, 20 containers in parallel
#   bash scripts/docker-bench.sh --agents claude-code --jobs all --parallel 20
#
#   # Run 3 jobs with all agents, 2 containers at a time
#   bash scripts/docker-bench.sh --agents claude-code,gemini-cli,codex-cli \
#     --jobs j01,j03,j05 --parallel 6 --runs 3
#
#   # Build image first, then run
#   bash scripts/docker-bench.sh --build --agents claude-code --jobs all
# =============================================================================

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
AGENTS="claude-code"
JOBS="all"
RUNS="1"
LANGUAGES="nodejs"
PARALLEL="5"
OUTPUT="./results/docker"
IMAGE="llm-dev-bench"
ENV_FILE=".env"
BUILD=false
DRY_RUN=false

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --agents)    AGENTS="$2";    shift 2 ;;
    --jobs)      JOBS="$2";      shift 2 ;;
    --runs)      RUNS="$2";      shift 2 ;;
    --languages) LANGUAGES="$2"; shift 2 ;;
    --parallel)  PARALLEL="$2";  shift 2 ;;
    --output)    OUTPUT="$2";    shift 2 ;;
    --image)     IMAGE="$2";     shift 2 ;;
    --env-file)  ENV_FILE="$2";  shift 2 ;;
    --build)     BUILD=true;     shift   ;;
    --dry-run)   DRY_RUN=true;   shift   ;;
    -h|--help)
      sed -n '3,30p' "$0" | sed 's/^# //' | sed 's/^#//'
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────────────────────
log()  { echo "$(date '+%H:%M:%S') $*"; }
info() { echo "  $*"; }

# ── Build image if requested ──────────────────────────────────────────────────
if $BUILD; then
  log "Building Docker image: $IMAGE ..."
  docker build -t "$IMAGE" .
  log "Image built."
fi

# Verify image exists
if ! docker image inspect "$IMAGE" &>/dev/null; then
  echo "Docker image '$IMAGE' not found. Run with --build or: docker build -t $IMAGE ." >&2
  exit 1
fi

# Verify env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "Warning: env file '$ENV_FILE' not found — containers will run without API keys" >&2
fi

# ── Resolve job list ──────────────────────────────────────────────────────────
# Try to get the list from the running image via list-jobs command
resolve_jobs() {
  if [ "$JOBS" = "all" ]; then
    # Run list-jobs inside the image to get the canonical job list
    docker run --rm "$IMAGE" list-jobs 2>/dev/null \
      | grep -E '^\s+j[0-9]+' \
      | awk '{print $1}' \
      | tr '\n' ' '
  else
    echo "$JOBS" | tr ',' ' '
  fi
}

log "Resolving job list..."
JOBS_RESOLVED=$(resolve_jobs)
if [ -z "$JOBS_RESOLVED" ]; then
  echo "Failed to resolve job list." >&2
  exit 1
fi

# Convert agents to space-separated list
AGENTS_LIST=$(echo "$AGENTS" | tr ',' ' ')

# ── Build combo list (job × agent) ───────────────────────────────────────────
declare -a COMBOS=()
for job in $JOBS_RESOLVED; do
  for agent in $AGENTS_LIST; do
    COMBOS+=("${job}::${agent}")
  done
done

TOTAL=${#COMBOS[@]}
if [ "$TOTAL" -eq 0 ]; then
  echo "No combos to run." >&2
  exit 1
fi

# ── Create run output directory ───────────────────────────────────────────────
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
RUN_DIR="${OUTPUT}/run_${TIMESTAMP}"
mkdir -p "$RUN_DIR"

# ── Print header ──────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           LLM Dev Bench — Docker Parallel Runner            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
info "Image:             $IMAGE"
info "Agents:            $AGENTS"
info "Jobs:              $(echo "$JOBS_RESOLVED" | wc -w | tr -d ' ') job(s)"
info "Runs per combo:    $RUNS"
info "Max parallel:      $PARALLEL containers"
info "Total containers:  $TOTAL"
info "Output dir:        $RUN_DIR"
echo ""

if $DRY_RUN; then
  echo "── Dry run — containers that would launch ──────────────────────"
  for combo in "${COMBOS[@]}"; do
    JOB="${combo%%::*}"
    AGENT="${combo##*::}"
    info "docker run $IMAGE run --mode cli --agents $AGENT --jobs $JOB --runs $RUNS"
  done
  echo ""
  echo "Total: $TOTAL containers"
  exit 0
fi

# ── Launch containers in parallel ────────────────────────────────────────────
declare -a RUNNING_PIDS=()
declare -a RUNNING_NAMES=()
SUCCEEDED=0
FAILED=0

# Cleanup on interrupt
cleanup() {
  echo ""
  log "Interrupted — killing running containers..."
  for pid in "${RUNNING_PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  exit 130
}
trap cleanup INT TERM

# Launch a single container and write exit code to file
launch_container() {
  local job="$1"
  local agent="$2"
  local combo_dir="$3"

  local env_args=()
  if [ -f "$ENV_FILE" ]; then
    env_args=(--env-file "$ENV_FILE")
  fi

  docker run \
    --rm \
    "${env_args[@]}" \
    -v "$(realpath "$combo_dir"):/app/results" \
    "$IMAGE" \
    run \
    --mode cli \
    --agents "$agent" \
    --jobs "$job" \
    --runs "$RUNS" \
    --languages "$LANGUAGES" \
    --output /app/results \
    > "${combo_dir}/container.log" 2>&1

  echo $? > "${combo_dir}/exit_code"
}

wait_one() {
  # Wait for first PID in queue and report result
  local pid="${RUNNING_PIDS[0]}"
  local name="${RUNNING_NAMES[0]}"
  wait "$pid" 2>/dev/null || true

  local combo_dir="${RUN_DIR}/${name}"
  local exit_code
  exit_code=$(cat "${combo_dir}/exit_code" 2>/dev/null || echo "1")

  if [ "$exit_code" = "0" ]; then
    log "[DONE   ] $name"
    SUCCEEDED=$((SUCCEEDED + 1))
  else
    log "[FAILED ] $name (see ${combo_dir}/container.log)"
    FAILED=$((FAILED + 1))
  fi

  # Remove first element from arrays
  RUNNING_PIDS=("${RUNNING_PIDS[@]:1}")
  RUNNING_NAMES=("${RUNNING_NAMES[@]:1}")
}

log "Launching $TOTAL containers (max $PARALLEL in parallel)..."
echo ""

for combo in "${COMBOS[@]}"; do
  JOB="${combo%%::*}"
  AGENT="${combo##*::}"
  COMBO_NAME="${JOB}_${AGENT}"
  COMBO_DIR="${RUN_DIR}/${COMBO_NAME}"

  mkdir -p "$COMBO_DIR"

  # Launch container in background
  launch_container "$JOB" "$AGENT" "$COMBO_DIR" &
  LAUNCH_PID=$!

  RUNNING_PIDS+=("$LAUNCH_PID")
  RUNNING_NAMES+=("$COMBO_NAME")

  log "[STARTED] $COMBO_NAME (pid $LAUNCH_PID, ${#RUNNING_PIDS[@]}/$PARALLEL active)"

  # Throttle: wait for one slot to free up when at capacity
  if [ "${#RUNNING_PIDS[@]}" -ge "$PARALLEL" ]; then
    wait_one
  fi
done

# ── Wait for remaining containers ─────────────────────────────────────────────
log "Waiting for ${#RUNNING_PIDS[@]} remaining container(s)..."
while [ "${#RUNNING_PIDS[@]}" -gt 0 ]; do
  wait_one
done

echo ""
log "All containers finished — succeeded: $SUCCEEDED, failed: $FAILED"
echo ""

# ── Merge results ─────────────────────────────────────────────────────────────
MERGED_FILE="${RUN_DIR}/benchmark_merged.csv"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log "Merging CSV results..."
bash "${SCRIPT_DIR}/merge-results.sh" "$RUN_DIR" "$MERGED_FILE"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
printf  "║  %-60s║\n" "Run complete"
printf  "║  %-60s║\n" "Results:  $MERGED_FILE"
printf  "║  %-60s║\n" "Combos:   $TOTAL  (succeeded: $SUCCEEDED, failed: $FAILED)"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Exit with error if any container failed
[ "$FAILED" -eq 0 ] || exit 1
