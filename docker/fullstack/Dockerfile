# ============================================================
# Fullstack Benchmark Docker Image
# Multi-stage build with optimized caching
# ============================================================

# Stage 1: Base with system dependencies
FROM node:20-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates git python3 build-essential \
    # Playwright/Chromium dependencies
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libatspi2.0-0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: CLI Agents
FROM base AS agents

RUN npm install -g @anthropic-ai/claude-code
RUN npm install -g @google/gemini-cli 2>/dev/null || true
RUN npm install -g @openai/codex 2>/dev/null || true

# Stage 3: Playwright + browsers
FROM agents AS playwright

RUN npx playwright install --with-deps chromium

# Stage 4: Project dependencies (cached by package.json)
FROM playwright AS project-deps

WORKDIR /app

# Backend deps
COPY fixtures/fullstack/base-project/backend/package.json \
     fixtures/fullstack/base-project/backend/package-lock.json* \
     /app/base-project/backend/
RUN cd /app/base-project/backend && npm install

# Frontend deps
COPY fixtures/fullstack/base-project/frontend/package.json \
     fixtures/fullstack/base-project/frontend/package-lock.json* \
     /app/base-project/frontend/
RUN cd /app/base-project/frontend && npm install

# E2E deps
COPY fixtures/fullstack/base-project/e2e/package.json \
     fixtures/fullstack/base-project/e2e/package-lock.json* \
     /app/base-project/e2e/
RUN cd /app/base-project/e2e && npm install

# Stage 5: Final image
FROM project-deps AS final

# Copy base project source (node_modules already installed)
COPY fixtures/fullstack/base-project/ /app/base-project/

# Copy and build benchmark code
COPY package.json package-lock.json* /app/bench/
RUN cd /app/bench && npm ci
COPY tsconfig.json /app/bench/
COPY src/ /app/bench/src/
COPY config/ /app/bench/config/
RUN cd /app/bench && npm run build

# Copy Docker scripts
COPY docker/fullstack/scripts/ /app/scripts/
RUN chmod +x /app/scripts/*.sh

RUN mkdir -p /app/results

ENV NODE_ENV=production
ENV RESULTS_DIR=/app/results
ENV BASE_PROJECT_DIR=/app/base-project

WORKDIR /app
ENTRYPOINT ["/app/scripts/entrypoint.sh"]
CMD ["--help"]
