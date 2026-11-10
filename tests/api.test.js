// API tests (TESTING.md A1–A3). Each test gets a fresh in-memory database,
// so tests never touch data/smartstock.db and don't affect each other.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');

const EMAIL = 'anna@stelisabeth.de';
const PASSWORD = 'demo1234';

// A new app with its own seeded in-memory database.
function createTestApp() {
  return createApp(openDatabase(':memory:'));
}

// A supertest agent that is already signed in (it keeps the session cookie).
async function signedInAgent() {
  const agent = request.agent(createTestApp());
  await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
  return agent;
}

test('A1 login with correct password returns the user, never the password hash', async () => {
  // An agent keeps the session cookie between requests, like a browser.
  const agent = request.agent(createTestApp());

  const login = await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
  assert.equal(login.status, 200);
  assert.equal(login.body.name, 'Anna Keller');
  assert.equal(login.body.password_hash, undefined);

  const me = await agent.get('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.email, EMAIL);
  assert.equal(me.body.password_hash, undefined);
});

test('A2 login with wrong password returns 401', async () => {
  const app = createTestApp();

  const wrongPassword = await request(app).post('/api/auth/login').send({ email: EMAIL, password: 'wrong' });
  assert.equal(wrongPassword.status, 401);
  assert.equal(wrongPassword.body.error, 'Email or password is incorrect.');

  const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'nobody@x.de', password: PASSWORD });
  assert.equal(unknownEmail.status, 401);
});

test('login without email or password returns 400 with field errors', async () => {
  const response = await request(createTestApp()).post('/api/auth/login').send({});
  assert.equal(response.status, 400);
  assert.ok(response.body.fields.email);
  assert.ok(response.body.fields.password);
});

test('A3 /api routes without login return 401', async () => {
  const app = createTestApp();

  const products = await request(app).get('/api/products');
  assert.equal(products.status, 401);
  assert.equal(products.body.error, 'Please sign in.');

  const me = await request(app).get('/api/auth/me');
  assert.equal(me.status, 401);
});

test('logout ends the session', async () => {
  const agent = request.agent(createTestApp());
  await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });

  const logout = await agent.post('/api/auth/logout');
  assert.equal(logout.status, 204);

  const me = await agent.get('/api/auth/me');
  assert.equal(me.status, 401);
});

// ---- Step 4: read APIs ----
const seed = require('../data/seed.json');

test('A4 dashboard KPIs match the seed data', async () => {
  const agent = await signedInAgent();
  const response = await agent.get('/api/dashboard');
  assert.equal(response.status, 200);

  const openInSeed = seed.removals.filter((r) => r.status === 'open').length;
  assert.equal(response.body.openRemovals, openInSeed);

  const unitsInSeed = seed.products.flatMap((p) => p.lots).reduce((sum, lot) => sum + lot[1], 0);
  assert.equal(response.body.unitsInStock, unitsInSeed);

  assert.equal(response.body.nearestExpiry.length, 5);
  assert.equal(response.body.latestRequests.length, 3);
});

test('A5 search "des" only returns products whose name or code contains it', async () => {
  const agent = await signedInAgent();
  const response = await agent.get('/api/products?search=des');
  assert.equal(response.status, 200);
  assert.ok(response.body.length > 0);
  for (const product of response.body) {
    const text = (product.name + ' ' + product.code).toLowerCase();
    assert.ok(text.includes('des'), product.name + ' should match "des"');
  }
});

test('A6 status=below only returns products below the recommendation', async () => {
  const agent = await signedInAgent();
  const response = await agent.get('/api/products?status=below');
  assert.equal(response.status, 200);
  assert.ok(response.body.length > 0);
  for (const product of response.body) {
    assert.equal(product.status, 'below');
  }
});

test('category filter and unknown status', async () => {
  const agent = await signedInAgent();
  const accessories = await agent.get('/api/products?category=Accessories');
  assert.equal(accessories.body.length, 1);
  assert.equal(accessories.body[0].inStock, 0); // product without lots is still listed
  assert.equal(accessories.body[0].status, 'out');

  const unknown = await agent.get('/api/products?status=lots');
  assert.equal(unknown.status, 400);
});

