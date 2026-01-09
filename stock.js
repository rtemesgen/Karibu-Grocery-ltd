/* global BaseManager */
/* eslint-disable class-methods-use-this, radix, no-nested-ternary, no-restricted-globals, no-shadow, max-len */
class StockManager extends BaseManager {
  constructor() {
    super();
    this.ALLOWED_PRODUCTS = ['Beans', 'Grain Maize', 'Cow peas', 'G-nuts', 'Soybeans'];
    this.stockItems = this.loadStock();
    this.sources = this.loadSources();
    this.currentEditId = null;
    this.init();
  }

  loadStock() {
    return this.loadFromStorage('stockItems', this.getInitialStock());
  }

  saveStock() {
    this.saveToStorage('stockItems', this.stockItems);
  }

  loadSources() {
    return this.loadFromStorage('suppliers', this.getInitialSources());
  }

  saveSources() {
    this.saveToStorage('suppliers', this.sources);
  }

  getInitialSources() {
    return [
      {
        id: '1',
        name: 'Maganjo Farm',
        type: 'farm',
        branch: 'Maganjo',
      },
      {
        id: '2',
        name: 'Matugga Farm',
        type: 'farm',
        branch: 'Matugga',
      },
      {
        id: '3',
        name: 'Individual Dealers',
        type: 'dealer',
        minQuantity: 1000,
      },
      {
        id: '4',
        name: 'Other Companies',
        type: 'company',
        minQuantity: 1000,
      },
    ];
  }

  init() {
    this.setupEventListeners();
    this.setupStorageSync();
    this.applyBusinessStockPreset();
    this.enforceBusinessRules();
    this.renderStockTable();
    this.updateOverview();
  }

  setupStorageSync() {
    window.addEventListener('storage', (event) => {
      if (event.key !== 'stockItems') return;
      this.stockItems = this.loadFromStorage('stockItems', []);
      this.renderStockTable();
      this.updateOverview();
    });
  }

  applyBusinessStockPreset() {
    try {
      const presetFlag = localStorage.getItem('stockPresetApplied');
      if (presetFlag === '1') return;

      const defaults = {
        Beans: {
          sku: 'BEA-001',
          minStock: 1000,
          costPrice: 2500,
          sellingPrice: Math.round(2500 * 1.2),
        },
        'Grain Maize': {
          sku: 'GRM-002',
          minStock: 1000,
          costPrice: 2000,
          sellingPrice: Math.round(2000 * 1.2),
        },
        'Cow peas': {
          sku: 'COP-003',
          minStock: 1000,
          costPrice: 3000,
          sellingPrice: Math.round(3000 * 1.2),
        },
        'G-nuts': {
          sku: 'GNU-004',
          minStock: 1000,
          costPrice: 4500,
          sellingPrice: Math.round(4500 * 1.2),
        },
        Soybeans: {
          sku: 'SOY-005',
          minStock: 1000,
          costPrice: 3500,
          sellingPrice: Math.round(3500 * 1.2),
        },
      };

      const items = Object.keys(defaults).map((name) => {
        const existing = (this.stockItems || []).find((i) => i.name === name) || {};
        const def = defaults[name];
        const isBeans = name === 'Beans';
        const qty = isBeans
          ? typeof existing.quantity === 'number' && existing.quantity > 0
            ? existing.quantity
            : 5000
          : 0;
        return {
          id: existing.id || Date.now().toString() + Math.random().toString().slice(2, 6),
          name,
          sku: existing.sku || def.sku,
          category: 'grains',
          quantity: qty,
          minStock: 1000,
          costPrice: typeof existing.costPrice === 'number' ? existing.costPrice : def.costPrice,
          sellingPrice: Math.round(
            ((typeof existing.costPrice === 'number' ? existing.costPrice : def.costPrice) || 0)
              * 1.2,
          ),
          batches: existing.batches || [],
        };
      });

      this.stockItems = items;
      this.saveStock();
      localStorage.setItem('stockPresetApplied', '1');
    } catch (e) {
      console.warn('Failed to apply stock preset', e);
    }
  }

