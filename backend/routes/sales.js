const express = require('express');
const Sale = require('../models/Sale');

const router = express.Router();

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// GET all sales
router.get('/', async (req, res) => {
  try {
    const sales = await Sale.find().sort({ saleDate: -1 });
    res.status(200).json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET sales summary
router.get('/summary/totals', async (req, res) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const totalSales = await Sale.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    const todaySales = await Sale.aggregate([
      {
        $match: {
          status: 'completed',
          saleDate: {
            $gte: new Date(todayStr),
            $lt: new Date(new Date(todayStr).getTime() + 24 * 60 * 60 * 1000),
          },
        },
      },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    res.status(200).json({
      totalSales: totalSales.length > 0 ? totalSales[0].total : 0,
      todaySales: todaySales.length > 0 ? todaySales[0].total : 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create sale
router.post('/', async (req, res) => {
  try {
    const sale = new Sale({
      saleId: generateId(),
      ...req.body,
    });

    const savedSale = await sale.save();
    res.status(201).json(savedSale);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update sale
router.put('/:id', async (req, res) => {
  try {
    const sale = await Sale.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.status(200).json(sale);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE sale
router.delete('/:id', async (req, res) => {
  try {
    const sale = await Sale.findByIdAndDelete(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.status(200).json({ message: 'Sale deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
