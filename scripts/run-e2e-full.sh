#!/usr/bin/env bash
set -euo pipefail

CONFIG="tests/e2e/playwright.config.js"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COUNTER="$SCRIPT_DIR/counter.mjs"

echo "=== Full E2E Suite ==="
echo ""

TOTAL=$(npx playwright test --config "$CONFIG" --list 2>/dev/null | grep -cP '^\s{2}\[')
echo "Total: $TOTAL tests (chromium + mobile)"
echo ""

set +e
npx playwright test --config "$CONFIG" --reporter=list 2>&1 | node "$COUNTER" "$TOTAL"
RC=$?
set -e

echo ""
echo "Exit code: $RC"
exit $RC
