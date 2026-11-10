// S2 Dashboard (FR-02): what needs attention today.
const container = document.getElementById('dashboard');

renderHeader('Dashboard');
showMessageFromUrl();
loadDashboard();

async function loadDashboard() {
  container.innerHTML = '<p class="muted">Loading dashboard…</p>';
  try {
    const data = await api('GET', '/api/dashboard');
    container.innerHTML = kpiCards(data) + expiringList(data.nearestExpiry) + requestList(data.latestRequests);
  } catch (error) {
    container.innerHTML = '';
    showError('Could not load the dashboard. ' + error.message, loadDashboard);
  }
}

// Four KPI cards. Each one links to the matching list.
function kpiCards(data) {
  return `
    <div class="cards">
      ${card('Units in stock', data.unitsInStock, 'inventory.html')}
      ${card('Lots expiring ≤ 90 days', data.expiringLots, 'inventory.html')}
      ${card('Products below recommended', data.productsBelow, 'inventory.html?status=below',
        'incl. out of stock')}
      ${card('Open removals', data.openRemovals, 'removals.html')}
    </div>`;
}

function card(label, number, href, hint) {
  const hintHtml = hint ? `<div class="muted small">${hint}</div>` : '';
  return `
    <a class="card" href="${href}">
      <div class="muted small">${label}</div>
      <div class="number">${number}</div>
      ${hintHtml}
      <div class="view">view →</div>
    </a>`;
}

// The 5 lots that expire soonest. Click → product page.
function expiringList(lots) {
  if (lots.length === 0) {
    return '<h2>Expiring soon</h2><p class="muted">No lots in stock.</p>';
  }
  const items = lots.map((lot) => `
    <li>
      <a class="grow" href="product.html?id=${lot.productId}">${escapeHtml(lot.productName)}</a>
      <span class="muted small">Lot ${escapeHtml(lot.lotNumber)} · ${lot.quantity} units</span>
      <span>${formatDate(lot.expiryDate)}</span>
      ${tag(lot.tier, lot.tier)}
    </li>`).join('');
  return `<h2>Expiring soon</h2><ul class="list">${items}</ul>`;
}

// The 3 newest requests. Click → requests list.
function requestList(requests) {
  if (requests.length === 0) {
    return '<h2>My latest requests</h2><p class="muted">No requests yet. <a href="request-form.html">New request</a></p>';
  }
  const items = requests.map((request) => `
    <li>
      <a class="grow" href="requests.html">#${request.id} ${TYPE_LABELS[request.type]} · ${escapeHtml(request.productName)}</a>
      <span class="muted small">${request.quantity} units · ${formatDate(request.createdAt)}</span>
      ${requestStatusTag(request.status)}
    </li>`).join('');
  return `<h2>My latest requests</h2><ul class="list">${items}</ul>`;
}
