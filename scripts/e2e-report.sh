#!/usr/bin/env bash
set -euo pipefail

CONFIG="tests/e2e/playwright.config.js"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE="$SCRIPT_DIR/.."
STATUS_FILE="$WORKSPACE/tests/e2e/test-status.json"
TIMEOUT_PER_FILE="300"

cd "$WORKSPACE"

VERSION=$(node -p "JSON.parse(require('fs').readFileSync('$STATUS_FILE','utf8')).version")
echo "=== E2E Report — $VERSION ==="
echo ""

# Trova i file con almeno un test non ancora pass per questa versione
FILES_JSON=$(node -p "
const s = JSON.parse(require('fs').readFileSync('$STATUS_FILE','utf8'));
const version = s.version;
const fileMap = {};
for (const [id, t] of Object.entries(s.tests)) {
  const skip = t.lastRun === version && t.chromium === 'pass' && t.mobile === 'pass';
  if (!skip) {
    if (!fileMap[t.file]) fileMap[t.file] = [];
    fileMap[t.file].push(id);
  }
}
JSON.stringify(fileMap)
")

TOTAL_FILES=$(echo "$FILES_JSON" | node -p "Object.keys(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))).length")
echo "File con test da eseguire: $TOTAL_FILES"
echo ""

mapfile -t FILE_NAMES < <(echo "$FILES_JSON" | node -p "Object.keys(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))).join('\n')")

PASSED=0
FAILED=0
FILE_OK=0
FILE_KO=0

for FILE in "${FILE_NAMES[@]}"; do
  TEST_IDS=$(echo "$FILES_JSON" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))['$FILE'].join(' ')")

  echo "━━━ $FILE ━━━"
  echo "  Test: $TEST_IDS"

  FILE_RESULT="ok"

  for project in "chromium" "mobile"; do
    # Salta se tutti i test del file sono già pass per questo progetto in questa versione
    ALL_PASS=$(node -e "
const s = JSON.parse(require('fs').readFileSync('$STATUS_FILE','utf8'));
const ids = '$TEST_IDS'.split(' ');
const allPass = ids.every(id => s.tests[id].lastRun === '$VERSION' && s.tests[id].$project === 'pass');
process.stdout.write(allPass ? 'yes' : 'no');
")

    if [ "$ALL_PASS" = "yes" ]; then
      echo "  ⏩ $project — già passato"
      continue
    fi

    echo "  ─ $project ─"
    START=$(date +%s)
    LOG="/tmp/e2e-$(echo "$FILE" | sed 's/\.spec\.js$//')-$project.log"

    if timeout "$TIMEOUT_PER_FILE" npx playwright test "tests/e2e/specs/$FILE" --config "$CONFIG" --project "$project" --reporter=list > "$LOG" 2>&1; then
      DURATION=$(( $(date +%s) - START ))
      echo "  ✅ $project — ${DURATION}s"

      # Aggiorna tutti i test del file come pass
      node -e "
const s = JSON.parse(require('fs').readFileSync('$STATUS_FILE','utf8'));
const ids = '$TEST_IDS'.split(' ');
ids.forEach(id => {
  s.tests[id].$project = 'pass';
  s.tests[id].lastRun = '$VERSION';
  s.tests[id].lastPassed = '$VERSION';
});
s.updated = new Date().toISOString();
require('fs').writeFileSync('$STATUS_FILE', JSON.stringify(s, null, 2));
"
      PASSED=$((PASSED + 1))
    else
      RC=$?
      DURATION=$(( $(date +%s) - START ))
      FILE_RESULT="ko"

      if [ "$RC" -eq 124 ]; then
        echo "  ⏰ $project — TIMEOUT (${TIMEOUT_PER_FILE}s)"
        tail -5 "$LOG" | sed 's/^/    /'
      else
        echo "  ❌ $project — ${DURATION}s"
        tail -15 "$LOG" | sed 's/^/    /'
      fi

      # Segna come fail SOLO i test che effettivamente hanno fallito
      # (Playwright --reporter=list mostra ✓/×)
      node -e "
const s = JSON.parse(require('fs').readFileSync('$STATUS_FILE','utf8'));
const ids = '$TEST_IDS'.split(' ');
const fs = require('fs');
const log = fs.readFileSync('$LOG', 'utf8');
ids.forEach(id => {
  const passInLog = new RegExp('✓\\\\s+' + id).test(log);
  s.tests[id].$project = passInLog ? 'pass' : 'fail';
  s.tests[id].lastRun = '$VERSION';
  if (passInLog) s.tests[id].lastPassed = '$VERSION';
});
s.updated = new Date().toISOString();
require('fs').writeFileSync('$STATUS_FILE', JSON.stringify(s, null, 2));
"
      FAILED=$((FAILED + 1))
    fi
  done

  if [ "$FILE_RESULT" = "ok" ]; then
    FILE_OK=$((FILE_OK + 1))
  else
    FILE_KO=$((FILE_KO + 1))
  fi
  echo ""
done

echo "═══════════════════════════════════"
echo "  Riepilogo"
echo "═══════════════════════════════════"
echo "  File OK:   $FILE_OK"
echo "  File KO:   $FILE_KO"

node -e "
const s = JSON.parse(require('fs').readFileSync('$STATUS_FILE','utf8'));
let ok = 0, ko = 0, unt = 0;
for (const t of Object.values(s.tests)) {
  if (t.chromium === 'pass' || t.mobile === 'pass') ok++;
  if (t.chromium === 'fail' || t.mobile === 'fail') ko++;
  if (t.chromium === 'untested' && t.mobile === 'untested') unt++;
}
console.log('Test:');
console.log('  ✅ Pass:    ' + ok);
console.log('  ❌ Fail:    ' + ko);
console.log('  ⬜ Mancano: ' + unt);
"

exit $FILE_KO
