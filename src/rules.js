// Business rules (README "Business rules"). Pure functions: no database, no Express.
// Because they only take values and return values, they are easy to unit-test.

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const CRITICAL_DAYS = 90;
const WARNING_DAYS = 180;

// FR-04: compare the stock with the recommended level.
// 'out' = none left · 'below' = under target · 'above' = more than 15% over · 'on' = otherwise.
function stockStatus(inStock, recommended) {
  if (inStock === 0) {
    return 'out';
  }
  if (inStock < recommended) {
    return 'below';
  }
  // "inStock > recommended × 1.15", written with whole numbers to avoid
  // floating-point rounding (24 × 1.15 is 27.599999999999998 in JavaScript).
  if (inStock * 100 > recommended * 115) {
    return 'above';
  }
  return 'on';
}

// FR-04: how urgent is a lot's expiry date? Expired lots count as critical.
// Both dates are 'YYYY-MM-DD' strings.
function expiryTier(expiryDate, today) {
  const days = daysBetween(today, expiryDate);
  if (days <= CRITICAL_DAYS) {
    return 'critical';
  }
  if (days <= WARNING_DAYS) {
    return 'warning';
  }
  return 'ok';
}

// Number of whole days from one 'YYYY-MM-DD' date to another (negative if in the past).
function daysBetween(fromDate, toDate) {
  const from = Date.parse(fromDate + 'T00:00:00Z');
  const to = Date.parse(toDate + 'T00:00:00Z');
  return Math.round((to - from) / DAY_IN_MS);
}

// FR-04: how many units to order to reach the recommended level (never negative).
function suggestedQuantity(inStock, recommended) {
  return Math.max(0, recommended - inStock);
}

// FR-08, FR-09: a request may only be edited or withdrawn while Bentley hasn't started it.
function canChangeRequest(status) {
  return status === 'Submitted';
}

// Today's date as 'YYYY-MM-DD' (UTC). Routes pass this to expiryTier.
function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = {
  stockStatus, expiryTier, daysBetween, suggestedQuantity, canChangeRequest, todayDate,
};
