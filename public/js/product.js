// S4 Product detail (FR-04, FR-05): lots, suggested order and "use first".
const container = document.getElementById('product');
const productId = urlParam('id');

renderHeader('Inventory');
showMessageFromUrl();
loadProduct();

async function loadProduct() {
  container.innerHTML = skeleton(3, 'Loading product…');
  try {
    const product = await api('GET', '/api/products/' + encodeURIComponent(productId));
    showProduct(product);
  } catch (error) {
    if (error.status === 404) {
      document.getElementById('page-title').textContent = 'Product not found';
      container.innerHTML = emptyState('package-x', 'Product not found', 'This product does not exist or was removed.',
        '<a class="btn primary" href="inventory.html">Back to inventory</a>');
      return;
    }
    container.innerHTML = '';
    showError('Could not load the product. ' + error.message, loadProduct);
  }
}

function showProduct(product) {
  document.title = product.name + ' · Smart Stock';
  document.getElementById('page-title').textContent = product.name;
  const next = product.lots[0]; // lots come soonest expiry first
  container.innerHTML = `
    <div class="stack">
      <div class="row between">
        <div class="stack tight">
          <span class="muted small num">${escapeHtml(product.code)} · ${escapeHtml(product.category)}</span>
          <div class="row tight">${stockTag(product.status)}${next ? expiryTag(next.tier) : ''}</div>
        </div>
        ${replenishButton(product)}
      </div>

      <div class="grid-3">
        ${infoCard(product)}
        ${stockCard(product)}
        ${expiryCard(product, next)}
      </div>

      <section class="card">
        <div class="card-head"><div><div class="kicker">Lots on the shelf</div><h3>Soonest expiry first</h3></div></div>
        ${lotsTable(product.lots)}
      </section>
    </div>`;

  for (const checkbox of container.querySelectorAll('input.use-first')) {
    checkbox.addEventListener('change', () => saveUseFirst(checkbox));
  }
}

function infoCard(product) {
  return `
    <section class="card">
      <div class="kicker">Product information</div>
      <h3 class="card-title">${escapeHtml(product.name)}</h3>
      <dl class="facts">
        <dt>Product code</dt><dd>${escapeHtml(product.code)}</dd>
        <dt>Category</dt><dd>${escapeHtml(product.category)}</dd>
        <dt>Unit price</dt><dd>${formatEuro(product.unitPrice)}</dd>
      </dl>
    </section>`;
}

// Big number, bar with a marker at the recommended stock, and the suggested order.
function stockCard(product) {
  const scale = Math.max(product.inStock, product.recommended) * 1.25 || 1;
  const fill = Math.round((product.inStock / scale) * 100);
  const target = Math.round((product.recommended / scale) * 100);
  return `
    <section class="card">
      <div class="kicker">Stock</div>
      <div class="row baseline">
        <span class="big xl">${product.inStock}</span>
        <span class="muted">units in stock</span>
      </div>
      <div class="bar" title="${product.inStock} of ${product.recommended} recommended">
        <div class="fill" style="width: ${fill}%"></div><div class="target" style="left: ${target}%"></div>
      </div>
      <div class="legend"><span><span class="swatch"></span>Current stock</span><span><span class="line"></span>Recommended</span></div>
      <dl class="facts">
        <dt>Recommended stock</dt><dd>${product.recommended} units</dd>
        <dt>Suggested order</dt><dd>${product.suggested} units</dd>
        <dt>Total stock value</dt><dd>${formatEuro(product.unitPrice * product.inStock)}</dd>
      </dl>
    </section>`;
}

function expiryCard(product, next) {
  if (!next) {
    return `
      <section class="card">
        <div class="kicker">Expiry</div>
        ${emptyState('package-x', 'No units in stock', 'There is nothing to track for expiry until the next delivery arrives.')}
      </section>`;
  }
  return `
    <section class="card">
      <div class="kicker">Expiry</div>
      <div>
        <div class="muted small">Next expiry · lot ${escapeHtml(next.lotNumber)}</div>
        <div class="big lg">${formatDate(next.expiryDate)}</div>
      </div>
      <div>${expiryTag(next.tier)}</div>
      <dl class="facts">
        <dt>Lots in stock</dt><dd>${product.lots.length}</dd>
        <dt>Marked "use first"</dt><dd>${product.lots.filter((lot) => lot.useFirst).length}</dd>
      </dl>
    </section>`;
}

// 1234.5 → "1.234,50 €"
function formatEuro(amount) {
  return Number(amount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

// Opens the request form prefilled. Hidden when nothing needs to be ordered.
function replenishButton(product) {
  if (product.suggested === 0) {
    return '';
  }
  const query = new URLSearchParams({ type: 'replenishment', productId: product.id, quantity: product.suggested });
  return `<a class="btn primary" href="request-form.html?${query}"><i data-lucide="package-plus"></i>Request replenishment</a>`;
}

function lotsTable(lots) {
  if (lots.length === 0) {
    return '<p class="muted">No lots in stock for this product.</p>';
  }
  const rows = lots.map((lot) => `
    <tr>
      <td class="num">${escapeHtml(lot.lotNumber)}</td>
      <td class="number">${lot.quantity}</td>
      <td>${formatDate(lot.expiryDate)}</td>
      <td>${expiryTag(lot.tier)}</td>
      <td>
        <label class="row tight nowrap">
          <input type="checkbox" class="use-first" data-id="${lot.id}" ${lot.useFirst ? 'checked' : ''}>
          Use first
          <span class="muted small" id="saved-${lot.id}"></span>
        </label>
      </td>
    </tr>`).join('');
  return `
    <div class="scroll-x">
      <table>
        <thead><tr><th>Lot</th><th class="number">Qty</th><th>Expires</th><th>Expiry status</th><th>Priority use</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// FR-05: save the checkbox immediately. On error, put the checkbox back.
async function saveUseFirst(checkbox) {
  const savedLabel = document.getElementById('saved-' + checkbox.dataset.id);
  savedLabel.textContent = '';
  checkbox.disabled = true;
  try {
    await api('PATCH', '/api/lots/' + checkbox.dataset.id, { useFirst: checkbox.checked });
    savedLabel.textContent = 'Saved';
  } catch (error) {
    checkbox.checked = !checkbox.checked;
    showError('Could not save "use first". ' + error.message);
  } finally {
    checkbox.disabled = false;
  }
}
