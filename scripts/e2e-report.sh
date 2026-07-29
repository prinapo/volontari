#!/usr/bin/env bash
set -euo pipefail

CONFIG="tests/e2e/playwright.config.js"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE="$SCRIPT_DIR/.."
STATUS_FILE="$WORKSPACE/tests/e2e/test-status.json"
TIMEOUT_PER_TEST="300"

cd "$WORKSPACE"

VERSION=$(node -p "JSON.parse(require('fs').readFileSync('$STATUS_FILE','utf8')).version")
echo "=== E2E Report — $VERSION ==="
echo ""

TOTAL=$(node -p "Object.keys(JSON.parse(require('fs').readFileSync('$STATUS_FILE','utf8')).tests).length")

while true; do
  # Trova il prossimo test non ancora eseguito per questa versione
  NEXT=$(node -e "
const s = JSON.parse(require('fs').readFileSync('$STATUS_FILE','utf8'));
const v = s.version;
for (const [id, t] of Object.entries(s.tests)) {
  const cDone = t.lastRun === v && (t.chromium === 'pass' || t.chromium === 'fail');
  const mDone = t.lastRun === v && (t.mobile === 'pass' || t.mobile === 'fail');
  if (!cDone || !mDone) {
    console.log(JSON.stringify({ id, file: t.file, name: t.name, cDone, mDone }));
    process.exit(0);
  }
}
console.log('DONE');
")

  if [ "$NEXT" = "DONE" ]; then
    echo "✅ Tutti i test passati per $VERSION"
    break
  fi

  ID=$(echo "$NEXT" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).id")
  FILE=$(echo "$NEXT" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).file")
  NAME=$(echo "$NEXT" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).name")
  CDONE=$(echo "$NEXT" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).cDone")
  MDONE=$(echo "$NEXT" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).mDone")

  echo "━━━ $ID: $NAME ━━━"
  echo "  File: $FILE"

  for project in "chromium" "mobile"; do
    # Se già eseguito per questo progetto, salta
    if { [ "$project" = "chromium" ] && [ "$CDONE" = "true" ]; } || \
       { [ "$project" = "mobile" ] && [ "$MDONE" = "true" ]; }; then
      echo "  ⏩ $project — già eseguito"
      continue
    fi

    echo "  ─ $project ─"
    START=$(date +%s)
    LOG="/tmp/e2e-$ID-$project.log"

    if timeout "$TIMEOUT_PER_TEST" npx playwright test "tests/e2e/specs/$FILE" --config "$CONFIG" --project "$project" --grep "$ID:" --reporter=list > "$LOG" 2>&1; then
      DURATION=$(( $(date +%s) - START ))
      echo "  ✅ $project — ${DURATION}s"
      node -e "
const s = JSON.parse(require('fs').readFileSync('$STATUS_FILE','utf8'));
s.tests['$ID'].$project = 'pass';
s.tests['$ID'].lastRun = '$VERSION';
s.tests['$ID'].lastPassed = '$VERSION';
s.updated = new Date().toISOString();
require('fs').writeFileSync('$STATUS_FILE', JSON.stringify(s, null, 2));
"
    else
      RC=$?
      DURATION=$(( $(date +%s) - START ))
      if [ "$RC" -eq 124 ]; then
        echo "  ⏰ $project — TIMEOUT (${TIMEOUT_PER_TEST}s)"
        tail -5 "$LOG" | sed 's/^/    /'
      else
        echo "  ❌ $project — ${DURATION}s"
        tail -15 "$LOG" | sed 's/^/    /'
      fi
      node -e "
const s = JSON.parse(require('fs').readFileSync('$STATUS_FILE','utf8'));
s.tests['$ID'].$project = 'fail';
s.tests['$ID'].lastRun = '$VERSION';
s.updated = new Date().toISOString();
require('fs').writeFileSync('$STATUS_FILE', JSON.stringify(s, null, 2));
"
    fi
  done
  echo ""
done

echo "═══════════════════════════════════"
echo "  Riepilogo finale"
echo "═══════════════════════════════════"
node -e "
const s = JSON.parse(require('fs').readFileSync('$STATUS_FILE','utf8'));
let ok=0,fail=0,unt=0;
for(const t of Object.values(s.tests)){
  if(t.chromium==='pass'&&t.mobile==='pass') ok++;
  else if(t.chromium==='fail'||t.mobile==='fail') fail++;
  if(t.chromium==='untested'||t.mobile==='untested') unt++;
}
console.log('  ✅ Completati: ' + ok + '/' + Object.keys(s.tests).length);
console.log('  ❌ Falliti:    ' + fail);
console.log('  ⬜ Mancano:    ' + Math.ceil(unt/2));
"
