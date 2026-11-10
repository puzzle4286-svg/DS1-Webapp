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
