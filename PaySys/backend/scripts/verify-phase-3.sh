#!/usr/bin/env bash
set -euo pipefail
ROOT=$(dirname "$0")/..
ROOT=$(cd "$ROOT" && pwd)
echo "Verifying Phase 3 structure in $ROOT"
MISSING=0
check(){
  if [ ! -e "$ROOT/$1" ]; then
    echo "MISSING: $1"
    MISSING=$((MISSING+1))
  else
    echo "OK: $1"
  fi
}
check "build.gradle"
check "settings.gradle"
check "src/main/java/com/payments/backend/BackendApplication.java"
check "src/main/java/com/payments/backend/startup/StartupCoordinator.java"
check "src/main/java/com/payments/backend/module/Module.java"
check "docs/PHASE_3_REPORT.md"
if [ $MISSING -ne 0 ]; then
  echo "FAIL: $MISSING missing files"
  exit 2
fi
echo "PASS: Phase 3 basic structure present"
