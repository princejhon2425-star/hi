(function () {
  const config = window.MRXBackendConfig || {};
  const sessionKey = 'mrx-supabase-session-v1';
  const table = 'repair_requests';

  function getBaseUrl() {
    const url = typeof config.supabaseUrl === 'string' ? config.supabaseUrl.trim() : '';
    const anonKey = typeof config.supabaseAnonKey === 'string' ? config.supabaseAnonKey.trim() : '';
    if (!url || !anonKey) {
      throw new Error('Shared request storage is not configured. Follow the Supabase setup guide.');
    }
    if (!/^https:\/\/[^/]+$/i.test(url)) {
      throw new Error('The Supabase project URL must be an HTTPS URL without a trailing slash.');
    }
    return url;
  }

  function getAnonKey() {
    const anonKey = typeof config.supabaseAnonKey === 'string' ? config.supabaseAnonKey.trim() : '';
    if (!anonKey) {
      throw new Error('Shared request storage is not configured. Follow the Supabase setup guide.');
    }
    return anonKey;
  }

  function getPublicApiHeaders() {
    const anonKey = getAnonKey();
    const headers = { apikey: anonKey };
    if (!anonKey.startsWith('sb_publishable_')) {
      headers.Authorization = 'Bearer ' + anonKey;
    }
    return headers;
  }

  function readSession() {
    const stored = sessionStorage.getItem(sessionKey);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch (error) {
      sessionStorage.removeItem(sessionKey);
      throw new Error('The saved admin session is invalid. Sign in again.');
    }
  }

  function saveSession(session) {
    const savedAt = Date.now();
    sessionStorage.setItem(sessionKey, JSON.stringify({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: savedAt + (Number(session.expires_in) || 3600) * 1000
    }));
  }

  async function send(url, options) {
    let response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      throw new Error('Could not connect to Supabase. Check the project URL and internet connection.');
    }

    const text = await response.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch (error) {
        body = null;
      }
    }
    if (!response.ok) {
      const message = body && (body.message || body.msg || body.error_description || body.error);
      throw new Error(message || ('Supabase returned HTTP ' + response.status + '.'));
    }
    return body;
  }

  async function refreshSession(session) {
    if (!session.refreshToken) {
      sessionStorage.removeItem(sessionKey);
      throw new Error('Your admin session expired. Sign in again.');
    }
    const response = await send(getBaseUrl() + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: {
        apikey: getAnonKey(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: session.refreshToken })
    });
    saveSession(response);
    return response.access_token;
  }

  async function getAccessToken() {
    const session = readSession();
    if (!session || !session.accessToken) {
      throw new Error('Sign in to your admin account to view requests.');
    }
    if (session.expiresAt <= Date.now() + 30000) {
      return refreshSession(session);
    }
    return session.accessToken;
  }

  async function request(path, options) {
    const accessToken = await getAccessToken();
    const response = await send(getBaseUrl() + '/rest/v1/' + table + path, {
      ...options,
      headers: {
        apikey: getAnonKey(),
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
        ...(options && options.headers)
      }
    });
    return response;
  }

  function fromRow(row) {
    return {
      ticketId: row.ticket_id,
      sourcePage: row.source_page,
      name: row.name,
      email: row.email,
      phone: row.phone,
      issue: row.issue,
      service: row.service,
      submittedAt: row.submitted_at,
      status: row.status
    };
  }

  async function submitRequest(data) {
    const baseUrl = getBaseUrl();
    const row = {
      ticket_id: data.ticketId,
      source_page: data.sourcePage,
      name: data.name,
      email: data.email,
      phone: data.phone,
      issue: data.issue,
      service: data.service || null
    };
    await send(baseUrl + '/rest/v1/' + table, {
      method: 'POST',
      headers: {
        ...getPublicApiHeaders(),
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(row)
    });
    return {
      ...data,
      submittedAt: new Date().toISOString(),
      status: 'New'
    };
  }

  async function signIn(email, password) {
    const response = await send(getBaseUrl() + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: {
        apikey: getAnonKey(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    if (!response.access_token || !response.refresh_token) {
      throw new Error('Supabase did not return a valid admin session.');
    }
    saveSession(response);
  }

  async function listRequests() {
    const rows = await request(
      '?select=ticket_id,source_page,name,email,phone,issue,service,submitted_at,status&order=submitted_at.desc',
      { method: 'GET' }
    );
    if (!Array.isArray(rows)) throw new Error('Supabase returned an invalid request list.');
    return rows.map(fromRow);
  }

  async function updateRequestStatus(ticketId, status) {
    const query = '?ticket_id=eq.' + encodeURIComponent(ticketId) + '&select=ticket_id';
    const rows = await request(query, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status })
    });
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Request not found. Refresh the list and try again.');
    }
  }

  async function deleteRequest(ticketId) {
    const query = '?ticket_id=eq.' + encodeURIComponent(ticketId) + '&select=ticket_id';
    const rows = await request(query, {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' }
    });
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Request not found. Refresh the list and try again.');
    }
  }

  function signOut() {
    sessionStorage.removeItem(sessionKey);
  }

  window.MRXBackend = {
    isConfigured: () => Boolean(config.supabaseUrl && config.supabaseAnonKey),
    signIn,
    signOut,
    submitRequest,
    listRequests,
    updateRequestStatus,
    deleteRequest
  };
})();
