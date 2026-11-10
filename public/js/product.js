// S4 Product detail (FR-04, FR-05): lots, suggested order and "use first".
const container = document.getElementById('product');
const productId = urlParam('id');

renderHeader('Inventory');
showMessageFromUrl();
loadProduct();

async function loadProduct() {
  container.innerHTML = '<p class="muted">Loading product…</p>';
  try {
    const product = await api('GET', '/api/products/' + encodeURIComponent(productId));
    showProduct(product);
  } catch (error) {
    if (error.status === 404) {
      container.innerHTML = '<h1>Product not found.</h1><p><a href="inventory.html">Back to inventory</a></p>';
      return;
    }
    container.innerHTML = '';
    showError('Could not load the product. ' + error.message, loadProduct);
  }
}

function showProduct(product) {
  document.title = product.name + ' · Smart Stock';
  container.innerHTML = `
    <h1>${escapeHtml(product.name)}</h1>
    <p class="muted">${escapeHtml(product.code)} · ${escapeHtml(product.category)} · ${stockTag(product.status)}</p>
    <p>In stock <strong>${product.inStock}</strong> · Recommended <strong>${product.recommended}</strong>
       · Suggested order <strong>${product.suggested}</strong></p>
    <div class="stock-bar"><div style="width: ${stockPercent(product)}%"></div></div>
    ${replenishButton(product)}
    <h2>Lots (soonest expiry first)</h2>
    ${lotsTable(product.lots)}`;

  for (const checkbox of container.querySelectorAll('input.use-first')) {
    checkbox.addEventListener('change', () => saveUseFirst(checkbox));
  }
}

// How full the stock is compared with the recommendation (max 100%).
function stockPercent(product) {
  if (product.recommended === 0) {
    return 100;
  }
  return Math.min(100, Math.round((product.inStock / product.recommended) * 100));
}

// Opens the request form prefilled. Hidden when nothing needs to be ordered.
function replenishButton(product) {
  if (product.suggested === 0) {
    return '';
  }
  const query = new URLSearchParams({ type: 'replenishment', productId: product.id, quantity: product.suggested });
  return `<a class="button primary" href="request-form.html?${query}">Request replenishment</a>`;
}

function lotsTable(lots) {
  if (lots.length === 0) {
    return '<p class="muted">No lots in stock for this product.</p>';
  }
  const rows = lots.map((lot) => `
    <tr>
      <td>${escapeHtml(lot.lotNumber)}</td>
      <td class="number">${lot.quantity}</td>
      <td>${formatDate(lot.expiryDate)}</td>
      <td>${tag(lot.tier, lot.tier)}</td>
      <td>
        <label>
          <input type="checkbox" class="use-first" data-id="${lot.id}" ${lot.useFirst ? 'checked' : ''}>
          Use first
        </label>
        <span class="muted small" id="saved-${lot.id}"></span>
      </td>
    </tr>`).join('');
  return `
    <table>
      <thead><tr><th>Lot</th><th class="number">Qty</th><th>Expires</th><th>Tier</th><th>Use first</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
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
