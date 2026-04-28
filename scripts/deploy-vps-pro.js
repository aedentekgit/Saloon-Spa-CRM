#!/usr/bin/env node

const { spawnSync } = require('child_process');

const TARGETS = {
  staging: {
    remoteRoot: '/staginger/apps/staging_saloon_spa_crm',
    pm2Name: 'saloon-spa-crm-staging-api',
    healthUrl: 'http://127.0.0.1:5006/api/health',
    publicHealthUrl: 'https://saloonandspacrm.aedentek.com/staging_saloon_spa_crm/api/health',
    reloadNginx: false,
    frontendBuildCmd: 'npm run build -- --base=/staging_saloon_spa_crm/',
  },
  production: {
    remoteRoot: '/staginger/apps/live_saloon_spa_crm',
    pm2Name: 'saloon-spa-crm-live-api',
    healthUrl: 'http://127.0.0.1:5005/api/health',
    publicHealthUrl: 'https://saloonandspacrm.aedentek.com/api/health',
    reloadNginx: true,
    frontendBuildCmd: 'npm run build',
  },
};

function usage(exitCode = 0) {
  console.log(
    [
      'Usage:',
      '  node scripts/deploy-vps-pro.js <staging|production> [--dry-run]',
      '',
      'Required env vars:',
      '  VPS_PASS   SSH password for VPS root user',
      '',
      'Optional env vars:',
      '  VPS_HOST   Default: 194.238.23.158',
      '  VPS_USER   Default: root',
      '',
      'Examples:',
      "  VPS_PASS='***' node scripts/deploy-vps-pro.js staging",
      "  VPS_PASS='***' node scripts/deploy-vps-pro.js production",
    ].join('\n')
  );
  process.exit(exitCode);
}

function run(cmd, args, label, opts = {}) {
  console.log(`\n# ${label}`);
  console.log(`$ ${cmd} ${args.join(' ')}`);
  if (opts.dryRun) return;

  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: process.env,
  });

  if (res.status !== 0) {
    process.exit(res.status || 1);
  }
}

function ensureBinary(bin) {
  const res = spawnSync('which', [bin], { stdio: 'ignore' });
  if (res.status !== 0) {
    console.error(`Missing required command: ${bin}`);
    process.exit(1);
  }
}

const targetArg = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!targetArg || targetArg === '--help' || targetArg === '-h') {
  usage(0);
}

const targetKey = targetArg === 'live' ? 'production' : targetArg;
const target = TARGETS[targetKey];

if (!target) {
  console.error(`Invalid target: ${targetArg}`);
  usage(1);
}

const host = process.env.VPS_HOST || '194.238.23.158';
const user = process.env.VPS_USER || 'root';
const pass = process.env.VPS_PASS;

if (!pass) {
  console.error('Missing VPS_PASS environment variable.');
  usage(1);
}

ensureBinary('sshpass');
ensureBinary('rsync');

const sshTransport = `sshpass -p ${pass} ssh -o StrictHostKeyChecking=no`;
const sshTarget = `${user}@${host}`;

run(
  'rsync',
  [
    '-az',
    '--delete',
    '--exclude',
    '.env',
    '--exclude',
    'node_modules',
    '--exclude',
    'uploads',
    '--exclude',
    '.git',
    '--exclude',
    '.DS_Store',
    '-e',
    sshTransport,
    './backend/',
    `${sshTarget}:${target.remoteRoot}/backend/`,
  ],
  `Sync backend to ${targetKey}`,
  { dryRun }
);

run(
  'rsync',
  [
    '-az',
    '--delete',
    '--exclude',
    '.env',
    '--exclude',
    'node_modules',
    '--exclude',
    'dist',
    '--exclude',
    '.git',
    '--exclude',
    '.DS_Store',
    '-e',
    sshTransport,
    './frontend/',
    `${sshTarget}:${target.remoteRoot}/frontend/`,
  ],
  `Sync frontend to ${targetKey}`,
  { dryRun }
);

const remoteSteps = [
  'set -e',
  `test -f ${target.remoteRoot}/backend/.env`,
  `mkdir -p ${target.remoteRoot}/backend/uploads`,
  `cd ${target.remoteRoot}/backend && npm install --omit=dev`,
  `cd ${target.remoteRoot}/backend && CHECK_ENV_STRICT=true node scripts/check-env-security.js`,
  `cd ${target.remoteRoot}/frontend && npm install && ${target.frontendBuildCmd}`,
  `pm2 restart ${target.pm2Name}`,
  'pm2 save',
  `curl -fsS ${target.healthUrl}`,
  `curl -fsS ${target.publicHealthUrl}`,
];

if (target.reloadNginx) {
  remoteSteps.splice(5, 0, 'nginx -t && systemctl reload nginx');
}

run(
  'sshpass',
  ['-p', pass, 'ssh', '-o', 'StrictHostKeyChecking=no', sshTarget, remoteSteps.join('; ')],
  `Install, build, restart ${target.pm2Name}`,
  { dryRun }
);

console.log(`\nDeployment complete for ${targetKey}.`);
