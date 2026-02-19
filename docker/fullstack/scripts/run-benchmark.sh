#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

AGENTS="${1:-claude-code}"
JOBS="${2:-j26,j27,j28,j29,j30,j31}"
RUNS="${3:-1}"
PARALLEL="${4:-3}"
IMAGE="llm-fullstack-bench"
ENV_FILE="${PROJECT_ROOT}/.env"
RESULTS_DIR="${PROJECT_ROOT}/results/fullstack"
RUN_DIR="${RESULTS_DIR}/run_$(date +%Y%m%d_%H%M%S)"

# Validate .env
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env file not found at $ENV_FILE"
  echo "Copy .env.example to .env and fill in your API keys."
  exit 1
fi

echo "=== Fullstack Benchmark ==="
echo "Agents: $AGENTS"
echo "Jobs: $JOBS"
echo "Runs: $RUNS"
echo "Parallel: $PARALLEL"
echo "Results: $RUN_DIR"
echo ""

mkdir -p "$RUN_DIR"

# Build image
echo "Building Docker image..."
docker build -f "$SCRIPT_DIR/../Dockerfile" -t "$IMAGE" "$PROJECT_ROOT"

# Launch containers
IFS=',' read -ra AGENT_LIST <<< "$AGENTS"
IFS=',' read -ra JOB_LIST <<< "$JOBS"

PIDS=()
RUNNING=0

for agent in "${AGENT_LIST[@]}"; do
  for job in "${JOB_LIST[@]}"; do
    COMBO_DIR="${RUN_DIR}/${job}_${agent}"
    mkdir -p "$COMBO_DIR"

    # Throttle: wait if at parallel limit
    while [ "$RUNNING" -ge "$PARALLEL" ]; do
      wait -n 2>/dev/null || true
      RUNNING=$((RUNNING - 1))
    done

    echo "Launching: $job x $agent"
    docker run --rm \
      --env-file "$ENV_FILE" \
      -e CLI_AGENT_TIMEOUT_MS=300000 \
      -v "${COMBO_DIR}:/app/results" \
      "$IMAGE" \
      node /app/bench/dist/cli.js run \
        --mode cli --agents "$agent" \
        --jobs "$job" --runs "$RUNS" \
        --concurrent 1 --max-iterations 3 \
        --output /app/results \
      > "${COMBO_DIR}/container.log" 2>&1 &

    PIDS+=($!)
    RUNNING=$((RUNNING + 1))
  done
done

# Wait for all
echo ""
echo "Waiting for ${#PIDS[@]} containers to finish..."
for pid in "${PIDS[@]}"; do
  wait "$pid" 2>/dev/null || true
done

# Merge results
echo "Merging results..."
MERGED="${RUN_DIR}/benchmark_merged.csv"
FIRST=true
for csv in $(find "$RUN_DIR" -name "benchmark_*.csv" ! -name "benchmark_merged.csv" 2>/dev/null); do
  if $FIRST; then
    cp "$csv" "$MERGED"
    FIRST=false
  else
    tail -n +2 "$csv" >> "$MERGED"
  fi
done

echo ""
echo "=== Results ==="
if [ -f "$MERGED" ]; then
  echo "Merged CSV: $MERGED"
else
  echo "No results found."
fi
echo "Run directory: $RUN_DIR"
