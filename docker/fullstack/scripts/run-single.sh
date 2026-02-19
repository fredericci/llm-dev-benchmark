#!/bin/bash
# Usage: bash docker/fullstack/scripts/run-single.sh [JOBS] [AGENTS]
# Examples:
#   npm run docker:fullstack -- j28                          # j28, all 3 agents
#   npm run docker:fullstack -- j26 claude-code              # j26, claude only
#   npm run docker:fullstack -- j26,j27,j28                  # 3 jobs, all agents
#   npm run docker:fullstack -- j28 claude-code,codex-cli    # j28, 2 agents
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

JOBS="${1:-j28}"
AGENTS="${2:-claude-code,codex-cli,gemini-cli}"
IMAGE="llm-fullstack-bench"
ENV_FILE="${PROJECT_ROOT}/.env"
RESULTS_DIR="${PROJECT_ROOT}/results/fullstack"

# Validate .env
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env not found. Copy .env.example to .env and configure."
  exit 1
fi

# Build image if it doesn't exist
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "Building Docker image (first run)..."
  docker build -f "$SCRIPT_DIR/../Dockerfile" -t "$IMAGE" "$PROJECT_ROOT"
fi

# Mount GCP credentials if they exist
GCP_MOUNT=""
if [ -d "${HOME}/.config/gcloud" ]; then
  GCP_MOUNT="-v ${HOME}/.config/gcloud:/root/.config/gcloud:ro"
fi

mkdir -p "$RESULTS_DIR"

echo "=== Fullstack Benchmark ==="
echo "Jobs:   $JOBS"
echo "Agents: $AGENTS"
echo ""

IFS=',' read -ra AGENT_LIST <<< "$AGENTS"

for agent in "${AGENT_LIST[@]}"; do
  echo "────────────────────────────────────────"
  echo "Running: $JOBS x $agent"
  echo "────────────────────────────────────────"

  # Source .env in a subshell to extract Claude Code Vertex vars without polluting script env
  _CLAUDE_CODE_USE_VERTEX="$(grep '^CLAUDE_CODE_USE_VERTEX=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)"
  _ANTHROPIC_VERTEX_PROJECT_ID="$(grep '^ANTHROPIC_VERTEX_PROJECT_ID=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)"
  _ANTHROPIC_MODEL="$(grep '^ANTHROPIC_MODEL=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)"
  _CLAUDE_MODEL="$(grep '^CLAUDE_MODEL=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)"

  docker run --rm \
    --env-file "$ENV_FILE" \
    -e CLI_AGENT_TIMEOUT_MS=300000 \
    ${_CLAUDE_CODE_USE_VERTEX:+-e CLAUDE_CODE_USE_VERTEX="$_CLAUDE_CODE_USE_VERTEX"} \
    ${_ANTHROPIC_VERTEX_PROJECT_ID:+-e ANTHROPIC_VERTEX_PROJECT_ID="$_ANTHROPIC_VERTEX_PROJECT_ID"} \
    ${_ANTHROPIC_MODEL:+-e ANTHROPIC_MODEL="$_ANTHROPIC_MODEL"} \
    ${_CLAUDE_MODEL:+-e CLAUDE_MODEL="$_CLAUDE_MODEL"} \
    -v "${RESULTS_DIR}:/app/results" \
    $GCP_MOUNT \
    "$IMAGE" \
    node /app/bench/dist/cli.js run \
      --mode cli --agents "$agent" \
      --jobs "$JOBS" --runs 1 \
      --concurrent 1 --max-iterations 3 \
      --output /app/results

  echo ""
done

echo "=== Done ==="
echo "Results: $RESULTS_DIR"
