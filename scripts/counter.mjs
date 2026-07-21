#!/usr/bin/env node
let n = 0;
let passed = 0;
let failed = 0;
const total = process.argv[2] || '?';
let buf = '';

process.stdin.on('data', chunk => {
  buf += chunk.toString();
  const lines = buf.split('\n');
  buf = lines.pop() || '';
  for (const line of lines) {
    if (/^\s{2}\S\s+\d+\s+\[/.test(line)) {
      n++;
      if (/^\s{2}[✓]/.test(line)) passed++;
      else failed++;
      process.stdout.write(`[${n}/${total}] ${line.trimStart()}\n`);
    } else {
      process.stdout.write(`${line}\n`);
    }
  }
});

process.stdin.on('end', () => {
  if (buf.trim()) {
    const line = buf.trim();
    if (/^\s{2}\S\s+\d+\s+\[/.test(line)) {
      n++;
      if (/^\s{2}[✓]/.test(line)) passed++;
      else failed++;
      process.stdout.write(`[${n}/${total}] ${line.trimStart()}\n`);
    } else {
      process.stdout.write(`${buf}\n`);
    }
  }
  process.stdout.write('\n');
  process.stdout.write('=== Riassunto ===\n');
  process.stdout.write(`Total: ${total} | Passed: ${passed} | Failed: ${failed}\n`);
});