  // Ensure existing records follow: minStock=1000, sellingPrice=cost*1.2
  enforceBusinessRules() {
    try {
      let changed = false;
      this.stockItems = (this.stockItems || []).map((it) => {
        const item = { ...it };
        if (item.minStock !== 1000) {
          item.minStock = 1000;
          changed = true;
        }
        if (typeof item.costPrice === 'number') {
          const expectedSell = Math.round((item.costPrice || 0) * 1.2);
          if (item.sellingPrice !== expectedSell) {
            item.sellingPrice = expectedSell;
            changed = true;
          }
        }
        return item;
      });
      if (changed) this.saveStock();
    } catch (e) {
      console.warn('Failed to enforce business rules', e);
    }
  }

  setupEventListeners() {
    document
      .getElementById('addItemBtn')
      .addEventListener('click', () => this.showReceivingModal());
    document.getElementById('cancelStockBtn').addEventListener('click', () => this.hideForm());
    document.getElementById('stockForm').addEventListener('submit', (e) => this.handleSubmit(e));
    document.getElementById('categoryFilter').addEventListener('change', () => this.filterStock());
    document.getElementById('searchStock').addEventListener('input', () => this.filterStock());
    document
      .getElementById('closeReceivingModal')
      .addEventListener('click', () => this.hideReceivingModal());
    document
      .getElementById('receivingForm')
      .addEventListener('submit', (e) => this.handleReceivingSubmit(e));
  }

  showReceivingModal() {
    document.getElementById('receivingModal').classList.remove('hidden');
    document.getElementById('receivingForm').reset();
    document.body.style.overflow = 'hidden';
    this.populateSourceSelect();
  }

  hideReceivingModal() {
    document.getElementById('receivingModal').classList.add('hidden');
    document.getElementById('receivingForm').reset();
    document.body.style.overflow = 'auto';
  }

  populateSourceSelect() {
    const sourceSelect = document.getElementById('receivingSource');
    sourceSelect.innerHTML = `<option value="">Select source...</option>${this.sources
      .map((s) => `<option value="${s.id}">${s.name}</option>`)
      .join('')}`;
  }

  handleReceivingSubmit(e) {
    e.preventDefault();
    const product = document.getElementById('receivingProduct').value;
    const sourceId = document.getElementById('receivingSource').value;
    const quantity = parseInt(document.getElementById('receivingQuantity').value);
    const costPrice = parseFloat(document.getElementById('receivingCostPrice').value);
    const sellingPrice = Math.round(
      (parseFloat(document.getElementById('receivingCostPrice').value) || 0) * 1.2,
    );

    if (!product || !sourceId || !quantity || !costPrice) {
      alert('Please fill all fields');
      return;
    }

    const source = this.sources.find((s) => s.id === sourceId);
    if (!source) {
      alert('Invalid source');
      return;
    }

    if (!this.ALLOWED_PRODUCTS.includes(product)) {
      alert('Only approved products can be received');
      return;
    }

    // Validate minimum quantities for dealers and companies
    if ((source.type === 'dealer' || source.type === 'company') && quantity < 1000) {
      alert(`Minimum quantity from ${source.name} is 1000 kg`);
      return;
    }

    // Find or create stock item
    let item = this.stockItems.find((i) => i.name === product);
    if (!item) {
      item = {
        id: Date.now().toString(),
        name: product,
        sku: this.generateSKU(product),
        category: 'grains',
        quantity: 0,
        minStock: 1000,
        costPrice,
        sellingPrice,
        batches: [],
      };
      this.stockItems.push(item);
    }

    // Add batch record
    const batch = {
      id: Date.now().toString(),
      sourceId,
      sourceName: source.name,
      quantity,
      costPrice,
      date: new Date().toISOString().slice(0, 10),
    };
    if (!item.batches) item.batches = [];
    item.batches.push(batch);

    // Update quantity and latest prices
    item.quantity += quantity;
    item.costPrice = costPrice;
    item.sellingPrice = sellingPrice;

    this.saveStock();
    this.enforceBusinessRules();
    this.recordProcurementTransaction(product, quantity, costPrice * quantity);
    this.showNotification(
      `Stock received: ${product} - ${quantity}kg from ${source.name}`,
      'success',
    );

    this.renderStockTable();
    this.updateOverview();
    this.hideReceivingModal();
  }

