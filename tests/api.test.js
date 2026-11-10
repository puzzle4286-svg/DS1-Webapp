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
