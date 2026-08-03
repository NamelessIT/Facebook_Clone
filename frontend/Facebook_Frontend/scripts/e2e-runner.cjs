const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const REPORTS_DIR = path.resolve(__dirname, '..', 'playwright-reports');
const LATEST_FILE = path.join(REPORTS_DIR, 'latest.txt');
const MAX_REPORTS = Number(process.env.E2E_MAX_REPORTS || 10);

const pad = (value) => String(value).padStart(2, '0');

const buildReportName = () => {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
  ].join('-');
  return `report-${stamp}`;
};

const listReportDirs = () => {
  if (!fs.existsSync(REPORTS_DIR)) return [];

  return fs.readdirSync(REPORTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('report-'))
    .map((entry) => {
      const fullPath = path.join(REPORTS_DIR, entry.name);
      return { fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
};

const pruneReports = () => {
  const staleReports = listReportDirs().slice(MAX_REPORTS);
  for (const report of staleReports) {
    fs.rmSync(report.fullPath, { recursive: true, force: true });
  }
};

fs.mkdirSync(REPORTS_DIR, { recursive: true });
pruneReports();

const reportDir = path.join(REPORTS_DIR, buildReportName());
const bin = process.execPath;
const args = [
  path.resolve(__dirname, '..', 'node_modules', '@playwright', 'test', 'cli.js'),
  'test',
  ...process.argv.slice(2),
];
const env = {
  ...process.env,
  PLAYWRIGHT_REPORT_DIR: reportDir,
};

const result = spawnSync(bin, args, {
  cwd: path.resolve(__dirname, '..'),
  env,
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  console.error(`Failed to start Playwright: ${result.error.message}`);
}

if (fs.existsSync(reportDir)) {
  fs.writeFileSync(LATEST_FILE, reportDir, 'utf8');
}

pruneReports();

process.exit(result.status ?? 1);
