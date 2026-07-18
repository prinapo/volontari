#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 24.14.1
cd /home/ubuntu/volontari
npx playwright test --config tests/e2e/playwright.config.js --project=chromium --project=mobile 2>&1
echo "EXIT: $?"
