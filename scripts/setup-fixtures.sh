#!/usr/bin/env bash
# scripts/setup-fixtures.sh
# Install dependencies in all fixture test directories.
# Supports Node.js (npm), Java (Maven), and .NET Core (dotnet restore).
# Run this once after cloning before executing any benchmark.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Installing fixture test dependencies..."
echo ""

# ── Node.js fixtures (Jest) ──────────────────────────────────────────────────
echo "=== Node.js fixtures ==="
NODE_DIRS=$(find "$REPO_ROOT/fixtures" -name "package.json" -not -path "*/node_modules/*" -printf "%h\n" 2>/dev/null || true)
for dir in $NODE_DIRS; do
  echo "  → $dir"
  (cd "$dir" && npm install --silent 2>&1) || echo "    WARNING: npm install failed in $dir"
done

# ── Java fixtures (Maven) ───────────────────────────────────────────────────
if command -v mvn &>/dev/null; then
  echo ""
  echo "=== Java fixtures ==="
  MAVEN_DIRS=$(find "$REPO_ROOT/fixtures/java" -name "pom.xml" -printf "%h\n" 2>/dev/null || true)
  for dir in $MAVEN_DIRS; do
    echo "  → $dir"
    (cd "$dir" && mvn dependency:resolve -q -B 2>&1) || echo "    WARNING: mvn dependency:resolve failed in $dir"
  done
else
  echo ""
  echo "=== Java fixtures: SKIPPED (mvn not found) ==="
fi

# ── .NET Core fixtures (dotnet) ──────────────────────────────────────────────
if command -v dotnet &>/dev/null; then
  echo ""
  echo "=== .NET Core fixtures ==="
  DOTNET_DIRS=$(find "$REPO_ROOT/fixtures/dotnet" -name "*.csproj" -printf "%h\n" 2>/dev/null || true)
  for dir in $DOTNET_DIRS; do
    echo "  → $dir"
    (cd "$dir" && dotnet restore -q 2>&1) || echo "    WARNING: dotnet restore failed in $dir"
  done
else
  echo ""
  echo "=== .NET Core fixtures: SKIPPED (dotnet not found) ==="
fi

echo ""
echo "Done. All available fixture test environments are ready."
