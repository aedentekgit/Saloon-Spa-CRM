#!/usr/bin/env node
require('dotenv').config();
const isProd = process.env.NODE_ENV === 'production';
const jwtSecret = String(process.env.JWT_SECRET || '');

const checks = [
  {
    name: 'JWT_SECRET',
    valid: jwtSecret.length >= 32 && jwtSecret !== 'your_super_secret_key_123',
    message: 'JWT_SECRET must be >=32 chars and not a default placeholder.'
  }
];

const failed = checks.filter((c) => !c.valid);

if (failed.length > 0) {
  const label = isProd ? 'Error' : 'Warning';
  console.error(`${label}: insecure environment configuration detected.`);
  failed.forEach((f) => console.error(`- ${f.name}: ${f.message}`));
  if (isProd) process.exit(1);
}

console.log('Environment security checks completed.');
