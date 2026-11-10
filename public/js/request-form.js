// S6 Request form (FR-06 create, FR-08 edit).
// URL options: ?id=12 (edit) or ?type=usage&productId=3&quantity=2 (prefill a new request).
// validateRequest() comes from js/validation.js: the same file the server uses.
const form = document.getElementById('request-form');
const productSelect = document.getElementById('productId');
const quantityInput = document.getElementById('quantity');
const reasonField = document.getElementById('reason-field');
const reasonSelect = document.getElementById('reason');
const notesInput = document.getElementById('notes');
const saveButton = document.getElementById('save');

const editId = urlParam('id'); // null when creating a new request
let products = [];

// Reason choices depend on the type. Replenishment needs no reason.
const REASONS_BY_TYPE = {
  replenishment: [],
  usage: ['Used in procedure', 'Damaged during procedure', 'Other'],
  return: ['Overstock', 'Expiring soon', 'Wrong product', 'Damaged', 'Other'],
};

renderHeader('Requests');
setUpForm();

async function setUpForm() {
  try {
    products = await api('GET', '/api/products');
    fillProductOptions();
    if (editId) {
      await loadRequestForEditing();
    } else {
      prefillFromUrl();
    }
    document.getElementById('loading').classList.add('hidden');
    form.classList.remove('hidden');
  } catch (error) {
    document.getElementById('loading').classList.add('hidden');
    showError(error.message, setUpForm);
  }
}

function fillProductOptions() {
  for (const product of products) {
    const option = document.createElement('option');
    option.value = product.id;
    option.textContent = `${product.name} (${product.code})`;
    productSelect.appendChild(option);
  }
}

// New request: take type, product and quantity from the URL if they are there.
function prefillFromUrl() {
  setType(urlParam('type') || 'replenishment');
  productSelect.value = urlParam('productId') || '';
  quantityInput.value = urlParam('quantity') || '';
  showStockInfo();
}

// Edit: load the saved request and put its values into the form.
async function loadRequestForEditing() {
  const request = await api('GET', '/api/requests/' + encodeURIComponent(editId));
  document.getElementById('form-title').textContent = `Edit request #${request.id}`;
  document.title = `Edit request #${request.id} · Smart Stock`;
  setType(request.type);
  productSelect.value = request.productId;
  quantityInput.value = request.quantity;
  selectReason(request.reason);
  notesInput.value = request.notes;
  updateNotesCount();
  showStockInfo();
  if (request.status !== 'Submitted') {
    showError('This request can no longer be changed.');
    saveButton.disabled = true;
  }
}

// ---- Keeping the form up to date while the user types ----

for (const radio of form.elements.type) {
  radio.addEventListener('change', () => setType(radio.value));
}
productSelect.addEventListener('change', showStockInfo);
notesInput.addEventListener('input', updateNotesCount);

function selectedType() {
  return form.elements.type.value;
}

// Tick the right radio button and show the matching reason choices.
function setType(type) {
  const radio = form.querySelector(`input[name="type"][value="${type}"]`) || form.elements.type[0];
  radio.checked = true;
  const reasons = REASONS_BY_TYPE[radio.value];
  reasonField.classList.toggle('hidden', reasons.length === 0);
  reasonSelect.innerHTML = '<option value="">Choose a reason…</option>' +
    reasons.map((reason) => `<option>${escapeHtml(reason)}</option>`).join('');
}

// When editing, the saved reason may not be in the list (e.g. old data), so add it.
function selectReason(reason) {
  if (reason && ![...reasonSelect.options].some((option) => option.value === reason)) {
    reasonSelect.add(new Option(reason, reason));
  }
  reasonSelect.value = reason || '';
}

function showStockInfo() {
  const product = products.find((p) => p.id === Number(productSelect.value));
  document.getElementById('stock-info').textContent = product
    ? `In stock ${product.inStock} · recommended ${product.recommended}`
    : '';
}

function updateNotesCount() {
  document.getElementById('notes-count').textContent = notesInput.value.length;
}

// ---- Saving ----

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearBanner();

  const body = readForm();
  const fields = validateRequest(body); // same rules as the server
  showFieldErrors(fields);
  if (Object.keys(fields).length > 0) {
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = 'Saving…';
  try {
    const saved = editId
      ? await api('PUT', '/api/requests/' + encodeURIComponent(editId), body)
      : await api('POST', '/api/requests', body);
    const message = editId ? `Request #${saved.id} updated` : `Request #${saved.id} created`;
    window.location.href = 'requests.html?msg=' + encodeURIComponent(message);
  } catch (error) {
    showFieldErrors(error.fields || {});
    showError(error.message);
    saveButton.disabled = false;
    saveButton.textContent = 'Save request';
  }
});

// Turn the form into the JSON body the API expects.
function readForm() {
  const type = selectedType();
  return {
    type,
    productId: productSelect.value === '' ? null : Number(productSelect.value),
    // An empty box becomes null (missing); "2.5" stays 2.5 so validation can reject it.
    quantity: quantityInput.value === '' ? null : Number(quantityInput.value),
    reason: REASONS_BY_TYPE[type].length > 0 ? reasonSelect.value : '',
    notes: notesInput.value,
  };
}

// Put each message under its field, and clear the fields without errors.
function showFieldErrors(fields) {
  for (const name of ['type', 'productId', 'quantity', 'reason', 'notes']) {
    document.getElementById(name + '-error').textContent = fields[name] || '';
  }
}
