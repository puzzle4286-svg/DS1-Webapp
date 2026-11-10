// S3 Inventory (FR-03): search and filter products.
const searchInput = document.getElementById('search');
const categorySelect = document.getElementById('category');
const statusSelect = document.getElementById('status');
const tableBody = document.getElementById('products');

const SEARCH_DELAY_MS = 300;
let searchTimer = null;

renderHeader('Inventory');
showMessageFromUrl();
statusSelect.value = urlParam('status') || ''; // the dashboard can link here with ?status=below
loadProducts();

// Search waits 300 ms after the last key press, so we don't call the API for every letter.
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadProducts, SEARCH_DELAY_MS);
});
categorySelect.addEventListener('change', loadProducts);
statusSelect.addEventListener('change', loadProducts);

async function loadProducts() {
  tableBody.innerHTML = '<tr><td colspan="5" class="muted">Loading products…</td></tr>';
  const query = new URLSearchParams({
    search: searchInput.value.trim(),
    category: categorySelect.value,
    status: statusSelect.value,
  });
  try {
    const products = await api('GET', '/api/products?' + query);
    showProducts(products);
  } catch (error) {
    tableBody.innerHTML = '';
    showError('Could not load the products. ' + error.message, loadProducts);
  }
}

function showProducts(products) {
  if (products.length === 0) {
    tableBody.innerHTML = `
      <tr><td colspan="5">
        No products match your filters.
        <button type="button" id="clear-filters">Clear filters</button>
      </td></tr>`;
    document.getElementById('clear-filters').addEventListener('click', clearFilters);
    return;
  }
  tableBody.innerHTML = products.map(productRow).join('');
  // The whole row is a link to the product page.
  for (const row of tableBody.querySelectorAll('tr')) {
    row.addEventListener('click', () => {
      window.location.href = 'product.html?id=' + row.dataset.id;
    });
  }
}

function productRow(product) {
  const expiry = product.nextExpiry
    ? `${formatDate(product.nextExpiry)} ${tag(product.nextExpiryTier, product.nextExpiryTier)}`
    : '<span class="muted">–</span>';
  return `
    <tr class="clickable" data-id="${product.id}">
      <td>
        <a href="product.html?id=${product.id}">${escapeHtml(product.name)}</a><br>
        <span class="muted small">${escapeHtml(product.code)}</span>
      </td>
      <td class="number">${product.inStock}</td>
      <td class="number">${product.recommended}</td>
      <td>${stockTag(product.status)}</td>
      <td>${expiry}</td>
    </tr>`;
}

function clearFilters() {
  searchInput.value = '';
  categorySelect.value = '';
  statusSelect.value = '';
  loadProducts();
}
