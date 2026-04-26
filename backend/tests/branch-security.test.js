const test = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5005/api';
const BRANCH_A_TOKEN = process.env.BRANCH_A_TOKEN || '';
const BRANCH_B_TOKEN = process.env.BRANCH_B_TOKEN || '';
const FOREIGN_BRANCH_ID = process.env.FOREIGN_BRANCH_ID || '';

const FOREIGN_CLIENT_ID = process.env.FOREIGN_CLIENT_ID || '';
const FOREIGN_APPOINTMENT_ID = process.env.FOREIGN_APPOINTMENT_ID || '';
const FOREIGN_INVOICE_ID = process.env.FOREIGN_INVOICE_ID || '';
const FOREIGN_EXPENSE_ID = process.env.FOREIGN_EXPENSE_ID || '';

const FOREIGN_MEMBERSHIP_ID = process.env.FOREIGN_MEMBERSHIP_ID || '';
const FOREIGN_SERVICE_ID = process.env.FOREIGN_SERVICE_ID || '';
const FOREIGN_PLAN_ID = process.env.FOREIGN_PLAN_ID || '';

const BULK_ENDPOINT = process.env.BULK_ENDPOINT || '/appointments';
const BULK_MIXED_PAYLOAD = process.env.BULK_MIXED_PAYLOAD || '';

const TAMPERED_BRANCH_TOKEN = process.env.TAMPERED_BRANCH_TOKEN || '';

const hasBranchAFixture = Boolean(BRANCH_A_TOKEN && FOREIGN_BRANCH_ID);
const hasBranchBFixture = Boolean(BRANCH_B_TOKEN);

const requestJson = async ({ token, method = 'GET', path, body }) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
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

const unwrapList = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
};

const toId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};

const assertNoForeignBranchRows = (rows, foreignBranchId) => {
  for (const row of rows) {
    const rowBranchId = toId(row.branch);
    assert.notEqual(
      rowBranchId,
      foreignBranchId,
      `Expected no row from foreign branch ${foreignBranchId}, but got ${rowBranchId}`
    );
  }
};

const optionalSnapshot = async ({ token, endpoint, id }) => {
  const res = await requestJson({ token, method: 'GET', path: `${endpoint}/${id}` });
  if (res.status !== 200) return null;
  return res.payload;
};

test('GET list endpoints ignore/deny cross-branch filters', { skip: !hasBranchAFixture }, async () => {
  const checks = [
    { path: `/expenses?branch=${FOREIGN_BRANCH_ID}` },
    { path: `/inventory?branch=${FOREIGN_BRANCH_ID}` }
  ];

  if (FOREIGN_CLIENT_ID) {
    checks.push({ path: `/appointments?clientId=${FOREIGN_CLIENT_ID}` });
  }

  for (const check of checks) {
    const res = await requestJson({ token: BRANCH_A_TOKEN, path: check.path });
    assert.equal(res.status, 200, `Expected 200 for ${check.path}, got ${res.status}`);
    const rows = unwrapList(res.payload);
    assertNoForeignBranchRows(rows, FOREIGN_BRANCH_ID);
  }
});

test('GET by id forbids cross-branch resources', { skip: !hasBranchAFixture }, async () => {
  const checks = [];
  if (FOREIGN_INVOICE_ID) checks.push({ path: `/invoices/${FOREIGN_INVOICE_ID}`, allow404: false });
  if (FOREIGN_APPOINTMENT_ID) checks.push({ path: `/appointments/${FOREIGN_APPOINTMENT_ID}`, allow404: true });

  for (const check of checks) {
    const path = check.path;
    const res = await requestJson({ token: BRANCH_A_TOKEN, path });
    if (check.allow404) {
      assert.ok(
        res.status === 403 || res.status === 404,
        `Expected 403/404 for ${path}, got ${res.status}`
      );
    } else {
      assert.equal(res.status, 403, `Expected 403 for ${path}, got ${res.status}`);
    }
  }
});

test('PATCH/PUT forbids cross-branch updates and preserves target data', { skip: !(hasBranchAFixture && hasBranchBFixture) }, async () => {
  if (FOREIGN_EXPENSE_ID) {
    const before = await optionalSnapshot({ token: BRANCH_B_TOKEN, endpoint: '/expenses', id: FOREIGN_EXPENSE_ID });
    const attempt = await requestJson({
      token: BRANCH_A_TOKEN,
      method: 'PATCH',
      path: `/expenses/${FOREIGN_EXPENSE_ID}`,
      body: { title: 'Unauthorized edit attempt' }
    });
    assert.equal(attempt.status, 403, `Expected 403 for cross-branch expense patch, got ${attempt.status}`);
    const after = await optionalSnapshot({ token: BRANCH_B_TOKEN, endpoint: '/expenses', id: FOREIGN_EXPENSE_ID });
    if (before && after) {
      assert.equal(after.title, before.title, 'Expense title changed despite forbidden request');
    }
  }

  if (FOREIGN_APPOINTMENT_ID) {
    const before = await optionalSnapshot({ token: BRANCH_B_TOKEN, endpoint: '/appointments', id: FOREIGN_APPOINTMENT_ID });
    const attempt = await requestJson({
      token: BRANCH_A_TOKEN,
      method: 'PUT',
      path: `/appointments/${FOREIGN_APPOINTMENT_ID}`,
      body: { status: 'Cancelled', cancellationReason: 'Unauthorized edit attempt' }
    });
    assert.equal(attempt.status, 403, `Expected 403 for cross-branch appointment put, got ${attempt.status}`);
    const after = await optionalSnapshot({ token: BRANCH_B_TOKEN, endpoint: '/appointments', id: FOREIGN_APPOINTMENT_ID });
    if (before && after) {
      assert.equal(after.status, before.status, 'Appointment status changed despite forbidden request');
    }
  }
});

