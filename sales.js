/* global BaseManager */
/* eslint-disable class-methods-use-this, no-restricted-globals, prefer-destructuring, no-nested-ternary, no-shadow, max-len */
// Sales Management JavaScript
class SalesManager extends BaseManager {
  constructor() {
    super();
    this.ALLOWED_PRODUCTS = ['Beans', 'Grain Maize', 'Cow peas', 'G-nuts', 'Soybeans'];
    this.inventory = this.loadInventory();
    this.sales = this.getInitialSales();
    this.init();
  }

  loadInventory() {
    const stored = this.loadFromStorage('stockItems');
    if (stored) {
      // Map stockItems to inventory format with selling price
      return stored.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category || 'grains',
        quantity: item.quantity || 0,
        price: item.sellingPrice || 0,
        costPrice: item.costPrice || 0,
        minStock: item.minStock || 1000,
      }));
    }
    return this.getInitialInventory();
  }

  persistInventory() {
    // Map back to stockItems format with costPrice, minStock, etc.
    const stockItems = this.inventory.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku || '',
      category: item.category || 'grains',
      quantity: item.quantity,
      minStock: item.minStock || 1000,
      costPrice: item.costPrice || 0,
      sellingPrice: item.price,
      batches: item.batches || [],
    }));
    this.saveToStorage('stockItems', stockItems);
  }

  init() {
    this.setupEventListeners();
    // Load persisted sales or backfill from transactions so the table isn't empty on refresh
    if (!this.sales || this.sales.length === 0) {
      this.backfillSalesFromTransactions();
    }
    this.renderInventory();
    this.renderSalesTable();
    this.setDefaultDate();
    this.calculateTotal();
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

  setupEventListeners() {
    // Form calculations
    document.getElementById('quantity').addEventListener('input', () => this.calculateTotal());
    document.getElementById('unitPrice').addEventListener('input', () => this.calculateTotal());

    // Form submission
    document.getElementById('salesForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSaleSubmission();
    });

    // Cancel button
    document.getElementById('cancelBtn').addEventListener('click', () => {
      this.clearForm();
    });

    // Export button
    document.getElementById('exportSalesBtn').addEventListener('click', () => {
      this.exportSales();
    });
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

  handleSaleSubmission() {
    const itemName = document.getElementById('itemName').value.trim();
    const quantity = parseInt(document.getElementById('quantity').value, 10);
    const unitPrice = parseFloat(document.getElementById('unitPrice').value);
    const customerName = document.getElementById('customerName').value.trim();
    const saleDate = document.getElementById('saleDate').value;

    if (!itemName || !quantity || !unitPrice || !customerName || !saleDate) {
      alert('Please fill all required fields');
      return;
    }

    if (!this.ALLOWED_PRODUCTS.includes(itemName)) {
      alert('Only approved products can be sold');
      return;
    }

    const formData = {
      id: Date.now().toString(),
      itemName,
      category: 'grains',
      quantity,
      unitPrice,
      customerName,
      saleDate,
      description: document.getElementById('description').value,
      total: quantity * unitPrice,
    };

    // Add to sales list and persist
    this.sales.unshift(formData);
    this.persistSales();

    // Update inventory (decrease quantity)
    this.updateInventory(formData.itemName, formData.quantity);

    // Refresh displays
    this.renderSalesTable();
    this.renderInventory();

    // Persist a corresponding transaction to Accounts (localStorage) and record activity
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
      const txs = JSON.parse(localStorage.getItem('transactions') || '[]');
      txs.unshift({
        id: Date.now().toString(),
        date: formData.saleDate,
        type: 'sale',
        amount: formData.total,
        account: 'cash',
        description: `Sale: ${formData.itemName}`,
        user: currentUser ? currentUser.username : 'System',
      });
      localStorage.setItem('transactions', JSON.stringify(txs));

      const acts = JSON.parse(localStorage.getItem('activityLog') || '[]');
      acts.unshift({
        id: Date.now().toString(),
        action: 'add-transaction',
        data: { source: 'sales', amount: formData.total },
        user: currentUser ? currentUser.username : 'System',
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('activityLog', JSON.stringify(acts));
    } catch (e) {
      console.warn('Could not write transaction/activity', e);
    }

    // Clear form
    this.clearForm();

    // Update dashboard metrics
    this.updateDashboardMetrics();

    // Show success message
    this.showNotification('Sale recorded successfully!', 'success');
  }

  updateInventory(itemName, soldQuantity) {
    const item = this.inventory.find((item) => item.name.toLowerCase() === itemName.toLowerCase());
    if (item) {
      item.quantity = Math.max(0, item.quantity - soldQuantity);
      this.persistInventory();
    }
  }

  clearForm() {
    document.getElementById('salesForm').reset();
    this.setDefaultDate();
    document.getElementById('totalAmount').textContent = '$0.00';
  }

  renderInventory() {
    const inventoryGrid = document.getElementById('inventoryGrid');

    inventoryGrid.innerHTML = this.inventory
      .map((item) => {
        const minStock = item.minStock || 1000;
        const isLow = item.quantity <= minStock;
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
                                <h5 class="card-title mb-0">${item.name}</h5>
                                <span class="badge bg-secondary">${item.category}</span>
                            </div>
                            <div class="mb-3">
                                <p class="mb-1 text-muted">Qty: <strong>${item.quantity} kg</strong></p>
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

    if (!this.sales || this.sales.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #999;">No recent sales</td></tr>';
      return;
    }

    tableBody.innerHTML = this.sales
      .map(
        (sale) => `
            <tr>
                <td>${this.formatDate(sale.saleDate)}</td>
                <td>${sale.itemName}</td>
                <td>${sale.customerName}</td>
                <td>${sale.quantity} kg</td>
                <td>UGX ${(sale.unitPrice || 0).toLocaleString()}</td>
                <td>UGX ${(sale.total || 0).toLocaleString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="salesManager.editSale('${sale.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="salesManager.deleteSale('${sale.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `,
      )
      .join('');
  }

  editSale(saleId) {
    const sale = this.sales.find((s) => s.id === saleId);
    if (sale) {
      // Populate form with sale data
      document.getElementById('itemName').value = sale.itemName;
      document.getElementById('itemCategory').value = sale.category;
      document.getElementById('quantity').value = sale.quantity;
      document.getElementById('unitPrice').value = sale.unitPrice;
      document.getElementById('customerName').value = sale.customerName;
      document.getElementById('saleDate').value = sale.saleDate;
      document.getElementById('description').value = sale.description || '';

      // Remove from sales list (will be re-added when saved)
      this.sales = this.sales.filter((s) => s.id !== saleId);
      this.renderSalesTable();

      this.calculateTotal();
      this.showNotification('Sale loaded for editing', 'info');
    }
  }

  deleteSale(saleId) {
    if (confirm('Are you sure you want to delete this sale?')) {
      this.sales = this.sales.filter((s) => s.id !== saleId);
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
        quantity: 5000,
        price: 3500,
      },
      {
        id: 2,
        name: 'Grain Maize',
        category: 'grains',
        quantity: 8000,
        price: 3000,
      },
      {
        id: 3,
        name: 'Cow peas',
        category: 'grains',
        quantity: 3500,
        price: 4200,
      },
      {
        id: 4,
        name: 'G-nuts',
        category: 'grains',
        quantity: 2000,
        price: 6000,
      },
      {
        id: 5,
        name: 'Soybeans',
        category: 'grains',
        quantity: 4500,
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
