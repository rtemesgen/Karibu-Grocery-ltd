/* global BaseManager, bootstrap */
/* eslint-disable class-methods-use-this, no-restricted-globals, prefer-destructuring, no-nested-ternary, max-len */
// Sales Management JavaScript
class SalesManager extends BaseManager {
  constructor() {
    super();
    this.apiUrl = 'http://localhost:5000/api';
    this.inventory = [];
    this.sales = [];
    this.init();
  }

  async seedInitialStockIfNeeded() {
    try {
      const seededKey = 'initialStockSeeded';
      if (localStorage.getItem(seededKey)) return;

      const res = await fetch(`${this.apiUrl}/stock/seed-initial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        localStorage.setItem(seededKey, 'true');
        console.log('Initial stock items seeded');
      }
    } catch (error) {
      console.warn('Could not seed initial stock', error);
    }
  }

  async loadInventoryFromAPI() {
    try {
      const res = await fetch(`${this.apiUrl}/stock`);
      if (!res.ok) throw new Error('Failed to load stock items');
      const items = await res.json();
      // Normalize for the UI
      this.inventory = items.map((item) => ({
        _id: item._id,
        itemId: item.itemId,
        itemName: item.itemName,
        category: item.category || 'Other',
        quantity: item.quantity || 0,
        unit: item.unit || 'kg',
        price: item.sellingPrice || 0,
        minStock: item.minQuantity || 0,
      }));
      this.saveToStorage('stockItems', this.inventory); // keep a lightweight cache
    } catch (error) {
      console.warn('Could not load stock from API', error);
      // fall back to any cached items so UI is not empty
      const cached = this.loadFromStorage('stockItems', []);
      this.inventory = cached;
    }
  }

  async loadSalesFromAPI() {
    try {
      const res = await fetch(`${this.apiUrl}/sales`);
      if (!res.ok) throw new Error('Failed to load sales');
      this.sales = await res.json();
      this.persistSales();
    } catch (error) {
      console.warn('Could not load sales from API', error);
      this.sales = this.getInitialSales();
      if (!this.sales || this.sales.length === 0) this.backfillSalesFromTransactions();
    }
  }

  async init() {
    this.setupEventListeners();
    this.loadCurrentUser();
    await this.seedInitialStockIfNeeded();
    await this.loadInventoryFromAPI();
    await this.loadSalesFromAPI();
    this.renderInventory();
    this.renderSalesTable();
    this.updateDashboardMetrics();

    // Refresh metrics when transactions or sales change in localStorage
    window.addEventListener('storage', (e) => {
      if (e.key === 'transactions' || e.key === 'sales') {
        if (e.key === 'sales') {
          this.sales = this.loadFromStorage('sales', []);
        }
        this.updateDashboardMetrics();
      }
    });
  }

  loadCurrentUser() {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser'));
      const roleElement = document.getElementById('profileRole');
      const nameElement = document.getElementById('profileName');
      if (roleElement && nameElement && user) {
        roleElement.textContent = user.role || 'User';
        nameElement.textContent = user.username || 'Not logged in';
      }
    } catch {
      // Default to guest if no user
    }
  }

  handleLogout(e) {
    if (e) e.preventDefault();
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
  }

  setupEventListeners() {
    // Add Sale button - opens modal
    const addSaleBtn = document.getElementById('addSaleBtn');
    if (addSaleBtn) {
      addSaleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showAddSaleModal();
      });
    }

    // Form calculations
    document.getElementById('quantity')?.addEventListener('input', () => this.calculateTotal());
    document.getElementById('unitPrice')?.addEventListener('input', () => this.calculateTotal());

    // Payment method custom input toggle
    document.getElementById('paymentMethod')?.addEventListener('change', (e) => {
      const customInput = document.getElementById('customPaymentMethod');
      if (customInput) {
        customInput.disabled = e.target.value !== 'other';
        if (e.target.value !== 'other') customInput.value = '';
      }
    });

    // Form submission
    document.getElementById('salesForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSaleSubmission();
    });

    // Export button
    document.getElementById('exportSalesBtn')?.addEventListener('click', () => {
      this.exportSales();
    });

    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
      this.handleLogout(e);
    });
  }

  showAddSaleModal() {
    const modalElement = document.getElementById('addSaleModal');
    if (!modalElement) return;
    if (typeof bootstrap === 'undefined') return;

    this.clearForm();
    this.setDefaultDate();
    this.populateAvailableItems();

    // Ensure modal starts completely hidden before showing
    modalElement.classList.remove('show');
    modalElement.style.display = 'none';

    // Create and show modal
    const modal = new bootstrap.Modal(modalElement, {
      backdrop: 'static', // Prevent closing on backdrop click
      keyboard: true, // Allow ESC to close
      focus: true, // Focus on modal when opened
    });

    modal.show();

    // Ensure focus is on the modal after it's shown
    setTimeout(() => {
      const firstInput = modalElement.querySelector('select, input, textarea');
      if (firstInput) firstInput.focus();
    }, 300);
  }

  populateAvailableItems() {
    const itemSelect = document.getElementById('itemName');
    if (!itemSelect) return;

    // Clear existing options except the first placeholder
    itemSelect.innerHTML = '<option value="">Select product</option>';

    // Add only items with available stock
    const availableItems = (this.inventory || []).filter((item) => item.quantity > 0);

    availableItems.forEach((item) => {
      const option = document.createElement('option');
      option.value = item._id; // use backend id so we can stock-out later
      option.textContent = `${item.itemName} (${item.quantity} ${item.unit || 'units'} available)`;
      itemSelect.appendChild(option);
    });

    if (availableItems.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No items in stock';
      option.disabled = true;
      itemSelect.appendChild(option);
    }
  }

  calculateTotal() {
    const quantity = parseFloat(document.getElementById('quantity').value) || 0;
    const unitPrice = parseFloat(document.getElementById('unitPrice').value) || 0;
    const total = quantity * unitPrice;

    document.getElementById('totalAmount').textContent = `$${total.toFixed(2)}`;
  }

  setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('saleDate').value = today;
  }

  async handleSaleSubmission() {
    const itemId = document.getElementById('itemName').value.trim();
    const quantity = parseFloat(document.getElementById('quantity').value);
    let unitPrice = parseFloat(document.getElementById('unitPrice').value);
    const customerName = document.getElementById('customerName').value.trim();
    const saleDate = document.getElementById('saleDate').value;
    const description = document.getElementById('description').value;

    if (!itemId || !quantity || !customerName || !saleDate) {
      alert('Please fill all required fields');
      return;
    }

    const stockItem = (this.inventory || []).find((i) => i._id === itemId);
    if (!stockItem) {
      alert('Selected item not found in stock');
      return;
    }

    if (quantity > stockItem.quantity) {
      alert(`Insufficient stock. Available: ${stockItem.quantity} ${stockItem.unit || 'units'}`);
      return;
    }

    if (!unitPrice || Number.isNaN(unitPrice)) {
      unitPrice = stockItem.price || 0;
    }

    const currentUser = (() => {
      try {
        return JSON.parse(localStorage.getItem('currentUser') || 'null');
      } catch {
        return null;
      }
    })();

    let paymentMethod = document.getElementById('paymentMethod')?.value || 'cash';
    if (paymentMethod === 'other') {
      const custom = document.getElementById('customPaymentMethod')?.value.trim();
      paymentMethod = custom || 'cash';
    }

    const salePayload = {
      clientName: customerName,
      productId: stockItem.itemId,
      productName: stockItem.itemName,
      quantity,
      unit: stockItem.unit || 'units',
      unitPrice,
      total: quantity * unitPrice,
      saleDate,
      paymentMethod,
      status: 'completed',
      notes: description,
      user: currentUser?.username || 'System',
    };

    try {
      // First, reduce stock on the backend
      const stockOutRes = await fetch(`${this.apiUrl}/stock/${itemId}/stock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity,
          reason: 'Sale',
          reference: salePayload.productId,
          notes: description,
          user: salePayload.user,
        }),
      });

      if (!stockOutRes.ok) {
        const error = await stockOutRes.json();
        throw new Error(error.error || 'Failed to update stock');
      }

      // Record the sale
      const saleRes = await fetch(`${this.apiUrl}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload),
      });

      if (!saleRes.ok) {
        const error = await saleRes.json();
        throw new Error(error.error || 'Failed to save sale');
      }

      const savedSale = await saleRes.json();
      this.sales.unshift(savedSale);
      this.persistSales();

      // Refresh inventory from backend to reflect new quantity
      await this.loadInventoryFromAPI();

      // Refresh displays
      this.renderSalesTable();
      this.renderInventory();

      // Clear form
      this.clearForm();

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('addSaleModal'));
      if (modal) {
        modal.hide();
      }

      // Update dashboard metrics
      this.updateDashboardMetrics();

      this.showNotification('Sale recorded and stock updated', 'success');
    } catch (error) {
      console.error('Error processing sale', error);
      this.showNotification(error.message || 'Failed to record sale', 'error');
    }
  }

  updateInventory(itemId, soldQuantity) {
    const item = (this.inventory || []).find((i) => i._id === itemId);
    if (item) {
      item.quantity = Math.max(0, item.quantity - soldQuantity);
      this.saveToStorage('stockItems', this.inventory);
    }
  }

  clearForm() {
    document.getElementById('salesForm').reset();
    this.setDefaultDate();
    document.getElementById('totalAmount').textContent = '$0.00';
  }

  renderInventory() {
    const inventoryGrid = document.getElementById('inventoryGrid');
    if (!inventoryGrid) return;

    inventoryGrid.innerHTML = (this.inventory || [])
      .map((item) => {
        const minStock = item.minStock || 0;
        const isLow = item.quantity <= minStock && item.quantity > 0;
        const isOut = item.quantity === 0;
        const badgeClass = isOut ? 'bg-danger' : isLow ? 'bg-warning' : 'bg-success';
        const statusText = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';
        const statusIcon = isOut
          ? '<i class="fas fa-exclamation-circle"></i>'
          : isLow
            ? '<i class="fas fa-exclamation-triangle"></i>'
            : '<i class="fas fa-check-circle"></i>';
        return `
          <div class="col-md-4">
            <div class="card shadow-sm h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h5 class="card-title mb-0">${item.itemName}</h5>
                  <span class="badge bg-secondary">${item.category}</span>
                </div>
                <div class="mb-3">
                  <p class="mb-1 text-muted">Qty: <strong>${item.quantity} ${item.unit || 'units'}</strong></p>
                  <p class="mb-1 text-muted">Price: <strong>UGX ${(item.price || 0).toLocaleString()}</strong></p>
                </div>
                <div class="d-flex align-items-center">
                  <span class="badge ${badgeClass}">${statusIcon} ${statusText}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  renderSalesTable() {
    const tableBody = document.getElementById('salesTableBody');
    if (!tableBody) return;

    if (!this.sales || this.sales.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #999;">No recent sales</td></tr>';
      return;
    }

    tableBody.innerHTML = this.sales
      .map((sale) => {
        const saleId = sale._id || sale.id || sale.saleId;
        const itemName = sale.productName || sale.itemName || '-';
        const client = sale.clientName || sale.customerName || '-';
        const qty = sale.quantity || 0;
        const unit = sale.unit || 'units';
        const unitPrice = sale.unitPrice || 0;
        const total = sale.total || qty * unitPrice;
        const saleDate = sale.saleDate ? this.formatDate(sale.saleDate) : '-';
        return `
        <tr>
          <td>${saleDate}</td>
          <td>${itemName}</td>
          <td>${client}</td>
          <td>${qty} ${unit}</td>
          <td>UGX ${unitPrice.toLocaleString()}</td>
          <td>UGX ${total.toLocaleString()}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="salesManager.editSale('${saleId}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="salesManager.deleteSale('${saleId}')">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
      })
      .join('');
  }

  editSale(saleId) {
    const sale = this.sales.find((s) => (s._id || s.id || s.saleId) === saleId);
    if (sale) {
      // Populate form with sale data
      const matchedItem = (this.inventory || []).find((i) => i.itemName === sale.productName);
      if (matchedItem) {
        document.getElementById('itemName').value = matchedItem._id;
      }
      document.getElementById('quantity').value = sale.quantity;
      document.getElementById('unitPrice').value = sale.unitPrice;
      document.getElementById('customerName').value = sale.clientName || sale.customerName || '';
      document.getElementById('saleDate').value = sale.saleDate
        ? sale.saleDate.toString().slice(0, 10)
        : '';
      document.getElementById('description').value = sale.notes || sale.description || '';

      // Remove from sales list (will be re-added when saved)
      this.sales = this.sales.filter((s) => (s._id || s.id || s.saleId) !== saleId);
      this.renderSalesTable();

      this.calculateTotal();
      this.showNotification('Sale loaded for editing', 'info');
    }
  }

  deleteSale(saleId) {
    if (confirm('Are you sure you want to delete this sale?')) {
      this.sales = this.sales.filter((s) => (s._id || s.id || s.saleId) !== saleId);
      this.persistSales();
      this.renderSalesTable();
      this.showNotification('Sale deleted successfully', 'success');
    }
  }

  exportSales() {
    const csvContent = 'data:text/csv;charset=utf-8,'
      + `Date,Item,Customer,Quantity,Unit Price,Total\n${this.sales
        .map(
          (sale) => `${sale.saleDate},${sale.itemName},${sale.customerName},${sale.quantity},${sale.unitPrice},${sale.total}`,
        )
        .join('\n')}`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sales_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showNotification('Sales exported successfully', 'success');
  }

  getInitialInventory() {
    return [
      {
        id: 1,
        name: 'Beans',
        category: 'grains',
        quantity: 0,
        price: 3500,
      },
      {
        id: 2,
        name: 'Grain Maize',
        category: 'grains',
        quantity: 0,
        price: 3000,
      },
      {
        id: 3,
        name: 'Cow peas',
        category: 'grains',
        quantity: 0,
        price: 4200,
      },
      {
        id: 4,
        name: 'G-nuts',
        category: 'grains',
        quantity: 0,
        price: 6000,
      },
      {
        id: 5,
        name: 'Soybeans',
        category: 'grains',
        quantity: 0,
        price: 5000,
      },
    ];
  }

  getInitialSales() {
    return this.loadFromStorage('sales', []);
  }

  // Update dashboard metrics with real data
  updateDashboardMetrics() {
    try {
      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .slice(0, 10);

      // Calculate today's sales
      const todaySales = transactions
        .filter((t) => t.type === 'sale' && t.date === todayStr)
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

      // Calculate monthly revenue
      const monthRevenue = transactions
        .filter((t) => t.type === 'sale' && t.date >= startOfMonth && t.date <= todayStr)
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

      // Calculate items sold (from sales manager data)
      const totalItemsSold = this.sales.reduce((sum, sale) => sum + sale.quantity, 0);

      // Calculate total expenses
      const monthExpenses = transactions
        .filter(
          (t) => (t.type === 'expense' || t.type === 'procurement')
            && t.date >= startOfMonth
            && t.date <= todayStr,
        )
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

      // Calculate profit margin
      const profitMargin = monthRevenue > 0 ? ((monthRevenue - monthExpenses) / monthRevenue) * 100 : 0;

      // Update DOM elements by IDs (fallback to card order if IDs missing)
      const setText = (selector, text) => {
        const el = document.querySelector(selector);
        if (el) el.textContent = text;
      };

      setText('#todaySalesValue', `UGX ${todaySales.toLocaleString()}`);
      setText('#monthRevenueValue', `UGX ${monthRevenue.toLocaleString()}`);
      setText('#itemsSoldValue', totalItemsSold.toLocaleString());
      setText('#profitMarginValue', `${profitMargin.toFixed(1)}%`);

      // Fallback for older markup
      const cards = document.querySelectorAll('.overview-card');
      if (cards.length >= 4) {
        if (!document.querySelector('#todaySalesValue')) cards[0].querySelector('.card-value').textContent = `UGX ${todaySales.toLocaleString()}`;
        if (!document.querySelector('#monthRevenueValue')) cards[1].querySelector('.card-value').textContent = `UGX ${monthRevenue.toLocaleString()}`;
        if (!document.querySelector('#itemsSoldValue')) cards[2].querySelector('.card-value').textContent = totalItemsSold.toLocaleString();
        if (!document.querySelector('#profitMarginValue')) cards[3].querySelector('.card-value').textContent = `${profitMargin.toFixed(1)}%`;
      }
    } catch (e) {
      console.warn('Could not update dashboard metrics', e);
    }
  }

  // Persist current sales list
  persistSales() {
    this.saveToStorage('sales', this.sales || []);
  }

  // If there are no saved sales, try to build a recent list from transactions
  backfillSalesFromTransactions() {
    try {
      const txs = JSON.parse(localStorage.getItem('transactions') || '[]');
      const recent = txs
        .filter((t) => t.type === 'sale')
        .slice(0, 20) // limit to recent 20
        .map((t) => {
          // Try to extract item name from description "Sale: <name>"
          let itemName = 'Sale';
          const m = (t.description || '').match(/Sale:\s*(.*)/i);
          if (m && m[1]) itemName = m[1];
          return {
            id: t.id || Date.now().toString(),
            itemName,
            category: '',
            quantity: 1,
            unitPrice: parseFloat(t.amount) || 0,
            customerName: t.user || '-',
            saleDate: t.date,
            description: t.description || '',
            total: parseFloat(t.amount) || 0,
          };
        });
      if (recent.length > 0) {
        this.sales = recent;
      }
    } catch {
      // ignore
    }
  }
}

// Initialize the sales manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
  window.salesManager = new SalesManager();
});
