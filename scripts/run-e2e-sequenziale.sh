#!/usr/bin/env bash
set -euo pipefail

CONFIG="tests/e2e/playwright.config.js"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

TIMEOUT_PER_FILE="300"
PROJECTS=("chromium" "mobile")
SPEC_DIR="tests/e2e/specs"
PASSED=0
FAILED=0
FAILED_FILES=""

echo "=== E2E Sequenziale ==="
echo "Timeout per file: ${TIMEOUT_PER_FILE}s"
echo "Progetti: ${PROJECTS[*]}"
echo ""

# Usa filtri passati come argomenti, oppure tutti i file
if [ $# -gt 0 ]; then
  SPEC_FILES=()
  for pattern in "$@"; do
    # pattern può essere un nome file (con o senza .spec.js) o un percorso
    if [[ "$pattern" =~ \.spec\.js$ ]]; then
      f="$SPEC_DIR/$pattern"
    else
      f="$SPEC_DIR/$pattern.spec.js"
    fi
    if [ -f "$f" ]; then
      SPEC_FILES+=("$f")
    else
      echo "  ⚠ File non trovato: $f"
    fi
  done
else
  mapfile -t SPEC_FILES < <(ls "$SPEC_DIR"/*.spec.js 2>/dev/null | sort)
fi

TOTAL_FILES=${#SPEC_FILES[@]}
TOTAL_RUN=$((TOTAL_FILES * ${#PROJECTS[@]}))
echo "File da eseguire: $TOTAL_FILES (${TOTAL_RUN} esecuzioni totali)"
echo ""

for spec in "${SPEC_FILES[@]}"; do
  NAME=$(basename "$spec")
  echo "━━━ $NAME ━━━"

  for project in "${PROJECTS[@]}"; do
    echo "  ─ $project ─"
    START=$(date +%s)
    LOG="/tmp/e2e-$(echo "$NAME" | sed 's/\.spec\.js$//')-$project.log"

    if timeout "$TIMEOUT_PER_FILE" npx playwright test "$spec" --config "$CONFIG" --project "$project" --reporter=list > "$LOG" 2>&1; then
      DURATION=$(( $(date +%s) - START ))
      echo "  ✅ $project — ${DURATION}s"
    else
      RC=$?
      DURATION=$(( $(date +%s) - START ))
      if [ "$RC" -eq 124 ]; then
        echo "  ⏰ $project — TIMEOUT (${TIMEOUT_PER_FILE}s, durata effettiva ${DURATION}s)"
        echo "  Ultime righe del log:"
        tail -5 "$LOG" | sed 's/^/    /'
        FAILED_FILES="$FAILED_FILES\n  - $NAME ($project) — TIMEOUT"
      else
        echo "  ❌ $project — ${DURATION}s"
        echo "  Ultime righe del log:"
        tail -10 "$LOG" | sed 's/^/    /'
        FAILED_FILES="$FAILED_FILES\n  - $NAME ($project) — FALLITO"
      fi
      FAILED=$((FAILED + 1))
    fi

    PASSED=$((PASSED + 1))
  done
  echo ""
done

echo "═══════════════════════════════════"
echo "  Riepilogo finale"
echo "═══════════════════════════════════"
echo "  File specifiche:  $TOTAL_FILES"
echo "  Esecuzioni totali: $TOTAL_RUN"
echo "  Passati:           $PASSED"
echo "  Fallimenti:        $FAILED"
if [ -n "$FAILED_FILES" ]; then
  echo -e "  Dettaglio fallimenti:$FAILED_FILES"
fi
echo ""

exit $FAILED
