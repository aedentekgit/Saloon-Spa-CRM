#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const allowedModeratePackages = new Set([
  'firebase-admin',
  '@google-cloud/firestore',
  '@google-cloud/storage',
  'google-gax',
  'gaxios',
  'retry-request',
  'teeny-request',
  'uuid'
]);

const run = spawnSync('npm', ['audit', '--json'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  encoding: 'utf8'
});

if (!run.stdout) {
  console.error('Audit policy check failed: npm audit returned no JSON output.');
  if (run.stderr) console.error(run.stderr.trim());
  process.exit(1);
}

let report;
try {
  report = JSON.parse(run.stdout);
} catch (error) {
  console.error('Audit policy check failed: unable to parse npm audit JSON.');
  console.error(error.message);
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities || {};
const blocked = [];
const unapprovedModerate = [];

for (const [name, details] of Object.entries(vulnerabilities)) {
  const severity = details?.severity || 'unknown';
  if (severity === 'high' || severity === 'critical') {
    blocked.push({ name, severity });
    continue;
  }

  if (severity === 'moderate' && !allowedModeratePackages.has(name)) {
    unapprovedModerate.push({ name, severity });
  }
}

if (blocked.length > 0 || unapprovedModerate.length > 0) {
  if (blocked.length > 0) {
    console.error('Blocked vulnerabilities found (high/critical):');
    blocked.forEach((v) => console.error(`- ${v.name} (${v.severity})`));
  }

  if (unapprovedModerate.length > 0) {
    console.error('Unapproved moderate vulnerabilities found:');
    unapprovedModerate.forEach((v) => console.error(`- ${v.name} (${v.severity})`));
  }

  process.exit(1);
}

const counts = report.metadata?.vulnerabilities || {};
console.log(
  `Audit policy passed. totals: low=${counts.low || 0}, moderate=${counts.moderate || 0}, high=${counts.high || 0}, critical=${counts.critical || 0}`
);
