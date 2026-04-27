const test = require('node:test');
const assert = require('node:assert/strict');

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5005/api';
const MANAGER_TOKEN = process.env.MANAGER_TOKEN || '';
const CLIENT_TOKEN = process.env.CLIENT_TOKEN || '';
const FOREIGN_BRANCH_ID = process.env.FOREIGN_BRANCH_ID || '';
const EXPIRED_MANAGER_TOKEN = process.env.EXPIRED_MANAGER_TOKEN || '';
const TAMPERED_MANAGER_TOKEN = process.env.TAMPERED_MANAGER_TOKEN || '';

const hasManager = Boolean(MANAGER_TOKEN);
const hasClient = Boolean(CLIENT_TOKEN);
const hasForeignBranch = Boolean(FOREIGN_BRANCH_ID);

const requestJson = async ({ token, method = 'GET', path, body }) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch (_err) {
    payload = null;
  }

  return { status: res.status, payload };
};

test('protected endpoint denies missing token', async () => {
  const res = await requestJson({ path: '/clients' });
  assert.equal(res.status, 401, `Expected 401 without token, got ${res.status}`);
});

test('protected endpoint denies malformed token', async () => {
  const res = await requestJson({ token: 'not-a-jwt', path: '/clients' });
  assert.equal(res.status, 401, `Expected 401 for malformed token, got ${res.status}`);
});

test('protected endpoint denies expired token', { skip: !EXPIRED_MANAGER_TOKEN }, async () => {
  const res = await requestJson({ token: EXPIRED_MANAGER_TOKEN, path: '/clients' });
  assert.equal(res.status, 401, `Expected 401 for expired token, got ${res.status}`);
});

test('protected endpoint denies tampered-signature token', { skip: !TAMPERED_MANAGER_TOKEN }, async () => {
  const res = await requestJson({ token: TAMPERED_MANAGER_TOKEN, path: '/clients' });
  assert.equal(res.status, 401, `Expected 401 for tampered token, got ${res.status}`);
});

test('client role cannot create expenses or invoices', { skip: !hasClient }, async () => {
  const today = new Date().toISOString().slice(0, 10);

  const expense = await requestJson({
    token: CLIENT_TOKEN,
    method: 'POST',
    path: '/expenses',
    body: { title: 'Forbidden', category: 'Misc', amount: 10, date: today }
  });
  assert.equal(expense.status, 403, `Expected 403 for client expense creation, got ${expense.status}`);

  const invoice = await requestJson({
    token: CLIENT_TOKEN,
    method: 'POST',
    path: '/invoices',
    body: {
      invoiceNumber: `AUTHSEC-${Date.now()}`,
      clientName: 'Forbidden Client',
      items: [],
      subtotal: 0,
      gst: 0,
      total: 0,
      paymentMode: 'Cash',
      date: today
    }
  });
  assert.equal(invoice.status, 403, `Expected 403 for client invoice creation, got ${invoice.status}`);
});

test('client role cannot access protected admin/config resources', { skip: !hasClient }, async () => {
  const settings = await requestJson({ token: CLIENT_TOKEN, path: '/settings' });
  assert.equal(settings.status, 403, `Expected 403 for client settings access, got ${settings.status}`);

  const roles = await requestJson({ token: CLIENT_TOKEN, path: '/roles' });
  assert.equal(roles.status, 403, `Expected 403 for client roles access, got ${roles.status}`);

  const inventory = await requestJson({ token: CLIENT_TOKEN, path: '/inventory' });
  assert.equal(inventory.status, 403, `Expected 403 for client inventory access, got ${inventory.status}`);
});

test('manager cannot write resources into foreign branch', { skip: !(hasManager && hasForeignBranch) }, async () => {
  const today = new Date().toISOString().slice(0, 10);

  const expense = await requestJson({
    token: MANAGER_TOKEN,
    method: 'POST',
    path: '/expenses',
    body: {
      title: 'Cross branch deny',
      category: 'Misc',
      amount: 10,
      date: today,
      branch: FOREIGN_BRANCH_ID
    }
  });
  assert.equal(expense.status, 403, `Expected 403 for manager cross-branch expense create, got ${expense.status}`);

  const invoice = await requestJson({
    token: MANAGER_TOKEN,
    method: 'POST',
    path: '/invoices',
    body: {
      invoiceNumber: `AUTHSEC-FB-${Date.now()}`,
      clientName: 'Cross Branch',
      items: [],
      subtotal: 0,
      gst: 0,
      total: 0,
      paymentMode: 'Cash',
      date: today,
      branch: FOREIGN_BRANCH_ID
    }
  });
  assert.equal(invoice.status, 403, `Expected 403 for manager cross-branch invoice create, got ${invoice.status}`);
});

test('NoSQL-style login payload does not crash server', async () => {
  const res = await requestJson({
    method: 'POST',
    path: '/users/login',
    body: {
      email: { $ne: null },
      password: { $ne: null }
    }
  });

  assert.ok(
    res.status === 400 || res.status === 401 || res.status === 429,
    `Expected 400/401/429 for malformed login payload, got ${res.status}`
  );
});

test('suspicious query patterns on protected list do not cause server error', { skip: !hasManager }, async () => {
  const res = await requestJson({
    token: MANAGER_TOKEN,
    path: '/appointments?status[$ne]=Cancelled&clientId[$ne]=x'
  });

  assert.ok(
    res.status === 200 || res.status === 403,
    `Expected safe response (200/403), got ${res.status}`
  );
});
