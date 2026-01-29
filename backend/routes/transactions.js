const express = require('express');
const Transaction = require('../models/Transaction');

const router = express.Router();

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// GET all transactions
router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET transactions by type
router.get('/type/:type', async (req, res) => {
  try {
    const transactions = await Transaction.find({ type: req.params.type }).sort({ date: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET totals summary
router.get('/summary/totals', async (req, res) => {
  try {
    const income = await Transaction.aggregate([
      { $match: { type: 'sale' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const expenses = await Transaction.aggregate([
      { $match: { type: { $in: ['expense', 'procurement'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.status(200).json({
      income: income.length > 0 ? income[0].total : 0,
      expenses: expenses.length > 0 ? expenses[0].total : 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create transaction
router.post('/', async (req, res) => {
  try {
    const transaction = new Transaction({
      transactionId: generateId(),
      ...req.body,
    });

    const savedTransaction = await transaction.save();
    res.status(201).json(savedTransaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update transaction
router.put('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.status(200).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE transaction
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.status(200).json({ message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
