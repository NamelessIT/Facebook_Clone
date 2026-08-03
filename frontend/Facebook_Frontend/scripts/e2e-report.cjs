const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const REPORTS_DIR = path.resolve(__dirname, '..', 'playwright-reports');
const LATEST_FILE = path.join(REPORTS_DIR, 'latest.txt');

const findLatestReport = () => {
  if (fs.existsSync(LATEST_FILE)) {
    const reportPath = fs.readFileSync(LATEST_FILE, 'utf8').trim();
    if (reportPath && fs.existsSync(reportPath)) return reportPath;
  }

  if (!fs.existsSync(REPORTS_DIR)) return null;

  const reports = fs.readdirSync(REPORTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('report-'))
    .map((entry) => {
      const fullPath = path.join(REPORTS_DIR, entry.name);
      return { fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return reports[0]?.fullPath ?? null;
};

const reportDir = findLatestReport();
if (!reportDir) {
  console.error('No Playwright report found. Run npm run test:e2e first.');
  process.exit(1);
}

const bin = process.execPath;
const result = spawnSync(bin, [
  path.resolve(__dirname, '..', 'node_modules', '@playwright', 'test', 'cli.js'),
  'show-report',
  reportDir,
], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  console.error(`Failed to open Playwright report: ${result.error.message}`);
}

process.exit(result.status ?? 1);
