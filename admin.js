(function () {
  const site = window.MRXSite;
  const contentDefaults = {
    brand: 'M.R.X Computer Solutions',
    founderName: 'Yohannes Fiesha',
    homeTitle: 'M.R.X COMPUTER SOLUTIONS',
    homeTagline: 'Where All Problems Are Solved',
    homeDescription: 'Professional Computer Repair, Computer Sales, Laptop Accessories, Phone Accessories, Software Installation and Technical Support.',
    servicesHeading: 'Our Services',
    aboutHeading: 'About Us',
    aboutDescription: 'M.R.X Computer Solutions is dedicated to providing professional technology services including computer repair, maintenance, sales and support. We believe every customer deserves fast, reliable and affordable solutions.',
    repairTitle: 'Computer Repair',
    repairLead: 'Fast and reliable solutions for slow systems, broken screens, software issues, hardware failures, and everyday computer problems. We fix what matters and keep your devices running smoothly.',
    repairFormHeading: 'Book a Repair',
    salesTitle: 'Computer Sales',
    salesIntro: 'Browse our available computers, laptops, and upgrades.',
    confirmationTitle: 'Request Submitted Successfully',
    confirmationMessage: 'Your repair request has been received and is now waiting for technician review.',
    indexBrand: 'M.R.X',
    indexDomain: 'm.r.x.com',
    indexTagline: 'Computer repair • computer sales • laptop and pc accessories'
  };

  const requestStatuses = ['New', 'In review', 'Repair in progress', 'Ready for pickup', 'Completed'];
  const productForm = document.getElementById('productForm');
  const contentForm = document.getElementById('contentForm');
  const productMessage = document.getElementById('productMessage');
  const contentMessage = document.getElementById('contentMessage');
  const requestMessage = document.getElementById('requestMessage');
  const imageDropzone = document.getElementById('imageDropzone');
  const imageFileInput = document.getElementById('productImageFile');
  const imagePreview = document.getElementById('imagePreview');
  let selectedProductImage = '';

  function showImagePreview(image, altText) {
    selectedProductImage = image || '';
    imagePreview.hidden = !selectedProductImage;
    imagePreview.src = selectedProductImage;
    imagePreview.alt = altText || 'Selected product image preview';
    document.getElementById('imageActions').hidden = !selectedProductImage;
    imageDropzone.hidden = Boolean(selectedProductImage);
  }

  function loadImageFile(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showMessage(productMessage, 'Choose a JPG, PNG, or WebP image.', true);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showMessage(productMessage, 'That image is larger than 10 MB. Choose a smaller file.', true);
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      const maxDimension = 1200;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        showMessage(productMessage, 'Your browser could not prepare that image. Try another image.', true);
        return;
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let quality = 0.82;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > 900000 && quality > 0.45) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      if (dataUrl.length > 900000) {
        showMessage(productMessage, 'That image is still too large after resizing. Choose a smaller image.', true);
        return;
      }

      showImagePreview(dataUrl, file.name);
      showMessage(productMessage, 'Image ready. Save the product to keep it.', false);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      showMessage(productMessage, 'Could not open that image. Try a different file.', true);
    };
    image.src = imageUrl;
  }

  document.getElementById('chooseImageButton').addEventListener('click', () => imageFileInput.click());
  imageFileInput.addEventListener('change', () => {
    loadImageFile(imageFileInput.files && imageFileInput.files[0]);
    imageFileInput.value = '';
  });
  imageDropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    imageDropzone.classList.add('dragover');
  });
  imageDropzone.addEventListener('dragleave', (event) => {
    if (!imageDropzone.contains(event.relatedTarget)) imageDropzone.classList.remove('dragover');
  });
  imageDropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    imageDropzone.classList.remove('dragover');
    const files = event.dataTransfer && event.dataTransfer.files;
    if (files && files.length > 1) {
      showMessage(productMessage, 'Add one product image at a time.', true);
      return;
    }
    loadImageFile(files && files[0]);
  });
  document.getElementById('removeImageButton').addEventListener('click', () => {
    showImagePreview('');
    showMessage(productMessage, 'Image removed. Save the product to apply the change.', false);
  });

  function showMessage(element, message, isError) {
    element.textContent = message;
    element.classList.toggle('error', Boolean(isError));
    element.classList.toggle('success', !isError);
  }

  function escapeText(value) {
    return String(value == null ? '' : value);
  }

  function getProducts() {
    const products = site.read(site.keys.products, []);
    if (!Array.isArray(products)) throw new Error('Saved products are not a list.');
    return products;
  }

  function renderProducts() {
    const products = getProducts();
    const table = document.getElementById('productTable');
    table.replaceChildren();
    products.forEach((product) => {
      const row = document.createElement('tr');
      [product.name, product.category, product.price].forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = escapeText(value);
        row.appendChild(cell);
      });

      const actions = document.createElement('td');
      actions.className = 'table-actions';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'acrylic-btn';
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', () => editProduct(product.id));
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'acrylic-btn danger';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => deleteProduct(product.id));
      actions.append(editButton, deleteButton);
      row.appendChild(actions);
      table.appendChild(row);
    });
    document.getElementById('noProducts').hidden = products.length > 0;
  }

  function clearProductForm() {
    productForm.reset();
    showImagePreview('');
    document.getElementById('productId').value = '';
    document.getElementById('saveProductButton').textContent = 'Add product';
    document.getElementById('cancelEditButton').hidden = true;
  }

  function editProduct(id) {
    const product = getProducts().find((item) => item.id === id);
    if (!product) {
      showMessage(productMessage, 'That product no longer exists. Refresh the list and try again.', true);
      return;
    }
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = product.price;
    showImagePreview(product.image || '', product.name + ' image preview');
    document.getElementById('productDescription').value = product.description;
    document.getElementById('saveProductButton').textContent = 'Save changes';
    document.getElementById('cancelEditButton').hidden = false;
    productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function deleteProduct(id) {
    const products = getProducts();
    const updated = products.filter((product) => product.id !== id);
    if (updated.length === products.length) {
      showMessage(productMessage, 'That product was not found.', true);
      return;
    }
    site.write(site.keys.products, updated);
    renderProducts();
    showMessage(productMessage, 'Product deleted.', false);
  }

  function getContent() {
    const saved = site.read(site.keys.content, {});
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
      throw new Error('Saved page content is not valid.');
    }
    return { ...contentDefaults, ...saved };
  }

  function loadContentForm() {
    const content = getContent();
    contentForm.querySelectorAll('[data-content-field]').forEach((field) => {
      field.value = content[field.dataset.contentField] || '';
    });
  }

  async function renderRequests() {
    const requests = await window.MRXBackend.listRequests();
    const table = document.getElementById('requestTable');
    table.replaceChildren();
    requests.forEach((request) => {
      const row = document.createElement('tr');
      const values = [
        request.ticketId,
        request.sourcePage,
        request.name,
        [request.email, request.phone].filter(Boolean).join(' • '),
        [request.service, request.issue].filter(Boolean).join(': '),
        request.submittedAt ? new Date(request.submittedAt).toLocaleString() : '—'
      ];
      values.forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = escapeText(value || '—');
        row.appendChild(cell);
      });

      const statusCell = document.createElement('td');
      const statusSelect = document.createElement('select');
      statusSelect.className = 'status-select';
      statusSelect.setAttribute('aria-label', 'Request status');
      statusSelect.dataset.previousStatus = request.status || 'New';
      requestStatuses.forEach((status) => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        option.selected = (request.status || 'New') === status;
        statusSelect.appendChild(option);
      });
      statusSelect.addEventListener('change', () => {
        updateRequestStatus(request.ticketId, statusSelect.value, statusSelect);
      });
      statusCell.appendChild(statusSelect);
      row.appendChild(statusCell);

      const actionCell = document.createElement('td');
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'acrylic-btn danger';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => deleteRequest(request.ticketId, deleteButton));
      actionCell.appendChild(deleteButton);
      row.appendChild(actionCell);
      table.appendChild(row);
    });
    document.getElementById('noRequests').hidden = requests.length > 0;
  }

  async function updateRequestStatus(ticketId, status, select) {
    const previousStatus = select.dataset.previousStatus || 'New';
    select.disabled = true;
    try {
      await window.MRXBackend.updateRequestStatus(ticketId, status);
      select.dataset.previousStatus = status;
      showMessage(requestMessage, 'Request status updated.', false);
    } catch (error) {
      select.value = previousStatus;
      showMessage(requestMessage, error.message, true);
    } finally {
      select.disabled = false;
    }
  }

  async function deleteRequest(ticketId, button) {
    button.disabled = true;
    try {
      await window.MRXBackend.deleteRequest(ticketId);
      await renderRequests();
      showMessage(requestMessage, 'Request deleted.', false);
    } catch (error) {
      button.disabled = false;
      showMessage(requestMessage, error.message, true);
    }
  }

  function setActiveTab(tabName) {
    document.querySelectorAll('[data-tab]').forEach((tab) => {
      const active = tab.dataset.tab === tabName;
      tab.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('[data-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.panel !== tabName;
    });
  }

  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
  });

  productForm.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const products = getProducts();
      const id = document.getElementById('productId').value ||
        'product-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      const product = {
        id,
        name: document.getElementById('productName').value.trim(),
        category: document.getElementById('productCategory').value.trim(),
        price: document.getElementById('productPrice').value.trim(),
        image: selectedProductImage,
        description: document.getElementById('productDescription').value.trim()
      };
      const existing = products.findIndex((item) => item.id === id);
      if (existing === -1) products.push(product);
      else products[existing] = product;
      site.write(site.keys.products, products);
      renderProducts();
      clearProductForm();
      showMessage(productMessage, existing === -1 ? 'Product added.' : 'Product updated.', false);
    } catch (error) {
      showMessage(productMessage, error.message, true);
    }
  });

  document.getElementById('cancelEditButton').addEventListener('click', clearProductForm);

  contentForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const content = {};
    contentForm.querySelectorAll('[data-content-field]').forEach((field) => {
      content[field.dataset.contentField] = field.value.trim();
    });
    try {
      site.write(site.keys.content, content);
      showMessage(contentMessage, 'Page copy saved. Reload the website pages to see the changes.', false);
    } catch (error) {
      showMessage(contentMessage, 'Could not save page copy: ' + error.message, true);
    }
  });

  document.getElementById('resetContentButton').addEventListener('click', () => {
    try {
      localStorage.removeItem(site.keys.content);
      loadContentForm();
      showMessage(contentMessage, 'Original page copy restored.', false);
    } catch (error) {
      showMessage(contentMessage, error.message, true);
    }
  });

  document.getElementById('refreshRequestsButton').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await renderRequests();
      showMessage(requestMessage, 'Request list refreshed.', false);
    } catch (error) {
      showMessage(requestMessage, error.message, true);
    } finally {
      button.disabled = false;
    }
  });

  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const tabs = Array.from(document.querySelectorAll('[data-tab]'));
        const offset = event.key === 'ArrowRight' ? 1 : -1;
        const next = (tabs.indexOf(tab) + offset + tabs.length) % tabs.length;
        tabs[next].focus();
        setActiveTab(tabs[next].dataset.tab);
      }
    });
  });

  try {
    renderProducts();
    loadContentForm();
  } catch (error) {
    showMessage(document.getElementById('dashboardMessage'), error.message, true);
  }

  renderRequests().catch((error) => {
    showMessage(requestMessage, error.message, true);
  });
})();
