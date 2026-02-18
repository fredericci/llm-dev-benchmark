#!/usr/bin/env bash
# =============================================================================
# merge-results.sh — Merge partial benchmark CSVs into one consolidated file
# =============================================================================
#
# Called automatically by docker-bench.sh after all containers finish.
# Can also be run manually to re-merge a previous Docker run.
#
# Usage:
#   bash scripts/merge-results.sh <run-dir> <output-file>
#
# Arguments:
#   <run-dir>      Directory containing combo subdirs with benchmark_*.csv files
#   <output-file>  Path for the merged output CSV
#
# Example:
#   bash scripts/merge-results.sh ./results/docker/run_20250218_143000 \
#                                 ./results/docker/run_20250218_143000/benchmark_merged.csv
# =============================================================================

set -euo pipefail

INPUT_DIR="${1:?Usage: merge-results.sh <run-dir> <output-file>}"
OUTPUT_FILE="${2:?Usage: merge-results.sh <run-dir> <output-file>}"

# Find all partial CSVs (excluding any previously merged file)
mapfile -t CSV_FILES < <(
  find "$INPUT_DIR" -name "benchmark_*.csv" \
    ! -name "benchmark_merged.csv" \
    | sort
)

if [ "${#CSV_FILES[@]}" -eq 0 ]; then
  echo "No CSV files found in $INPUT_DIR" >&2
  exit 1
fi

COUNT="${#CSV_FILES[@]}"
echo "  Found $COUNT partial CSV file(s)"

# Write header from first file
head -1 "${CSV_FILES[0]}" > "$OUTPUT_FILE"

# Append data rows (skip header line) from every file
TOTAL_ROWS=0
for csvfile in "${CSV_FILES[@]}"; do
  ROWS=$(tail -n +2 "$csvfile" | wc -l)
  tail -n +2 "$csvfile" >> "$OUTPUT_FILE"
  TOTAL_ROWS=$((TOTAL_ROWS + ROWS))
  echo "    + $(basename "$(dirname "$csvfile")")/$(basename "$csvfile") ($ROWS rows)"
done

echo "  Merged $TOTAL_ROWS result rows → $OUTPUT_FILE"
