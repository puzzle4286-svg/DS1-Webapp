// Input validation (README "Validation"). The server is the source of truth.
// Each validator returns an object of field errors, e.g. { quantity: '...' }.
// An empty object {} means the input is valid.

const REQUEST_TYPES = ['replenishment', 'usage', 'return'];
const TYPES_THAT_NEED_A_REASON = ['usage', 'return'];
const REMOVAL_REASONS = ['Used in procedure', 'Damaged', 'Moved to other room', 'Other'];

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 100;
const MAX_NOTES_LENGTH = 500;
const MAX_NOTE_LENGTH = 300;

// FR-06, FR-08: check a new or edited request.
// Whether productId exists in the database is checked in the route (it needs the db).
function validateRequest(input) {
  const errors = {};

  if (!REQUEST_TYPES.includes(input.type)) {
    errors.type = 'Choose a request type.';
  }

  if (!Number.isInteger(input.productId) || input.productId < 1) {
    errors.productId = 'Choose a product.';
  }

  if (!isWholeNumberInRange(input.quantity, MIN_QUANTITY, MAX_QUANTITY)) {
    errors.quantity = 'Quantity must be a whole number from 1 to 100.';
  }

  if (TYPES_THAT_NEED_A_REASON.includes(input.type) && isBlank(input.reason)) {
    errors.reason = 'A reason is required for usage reports and returns.';
  }

  if (isTooLong(input.notes, MAX_NOTES_LENGTH)) {
    errors.notes = 'Notes can be at most 500 characters.';
  }

  return errors;
}

// FR-11: check the explanation for an unreported removal.
function validateExplanation(input) {
  const errors = {};

  if (!REMOVAL_REASONS.includes(input.reason)) {
    errors.reason = 'Choose a reason.';
  }

  if (input.reason === 'Other' && isBlank(input.note)) {
    errors.note = 'Please add a note when the reason is "Other".';
  }

  if (isTooLong(input.note, MAX_NOTE_LENGTH)) {
    errors.note = 'The note can be at most 300 characters.';
  }

  return errors;
}

// True for a number like 5, false for 0, 101, 2.5, "abc", "5" or undefined.
function isWholeNumberInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

// True when a text is missing or only spaces.
function isBlank(text) {
  return typeof text !== 'string' || text.trim() === '';
}

// True when a text is longer than the limit. A missing text is not too long.
function isTooLong(text, maxLength) {
  return typeof text === 'string' && text.length > maxLength;
}

module.exports = { validateRequest, validateExplanation, REQUEST_TYPES, REMOVAL_REASONS };
