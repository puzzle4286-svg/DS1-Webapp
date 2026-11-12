// S2 Dashboard (FR-02): what needs attention today.
const container = document.getElementById('dashboard');
let firstName = '';

renderHeader('Dashboard').then((user) => {
  firstName = user.name.split(' ')[0];
  const greeting = document.getElementById('greeting-name');
  if (greeting) {
    greeting.textContent = firstName;
  }
});
showMessageFromUrl();
loadDashboard();

async function loadDashboard() {
  container.innerHTML = skeleton(4, 'Loading the dashboard…');
  try {
    const data = await api('GET', '/api/dashboard');
    container.innerHTML = `
      <div class="stack">
        ${greeting()}
        ${kpiCards(data)}
        <div class="grid-2">
          ${expiringList(data.nearestExpiry)}
          ${requestList(data.latestRequests)}
        </div>
      </div>`;
  } catch (error) {
    container.innerHTML = '';
    showError('Could not load the dashboard. ' + error.message, loadDashboard);
  }
}

// "Good morning, Anna" + today's date.
function greeting() {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  return `
    <div class="greeting">
      <h2>Good ${part}, <span id="greeting-name">${escapeHtml(firstName)}</span></h2>
      <p class="muted">${today} · <em>demonstration data</em></p>
    </div>`;
}

// Four KPI cards. Each one links to the matching list.
function kpiCards(data) {
  return `
    <div class="kpis">
      ${card('Units in stock', 'boxes', data.unitsInStock, 'inventory.html', 'across all products')}
      ${card('Lots expiring ≤ 90 days', 'hourglass', data.expiringLots, 'inventory.html', 'use these first')}
      ${card('Products below recommended', 'trending-down', data.productsBelow, 'inventory.html?status=below',
        'incl. out of stock')}
      ${card('Open removals', 'triangle-alert', data.openRemovals, 'removals.html', 'need a report')}
    </div>`;
}

function card(label, icon, number, href, hint) {
  return `
    <a class="kpi" href="${href}">
      <div class="kicker"><span>${label}</span><i data-lucide="${icon}"></i></div>
      <div class="big">${number}</div>
      <div class="muted small">${hint}</div>
    </a>`;
}

// The 5 lots that expire soonest. Click → product page.
function expiringList(lots) {
  const head = `
    <div class="card-head"><div><div class="kicker">Expiry overview</div><h3>Expiring soon</h3></div></div>`;
  if (lots.length === 0) {
    return `<section class="card">${head}<p class="muted">No lots in stock.</p></section>`;
  }
  const rows = lots.map((lot) => `
    <tr class="clickable" onclick="location.href='product.html?id=${lot.productId}'">
      <td><a href="product.html?id=${lot.productId}">${escapeHtml(lot.productName)}</a>
        <span class="sub">Lot ${escapeHtml(lot.lotNumber)}</span></td>
      <td class="number">${lot.quantity}</td>
      <td>${formatDate(lot.expiryDate)}</td>
      <td>${expiryTag(lot.tier)}</td>
    </tr>`).join('');
  return `
    <section class="card">${head}
      <div class="scroll-x"><table>
        <thead><tr><th>Product</th><th class="number">Units</th><th>Expires</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <a class="btn ghost self-start" href="inventory.html">View inventory<i data-lucide="arrow-right"></i></a>
    </section>`;
}

// The 3 newest requests. Click → requests list.
function requestList(requests) {
  const head = `
    <div class="card-head"><div><div class="kicker">Requests</div><h3>My latest requests</h3></div></div>`;
  if (requests.length === 0) {
    return `<section class="card">${head}
      ${emptyState('clipboard-list', 'No requests yet', 'Requests you send to Bentley appear here.',
        '<a class="btn primary" href="request-form.html"><i data-lucide="plus"></i>New request</a>')}
    </section>`;
  }
  const rows = requests.map((request) => `
    <tr class="clickable" onclick="location.href='requests.html'">
      <td><a href="requests.html">#${request.id} ${TYPE_LABELS[request.type]}</a>
        <span class="sub">${escapeHtml(request.productName)}</span></td>
      <td class="number">${request.quantity}</td>
      <td>${formatDate(request.createdAt)}</td>
      <td>${requestStatusTag(request.status)}</td>
    </tr>`).join('');
  return `
    <section class="card">${head}
      <div class="scroll-x"><table>
        <thead><tr><th>Request</th><th class="number">Units</th><th>Created</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <a class="btn ghost self-start" href="requests.html">All requests<i data-lucide="arrow-right"></i></a>
    </section>`;
}
