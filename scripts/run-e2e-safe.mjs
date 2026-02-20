import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const rootDir = process.cwd();
const playwrightBin = path.join(
  rootDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'playwright.cmd' : 'playwright'
);

function logSkip(reason) {
  console.log(`[test:e2e:smoke] Skipped: ${reason}`);
}

if (!fs.existsSync(playwrightBin)) {
  logSkip('Playwright CLI is not installed in node_modules.');
  process.exit(0);
}

const args = ['test', 'tests/liteedit.spec.js', '--reporter=line'];
const child = spawn(playwrightBin, args, {
  cwd: rootDir,
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe']
});

let combinedOutput = '';

child.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  combinedOutput += text;
  process.stdout.write(text);
});

child.stderr.on('data', (chunk) => {
  const text = chunk.toString();
  combinedOutput += text;
  process.stderr.write(text);
});

child.on('error', (error) => {
  if (error && error.code === 'ENOENT') {
    logSkip('Playwright CLI executable could not be started.');
    process.exit(0);
    return;
  }
  console.error(error);
  process.exit(1);
});

child.on('close', (code) => {
  if (code === 0) {
    process.exit(0);
    return;
  }

  const missingRuntimePattern = /(Executable doesn't exist|Please run[\s\S]*playwright install|browser[\s\S]*not found|Failed to launch browser|no browsers are installed)/i;
  if (missingRuntimePattern.test(combinedOutput)) {
    logSkip('Playwright browsers are not installed in this environment.');
    process.exit(0);
    return;
  }

  process.exit(code || 1);
});
