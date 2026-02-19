#!/bin/bash
set -e

echo "=== Fullstack Benchmark Container ==="

# Validate API keys
MISSING_KEYS=()
if [ -z "$ANTHROPIC_API_KEY" ]; then MISSING_KEYS+=("ANTHROPIC_API_KEY"); fi
if [ -z "$OPENAI_API_KEY" ]; then MISSING_KEYS+=("OPENAI_API_KEY"); fi
if [ -z "$GOOGLE_API_KEY" ]; then MISSING_KEYS+=("GOOGLE_API_KEY"); fi

if [ ${#MISSING_KEYS[@]} -gt 0 ]; then
  echo "WARNING: Missing API keys: ${MISSING_KEYS[*]}"
  echo "Some agents may not work. Pass keys via --env-file .env or -e KEY=VALUE"
fi

# Check CLI agents
echo "Checking CLI agents..."
claude --version 2>/dev/null && echo "  Claude Code: OK" || echo "  Claude Code: NOT FOUND"
codex --version 2>/dev/null && echo "  Codex CLI: OK" || echo "  Codex CLI: NOT FOUND"
gemini --version 2>/dev/null && echo "  Gemini CLI: OK" || echo "  Gemini CLI: NOT FOUND"
echo ""

exec "$@"
