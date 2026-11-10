// Unit tests for src/rules.js (TESTING.md U1–U4).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  stockStatus, expiryTier, daysBetween, suggestedQuantity, canChangeRequest,
} = require('../src/rules');

const TODAY = '2026-11-10';

// Helper: the date N days after TODAY, as 'YYYY-MM-DD'.
function daysFromToday(days) {
  const date = new Date(TODAY + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test('U1 stockStatus: out, below, on, above', () => {
  assert.equal(stockStatus(0, 10), 'out');
  assert.equal(stockStatus(9, 10), 'below');
  assert.equal(stockStatus(10, 10), 'on');
  assert.equal(stockStatus(11.5, 10), 'on'); // exactly 1.15 × recommended is still "on"
  assert.equal(stockStatus(12, 10), 'above');
});

test('U1 stockStatus: 1.15 boundary has no floating-point error', () => {
  // 24 × 1.15 = 27.6, but JavaScript computes 27.599999999999998.
  assert.equal(stockStatus(27.6, 24), 'on');
  assert.equal(stockStatus(28, 24), 'above');
  assert.equal(stockStatus(23, 20), 'on'); // exactly 1.15 × 20
});

test('U2 expiryTier: 90 / 91 / 180 / 181 days and expired', () => {
  assert.equal(expiryTier(daysFromToday(90), TODAY), 'critical');
  assert.equal(expiryTier(daysFromToday(91), TODAY), 'warning');
  assert.equal(expiryTier(daysFromToday(180), TODAY), 'warning');
  assert.equal(expiryTier(daysFromToday(181), TODAY), 'ok');
  assert.equal(expiryTier(daysFromToday(-1), TODAY), 'critical');
  assert.equal(expiryTier(TODAY, TODAY), 'critical');
});

test('daysBetween counts whole days, negative in the past', () => {
  assert.equal(daysBetween('2026-11-10', '2026-11-11'), 1);
  assert.equal(daysBetween('2026-11-10', '2026-11-09'), -1);
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2); // across a daylight-saving change
});

test('U3 suggestedQuantity: fills the gap, never negative', () => {
  assert.equal(suggestedQuantity(14, 24), 10);
  assert.equal(suggestedQuantity(30, 24), 0);
  assert.equal(suggestedQuantity(24, 24), 0);
});

test('U4 canChangeRequest: only while Submitted', () => {
  assert.equal(canChangeRequest('Submitted'), true);
  assert.equal(canChangeRequest('Approved'), false);
  assert.equal(canChangeRequest('Completed'), false);
  assert.equal(canChangeRequest('Rejected'), false);
});
