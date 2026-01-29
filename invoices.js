/* global BaseManager */
/* eslint-disable class-methods-use-this, no-restricted-globals, prefer-destructuring, radix, no-param-reassign, max-len */
class InvoiceManager extends BaseManager {
  constructor() {
    super();
    this.apiBase = 'http://localhost:5000/api';
    this.invoices = [];
    this.currentEditId = null;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadInvoices();
    this.setDefaultDates();
    this.showInvoiceNumberPreview();
  }

  setupEventListeners() {
    document
      .getElementById('createInvoiceBtn')
      .addEventListener('click', () => this.showCreateForm());
    document.getElementById('cancelInvoiceBtn').addEventListener('click', () => this.hideForm());
    document.getElementById('invoiceForm').addEventListener('submit', (e) => this.handleSubmit(e));

    // Save as draft button
    const saveAsDraftBtn = document.getElementById('saveAsDraftBtn');
    if (saveAsDraftBtn) {
      saveAsDraftBtn.addEventListener('click', () => this.saveAsDraft());
    }

    document.getElementById('addItemBtn').addEventListener('click', () => this.addInvoiceItem());
    document.getElementById('statusFilter').addEventListener('change', () => this.filterInvoices());
    document
      .getElementById('searchInvoices')
      .addEventListener('input', () => this.filterInvoices());

    const exportBtn = document.getElementById('exportInvoicesBtn');
    if (exportBtn) exportBtn.addEventListener('click', () => this.exportInvoicesTable());

    // Payment terms change
    const paymentTermsSelect = document.getElementById('paymentTerms');
    if (paymentTermsSelect) {
      paymentTermsSelect.addEventListener('change', (e) => {
        const customTermsRow = document.getElementById('customTermsRow');
        if (customTermsRow) {
          customTermsRow.style.display = e.target.value === 'Custom' ? 'block' : 'none';
        }
        this.updateDueDateByTerms(e.target.value);
      });
    }

    // Attachment handling
    const attachmentsInput = document.getElementById('invoiceAttachments');
    if (attachmentsInput) {
      attachmentsInput.addEventListener('change', (e) => this.handleAttachments(e));
    }

    // Setup initial item calculation
    this.setupItemCalculations();
  }

  setupItemCalculations() {
    const itemsContainer = document.getElementById('invoiceItems');
    itemsContainer.addEventListener('input', (e) => {
      if (
        e.target.classList.contains('item-quantity')
        || e.target.classList.contains('item-price')
        || e.target.classList.contains('item-discount')
        || e.target.classList.contains('item-discount-type')
      ) {
        this.updateItemTotal(e.target.closest('.invoice-item-row'));
        this.updateInvoiceTotals();
      }
    });

    itemsContainer.addEventListener('change', (e) => {
      if (e.target.classList.contains('item-discount-type')) {
        this.updateItemTotal(e.target.closest('.invoice-item-row'));
        this.updateInvoiceTotals();
      }
    });

    // Tax rate change
    const taxRateInput = document.getElementById('taxRate');
    if (taxRateInput) {
      taxRateInput.addEventListener('input', () => this.updateInvoiceTotals());
    }

    itemsContainer.addEventListener('click', (e) => {
      if (e.target.closest('.btn-remove-item')) {
        this.removeInvoiceItem(e.target.closest('.invoice-item-row'));
      }
    });
  }

  showCreateForm() {
    document.getElementById('invoiceFormSection').style.display = 'block';
    document.querySelector('.sales-form-section h2').textContent = 'Create New Invoice';
    this.currentEditId = null;
  }

  hideForm() {
    document.getElementById('invoiceFormSection').style.display = 'none';
    document.getElementById('invoiceForm').reset();
    this.resetInvoiceItems();
    this.setDefaultDates();
  }

  setDefaultDates() {
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + 30);

