#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "Cleaning $ROOT"
rm -rf node_modules **/node_modules .turbo || true
echo "Cleaned"
