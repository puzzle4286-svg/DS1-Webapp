// S1 Sign in (FR-01).
const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitButton = document.getElementById('submit');

form.addEventListener('submit', async (event) => {
  event.preventDefault(); // we send the data with fetch, not by reloading the page
  clearBanner();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const fields = checkLoginFields(email, password);
  showFieldErrors(fields);
  if (Object.keys(fields).length > 0) {
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Signing in…';
  try {
    await api('POST', '/api/auth/login', { email, password });
    window.location.href = 'index.html';
  } catch (error) {
    if (error.status === 401) {
      passwordInput.value = '';
    }
    showFieldErrors(error.fields || {});
    showError(error.message);
    submitButton.disabled = false;
    submitButton.textContent = 'Sign in';
  }
});

// Browser check before sending. The server checks again.
function checkLoginFields(email, password) {
  const fields = {};
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    fields.email = 'Enter a valid email.';
  }
  if (password === '') {
    fields.password = 'Enter your password.';
  }
  return fields;
}

function showFieldErrors(fields) {
  document.getElementById('email-error').textContent = fields.email || '';
  document.getElementById('password-error').textContent = fields.password || '';
}
