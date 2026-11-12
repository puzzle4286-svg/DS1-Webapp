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

// Draw the shared sidebar (logo, navigation, user, sign out) into <aside id="site-header">.
// It also checks the session: /api/auth/me answers 401 → redirect to login.
// Returns the signed-in user, so a page can use the name (e.g. the dashboard greeting).
async function renderHeader(activePage) {
  const pages = [
    ['Dashboard', 'index.html', 'Dashboard', 'layout-dashboard'],
    ['Inventory', 'inventory.html', 'Inventory', 'boxes'],
    ['Requests', 'requests.html', 'Requests', 'clipboard-list'],
    ['Removals', 'removals.html', 'Unreported removals', 'triangle-alert'],
  ];
  const links = pages.map(([key, href, label, icon]) => {
    const active = key === activePage ? ' class="active" aria-current="page"' : '';
    const badge = key === 'Removals' ? '<span class="badge hidden" id="removals-badge"></span>' : '';
    return `<a href="${href}"${active} title="${label}"><i data-lucide="${icon}"></i><span class="text">${label}</span>${badge}</a>`;
  }).join('');

  const sidebar = document.getElementById('site-header');
  sidebar.innerHTML = `
    <a href="index.html" class="brand" title="Smart Stock">
      <img class="mark" src="img/bentley-blue-mark.png" alt="Bentley">
      <span class="words"><img class="wordmark" src="img/bentley-wordmark.png" alt=""><span class="label">Smart Stock</span></span>
    </a>
    <nav class="nav" aria-label="Main">${links}</nav>
    <div class="user-box">
      <span class="initials" id="user-initials"></span>
      <div class="who"><div id="user-name"></div><div class="muted" id="user-email"></div></div>
      <button type="button" class="btn ghost small" id="logout" title="Sign out"><i data-lucide="log-out"></i><span class="sr-only">Sign out</span></button>
    </div>`;

  document.getElementById('logout').addEventListener('click', logOut);

  const user = await api('GET', '/api/auth/me');
  document.getElementById('user-name').textContent = shortName(user.name);
  document.getElementById('user-email').textContent = user.email || '';
  document.getElementById('user-initials').textContent = initials(user.name);
  loadRemovalsBadge();
  return user;
}

// Red count next to "Unreported removals". Uses the dashboard numbers; if that fails, no badge.
async function loadRemovalsBadge() {
  try {
    const { openRemovals } = await api('GET', '/api/dashboard');
    const badge = document.getElementById('removals-badge');
    badge.textContent = openRemovals;
    badge.classList.toggle('hidden', !openRemovals);
  } catch (error) {
    // The badge is only a hint; the page itself shows any real error.
  }
}

// "Anna Keller" → "AK"
function initials(fullName) {
  return fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
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
  banner.innerHTML = `<div class="alert success" role="status"><i data-lucide="circle-check"></i><span class="text">${escapeHtml(text)}</span></div>`;
}

// Red message at the top of the page, with an optional "Try again" button.
function showError(text, retry) {
  const banner = document.getElementById('banner');
  banner.innerHTML = `<div class="alert error" role="alert"><i data-lucide="circle-alert"></i><span class="text">${escapeHtml(text)}</span></div>`;
  if (retry) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn small';
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

// A coloured label with a small icon. kind is one of: critical, warning, ok, neutral.
const TAG_ICONS = { critical: 'circle-alert', warning: 'clock', ok: 'circle-check', neutral: 'minus' };

function tag(text, kind) {
  return `<span class="tag ${kind}"><i data-lucide="${TAG_ICONS[kind]}"></i>${escapeHtml(text)}</span>`;
}

const STOCK_LABELS = { out: 'Out of stock', below: 'Below target', on: 'On target', above: 'Above target' };
const STOCK_TAG_KINDS = { out: 'critical', below: 'warning', on: 'ok', above: 'neutral' };
const STATUS_TAG_KINDS = { Submitted: 'warning', Approved: 'ok', Rejected: 'critical', Completed: 'neutral' };
const TYPE_LABELS = { replenishment: 'Replenishment', usage: 'Usage report', return: 'Return' };
// Expiry tiers from the server: critical ≤ 90 days, warning ≤ 180 days, ok later.
const EXPIRY_LABELS = { critical: 'Expires < 3 mo', warning: 'Expires < 6 mo', ok: '6+ months' };

function stockTag(status) {
  return tag(STOCK_LABELS[status], STOCK_TAG_KINDS[status]);
}

function requestStatusTag(status) {
  return tag(status, STATUS_TAG_KINDS[status]);
}

function expiryTag(tier) {
  return tag(EXPIRY_LABELS[tier] || tier, tier);
}

// Grey pulsing blocks while data loads.
function skeleton(blocks = 3, text = 'Loading…') {
  return `<div class="skeleton" aria-busy="true">${'<div class="block"></div>'.repeat(blocks)}
    <div class="loading"><i data-lucide="loader"></i>${escapeHtml(text)}</div></div>`;
}

// Centred "nothing here" box. buttonHtml is optional.
function emptyState(icon, title, text, buttonHtml = '') {
  return `<div class="empty"><i data-lucide="${icon}"></i><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p>${buttonHtml}</div>`;
}

// ---- Icons (Lucide) ----
// Pages put <i data-lucide="name"></i> in their HTML. Instead of calling lucide.createIcons()
// after every render by hand, we call it whenever the page content changes.
// MutationObserver already groups changes, so this runs once per render, not once per element.
function drawIcons() {
  if (window.lucide && document.querySelector('i[data-lucide]')) {
    lucide.createIcons();
  }
}
new MutationObserver(drawIcons).observe(document.documentElement, { childList: true, subtree: true });
drawIcons();

// Read one value from the page URL, e.g. urlParam('id') for product.html?id=3.
function urlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
