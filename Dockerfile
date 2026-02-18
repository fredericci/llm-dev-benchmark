# ─── LLM Dev Bench — Docker image ────────────────────────────────────────────
#
# Bundles the benchmark runner with CLI agents (claude, gemini, codex).
# Used by scripts/docker-bench.sh for parallel job execution.
#
# Build:
#   docker build -t llm-dev-bench .
#
# Run a single combo (example):
#   docker run --rm --env-file .env \
#     -v $(pwd)/results/partial:/app/results \
#     llm-dev-bench run --mode cli --agents claude-code --jobs j01 --runs 1
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-slim

# System deps for CLI tools and test runners
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Install CLI agents globally ───────────────────────────────────────────────
# Claude Code CLI (provides 'claude' binary)
RUN npm install -g @anthropic-ai/claude-code

# Gemini CLI (provides 'gemini' binary)
# Install only if the package is available; skip otherwise
RUN npm install -g @google/gemini-cli 2>/dev/null || echo "gemini-cli not installed (optional)"

# OpenAI Codex CLI (provides 'codex' binary)
RUN npm install -g @openai/codex 2>/dev/null || echo "codex-cli not installed (optional)"

# ── Install benchmark dependencies ────────────────────────────────────────────
COPY package.json package-lock.json* ./
RUN npm ci

# ── Copy project files ────────────────────────────────────────────────────────
COPY tsconfig.json ./
COPY src/    ./src/
COPY config/ ./config/
COPY fixtures/ ./fixtures/
COPY scripts/  ./scripts/

# ── Build TypeScript ─────────────────────────────────────────────────────────
RUN npm run build

# ── Install fixture test dependencies (Jest etc.) ────────────────────────────
RUN bash scripts/setup-fixtures.sh || true

# Results directory (will be overridden by host volume mount)
RUN mkdir -p /app/results

ENTRYPOINT ["node", "dist/cli.js"]
CMD ["--help"]
