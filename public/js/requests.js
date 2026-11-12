// S5 Requests list (FR-07 read, FR-09 withdraw).
const statusButtons = document.querySelectorAll('#status button');
let activeStatus = ''; // '' = all statuses
const typeSelect = document.getElementById('type');
const tableBody = document.getElementById('requests');
const tableCard = document.getElementById('table-card');
const emptyBox = document.getElementById('empty');
const dialog = document.getElementById('withdraw-dialog');

let requestToWithdraw = null; // the id the dialog is asking about

renderHeader('Requests');
showMessageFromUrl();
loadRequests();

for (const button of statusButtons) {
  button.addEventListener('click', () => {
    activeStatus = button.dataset.status;
    for (const other of statusButtons) {
      other.classList.toggle('active', other === button);
      other.setAttribute('aria-pressed', other === button);
    }
    loadRequests();
  });
}
typeSelect.addEventListener('change', loadRequests);
document.getElementById('withdraw-cancel').addEventListener('click', () => dialog.close());
document.getElementById('withdraw-confirm').addEventListener('click', withdrawRequest);

async function loadRequests() {
  tableCard.classList.remove('hidden');
  emptyBox.innerHTML = '';
  tableBody.innerHTML = `<tr><td colspan="6">${skeleton(3, 'Loading requests…')}</td></tr>`;
  const query = new URLSearchParams({ status: activeStatus, type: typeSelect.value });
  try {
    const requests = await api('GET', '/api/requests?' + query);
    showRequests(requests);
  } catch (error) {
    tableBody.innerHTML = '';
    showError('Could not load the requests. ' + error.message, loadRequests);
  }
}

function showRequests(requests) {
  tableCard.classList.toggle('hidden', requests.length === 0);
  if (requests.length === 0) {
    const filtered = activeStatus !== '' || typeSelect.value !== '';
    tableBody.innerHTML = '';
    emptyBox.innerHTML = emptyState('clipboard-list', filtered ? 'No requests found' : 'No requests yet',
      filtered ? 'No requests match your filters.' : 'Requests you send to Bentley appear here.',
      '<a class="btn primary" href="request-form.html"><i data-lucide="plus"></i>New request</a>');
    return;
  }
  tableBody.innerHTML = requests.map(requestRow).join('');
  for (const button of tableBody.querySelectorAll('button.withdraw')) {
    button.addEventListener('click', () => askToWithdraw(Number(button.dataset.id)));
  }
}

function requestRow(request) {
  return `
    <tr>
      <td class="num">${request.id}</td>
      <td>${TYPE_LABELS[request.type]}</td>
      <td>${escapeHtml(request.productName)}<span class="sub">${formatDate(request.createdAt)}</span></td>
      <td class="number">${request.quantity}</td>
      <td>${requestStatusTag(request.status)}</td>
      <td class="actions">${actionButtons(request)}</td>
    </tr>`;
}

// FR-08, FR-09: Edit and Withdraw only while Submitted. Bentley already handles the others.
function actionButtons(request) {
  if (request.status !== 'Submitted') {
    return '';
  }
  return `
    <a class="btn small" href="request-form.html?id=${request.id}"><i data-lucide="pencil"></i>Edit</a>
    <button type="button" class="btn ghost small withdraw" data-id="${request.id}"><i data-lucide="trash-2"></i>Withdraw</button>`;
}

function askToWithdraw(id) {
  requestToWithdraw = id;
  document.getElementById('withdraw-title').textContent = `Withdraw request #${id}?`;
  dialog.showModal();
}

// FR-09: delete after the user confirmed.
async function withdrawRequest() {
  const confirmButton = document.getElementById('withdraw-confirm');
  confirmButton.disabled = true;
  try {
    await api('DELETE', '/api/requests/' + requestToWithdraw);
    dialog.close();
    showSuccess(`Request #${requestToWithdraw} withdrawn`);
    loadRequests();
  } catch (error) {
    dialog.close();
    showError(error.message);
    loadRequests(); // the status may have changed, so show the current list
  } finally {
    confirmButton.disabled = false;
  }
}
