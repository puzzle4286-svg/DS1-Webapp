// Shared helpers for every page: talking to the API, the header and messages.

// Call the API and return the JSON answer.
// - 401 (not signed in): go to the login page.
// - 400/404/409/500: throw an Error with the server's message (and .fields for 400).
async function api(method, url, body) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, options);
  } catch (networkError) {
    throw new Error('Could not reach the server. Try again.');
  }

  // A wrong password on the login page is also 401, but there we want the error message.
  if (response.status === 401 && url !== '/api/auth/login') {
    window.location.href = 'login.html';
    return new Promise(() => {}); // never finishes: the page is leaving anyway
  }

  if (response.status === 204) {
    return null; // "No Content", e.g. after a delete
  }

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || 'Something went wrong.');
    error.status = response.status;
    error.fields = data.fields || {};
    throw error;
  }
  return data;
}

// Draw the shared header (logo, navigation, user, log out) into <header id="site-header">.
// It also checks the session: /api/auth/me answers 401 → redirect to login.
async function renderHeader(activePage) {
  const pages = [
    ['index.html', 'Dashboard'],
    ['inventory.html', 'Inventory'],
    ['requests.html', 'Requests'],
    ['removals.html', 'Removals'],
  ];
  const links = pages.map(([href, label]) => {
    const active = label === activePage ? ' class="active"' : '';
    return `<a href="${href}"${active}>${label}</a>`;
  }).join('');

  const header = document.getElementById('site-header');
  header.innerHTML = `
    <a href="index.html" class="brand"><img src="img/bentley-logo.png" alt="Bentley"> Smart Stock</a>
    <nav>${links}</nav>
    <span class="user"><span id="user-name"></span> · <button type="button" class="link" id="logout">Log out</button></span>`;

  document.getElementById('logout').addEventListener('click', logOut);

  const user = await api('GET', '/api/auth/me');
  document.getElementById('user-name').textContent = shortName(user.name);
}

async function logOut() {
  try {
    await api('POST', '/api/auth/logout');
  } finally {
    window.location.href = 'login.html';
  }
}

// "Anna Keller" → "Anna K."
function shortName(fullName) {
  const [first, last] = fullName.split(' ');
  return last ? `${first} ${last[0]}.` : first;
}

// ---- Messages (NFR-01) ----

// Green message at the top of the page.
function showSuccess(text) {
  const banner = document.getElementById('banner');
  banner.innerHTML = `<div class="success">✓ ${escapeHtml(text)}</div>`;
}

// Red message at the top of the page, with an optional "Try again" button.
function showError(text, retry) {
  const banner = document.getElementById('banner');
  banner.innerHTML = `<div class="error">${escapeHtml(text)} </div>`;
  if (retry) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Try again';
    button.addEventListener('click', () => {
      clearBanner();
      retry();
    });
    banner.firstChild.appendChild(button);
  }
}

function clearBanner() {
  document.getElementById('banner').innerHTML = '';
}

// Show ?msg=... from the URL as a success message, then remove it from the URL
// so it doesn't show again on reload.
function showMessageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const message = params.get('msg');
  if (message) {
    showSuccess(message);
    params.delete('msg');
    const query = params.toString();
    history.replaceState(null, '', window.location.pathname + (query ? '?' + query : ''));
  }
}

// ---- Small formatting helpers ----

// Make text safe to put into innerHTML (so "<b>" in a note shows as text).
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// '2026-11-04' or '2026-11-04T09:14:00Z' → '04.11.2026'
function formatDate(isoText) {
  if (!isoText) {
    return '–';
  }
  const [year, month, day] = isoText.slice(0, 10).split('-');
  return `${day}.${month}.${year}`;
}

// A coloured label. kind is one of: critical, warning, ok, neutral.
function tag(text, kind) {
  return `<span class="tag ${kind}">${escapeHtml(text)}</span>`;
}

const STOCK_LABELS = { out: 'Out of stock', below: 'Below', on: 'On target', above: 'Above' };
const STOCK_TAG_KINDS = { out: 'warning', below: 'warning', on: 'ok', above: 'neutral' };
const STATUS_TAG_KINDS = { Submitted: 'warning', Approved: 'ok', Rejected: 'critical', Completed: 'neutral' };
const TYPE_LABELS = { replenishment: 'Replenishment', usage: 'Usage report', return: 'Return' };

function stockTag(status) {
  return tag(STOCK_LABELS[status], STOCK_TAG_KINDS[status]);
}

function requestStatusTag(status) {
  return tag(status, STATUS_TAG_KINDS[status]);
}

// Read one value from the page URL, e.g. urlParam('id') for product.html?id=3.
function urlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