  generateSKU(productName) {
    const prefix = productName.slice(0, 3).toUpperCase();
    return `${prefix}-${Date.now().toString().slice(-4)}`;
  }

  recordProcurementTransaction(itemName, qty, amount) {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
      const txs = JSON.parse(localStorage.getItem('transactions') || '[]');
      txs.unshift({
        id: Date.now().toString(),
        date: new Date().toISOString().slice(0, 10),
        type: 'procurement',
        amount,
        account: 'bank',
        description: `Procurement - ${itemName} (${qty} kg)`,
        user: currentUser ? currentUser.username : 'System',
      });
      localStorage.setItem('transactions', JSON.stringify(txs));

      const acts = JSON.parse(localStorage.getItem('activityLog') || '[]');
      acts.unshift({
        id: Date.now().toString(),
        action: 'procurement',
        data: { item: itemName, qty, amount },
        user: currentUser ? currentUser.username : 'System',
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('activityLog', JSON.stringify(acts));
    } catch (error) {
      console.warn('Could not record transaction', error);
    }
  }

  showAddForm() {
    document.getElementById('stockFormSection').style.display = 'block';
    document.querySelector('.sales-form-section h2').textContent = 'Add New Item';
    this.currentEditId = null;
  }

  hideForm() {
    document.getElementById('stockFormSection').style.display = 'none';
    document.getElementById('stockForm').reset();
  }

  handleSubmit(e) {
    e.preventDefault();
    const formData = {
      id: this.currentEditId || Date.now().toString(),
      name: document.getElementById('itemName').value,
      sku: document.getElementById('itemSku').value,
      category: 'grains',
      supplier: document.getElementById('supplier').value,
      quantity: parseInt(document.getElementById('quantity').value),
      minStock: 1000,
      costPrice: parseFloat(document.getElementById('costPrice').value),
      sellingPrice: Math.round((parseFloat(document.getElementById('costPrice').value) || 0) * 1.2),
    };

    if (!this.ALLOWED_PRODUCTS.includes(formData.name)) {
      alert('Only approved products can be added');
      return;
    }

    if (this.currentEditId) {
      const index = this.stockItems.findIndex((item) => item.id === this.currentEditId);
      const prev = this.stockItems[index];
      const qtyDelta = formData.quantity - (prev.quantity || 0);
      this.stockItems[index] = formData;

      if (qtyDelta > 0) {
        this.recordProcurementTransaction(formData.name, qtyDelta, qtyDelta * formData.costPrice);
      }

      this.showNotification('Item updated successfully', 'success');
    } else {
      this.stockItems.push(formData);
      this.recordProcurementTransaction(
        formData.name,
        formData.quantity,
        formData.quantity * formData.costPrice,
      );
      this.showNotification('Item added successfully', 'success');
    }

    this.saveStock();
    this.enforceBusinessRules();
    this.renderStockTable();
    this.updateOverview();
    this.hideForm();
  }

  editItem(id) {
    const item = this.stockItems.find((item) => item.id === id);
    if (item) {
      this.currentEditId = id;
      document.getElementById('itemName').value = item.name;
      document.getElementById('itemSku').value = item.sku;
      document.getElementById('category').value = item.category;
      document.getElementById('supplier').value = item.supplier;
      document.getElementById('quantity').value = item.quantity;
      document.getElementById('minStock').value = 1000;
      document.getElementById('costPrice').value = item.costPrice;
      document.getElementById('sellingPrice').value = Math.round((item.costPrice || 0) * 1.2);
      document.querySelector('.sales-form-section h2').textContent = 'Edit Item';
      document.getElementById('stockFormSection').style.display = 'block';
    }
  }

  deleteItem(id) {
    if (confirm('Are you sure you want to delete this item?')) {
      this.stockItems = this.stockItems.filter((item) => item.id !== id);
      this.saveStock();
      this.renderStockTable();
      this.updateOverview();
      this.showNotification('Item deleted successfully', 'success');
    }
  }

  getStockStatus(item) {
    if (item.quantity === 0) return { class: 'out-of-stock', text: 'Out of Stock' };
    if (item.quantity <= item.minStock) return { class: 'low-stock', text: 'Low Stock' };
    return { class: 'in-stock', text: 'In Stock' };
  }

  renderStockTable() {
    const tbody = document.getElementById('stockTableBody');
    const filteredItems = this.getFilteredItems();

    tbody.innerHTML = filteredItems
      .map((item) => {
        const status = this.getStockStatus(item);
        return `
                <tr>
                    <td>${item.sku}</td>
                    <td>${item.name}</td>
                    <td>${item.category}</td>
                    <td>${item.quantity} kg</td>
                    <td>${item.minStock} kg</td>
                    <td>UGX ${item.costPrice.toLocaleString()}</td>
                    <td>UGX ${item.sellingPrice.toLocaleString()}</td>
                    <td><span class="status-badge ${status.class}">${status.text}</span></td>
                    <td>
                        <button class="btn-edit" onclick="stockManager.editItem('${item.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-delete" onclick="stockManager.deleteItem('${item.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
      })
      .join('');
  }

  getFilteredItems() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const searchTerm = document.getElementById('searchStock').value.toLowerCase();

    return this.stockItems.filter((item) => {
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      const matchesSearch = !searchTerm
        || item.name.toLowerCase().includes(searchTerm)
        || item.sku.toLowerCase().includes(searchTerm);
      return matchesCategory && matchesSearch;
    });
  }

  filterStock() {
    this.renderStockTable();
  }

  updateOverview() {
    const totalItems = this.stockItems.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockCount = this.stockItems.filter(
      (item) => item.quantity > 0 && item.quantity <= item.minStock,
    ).length;
    const outOfStockCount = this.stockItems.filter((item) => item.quantity === 0).length;
    const stockValue = this.stockItems.reduce(
      (sum, item) => sum + item.quantity * item.costPrice,
      0,
    );

    document.getElementById('totalItems').textContent = `${totalItems.toLocaleString()} kg`;
    document.getElementById('lowStockItems').textContent = lowStockCount;
    document.getElementById('outOfStockItems').textContent = outOfStockCount;
    document.getElementById('stockValue').textContent = `UGX ${stockValue.toLocaleString()}`;
  }

  getInitialStock() {
    return [
      {
        id: '1',
        name: 'Beans',
        sku: 'BEA-001',
        category: 'grains',
        quantity: 5000,
        minStock: 1000,
        costPrice: 2500,
        sellingPrice: Math.round(2500 * 1.2),
        batches: [],
      },
      {
        id: '2',
        name: 'Grain Maize',
        sku: 'GRM-002',
        category: 'grains',
        quantity: 8000,
        minStock: 1000,
        costPrice: 2000,
        sellingPrice: Math.round(2000 * 1.2),
        batches: [],
      },
      {
        id: '3',
        name: 'Cow peas',
        sku: 'COP-003',
        category: 'grains',
        quantity: 3500,
        minStock: 1000,
        costPrice: 3000,
        sellingPrice: Math.round(3000 * 1.2),
        batches: [],
      },
      {
        id: '4',
        name: 'G-nuts',
        sku: 'GNU-004',
        category: 'grains',
        quantity: 2000,
        minStock: 1000,
        costPrice: 4500,
        sellingPrice: Math.round(4500 * 1.2),
        batches: [],
      },
      {
        id: '5',
        name: 'Soybeans',
        sku: 'SOY-005',
        category: 'grains',
        quantity: 4500,
        minStock: 1000,
        costPrice: 3500,
        sellingPrice: Math.round(3500 * 1.2),
        batches: [],
      },
    ];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.stockManager = new StockManager();
});
