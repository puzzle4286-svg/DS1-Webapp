// S5 Requests list (FR-07 read, FR-09 withdraw).
const statusSelect = document.getElementById('status');
const typeSelect = document.getElementById('type');
const tableBody = document.getElementById('requests');
const dialog = document.getElementById('withdraw-dialog');

let requestToWithdraw = null; // the id the dialog is asking about

renderHeader('Requests');
showMessageFromUrl();
loadRequests();

statusSelect.addEventListener('change', loadRequests);
typeSelect.addEventListener('change', loadRequests);
document.getElementById('withdraw-cancel').addEventListener('click', () => dialog.close());
document.getElementById('withdraw-confirm').addEventListener('click', withdrawRequest);

async function loadRequests() {
  tableBody.innerHTML = '<tr><td colspan="6" class="muted">Loading requests…</td></tr>';
  const query = new URLSearchParams({ status: statusSelect.value, type: typeSelect.value });
  try {
    const requests = await api('GET', '/api/requests?' + query);
    showRequests(requests);
  } catch (error) {
    tableBody.innerHTML = '';
    showError('Could not load the requests. ' + error.message, loadRequests);
  }
}

function showRequests(requests) {
  if (requests.length === 0) {
    const filtered = statusSelect.value !== '' || typeSelect.value !== '';
    const text = filtered ? 'No requests match your filters.' : 'No requests yet.';
    tableBody.innerHTML = `<tr><td colspan="6">${text} <a href="request-form.html">New request</a></td></tr>`;
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
      <td>${request.id}</td>
      <td>${TYPE_LABELS[request.type]}</td>
      <td>${escapeHtml(request.productName)}</td>
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
    <a href="request-form.html?id=${request.id}">Edit</a>
    <button type="button" class="link withdraw" data-id="${request.id}">Withdraw</button>`;
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
