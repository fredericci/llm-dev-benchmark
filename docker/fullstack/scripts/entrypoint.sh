#!/bin/bash
set -e

echo "=== Fullstack Benchmark Container ==="

# ─── Setup Claude Code settings if env vars are provided ───
# Users configure Claude Code via environment variables.
# If CLAUDE_CODE_USE_VERTEX=1, the entrypoint creates the settings.json automatically.
CLAUDE_SETTINGS_DIR="${HOME}/.claude"
if [ -n "$CLAUDE_CODE_USE_VERTEX" ]; then
  mkdir -p "$CLAUDE_SETTINGS_DIR"
  cat > "$CLAUDE_SETTINGS_DIR/settings.json" <<SETTINGS_EOF
{
  "env": {
    "CLAUDE_CODE_USE_VERTEX": "${CLAUDE_CODE_USE_VERTEX}",
    "CLOUD_ML_REGION": "${CLOUD_ML_REGION:-global}",
    "ANTHROPIC_VERTEX_PROJECT_ID": "${ANTHROPIC_VERTEX_PROJECT_ID}",
    "ANTHROPIC_MODEL": "${ANTHROPIC_MODEL:-claude-sonnet-4-20250514}"
  },
  "model": "${CLAUDE_MODEL:-claude-sonnet-4-20250514}",
  "alwaysThinkingEnabled": true
}
SETTINGS_EOF
  echo "Claude Code: Vertex AI mode (project: ${ANTHROPIC_VERTEX_PROJECT_ID}, region: ${CLOUD_ML_REGION:-global})"
fi

# ─── Check GCP credentials ────────────────────────────────
if [ -f "/root/.config/gcloud/application_default_credentials.json" ]; then
  echo "GCP credentials: OK (mounted)"
elif [ -n "$GOOGLE_APPLICATION_CREDENTIALS" ] && [ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo "GCP credentials: OK (via GOOGLE_APPLICATION_CREDENTIALS)"
else
  echo "WARNING: GCP credentials not found. Mount via -v ~/.config/gcloud:/root/.config/gcloud"
fi

# ─── Validate API keys ────────────────────────────────────
MISSING_KEYS=()
if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$CLAUDE_CODE_USE_VERTEX" ]; then
  MISSING_KEYS+=("ANTHROPIC_API_KEY (or use Vertex AI)")
fi
if [ -z "$OPENAI_API_KEY" ]; then MISSING_KEYS+=("OPENAI_API_KEY"); fi
if [ -z "$GOOGLE_API_KEY" ]; then MISSING_KEYS+=("GOOGLE_API_KEY"); fi

if [ ${#MISSING_KEYS[@]} -gt 0 ]; then
  echo "WARNING: Missing: ${MISSING_KEYS[*]}"
  echo "Some agents may not work. Pass keys via --env-file .env or -e KEY=VALUE"
fi

# ─── Check CLI agents ─────────────────────────────────────
echo "Checking CLI agents..."
claude --version 2>/dev/null && echo "  Claude Code: OK" || echo "  Claude Code: NOT FOUND"
codex --version 2>/dev/null && echo "  Codex CLI: OK" || echo "  Codex CLI: NOT FOUND"
gemini --version 2>/dev/null && echo "  Gemini CLI: OK" || echo "  Gemini CLI: NOT FOUND"
echo ""

exec "$@"