test('DELETE forbids cross-branch delete and target remains retrievable', { skip: !(hasBranchAFixture && hasBranchBFixture && FOREIGN_APPOINTMENT_ID) }, async () => {
  const attempt = await requestJson({
    token: BRANCH_A_TOKEN,
    method: 'DELETE',
    path: `/appointments/${FOREIGN_APPOINTMENT_ID}`
  });
  assert.equal(attempt.status, 403, `Expected 403 for cross-branch appointment delete, got ${attempt.status}`);

  const verify = await requestJson({ token: BRANCH_B_TOKEN, path: '/appointments?limit=200' });
  assert.equal(verify.status, 200, `Expected appointments list fetch to succeed; got ${verify.status}`);
  const rows = unwrapList(verify.payload);
  assert.ok(
    rows.some((row) => String(row._id) === FOREIGN_APPOINTMENT_ID),
    'Expected appointment to remain after forbidden delete'
  );
});

test('POST forbids creating records in foreign branch', { skip: !hasBranchAFixture }, async () => {
  const today = new Date().toISOString().slice(0, 10);

  const expenseRes = await requestJson({
    token: BRANCH_A_TOKEN,
    method: 'POST',
    path: '/expenses',
    body: {
      title: 'Cross branch forbidden test',
      category: 'Ops',
      amount: 999,
      date: today,
      branch: FOREIGN_BRANCH_ID
    }
  });
  assert.equal(expenseRes.status, 403, `Expected 403 for cross-branch expense create, got ${expenseRes.status}`);

  if (FOREIGN_CLIENT_ID && FOREIGN_PLAN_ID) {
    const enrollRes = await requestJson({
      token: BRANCH_A_TOKEN,
      method: 'POST',
      path: '/memberships/enroll',
      body: {
        clientId: FOREIGN_CLIENT_ID,
        planId: FOREIGN_PLAN_ID,
        branchId: FOREIGN_BRANCH_ID,
        startDate: today
      }
    });
    assert.equal(enrollRes.status, 403, `Expected 403 for cross-branch membership enroll, got ${enrollRes.status}`);
  }
});

test('Bulk-style mixed payloads are rejected and do not mutate foreign branch data', { skip: !(hasBranchAFixture && hasBranchBFixture && FOREIGN_APPOINTMENT_ID) }, async () => {
  const today = new Date().toISOString().slice(0, 10);
  let payload = [
    {
      client: 'Bulk Fixture A',
      service: 'Bulk Service A',
      employee: 'Bulk Employee A',
      date: today,
      time: '10:00',
      branch: 'same-branch-placeholder'
    },
    {
      client: 'Bulk Fixture B',
      service: 'Bulk Service B',
      employee: 'Bulk Employee B',
      date: today,
      time: '11:00',
      branch: FOREIGN_BRANCH_ID
    }
  ];

  if (BULK_MIXED_PAYLOAD) {
    try {
      payload = JSON.parse(BULK_MIXED_PAYLOAD);
    } catch (err) {
      assert.fail(`BULK_MIXED_PAYLOAD is not valid JSON: ${err.message}`);
    }
  }

  const before = await requestJson({ token: BRANCH_B_TOKEN, path: '/appointments?limit=200' });
  assert.equal(before.status, 200, `Precheck failed: expected 200, got ${before.status}`);

  const res = await requestJson({
    token: BRANCH_A_TOKEN,
    method: 'POST',
    path: BULK_ENDPOINT,
    body: payload
  });

  assert.ok(
    res.status === 400 || res.status === 403 || res.status === 422,
    `Expected 400/403/422 for mixed-branch bulk payload, got ${res.status}`
  );

  const after = await requestJson({ token: BRANCH_B_TOKEN, path: '/appointments?limit=200' });
  assert.equal(after.status, 200, `Postcheck failed: expected 200, got ${after.status}`);
  const rows = unwrapList(after.payload);
  assert.ok(
    rows.some((row) => String(row._id) === FOREIGN_APPOINTMENT_ID),
    'Expected foreign branch appointment to remain unchanged after bulk-style attempt'
  );
});

test('Tampered token with wrong branch claim cannot access foreign branch', { skip: !(TAMPERED_BRANCH_TOKEN && FOREIGN_INVOICE_ID) }, async () => {
  const res = await requestJson({
    token: TAMPERED_BRANCH_TOKEN,
    path: `/invoices/${FOREIGN_INVOICE_ID}`
  });

  assert.ok(
    res.status === 401 || res.status === 403,
    `Expected 401/403 for tampered token access, got ${res.status}`
  );
});

test('Redeem endpoint forbids cross-branch membership use', { skip: !(hasBranchAFixture && FOREIGN_MEMBERSHIP_ID && FOREIGN_SERVICE_ID) }, async () => {
  const res = await requestJson({
    token: BRANCH_A_TOKEN,
    method: 'POST',
    path: `/memberships/${FOREIGN_MEMBERSHIP_ID}/redeem`,
    body: {
      serviceId: FOREIGN_SERVICE_ID,
      notes: 'Cross branch unauthorized redeem attempt'
    }
  });

  assert.equal(res.status, 403, `Expected 403 for cross-branch membership redeem, got ${res.status}`);
});