    document.getElementById('invoiceDate').value = today.toISOString().split('T')[0];
    document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];
  }

  async loadInvoices() {
    try {
      const res = await fetch(`${this.apiBase}/invoices`);
      if (!res.ok) throw new Error('Failed to load invoices');
      const data = await res.json();
      this.invoices = data.map((inv) => this.normalizeInvoice(inv));
    } catch (err) {
      console.warn('Falling back to seed invoices', err);
      this.invoices = this.getInitialInvoices();
    }
    this.renderInvoicesTable();
  }

  normalizeInvoice(inv) {
    return {
      ...inv,
      id: inv._id || inv.id,
      invoiceNumber: inv.invoiceNumber || inv.number,
      items: (inv.items || []).map((it) => ({
        ...it,
        price: it.unitPrice ?? it.price ?? 0,
      })),
      subtotal: inv.subtotal ?? 0,
      discount: inv.discountTotal ?? inv.discount ?? 0,
      taxRate: inv.taxRate ?? 10,
      tax: inv.tax ?? 0,
      total: inv.total ?? 0,
      status: inv.status || 'pending',
    };
  }

  showInvoiceNumberPreview() {
    const preview = document.getElementById('previewInvoiceNumber');
    if (preview) preview.textContent = 'Auto-generated on save';
  }

  addInvoiceItem() {
    const itemsContainer = document.getElementById('invoiceItems');
    const itemRow = document.createElement('div');
    itemRow.className = 'invoice-item-row';
    itemRow.innerHTML = `
            <div class="form-group">
                <label>Item Description</label>
                <input type="text" class="item-description" placeholder="Item description" required>
            </div>
            <div class="form-group">
                <label>Quantity</label>
                <input type="number" class="item-quantity" placeholder="1" min="1" required>
            </div>
            <div class="form-group">
                <label>Unit Price</label>
                <input type="number" class="item-price" placeholder="0.00" step="0.01" min="0" required>
            </div>
          <div class="form-group">
            <label>Discount</label>
            <div style="display: flex; gap: 0.25rem;">
              <input type="number" class="item-discount" placeholder="0" min="0" step="0.01" style="flex: 1;" />
              <select class="item-discount-type" style="width: 60px;">
                <option value="percentage">%</option>
                <option value="fixed">$</option>
              </select>
            </div>
          </div>
            <div class="form-group">
                <label>Total</label>
                <input type="text" class="item-total" readonly>
            </div>
            <button type="button" class="btn-remove-item"><i class="fas fa-times"></i></button>
        `;
    itemsContainer.appendChild(itemRow);
  }

  removeInvoiceItem(itemRow) {
    if (document.querySelectorAll('.invoice-item-row').length > 1) {
      itemRow.remove();
      this.updateInvoiceTotals();
    }
  }

  updateItemTotal(itemRow) {
    const quantity = parseFloat(itemRow.querySelector('.item-quantity').value) || 0;
    const price = parseFloat(itemRow.querySelector('.item-price').value) || 0;
    const discount = parseFloat(itemRow.querySelector('.item-discount').value) || 0;
    const discountType = itemRow.querySelector('.item-discount-type').value;

    const subtotal = quantity * price;
    let discountAmount = 0;

    if (discount > 0) {
      if (discountType === 'percentage') {
        discountAmount = subtotal * (discount / 100);
      } else {
        discountAmount = discount;
      }
    }

    const total = subtotal - discountAmount;
    itemRow.querySelector('.item-total').value = `$${total.toFixed(2)}`;
  }

  updateInvoiceTotals() {
    const itemRows = document.querySelectorAll('.invoice-item-row');
    let subtotal = 0;
    let totalDiscount = 0;

    itemRows.forEach((row) => {
      const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
      const price = parseFloat(row.querySelector('.item-price').value) || 0;
      const discount = parseFloat(row.querySelector('.item-discount').value) || 0;
      const discountType = row.querySelector('.item-discount-type').value;

      const itemSubtotal = quantity * price;
      subtotal += itemSubtotal;

      if (discount > 0) {
        if (discountType === 'percentage') {
          totalDiscount += itemSubtotal * (discount / 100);
        } else {
          totalDiscount += discount;
        }
      }
    });

    const taxRate = parseFloat(document.getElementById('taxRate')?.value || 10) / 100;
    const afterDiscount = subtotal - totalDiscount;
    const tax = afterDiscount * taxRate;
    const total = afterDiscount + tax;

    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('discountAmount').textContent = `-$${totalDiscount.toFixed(2)}`;
    document.getElementById('taxAmount').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('finalTotal').textContent = `$${total.toFixed(2)}`;
  }

  resetInvoiceItems() {
    const itemsContainer = document.getElementById('invoiceItems');
    itemsContainer.innerHTML = `
            <div class="invoice-item-row">
                <div class="form-group">
                    <label>Item Description</label>
                    <input type="text" class="item-description" placeholder="Item description" required>
                </div>
                <div class="form-group">
                    <label>Quantity</label>
                    <input type="number" class="item-quantity" placeholder="1" min="1" required>
                </div>
                <div class="form-group">
                    <label>Unit Price</label>
                    <input type="number" class="item-price" placeholder="0.00" step="0.01" min="0" required>
                </div>
            <div class="form-group">
              <label>Discount</label>
              <div style="display: flex; gap: 0.25rem;">
                <input type="number" class="item-discount" placeholder="0" min="0" step="0.01" style="flex: 1;" />
                <select class="item-discount-type" style="width: 60px;">
                  <option value="percentage">%</option>
                  <option value="fixed">$</option>
                </select>
              </div>
            </div>
                <div class="form-group">
                    <label>Total</label>
                    <input type="text" class="item-total" readonly>
                </div>
                <button type="button" class="btn-remove-item"><i class="fas fa-times"></i></button>
            </div>
        `;
    this.updateInvoiceTotals();
  }

  handleSubmit(e) {
    e.preventDefault();
    this.saveInvoice(false);
  }

  async saveInvoice(isDraft = false) {
    const invoiceData = this.collectInvoiceData();
    if (!invoiceData) return;

    invoiceData.status = isDraft ? 'draft' : 'sent';
    invoiceData.createdAt = invoiceData.createdAt || new Date().toISOString();

    try {
      const existing = this.currentEditId
        ? this.invoices.find((inv) => inv.id === this.currentEditId)
        : null;

      if (existing && existing.invoiceNumber) {
        invoiceData.invoiceNumber = existing.invoiceNumber;
      }

      const saved = await this.persistInvoice(invoiceData);
      const normalized = this.normalizeInvoice(saved);

      if (this.currentEditId) {
        const idx = this.invoices.findIndex((inv) => inv.id === normalized.id);
        if (idx !== -1) this.invoices[idx] = normalized;
      } else {
        this.invoices.unshift(normalized);
      }

      this.renderInvoicesTable();
      this.hideForm();
      this.showNotification(
        `Invoice ${isDraft ? 'saved as draft' : 'sent'} successfully`,
        'success',
      );
    } catch (err) {
      console.error(err);
      this.showNotification('Failed to save invoice', 'danger');
    }
  }

  renderInvoicesTable() {
    const tbody = document.getElementById('invoicesTableBody');
    const filteredInvoices = this.getFilteredInvoices();

    tbody.innerHTML = filteredInvoices
      .map((invoice) => {
        const status = this.getInvoiceStatus(invoice);
        return `
                <tr>
                    <td>${invoice.invoiceNumber || invoice.number}</td>
                    <td>${invoice.clientName}</td>
                    <td>${this.formatDate(invoice.invoiceDate)}</td>
                    <td>${this.formatDate(invoice.dueDate)}</td>
                    <td>$${invoice.total.toFixed(2)}</td>
                    <td><span class="status-badge ${status.class}">${status.text}</span></td>
                    <td>
                        ${
  invoice.status !== 'paid'
    ? `<button class="btn-edit" onclick="invoiceManager.markAsPaid('${invoice.id}')" title="Mark as Paid">
                                <i class="fas fa-check"></i>
                            </button>`
    : ''
}
                        <button class="btn-edit" onclick="invoiceManager.viewInvoice('${invoice.id}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-edit" onclick="invoiceManager.downloadInvoicePDF('${invoice.id}')" title="Download PDF">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                        <button class="btn-delete" onclick="invoiceManager.deleteInvoice('${invoice.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
      })
      .join('');
  }

  getFilteredInvoices() {
    const statusFilter = document.getElementById('statusFilter').value;
    const searchTerm = document.getElementById('searchInvoices').value.toLowerCase();

    return this.invoices.filter((invoice) => {
      const status = this.getInvoiceStatus(invoice);
      const matchesStatus = !statusFilter || status.class === statusFilter;
      const matchesSearch = !searchTerm
        || (invoice.invoiceNumber || invoice.number || '').toLowerCase().includes(searchTerm)
        || invoice.clientName.toLowerCase().includes(searchTerm);
      return matchesStatus && matchesSearch;
    });
  }

  filterInvoices() {
    this.renderInvoicesTable();
  }

  async exportInvoicesTable() {
    await this.ensurePdfLib();
    const table = document.querySelector('.table-responsive');
    if (!table) return;
    const opt = {
      margin: 0.3,
      filename: 'invoices.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' },
    };
    window.html2pdf().set(opt).from(table).save();
  }

  async persistInvoice(invoiceData) {
    const payload = {
      invoiceNumber: invoiceData.invoiceNumber,
      clientName: invoiceData.clientName,
      clientEmail: invoiceData.clientEmail,
      clientPhone: invoiceData.clientPhone,
      clientAddress: invoiceData.clientAddress,
      paymentTerms: invoiceData.paymentTerms,
      customPaymentTerms: invoiceData.customPaymentTerms,
      currency: invoiceData.currency,
      invoiceDate: invoiceData.invoiceDate,
      dueDate: invoiceData.dueDate,
      notes: invoiceData.notes,
      terms: invoiceData.terms,
      items: invoiceData.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.price,
        discount: item.discount
          ? { type: item.discount.type, value: item.discount.value }
          : { type: 'percentage', value: 0 },
        amount: item.total,
      })),
      subtotal: invoiceData.subtotal,
      discountTotal: invoiceData.discount,
      taxRate: invoiceData.taxRate,
      tax: invoiceData.tax,
      total: invoiceData.total,
      status: invoiceData.status,
    };

    const isEdit = Boolean(this.currentEditId);
    const url = isEdit
      ? `${this.apiBase}/invoices/${this.currentEditId}`
      : `${this.apiBase}/invoices`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Invoice save failed');
    return res.json();
  }

  async deleteInvoice(invoiceId) {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      const res = await fetch(`${this.apiBase}/invoices/${invoiceId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      this.invoices = this.invoices.filter((inv) => inv.id !== invoiceId);
      this.renderInvoicesTable();
      this.showNotification('Invoice deleted', 'success');
    } catch (err) {
      console.error(err);
      this.showNotification('Failed to delete invoice', 'danger');
    }
  }

  async markAsPaid(invoiceId) {
    const invoice = this.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;
    try {
      const res = await fetch(`${this.apiBase}/invoices/${invoiceId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: invoice.total, method: 'cash', reference: 'manual' }),
      });
      if (!res.ok) throw new Error('Mark paid failed');
      const updated = this.normalizeInvoice(await res.json());
      const idx = this.invoices.findIndex((inv) => inv.id === invoiceId);
      if (idx !== -1) this.invoices[idx] = updated;
      this.renderInvoicesTable();
      this.showNotification('Invoice marked as paid', 'success');
    } catch (err) {
      console.error(err);
      this.showNotification('Failed to mark as paid', 'danger');
    }
  }

  viewInvoice(invoiceId) {
    const invoice = this.invoices.find((inv) => inv.id === invoiceId);
    if (invoice) {
      this.showNotification('Invoice viewer would open here', 'info');
      // In a real app, this would open a detailed invoice view or PDF
    }
  }

  getInitialInvoices() {
    return [
      {
        id: '1',
        number: 'INV-1001',
        clientName: 'ABC Corporation',
        clientEmail: 'billing@abc-corp.com',
        invoiceDate: '2025-12-01',
        dueDate: '2025-12-31',
        description: 'Web development services',
        total: 2500.0,
        status: 'paid',
      },
      {
        id: '2',
        number: 'INV-1002',
        clientName: 'XYZ Enterprises',
        clientEmail: 'finance@xyz-ent.com',
        invoiceDate: '2025-12-05',
        dueDate: '2026-01-05',
        description: 'Consulting services',
        total: 1800.0,
        status: 'pending',
      },
      {
        id: '3',
        number: 'INV-1003',
        clientName: 'Tech Solutions LLC',
        clientEmail: 'accounts@techsol.com',
        invoiceDate: '2025-11-20',
        dueDate: '2025-12-10',
        description: 'Software licensing',
        total: 3200.0,
        status: 'pending',
      },
    ];
  }

  updateDueDateByTerms(terms) {
    const invoiceDate = new Date(document.getElementById('invoiceDate').value);
    let daysToAdd = 30;

    switch (terms) {
      case 'Due on Receipt':
        daysToAdd = 0;
        break;
      case 'Net 15':
        daysToAdd = 15;
        break;
      case 'Net 30':
        daysToAdd = 30;
        break;
      case 'Net 45':
        daysToAdd = 45;
        break;
      case 'Net 60':
        daysToAdd = 60;
        break;
      default:
        return; // Don't change for custom
    }

    const dueDate = new Date(invoiceDate);
    dueDate.setDate(invoiceDate.getDate() + daysToAdd);
    document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];
  }

  handleAttachments(e) {
    const files = Array.from(e.target.files);
    const attachmentsList = document.getElementById('attachmentsList');

    attachmentsList.innerHTML = files
      .map(
        (file, index) => `
        <div class="attachment-item">
          <i class="fas fa-file"></i>
          <span>${file.name}</span>
          <button type="button" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `,
      )
      .join('');
  }

  saveAsDraft() {
    this.saveInvoice(true);
  }

  collectInvoiceData() {
    // Validate dates
    const invoiceDate = new Date(document.getElementById('invoiceDate').value);
    const dueDate = new Date(document.getElementById('dueDate').value);

    if (dueDate <= invoiceDate) {
      alert('Due date must be after invoice date');
      return null;
    }

    const items = [];
    let totalDiscount = 0;

    document.querySelectorAll('.invoice-item-row').forEach((row) => {
      const description = row.querySelector('.item-description').value;
      const quantity = parseInt(row.querySelector('.item-quantity').value);
      const price = parseFloat(row.querySelector('.item-price').value);
      const discount = parseFloat(row.querySelector('.item-discount').value) || 0;
      const discountType = row.querySelector('.item-discount-type').value;

      if (description && quantity && price) {
        const itemSubtotal = quantity * price;
        let itemDiscount = 0;

        if (discount > 0) {
          itemDiscount = discountType === 'percentage' ? itemSubtotal * (discount / 100) : discount;
          totalDiscount += itemDiscount;
        }

        items.push({
          description,
          quantity,
          price,
          discount: discount > 0 ? { value: discount, type: discountType } : null,
          total: itemSubtotal - itemDiscount,
        });
      }
    });

    const subtotal = items.reduce((sum, item) => {
      const qty = item.quantity || 0;
      const pr = item.price || 0;
      return sum + qty * pr;
    }, 0);

    const taxRate = parseFloat(document.getElementById('taxRate')?.value || 10) / 100;
    const afterDiscount = subtotal - totalDiscount;
    const tax = afterDiscount * taxRate;
    const total = afterDiscount + tax;

    return {
      id: this.currentEditId || null,
      invoiceNumber: this.currentEditId
        ? this.invoices.find((i) => i.id === this.currentEditId)?.invoiceNumber || null
        : null, // backend will generate when missing
      clientName: document.getElementById('clientName').value,
      clientEmail: document.getElementById('clientEmail').value,
      clientPhone: document.getElementById('clientPhone')?.value || '',
      clientAddress: {
        street: document.getElementById('clientStreet')?.value || '',
        city: document.getElementById('clientCity')?.value || '',
        country: document.getElementById('clientCountry')?.value || '',
      },
      paymentTerms: document.getElementById('paymentTerms')?.value || 'Net 30',
      customPaymentTerms: document.getElementById('customPaymentTerms')?.value || '',
      currency: document.getElementById('currency')?.value || 'UGX',
      invoiceDate: document.getElementById('invoiceDate').value,
      dueDate: document.getElementById('dueDate').value,
      description: document.getElementById('description').value,
      notes: document.getElementById('invoiceNotes')?.value || '',
      terms: document.getElementById('invoiceTerms')?.value || '',
      items,
      subtotal,
      discount: totalDiscount,
      tax,
      taxRate: taxRate * 100,
      total,
      status: this.currentEditId
        ? this.invoices.find((inv) => inv.id === this.currentEditId)?.status || 'pending'
        : 'pending',
    };
  }

  printInvoice(invoiceId) {
    const invoice = this.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    const printWindow = window.open('', '_blank');
    const currencySymbol = this.getCurrencySymbol(invoice.currency || 'UGX');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber || invoice.number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .invoice-header { text-align: center; margin-bottom: 30px; }
            .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .invoice-items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .invoice-items th, .invoice-items td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            .invoice-items th { background: #f5f5f5; }
            .totals { text-align: right; margin-top: 20px; }
            .totals div { margin: 5px 0; }
            .total-amount { font-size: 1.2em; font-weight: bold; margin-top: 10px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <h1>INVOICE</h1>
            <h2>${invoice.invoiceNumber || invoice.number}</h2>
          </div>
        
          <div class="invoice-details">
            <div>
              <strong>Bill To:</strong><br>
              ${invoice.clientName}<br>
              ${invoice.clientEmail}<br>
              ${invoice.clientPhone || ''}<br>
              ${invoice.clientAddress?.street || ''}<br>
              ${invoice.clientAddress?.city || ''} ${invoice.clientAddress?.country || ''}
            </div>
            <div>
              <strong>Invoice Date:</strong> ${this.formatDate(invoice.invoiceDate)}<br>
              <strong>Due Date:</strong> ${this.formatDate(invoice.dueDate)}<br>
              <strong>Status:</strong> ${invoice.status || 'pending'}
            </div>
          </div>
        
          <table class="invoice-items">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Discount</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items
    .map(
      (item) => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${currencySymbol}${item.price.toFixed(2)}</td>
                  <td>${item.discount ? (item.discount.type === 'percentage' ? `${item.discount.value}%` : `${currencySymbol}${item.discount.value}`) : '-'}</td>
                  <td>${currencySymbol}${item.total.toFixed(2)}</td>
                </tr>
              `,
    )
    .join('')}
            </tbody>
          </table>
        
          <div class="totals">
            <div>Subtotal: ${currencySymbol}${invoice.subtotal.toFixed(2)}</div>
            ${invoice.discount ? `<div>Discount: -${currencySymbol}${invoice.discount.toFixed(2)}</div>` : ''}
            <div>Tax (${invoice.taxRate || 10}%): ${currencySymbol}${invoice.tax.toFixed(2)}</div>
            <div class="total-amount">Total: ${currencySymbol}${invoice.total.toFixed(2)}</div>
          </div>
        
          ${invoice.terms ? `<div style="margin-top: 30px;"><strong>Terms & Conditions:</strong><br>${invoice.terms}</div>` : ''}
        
          <button onclick="window.print()" style="margin-top: 30px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Print Invoice</button>
        </body>
        </html>
      `);

    printWindow.document.close();
  }

  async downloadInvoicePDF(invoiceId) {
    const invoice = this.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;
    await this.ensurePdfLib();
    const currencySymbol = this.getCurrencySymbol(invoice.currency || 'UGX');

    const html = `
        <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 900px;">
          <div style="text-align:center; margin-bottom: 16px;">
            <h1 style="margin:0;">Invoice</h1>
            <h3 style="margin:4px 0;">${invoice.invoiceNumber || invoice.number}</h3>
          </div>
          <div style="display:flex; justify-content: space-between; margin-bottom:16px;">
            <div>
              <strong>Bill To:</strong><br>
              ${invoice.clientName || ''}<br>
              ${invoice.clientEmail || ''}<br>
              ${invoice.clientPhone || ''}<br>
              ${invoice.clientAddress?.street || ''}<br>
              ${[invoice.clientAddress?.city, invoice.clientAddress?.country].filter(Boolean).join(' ')}
            </div>
            <div style="text-align:right;">
              <div><strong>Invoice Date:</strong> ${this.formatDate(invoice.invoiceDate)}</div>
              <div><strong>Due Date:</strong> ${this.formatDate(invoice.dueDate)}</div>
              <div><strong>Status:</strong> ${invoice.status || 'pending'}</div>
            </div>
          </div>
          <table style="width:100%; border-collapse: collapse; margin-bottom: 12px;">
            <thead>
              <tr style="background:#f5f5f5;">
                <th style="border:1px solid #ddd; padding:8px; text-align:left;">Description</th>
                <th style="border:1px solid #ddd; padding:8px; text-align:left;">Qty</th>
                <th style="border:1px solid #ddd; padding:8px; text-align:left;">Unit</th>
                <th style="border:1px solid #ddd; padding:8px; text-align:left;">Discount</th>
                <th style="border:1px solid #ddd; padding:8px; text-align:left;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items
    .map(
      (item) => `
                  <tr>
                    <td style="border:1px solid #ddd; padding:8px;">${item.description}</td>
                    <td style="border:1px solid #ddd; padding:8px;">${item.quantity}</td>
                    <td style="border:1px solid #ddd; padding:8px;">${currencySymbol}${(item.price ?? item.unitPrice ?? 0).toFixed(2)}</td>
                    <td style="border:1px solid #ddd; padding:8px;">${item.discount ? (item.discount.type === 'percentage' ? `${item.discount.value}%` : `${currencySymbol}${item.discount.value}`) : '-'}</td>
                    <td style="border:1px solid #ddd; padding:8px;">${currencySymbol}${(item.total ?? item.amount ?? 0).toFixed(2)}</td>
                  </tr>
                `,
    )
    .join('')}
            </tbody>
          </table>
          <div style="text-align:right; margin-top: 8px;">
            <div>Subtotal: ${currencySymbol}${(invoice.subtotal ?? 0).toFixed(2)}</div>
            ${invoice.discount ? `<div>Discount: -${currencySymbol}${invoice.discount.toFixed(2)}</div>` : ''}
            <div>Tax (${invoice.taxRate || 10}%): ${currencySymbol}${(invoice.tax ?? 0).toFixed(2)}</div>
            <div style="font-size:18px; font-weight:bold; margin-top:4px;">Total: ${currencySymbol}${(invoice.total ?? 0).toFixed(2)}</div>
          </div>
          ${invoice.terms ? `<div style="margin-top:12px;"><strong>Terms:</strong><br>${invoice.terms}</div>` : ''}
        </div>
      `;

    const opt = {
      margin: 0.3,
      filename: `${invoice.invoiceNumber || 'invoice'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    };
    window.html2pdf().set(opt).from(html).save();
  }

  async ensurePdfLib() {
    if (window.html2pdf) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve();
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  getCurrencySymbol(currency) {
    const symbols = {
      UGX: 'UGX ',
      USD: '$',
      EUR: '€',
      GBP: '£',
    };
    return symbols[currency] || `${currency} `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.invoiceManager = new InvoiceManager();
});