test('A7 unknown product returns 404', async () => {
  const agent = await signedInAgent();
  const response = await agent.get('/api/products/999');
  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Product not found.');
});

test('product detail has lots sorted by expiry and a suggested quantity', async () => {
  const agent = await signedInAgent();
  const response = await agent.get('/api/products/2'); // BeCor DES 3.0 × 18 mm: 14 in stock, 24 recommended
  assert.equal(response.status, 200);
  assert.equal(response.body.inStock, 14);
  assert.equal(response.body.suggested, 10);
  const dates = response.body.lots.map((lot) => lot.expiryDate);
  assert.deepEqual(dates, [...dates].sort());
});

test('A8 marking a lot as "use first" is saved', async () => {
  const agent = await signedInAgent();
  const patch = await agent.patch('/api/lots/1').send({ useFirst: true });
  assert.equal(patch.status, 200);
  assert.equal(patch.body.useFirst, true);

  const product = await agent.get('/api/products/1');
  const lot = product.body.lots.find((l) => l.id === 1);
  assert.equal(lot.useFirst, true);
});

test('PATCH lot: wrong body is 400, unknown lot is 404', async () => {
  const agent = await signedInAgent();
  const badBody = await agent.patch('/api/lots/1').send({ useFirst: 'yes' });
  assert.equal(badBody.status, 400);
  assert.ok(badBody.body.fields.useFirst);

  const unknown = await agent.patch('/api/lots/999').send({ useFirst: true });
  assert.equal(unknown.status, 404);
});

test('A16 removals?status=open only returns open removals', async () => {
  const agent = await signedInAgent();
  const response = await agent.get('/api/removals?status=open');
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 3);
  for (const removal of response.body) {
    assert.equal(removal.status, 'open');
  }
});

// ---- Step 5: requests CRUD + removal explanation ----
// Seed requests: #1 Completed, #2 Approved, #3 and #4 Submitted.
// Seed removals: #1–#3 open, #4 explained.
const APPROVED_REQUEST_ID = 2;
const SUBMITTED_REQUEST_ID = 3;

function newRequest(changes) {
  return { type: 'replenishment', productId: 2, quantity: 10, reason: '', notes: '', ...changes };
}

test('A9 creating a valid request returns 201, status Submitted and an id', async () => {
  const agent = await signedInAgent();
  const response = await agent.post('/api/requests').send(newRequest({ notes: 'For next week' }));
  assert.equal(response.status, 201);
  assert.equal(response.body.status, 'Submitted');
  assert.ok(Number.isInteger(response.body.id));
  assert.equal(response.body.createdBy, 1);

  // The new request is first in the list (newest first).
  const list = await agent.get('/api/requests');
  assert.equal(list.body[0].id, response.body.id);
});

test('A10 quantity 0 returns 400 with fields.quantity and saves nothing', async () => {
  const agent = await signedInAgent();
  const before = await agent.get('/api/requests');

  const response = await agent.post('/api/requests').send(newRequest({ quantity: 0 }));
  assert.equal(response.status, 400);
  assert.ok(response.body.fields.quantity);

  const after = await agent.get('/api/requests');
  assert.equal(after.body.length, before.body.length);
});

test('creating a request for an unknown product returns 400 with fields.productId', async () => {
  const agent = await signedInAgent();
  const response = await agent.post('/api/requests').send(newRequest({ productId: 999 }));
  assert.equal(response.status, 400);
  assert.ok(response.body.fields.productId);
});

test('A11 status=Approved only returns Approved requests', async () => {
  const agent = await signedInAgent();
  const response = await agent.get('/api/requests?status=Approved');
  assert.equal(response.status, 200);
  assert.ok(response.body.length > 0);
  for (const request of response.body) {
    assert.equal(request.status, 'Approved');
  }

  const byType = await agent.get('/api/requests?type=return');
  assert.ok(byType.body.every((r) => r.type === 'return'));

  const unknown = await agent.get('/api/requests?status=Lost');
  assert.equal(unknown.status, 400);
});

test('GET one request: found and not found', async () => {
  const agent = await signedInAgent();
  const found = await agent.get('/api/requests/' + SUBMITTED_REQUEST_ID);
  assert.equal(found.status, 200);
  assert.equal(found.body.id, SUBMITTED_REQUEST_ID);

  const missing = await agent.get('/api/requests/999');
  assert.equal(missing.status, 404);
});

