// S3 Inventory (FR-03): search and filter products.
const searchInput = document.getElementById('search');
const categorySelect = document.getElementById('category');
const statusSelect = document.getElementById('status');
const tableBody = document.getElementById('products');
const tableCard = document.getElementById('table-card');
const emptyBox = document.getElementById('empty');
const clearToolbarButton = document.getElementById('clear-toolbar');

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
clearToolbarButton.addEventListener('click', clearFilters);

async function loadProducts() {
  tableCard.classList.remove('hidden');
  emptyBox.innerHTML = '';
  tableBody.innerHTML = `<tr><td colspan="6">${skeleton(4, 'Loading products…')}</td></tr>`;
  const filtersOn = searchInput.value.trim() !== '' || categorySelect.value !== '' || statusSelect.value !== '';
  clearToolbarButton.classList.toggle('hidden', !filtersOn);
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
  showSummary(products);
  const empty = products.length === 0;
  tableCard.classList.toggle('hidden', empty);
  emptyBox.innerHTML = empty
    ? emptyState('package-search', 'No products match these filters',
      'Check the spelling of the product name or code, or clear the filters to see your full inventory.',
      '<button type="button" class="btn primary" id="clear-filters"><i data-lucide="x"></i>Clear filters</button>')
    : '';
  if (empty) {
    tableBody.innerHTML = '';
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

// Numbers between the toolbar and the table, for the products shown.
function showSummary(products) {
  const units = products.reduce((sum, product) => sum + product.inStock, 0);
  const below = products.filter((product) => product.status === 'out' || product.status === 'below').length;
  document.getElementById('summary').innerHTML = `
    <div><span class="big">${products.length}</span> <span class="muted">products</span></div>
    <div><span class="big">${units}</span> <span class="muted">units in stock</span></div>
    <div><span class="big">${below}</span> <span class="muted">below target</span></div>`;
  document.getElementById('showing').textContent = products.length
    ? `Showing 1–${products.length} of ${products.length} products`
    : '';
}

function productRow(product) {
  const expiry = product.nextExpiry
    ? `${formatDate(product.nextExpiry)}<span class="sub">${expiryTag(product.nextExpiryTier)}</span>`
    : '<span class="muted">–</span>';
  return `
    <tr class="clickable" data-id="${product.id}">
      <td>
        <a href="product.html?id=${product.id}">${escapeHtml(product.name)}</a>
        <span class="sub num">${escapeHtml(product.code)}</span>
      </td>
      <td class="small">${escapeHtml(product.category)}</td>
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
