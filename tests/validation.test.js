// Unit tests for src/validation.js (TESTING.md V1–V5).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateRequest, validateExplanation } = require('../src/validation');

// A valid request. Each test changes one field to check one rule.
function validRequest(changes) {
  return { type: 'replenishment', productId: 1, quantity: 10, reason: '', notes: '', ...changes };
}

test('a valid request has no errors', () => {
  assert.deepEqual(validateRequest(validRequest({})), {});
});

test('V1 quantity: 0, 101, 2.5, "abc" and missing are errors', () => {
  for (const quantity of [0, 101, 2.5, 'abc', undefined]) {
    const errors = validateRequest(validRequest({ quantity }));
    assert.ok(errors.quantity, 'expected an error for quantity ' + quantity);
  }
});

test('V1 quantity: 1 and 100 are ok', () => {
  assert.deepEqual(validateRequest(validRequest({ quantity: 1 })), {});
  assert.deepEqual(validateRequest(validRequest({ quantity: 100 })), {});
});

test('V2 type: "order" and missing are errors', () => {
  assert.ok(validateRequest(validRequest({ type: 'order' })).type);
  assert.ok(validateRequest(validRequest({ type: undefined })).type);
});

test('V2 type: replenishment, usage and return are ok', () => {
  for (const type of ['replenishment', 'usage', 'return']) {
    const errors = validateRequest(validRequest({ type, reason: 'Used in procedure' }));
    assert.deepEqual(errors, {});
  }
});

test('product is required', () => {
  assert.ok(validateRequest(validRequest({ productId: undefined })).productId);
  assert.ok(validateRequest(validRequest({ productId: 0 })).productId);
  assert.ok(validateRequest(validRequest({ productId: 'abc' })).productId);
});

test('V3 reason: usage and return without a reason are errors', () => {
  assert.ok(validateRequest(validRequest({ type: 'usage', reason: '' })).reason);
  assert.ok(validateRequest(validRequest({ type: 'return', reason: '   ' })).reason);
  assert.ok(validateRequest(validRequest({ type: 'return', reason: undefined })).reason);
});

test('V3 reason: replenishment without a reason is ok', () => {
  assert.deepEqual(validateRequest(validRequest({ type: 'replenishment', reason: '' })), {});
});

test('V4 notes: 501 characters is an error, 500 is ok', () => {
  assert.ok(validateRequest(validRequest({ notes: 'a'.repeat(501) })).notes);
  assert.deepEqual(validateRequest(validRequest({ notes: 'a'.repeat(500) })), {});
  assert.deepEqual(validateRequest(validRequest({ notes: undefined })), {});
});

test('V5 explanation: valid reasons have no errors', () => {
  assert.deepEqual(validateExplanation({ reason: 'Damaged' }), {});
  assert.deepEqual(validateExplanation({ reason: 'Other', note: 'Found in room 2' }), {});
  assert.deepEqual(validateExplanation({ reason: 'Damaged', note: 'a'.repeat(300) }), {});
});

test('V5 explanation: missing or unknown reason is an error', () => {
  assert.ok(validateExplanation({}).reason);
  assert.ok(validateExplanation({ reason: 'Lost' }).reason);
});

test('V5 explanation: "Other" without a note is an error', () => {
  assert.ok(validateExplanation({ reason: 'Other' }).note);
  assert.ok(validateExplanation({ reason: 'Other', note: '  ' }).note);
});

test('V5 explanation: note of 301 characters is an error', () => {
  assert.ok(validateExplanation({ reason: 'Damaged', note: 'a'.repeat(301) }).note);
});