test('A12 editing a Submitted request changes the quantity', async () => {
  const agent = await signedInAgent();
  const response = await agent.put('/api/requests/' + SUBMITTED_REQUEST_ID)
    .send(newRequest({ type: 'return', productId: 7, quantity: 2, reason: 'Overstock' }));
  assert.equal(response.status, 200);
  assert.equal(response.body.quantity, 2);

  const reloaded = await agent.get('/api/requests/' + SUBMITTED_REQUEST_ID);
  assert.equal(reloaded.body.quantity, 2);
});

test('A13 editing an Approved request returns 409', async () => {
  const agent = await signedInAgent();
  const response = await agent.put('/api/requests/' + APPROVED_REQUEST_ID).send(newRequest({}));
  assert.equal(response.status, 409);
  assert.equal(response.body.error, 'This request can no longer be changed.');
});

test('editing: invalid input is 400, unknown id is 404', async () => {
  const agent = await signedInAgent();
  const invalid = await agent.put('/api/requests/' + SUBMITTED_REQUEST_ID).send(newRequest({ quantity: 101 }));
  assert.equal(invalid.status, 400);
  assert.ok(invalid.body.fields.quantity);

  const missing = await agent.put('/api/requests/999').send(newRequest({}));
  assert.equal(missing.status, 404);
});

test('A14 withdrawing a Submitted request returns 204, then it is gone', async () => {
  const agent = await signedInAgent();
  const response = await agent.delete('/api/requests/' + SUBMITTED_REQUEST_ID);
  assert.equal(response.status, 204);

  const reloaded = await agent.get('/api/requests/' + SUBMITTED_REQUEST_ID);
  assert.equal(reloaded.status, 404);
});

test('A15 withdrawing an Approved request returns 409 and it still exists', async () => {
  const agent = await signedInAgent();
  const response = await agent.delete('/api/requests/' + APPROVED_REQUEST_ID);
  assert.equal(response.status, 409);

  const reloaded = await agent.get('/api/requests/' + APPROVED_REQUEST_ID);
  assert.equal(reloaded.status, 200);

  const missing = await agent.delete('/api/requests/999');
  assert.equal(missing.status, 404);
});

test('A17 explaining an open removal returns 200 and status explained', async () => {
  const agent = await signedInAgent();
  const response = await agent.patch('/api/removals/1').send({ reason: 'Other', note: 'Found in room 2' });
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'explained');
  assert.equal(response.body.note, 'Found in room 2');
  assert.ok(response.body.explainedAt);

  const open = await agent.get('/api/removals?status=open');
  assert.equal(open.body.length, 2);
});

test('A18 explaining the same removal again returns 409', async () => {
  const agent = await signedInAgent();
  await agent.patch('/api/removals/1').send({ reason: 'Damaged' });
  const again = await agent.patch('/api/removals/1').send({ reason: 'Damaged' });
  assert.equal(again.status, 409);
});

test('explaining: "Other" without a note is 400, unknown removal is 404', async () => {
  const agent = await signedInAgent();
  const noNote = await agent.patch('/api/removals/1').send({ reason: 'Other' });
  assert.equal(noNote.status, 400);
  assert.ok(noNote.body.fields.note);

  const missing = await agent.patch('/api/removals/999').send({ reason: 'Damaged' });
  assert.equal(missing.status, 404);
});

test('unknown /api route returns JSON 404, broken JSON returns 400', async () => {
  const agent = await signedInAgent();
  const unknown = await agent.get('/api/nothing-here');
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.error, 'Not found.');

  const broken = await agent.post('/api/requests').set('Content-Type', 'application/json').send('{ not json');
  assert.equal(broken.status, 400);
});

test('central error handler returns 500 with a generic message', async (t) => {
  const db = openDatabase(':memory:');
  const app = createApp(db);
  db.close(); // every query now throws, like a broken database
  t.mock.method(console, 'error', () => {}); // keep the test output clean

  const response = await request(app).post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
  assert.equal(response.status, 500);
  assert.equal(response.body.error, 'Something went wrong on the server. Please try again.');
  assert.equal(console.error.mock.callCount(), 1); // the real error was logged
});
