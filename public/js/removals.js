// S7 Unreported removals (FR-10 list, FR-11 explain).
// validateExplanation() comes from js/validation.js: the same file the server uses.
const container = document.getElementById('removals');
const openTab = document.getElementById('tab-open');
const explainedTab = document.getElementById('tab-explained');
const dialog = document.getElementById('explain-dialog');
const explainForm = document.getElementById('explain-form');
const reasonSelect = document.getElementById('reason');
const noteInput = document.getElementById('note');
const sendButton = document.getElementById('explain-send');

let activeTab = 'open';
let removalToExplain = null; // the removal the dialog is about

renderHeader('Removals');
showMessageFromUrl();
loadRemovals();

openTab.addEventListener('click', () => switchTab('open'));
explainedTab.addEventListener('click', () => switchTab('explained'));
document.getElementById('explain-cancel').addEventListener('click', () => dialog.close());
noteInput.addEventListener('input', () => {
  document.getElementById('note-count').textContent = noteInput.value.length;
});

function switchTab(tab) {
  activeTab = tab;
  openTab.classList.toggle('active', tab === 'open');
  explainedTab.classList.toggle('active', tab === 'explained');
  loadRemovals();
}

// Load both lists: the open one is needed for the count on the "Open" tab.
async function loadRemovals() {
  container.innerHTML = skeleton(3, 'Loading removals…');
  try {
    const [open, explained] = await Promise.all([
      api('GET', '/api/removals?status=open'),
      api('GET', '/api/removals?status=explained'),
    ]);
    openTab.textContent = `Open (${open.length})`;
    showRemovals(activeTab === 'open' ? open : explained);
  } catch (error) {
    container.innerHTML = '';
    showError('Could not load the removals. ' + error.message, loadRemovals);
  }
}

function showRemovals(removals) {
  if (removals.length === 0) {
    container.innerHTML = activeTab === 'open'
      ? emptyState('circle-check', 'All removals are reported',
        'Nothing needs your attention. Thank you for keeping the count accurate.')
      : emptyState('history', 'No explained removals yet', 'Removals you report or explain appear here.');
    return;
  }
  const lastColumn = activeTab === 'open' ? 'Action' : 'Explanation';
  container.innerHTML = `
    <div class="card table-card">
      <table>
        <thead><tr><th>Product</th><th class="number">Qty</th><th>Detected</th><th>Status</th>
          <th class="${activeTab === 'open' ? 'actions' : ''}">${lastColumn}</th></tr></thead>
        <tbody>${removals.map(removalRow).join('')}</tbody>
      </table>
    </div>`;
  for (const button of container.querySelectorAll('button.explain')) {
    const removal = removals.find((r) => r.id === Number(button.dataset.id));
    button.addEventListener('click', () => openExplainDialog(removal));
  }
}

function removalRow(removal) {
  const open = removal.status === 'open';
  return `
    <tr>
      <td><a href="product.html?id=${removal.productId}">${escapeHtml(removal.productName)}</a>
        <span class="sub num">${escapeHtml(removal.productCode)}</span></td>
      <td class="number">${removal.quantity}</td>
      <td>${formatDate(removal.detectedAt)}</td>
      <td>${open ? tag('Not reported', 'warning') : tag('Explained', 'ok')}</td>
      ${open ? `<td class="actions">${openActions(removal)}</td>` : `<td>${explanationText(removal)}</td>`}
    </tr>`;
}

function explanationText(removal) {
  const note = removal.note ? ` – ${escapeHtml(removal.note)}` : '';
  return `${escapeHtml(removal.reason)}${note}<span class="sub">explained ${formatDate(removal.explainedAt)}</span>`;
}

// "Report usage" opens the request form prefilled (saving it also explains the removal);
// "Explain" opens the dialog.
function openActions(removal) {
  const query = new URLSearchParams({
    type: 'usage', productId: removal.productId, quantity: removal.quantity, removalId: removal.id,
  });
  return `
    <a class="btn primary small" href="request-form.html?${query}"><i data-lucide="clipboard-check"></i>Report usage</a>
    <button type="button" class="btn small explain" data-id="${removal.id}"><i data-lucide="flag"></i>Explain</button>`;
}

// ---- Explain dialog (FR-11) ----

function openExplainDialog(removal) {
  removalToExplain = removal;
  explainForm.reset();
  showDialogErrors({});
  document.getElementById('explain-error').textContent = '';
  document.getElementById('note-count').textContent = '0';
  document.getElementById('explain-summary').textContent =
    `${removal.productName} · ${removal.quantity} units · detected ${formatDate(removal.detectedAt)}`;
  dialog.showModal();
}

explainForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = { reason: reasonSelect.value, note: noteInput.value };
  const fields = validateExplanation(body); // same rules as the server
  showDialogErrors(fields);
  if (Object.keys(fields).length > 0) {
    return;
  }

  sendButton.disabled = true;
  try {
    await api('PATCH', '/api/removals/' + removalToExplain.id, body);
    dialog.close();
    showSuccess('Explanation saved');
    loadRemovals();
  } catch (error) {
    showDialogErrors(error.fields || {});
    document.getElementById('explain-error').textContent = error.message;
  } finally {
    sendButton.disabled = false;
  }
});

function showDialogErrors(fields) {
  document.getElementById('reason-error').textContent = fields.reason || '';
  document.getElementById('note-error').textContent = fields.note || '';
}
