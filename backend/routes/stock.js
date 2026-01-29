const express = require('express');
const Stock = require('../models/Stock');
const StockTransaction = require('../models/StockTransaction');

const router = express.Router();

// Helper to generate IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// GET all stock items
router.get('/', async (req, res) => {
  try {
    const items = await Stock.find({ isActive: true }).sort({ itemName: 1 });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET stock item by ID
router.get('/:id', async (req, res) => {
  try {
    const item = await Stock.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET low stock items (quantity <= minQuantity)
router.get('/alerts/low-stock', async (req, res) => {
  try {
    const lowStockItems = await Stock.find({
      $expr: { $lte: ['$quantity', '$minQuantity'] },
      isActive: true,
    });
    res.status(200).json(lowStockItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new stock item
router.post('/', async (req, res) => {
  try {
    const {
      itemName,
      category,
      quantity,
      minQuantity,
      unit,
      purchasePrice,
      sellingPrice,
      supplier,
      warehouse,
      description,
    } = req.body;

    // Generate itemId if not provided
    const itemId = req.body.itemId || `ITEM-${Date.now()}`;

    const stock = new Stock({
      itemId,
      itemName,
      category,
      quantity,
      minQuantity,
      unit,
      purchasePrice,
      sellingPrice,
      supplier,
      warehouse,
      description,
    });

    const savedStock = await stock.save();

    // Log transaction for initial stock entry
    if (quantity > 0) {
      const transaction = new StockTransaction({
        transactionId: generateId(),
        itemId,
        itemName,
        type: 'stock-in',
        quantityChange: quantity,
        quantityBefore: 0,
        quantityAfter: quantity,
        reason: 'Initial Stock Entry',
        user: req.body.user || 'System',
      });
      await transaction.save();
    }

    res.status(201).json(savedStock);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST seed initial stock items
router.post('/seed-initial', async (req, res) => {
  try {
    const initialItems = [
      {
        itemName: 'Beans',
        category: 'Grains',
        quantity: 0,
        unit: 'kg',
        purchasePrice: 3000,
        sellingPrice: 3500,
      },
      {
        itemName: 'Grain Maize',
        category: 'Grains',
        quantity: 0,
        unit: 'kg',
        purchasePrice: 2500,
        sellingPrice: 3000,
      },
      {
        itemName: 'Cow-peas',
        category: 'Grains',
        quantity: 0,
        unit: 'kg',
        purchasePrice: 3800,
        sellingPrice: 4200,
      },
      {
        itemName: 'G-nuts',
        category: 'Grains',
        quantity: 0,
        unit: 'kg',
        purchasePrice: 5500,
        sellingPrice: 6000,
      },
      {
        itemName: 'Soybeans',
        category: 'Grains',
        quantity: 0,
        unit: 'kg',
        purchasePrice: 4500,
        sellingPrice: 5000,
      },
    ];

    const created = [];
    for (const item of initialItems) {
      // Check if item already exists
      const existing = await Stock.findOne({ itemName: item.itemName });
      if (!existing) {
        const stock = new Stock({
          itemId: `ITEM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ...item,
          minQuantity: 100,
          warehouse: 'Main',
          description: `Initial ${item.itemName} stock`,
        });
        const saved = await stock.save();
        created.push(saved);
      }
    }

    res.status(201).json({
      message: `Seeded ${created.length} initial items`,
      items: created,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update stock item
router.put('/:id', async (req, res) => {
  try {
    const stock = await Stock.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!stock) return res.status(404).json({ error: 'Item not found' });
    res.status(200).json(stock);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE (soft delete) stock item
router.delete('/:id', async (req, res) => {
  try {
    const stock = await Stock.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!stock) return res.status(404).json({ error: 'Item not found' });
    res.status(200).json({ message: 'Item deleted', stock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST stock-in (receive stock)
router.post('/:id/stock-in', async (req, res) => {
  try {
    const {
      quantity, supplier, notes, user,
    } = req.body;

    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).json({ error: 'Item not found' });

    const quantityBefore = stock.quantity;
    stock.quantity += quantity;
    stock.lastRestockDate = new Date();

    const updatedStock = await stock.save();

    // Log transaction
    const transaction = new StockTransaction({
      transactionId: generateId(),
      itemId: stock.itemId,
      itemName: stock.itemName,
      type: 'stock-in',
      quantityChange: quantity,
      quantityBefore,
      quantityAfter: stock.quantity,
      reason: 'Stock Received',
      reference: supplier,
      user: user || 'System',
      notes,
    });

    await transaction.save();

    res.status(200).json({
      stock: updatedStock,
      transaction,
      message: `Stock increased by ${quantity} ${stock.unit}`,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST stock-out (reduce stock)
router.post('/:id/stock-out', async (req, res) => {
  try {
    const {
      quantity, reason, reference, notes, user,
    } = req.body;

    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).json({ error: 'Item not found' });

    if (stock.quantity < quantity) {
      return res.status(400).json({
        error: 'Insufficient stock',
        available: stock.quantity,
        requested: quantity,
      });
    }

    const quantityBefore = stock.quantity;
    stock.quantity -= quantity;

    const updatedStock = await stock.save();

    // Log transaction
    const transaction = new StockTransaction({
      transactionId: generateId(),
      itemId: stock.itemId,
      itemName: stock.itemName,
      type: 'stock-out',
      quantityChange: -quantity,
      quantityBefore,
      quantityAfter: stock.quantity,
      reason: reason || 'Stock Out',
      reference,
      user: user || 'System',
      notes,
    });

    await transaction.save();

    res.status(200).json({
      stock: updatedStock,
      transaction,
      message: `Stock reduced by ${quantity} ${stock.unit}`,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET stock transactions
router.get('/transactions/all', async (req, res) => {
  try {
    const transactions = await StockTransaction.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET transactions for specific item
router.get('/transactions/:itemId', async (req, res) => {
  try {
    const transactions = await StockTransaction.find({ itemId: req.params.itemId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
