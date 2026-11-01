(function () {
  const passwordStorageKey = 'mrx-admin-password-v1';
  const sessionStorageKey = 'mrx-admin-unlocked-v1';
  const iterations = 310000;
  const login = document.getElementById('adminLogin');
  const dashboard = document.getElementById('adminDashboard');
  const form = document.getElementById('authForm');
  const passwordInput = document.getElementById('authPassword');
  const confirmField = document.getElementById('authConfirmField');
  const confirmInput = document.getElementById('authConfirm');
  const description = document.getElementById('authDescription');
  const submitButton = document.getElementById('authSubmit');
  const message = document.getElementById('authMessage');

  function showMessage(text, isError) {
    message.textContent = text;
    message.classList.toggle('success', !isError);
    message.classList.toggle('error', Boolean(isError));
  }

  function getSavedPassword() {
    try {
      return JSON.parse(localStorage.getItem(passwordStorageKey) || 'null');
    } catch (error) {
      return null;
    }
  }

  function configureForm() {
    const hasPassword = Boolean(getSavedPassword());
    confirmField.hidden = hasPassword;
    confirmInput.required = !hasPassword;
    passwordInput.autocomplete = hasPassword ? 'current-password' : 'new-password';
    description.textContent = hasPassword
      ? 'Enter your password to open the admin dashboard.'
      : 'Create a password to open the admin dashboard in this browser.';
    submitButton.textContent = hasPassword ? 'Unlock dashboard' : 'Set password';
  }

  function toBase64(bytes) {
    return btoa(String.fromCharCode.apply(null, bytes));
  }

  function fromBase64(value) {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  }

  async function derivePasswordHash(password, salt) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256'
    }, keyMaterial, 256);
    return new Uint8Array(bits);
  }

  function matchesHash(left, right) {
    if (left.length !== right.length) return false;
    let difference = 0;
    for (let index = 0; index < left.length; index += 1) {
      difference |= left[index] ^ right[index];
    }
    return difference === 0;
  }

  async function savePassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derivePasswordHash(password, salt);
    localStorage.setItem(passwordStorageKey, JSON.stringify({
      salt: toBase64(salt),
      hash: toBase64(hash),
      iterations
    }));
  }

  async function verifyPassword(password, saved) {
    const salt = fromBase64(saved.salt);
    const expectedHash = fromBase64(saved.hash);
    const actualHash = await derivePasswordHash(password, salt);
    return matchesHash(actualHash, expectedHash);
  }

  function loadDashboardScripts() {
    return new Promise((resolve, reject) => {
      const siteScript = document.createElement('script');
      siteScript.src = 'mrx-site.js';
      siteScript.onload = () => {
        const adminScript = document.createElement('script');
        adminScript.src = 'admin.js';
        adminScript.onload = resolve;
        adminScript.onerror = reject;
        document.body.appendChild(adminScript);
      };
      siteScript.onerror = reject;
      document.body.appendChild(siteScript);
    });
  }

  async function unlockDashboard() {
    sessionStorage.setItem(sessionStorageKey, 'true');
    login.hidden = true;
    dashboard.hidden = false;
    try {
      await loadDashboardScripts();
    } catch (error) {
      dashboard.hidden = true;
      login.hidden = false;
      sessionStorage.removeItem(sessionStorageKey);
      showMessage('Could not load the dashboard files. Keep them together and try again.', true);
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    showMessage('Checking password...', false);

    try {
      const password = passwordInput.value;
      const saved = getSavedPassword();
      if (!saved) {
        if (password.length < 8) {
          showMessage('Use at least 8 characters for your password.', true);
          return;
        }
        if (password !== confirmInput.value) {
          showMessage('The passwords do not match.', true);
          return;
        }
        await savePassword(password);
        await unlockDashboard();
        return;
      }

      if (await verifyPassword(password, saved)) {
        await unlockDashboard();
      } else {
        showMessage('That password is not correct.', true);
        passwordInput.select();
      }
    } catch (error) {
      showMessage('Password verification is unavailable in this browser. Try opening the page in a current browser.', true);
    } finally {
      submitButton.disabled = false;
      passwordInput.value = '';
      confirmInput.value = '';
    }
  });

  document.getElementById('adminLogout').addEventListener('click', () => {
    sessionStorage.removeItem(sessionStorageKey);
    window.location.reload();
  });

  configureForm();
  if (sessionStorage.getItem(sessionStorageKey) === 'true') {
    login.hidden = true;
    dashboard.hidden = false;
    loadDashboardScripts().catch(() => {
      dashboard.hidden = true;
      login.hidden = false;
      sessionStorage.removeItem(sessionStorageKey);
      showMessage('Could not load the dashboard files. Keep them together and try again.', true);
    });
  }
})();