(function () {
  const backend = window.MRXBackend;
  const login = document.getElementById('adminLogin');
  const dashboard = document.getElementById('adminDashboard');
  const form = document.getElementById('authForm');
  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');
  const description = document.getElementById('authDescription');
  const submitButton = document.getElementById('authSubmit');
  const message = document.getElementById('authMessage');

  function showMessage(text, isError) {
    message.textContent = text;
    message.classList.toggle('success', !isError);
    message.classList.toggle('error', Boolean(isError));
  }

  function loadDashboardScripts() {
    return new Promise((resolve, reject) => {
      const siteScript = document.createElement('script');
      siteScript.src = 'mrx-site.js';
      siteScript.onload = () => {
        const adminScript = document.createElement('script');
        adminScript.src = 'admin.js';
        adminScript.onload = resolve;
        adminScript.onerror = () => reject(new Error('Could not load admin.js.'));
        document.body.appendChild(adminScript);
      };
      siteScript.onerror = () => reject(new Error('Could not load mrx-site.js.'));
      document.body.appendChild(siteScript);
    });
  }

  async function unlockDashboard() {
    login.hidden = true;
    dashboard.hidden = false;
    try {
      await loadDashboardScripts();
    } catch (error) {
      dashboard.hidden = true;
      login.hidden = false;
      backend.signOut();
      showMessage(error.message, true);
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!backend || !backend.isConfigured()) {
      showMessage('Set the Supabase project URL and anon key in mrx-backend-config.js first.', true);
      return;
    }

    submitButton.disabled = true;
    showMessage('Signing in...', false);
    try {
      await backend.signIn(emailInput.value.trim(), passwordInput.value);
      await unlockDashboard();
    } catch (error) {
      showMessage(error.message, true);
      passwordInput.select();
    } finally {
      submitButton.disabled = false;
      passwordInput.value = '';
    }
  });

  document.getElementById('adminLogout').addEventListener('click', () => {
    backend.signOut();
    window.location.reload();
  });

  if (!backend || !backend.isConfigured()) {
    description.textContent = 'Finish the Supabase setup before signing in.';
    showMessage('Shared storage is not configured. See PUBLIC-SETUP.txt.', true);
  } else {
    description.textContent = 'Sign in with the admin account created in your Supabase project.';
  }
})();
