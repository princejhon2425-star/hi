(function () {
  const keys = {
    products: 'mrxProducts',
    content: 'mrxSiteContent',
    requests: 'mrxRepairRequests',
    latestRequest: 'mrxRepairRequest'
  };

  function read(key, fallback) {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;

    try {
      return JSON.parse(stored);
    } catch (error) {
      throw new Error('Saved website data is invalid (' + key + ').');
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getRequests() {
    const requests = read(keys.requests, null);
    if (requests !== null) {
      if (!Array.isArray(requests)) throw new Error('Saved requests are not a list.');
      return requests;
    }

    const legacyRequest = read(keys.latestRequest, null);
    return legacyRequest && typeof legacyRequest === 'object'
      ? [{
          ...legacyRequest,
          ticketId: legacyRequest.ticketId || 'MRX-LEGACY',
          submittedAt: legacyRequest.submittedAt || new Date().toISOString(),
          status: legacyRequest.status || 'New'
        }]
      : [];
  }

  async function saveRequest(data) {
    if (!window.MRXBackend || typeof window.MRXBackend.submitRequest !== 'function') {
      throw new Error('Shared request storage is unavailable. Follow the Supabase setup guide.');
    }
    if (!['home.html', 'computer-repair.html'].includes(data.sourcePage)) {
      throw new Error('The request source page is invalid.');
    }
    const ticketId = 'MRX-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const savedRequest = await window.MRXBackend.submitRequest({
      ...data,
      ticketId,
    });

    try {
      sessionStorage.setItem(keys.latestRequest, JSON.stringify(savedRequest));
    } catch (error) {
      console.error('Request was sent, but its temporary confirmation copy could not be saved:', error);
    }
    return savedRequest;
  }

  function isSafeImagePath(value) {
    return /^https:\/\/[^\s]+$/i.test(value) ||
      /^data:image\/jpeg;base64,[a-z0-9+/]+=*$/i.test(value) ||
      /^(?!\/\/)(?![a-z][a-z0-9+.-]*:)[a-zA-Z0-9_./-][a-zA-Z0-9_./ -]*$/.test(value);
  }

  function applyContent() {
    const content = read(keys.content, {});
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      throw new Error('Saved page content is not valid.');
    }

    document.querySelectorAll('[data-mrx-content]').forEach((element) => {
      const field = element.dataset.mrxContent;
      if (typeof content[field] === 'string') {
        element.textContent = content[field];
      }
    });
  }

  function renderProducts() {
    const container = document.getElementById('productList');
    if (!container) return;

    const products = read(keys.products, []);
    if (!Array.isArray(products)) throw new Error('Saved products are not a list.');
    const searchInput = document.getElementById('searchInput');
    const search = searchInput ? searchInput.value.trim().toLowerCase() : '';
    container.replaceChildren();

    const visibleProducts = products.filter((product) => {
      const searchableText = [
        product.name,
        product.category,
        product.description,
        product.price
      ].join(' ').toLowerCase();
      return searchableText.includes(search);
    });

    visibleProducts.forEach((product) => {
      const card = document.createElement('article');
      card.className = 'product';

      const image = document.createElement('div');
      image.className = 'product-image';
      if (product.image && isSafeImagePath(product.image)) {
        const img = document.createElement('img');
        img.src = product.image;
        img.alt = product.name;
        img.loading = 'lazy';
        image.appendChild(img);
      } else {
        image.textContent = '💻';
      }

      const body = document.createElement('div');
      body.className = 'product-body';
      const name = document.createElement('h3');
      name.textContent = product.name;
      const category = document.createElement('p');
      category.className = 'product-category';
      category.textContent = product.category;
      const description = document.createElement('p');
      description.textContent = product.description;
      const price = document.createElement('div');
      price.className = 'price';
      price.textContent = product.price;
      body.append(name, category, description, price);
      card.append(image, body);
      container.appendChild(card);
    });

    const emptyMessage = document.getElementById('noProducts');
    if (emptyMessage) {
      emptyMessage.hidden = visibleProducts.length > 0;
      emptyMessage.textContent = search && products.length
        ? 'No products match your search.'
        : 'No products are listed yet. Check back soon.';
    }
  }

  window.MRXSite = {
    keys,
    read,
    write,
    getRequests,
    saveRequest,
    isSafeImagePath,
    applyContent,
    renderProducts
  };

  try {
    applyContent();
    renderProducts();
  } catch (error) {
    console.error('Unable to load saved M.R.X website data:', error);
  }
})();
