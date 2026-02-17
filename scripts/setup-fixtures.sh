#!/usr/bin/env bash
# scripts/setup-fixtures.sh
# Install dependencies in all fixture test directories so Jest can run.
# Run this once after cloning before executing any benchmark.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_DIRS=$(find "$REPO_ROOT/fixtures" -name "package.json" -not -path "*/node_modules/*" -printf "%h\n")

echo "Installing fixture test dependencies..."
echo ""

for dir in $TEST_DIRS; do
  echo "  → $dir"
  (cd "$dir" && npm install --silent 2>&1) || echo "    WARNING: npm install failed in $dir"
done

echo ""
echo "Done. All fixture test environments are ready."
