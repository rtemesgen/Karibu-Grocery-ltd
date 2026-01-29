/* eslint-disable no-restricted-globals */
// Stock Management Module - MongoDB Backend
class StockManager {
  constructor() {
    this.apiUrl = 'http://localhost:5000/api/stock';
    this.items = [];
    this.currentEditId = null;
    this.currentUser = null;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadItems();
    this.updateStats();
    this.loadCurrentUser();
  }

  loadCurrentUser() {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser'));
      this.currentUser = user || { username: 'System' };
      // Update profile display
      const roleElement = document.getElementById('profileRole');
      const nameElement = document.getElementById('profileName');
      if (roleElement && nameElement && user) {
        roleElement.textContent = user.role || 'User';
        nameElement.textContent = user.username || 'Not logged in';
      }
    } catch {
      this.currentUser = { username: 'System' };
    }
  }

  handleLogout(e) {
    if (e) e.preventDefault();
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
  }

  setupEventListeners() {
    // Add Item button
    document.getElementById('addItemBtn')?.addEventListener('click', () => this.showAddItemModal());

    // Stock In/Out buttons
    document.getElementById('stockInBtn')?.addEventListener('click', () => this.showStockInModal());
    document
      .getElementById('stockOutBtn')
      ?.addEventListener('click', () => this.showStockOutModal());

    // Export button
    document.getElementById('exportBtn')?.addEventListener('click', () => this.exportToCSV());

    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => this.handleLogout(e));

    // Item Modal
    document
      .getElementById('closeItemModal')
      ?.addEventListener('click', () => this.hideItemModal());
    document.getElementById('cancelItemBtn')?.addEventListener('click', () => this.hideItemModal());
    document.getElementById('itemForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleItemSubmit();
    });

    // Stock In Modal
    document
      .getElementById('closeStockInModal')
      ?.addEventListener('click', () => this.hideStockInModal());
    document
      .getElementById('cancelStockInBtn')
      ?.addEventListener('click', () => this.hideStockInModal());
    document.getElementById('stockInForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleStockIn();
    });

    // Stock Out Modal
    document
      .getElementById('closeStockOutModal')
      ?.addEventListener('click', () => this.hideStockOutModal());
    document
      .getElementById('cancelStockOutBtn')
      ?.addEventListener('click', () => this.hideStockOutModal());
    document.getElementById('stockOutForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleStockOut();
    });

    // Stock In Item selection
    document
      .getElementById('stockInItem')
      ?.addEventListener('change', (e) => this.updateStockInDisplay(e.target.value));
    document
      .getElementById('stockOutItem')
      ?.addEventListener('change', (e) => this.updateStockOutDisplay(e.target.value));

    // Search and filters
    document.getElementById('searchStock')?.addEventListener('input', () => this.filterAndRender());
    document
      .getElementById('categoryFilter')
      ?.addEventListener('change', () => this.filterAndRender());
    document
      .getElementById('stockFilter')
      ?.addEventListener('change', () => this.filterAndRender());
  }

  async loadItems() {
    try {
      const response = await fetch(this.apiUrl);
      if (!response.ok) throw new Error('Failed to load items');
      this.items = await response.json();
      this.renderItems();
      this.populateSelectDropdowns();
    } catch (error) {
      console.error('Error loading items:', error);
      this.showNotification('Failed to load stock items - ensure backend is running', 'error');
    }
  }

  populateSelectDropdowns() {
    const stockInSelect = document.getElementById('stockInItem');
    const stockOutSelect = document.getElementById('stockOutItem');

    const options = this.items
      .map((item) => `<option value="${item._id}">${item.itemName} (${item.itemId})</option>`)
      .join('');

    if (stockInSelect) stockInSelect.innerHTML = `<option value="">-- Select Item --</option>${options}`;
    if (stockOutSelect) stockOutSelect.innerHTML = `<option value="">-- Select Item --</option>${options}`;
  }

  showAddItemModal() {
    this.currentEditId = null;
    document.getElementById('itemModalTitle').textContent = 'Add New Item';
    document.getElementById('itemForm').reset();
    document.getElementById('itemId').value = `ITEM-${Date.now()}`;
    document.getElementById('itemModal').classList.remove('hidden');
  }

  hideItemModal() {
    document.getElementById('itemModal').classList.add('hidden');
    document.getElementById('itemForm').reset();
    this.currentEditId = null;
  }

  async handleItemSubmit() {
    const formData = {
      itemName: document.getElementById('itemName').value,
      category: document.getElementById('itemCategory').value,
      quantity: parseFloat(document.getElementById('itemQuantity').value),
      minQuantity: parseFloat(document.getElementById('itemMinQuantity').value),
      unit: document.getElementById('itemUnit').value,
      purchasePrice: parseFloat(document.getElementById('itemPurchasePrice').value),
      sellingPrice: parseFloat(document.getElementById('itemSellingPrice').value),
      supplier: document.getElementById('itemSupplier').value,
      warehouse: document.getElementById('itemWarehouse').value,
      description: document.getElementById('itemDescription').value,
      user: this.currentUser?.username,
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save item');
      await this.loadItems();
      this.hideItemModal();
      this.showNotification('Item added successfully', 'success');
    } catch (error) {
      console.error('Error saving item:', error);
      this.showNotification('Failed to save item', 'error');
    }
  }

  showStockInModal() {
    document.getElementById('stockInForm').reset();
    document.getElementById('stockInModal').classList.remove('hidden');
  }

  hideStockInModal() {
    document.getElementById('stockInModal').classList.add('hidden');
    document.getElementById('stockInForm').reset();
  }

  updateStockInDisplay(itemId) {
    const item = this.items.find((i) => i._id === itemId);
    if (item) {
      document.getElementById('stockInCurrent').value = `${item.quantity} ${item.unit}`;
      document.getElementById('stockInUnit').value = item.unit;
    }
  }

  async handleStockIn() {
    const itemId = document.getElementById('stockInItem').value;
    const quantity = parseFloat(document.getElementById('stockInQuantity').value);
    const supplier = document.getElementById('stockInSupplier').value;
    const notes = document.getElementById('stockInNotes').value;

    if (!itemId || !quantity) {
      this.showNotification('Please fill in all required fields', 'warning');
      return;
    }

    try {
      const response = await fetch(`${this.apiUrl}/${itemId}/stock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity,
          supplier,
          notes,
          user: this.currentUser?.username,
        }),
      });

      if (!response.ok) throw new Error('Failed to process stock in');
      const data = await response.json();

      await this.loadItems();
      this.hideStockInModal();
      this.showNotification(`Stock received: +${quantity} ${data.stock.unit}`, 'success');
    } catch (error) {
      console.error('Error processing stock in:', error);
      this.showNotification('Failed to process stock in', 'error');
    }
  }

  showStockOutModal() {
    document.getElementById('stockOutForm').reset();
    document.getElementById('stockOutModal').classList.remove('hidden');
  }

  hideStockOutModal() {
    document.getElementById('stockOutModal').classList.add('hidden');
    document.getElementById('stockOutForm').reset();
  }

  updateStockOutDisplay(itemId) {
    const item = this.items.find((i) => i._id === itemId);
    if (item) {
      document.getElementById('stockOutCurrent').value = `${item.quantity} ${item.unit}`;
      document.getElementById('stockOutUnit').value = item.unit;
    }
  }

  async handleStockOut() {
    const itemId = document.getElementById('stockOutItem').value;
    const quantity = parseFloat(document.getElementById('stockOutQuantity').value);
    const reason = document.getElementById('stockOutReason').value;
    const reference = document.getElementById('stockOutReference').value;
    const notes = document.getElementById('stockOutNotes').value;

    if (!itemId || !quantity || !reason) {
      this.showNotification('Please fill in all required fields', 'warning');
      return;
    }

    try {
      const response = await fetch(`${this.apiUrl}/${itemId}/stock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity,
          reason,
          reference,
          notes,
          user: this.currentUser?.username,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process stock out');
      }

      const data = await response.json();
      await this.loadItems();
      this.hideStockOutModal();
      this.showNotification(`Stock removed: -${quantity} ${data.stock.unit}`, 'success');
    } catch (error) {
      console.error('Error processing stock out:', error);
      this.showNotification(error.message || 'Failed to process stock out', 'error');
    }
  }

  filterAndRender() {
    const searchTerm = (document.getElementById('searchStock').value || '').toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const stockFilter = document.getElementById('stockFilter').value;

    let filtered = this.items;

    if (searchTerm) {
      filtered = filtered.filter(
        (item) => item.itemName.toLowerCase().includes(searchTerm)
          || item.itemId.toLowerCase().includes(searchTerm),
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    if (stockFilter === 'low') {
      filtered = filtered.filter((item) => item.quantity <= item.minQuantity && item.quantity > 0);
    } else if (stockFilter === 'out') {
      filtered = filtered.filter((item) => item.quantity === 0);
    }

    this.renderFilteredItems(filtered);
    this.updateStats();
  }

  renderItems() {
    this.filterAndRender();
  }

  renderFilteredItems(items) {
    const tbody = document.getElementById('stockTableBody');

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" style="text-align: center; padding: 2rem;">
            <i class="fas fa-inbox"></i> No items found
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items
      .map(
        (item) => `
        <tr data-id="${item._id}">
          <td>${item.itemId}</td>
          <td><strong>${item.itemName}</strong></td>
          <td>${item.category}</td>
          <td style="font-weight: 600;">${item.quantity}</td>
          <td>${item.unit}</td>
          <td>${item.minQuantity}</td>
          <td>${this.getStockStatus(item)}</td>
          <td>$${item.purchasePrice.toFixed(2)}</td>
          <td>$${item.sellingPrice.toFixed(2)}</td>
          <td>${this.getMarginPercent(item)}%</td>
          <td>${new Date(item.lastRestockDate).toLocaleDateString()}</td>
          <td>
            <button class="btn-action edit" data-id="${item._id}" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-action delete" data-id="${item._id}" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `,
      )
      .join('');

    tbody.querySelectorAll('.delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const { id } = e.target.closest('button').dataset;
        this.deleteItem(id);
      });
    });

    tbody.querySelectorAll('.edit').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const { id } = e.target.closest('button').dataset;
        this.editItem(id);
      });
    });
  }

  getStockStatus(item) {
    if (item.quantity === 0) {
      return '<span class="status-badge danger">Out of Stock</span>';
    }
    if (item.quantity <= item.minQuantity) {
      return '<span class="status-badge warning">Low Stock</span>';
    }
    return '<span class="status-badge success">In Stock</span>';
  }

  getMarginPercent(item) {
    if (item.purchasePrice === 0) return 0;
    return (((item.sellingPrice - item.purchasePrice) / item.purchasePrice) * 100).toFixed(1);
  }

  updateStats() {
    const lowStockItems = this.items.filter((item) => item.quantity <= item.minQuantity);
    const outOfStockItems = this.items.filter((item) => item.quantity === 0);
    const totalValue = this.items.reduce(
      (sum, item) => sum + item.quantity * item.purchasePrice,
      0,
    );

    document.getElementById('totalItems').textContent = this.items.length;
    document.getElementById('lowStockItems').textContent = lowStockItems.length;
    document.getElementById('outOfStockItems').textContent = outOfStockItems.length;
    document.getElementById('totalValue').textContent = `$${totalValue.toLocaleString('en-US', {
      maximumFractionDigits: 2,
    })}`;

    if (lowStockItems.length > 0) {
      document.getElementById('lowStockAlert').style.display = 'block';
      document.getElementById('lowStockCount').textContent = `${lowStockItems.length} items are running low on stock`;
    } else {
      document.getElementById('lowStockAlert').style.display = 'none';
    }
  }

  deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    fetch(`${this.apiUrl}/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to delete');
        return res.json();
      })
      .then(() => {
        this.loadItems();
        this.showNotification('Item deleted successfully', 'success');
      })
      .catch((error) => {
        console.error('Error deleting item:', error);
        this.showNotification('Failed to delete item', 'error');
      });
  }

  editItem(id) {
    const item = this.items.find((i) => i._id === id);
    if (!item) return;

    this.currentEditId = id;
    document.getElementById('itemModalTitle').textContent = 'Edit Item';
    document.getElementById('itemId').value = item.itemId;
    document.getElementById('itemName').value = item.itemName;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemUnit').value = item.unit;
    document.getElementById('itemQuantity').value = item.quantity;
    document.getElementById('itemMinQuantity').value = item.minQuantity;
    document.getElementById('itemPurchasePrice').value = item.purchasePrice;
    document.getElementById('itemSellingPrice').value = item.sellingPrice;
    document.getElementById('itemSupplier').value = item.supplier || '';
    document.getElementById('itemWarehouse').value = item.warehouse || 'Main';
    document.getElementById('itemDescription').value = item.description || '';

    document.getElementById('itemModal').classList.remove('hidden');
  }

  exportToCSV() {
    const headers = [
      'Item ID',
      'Item Name',
      'Category',
      'Quantity',
      'Unit',
      'Min Level',
      'Purchase Price',
      'Selling Price',
      'Margin %',
      'Supplier',
      'Last Restock',
    ];

    const rows = this.items.map((item) => [
      item.itemId,
      item.itemName,
      item.category,
      item.quantity,
      item.unit,
      item.minQuantity,
      item.purchasePrice,
      item.sellingPrice,
      this.getMarginPercent(item),
      item.supplier || '',
      new Date(item.lastRestockDate).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    this.showNotification('Stock list exported to CSV', 'success');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${
  type === 'success'
    ? 'check-circle'
    : type === 'error'
      ? 'exclamation-circle'
      : 'info-circle'
}"></i>
      ${message}
    `;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.stockManager = new StockManager();
});
