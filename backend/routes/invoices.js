const express = require('express');
const Invoice = require('../models/Invoice');

const router = express.Router();

// Helper to generate invoice numbers
const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const lastInvoice = await Invoice.findOne({ invoiceNumber: new RegExp(`^INV-${year}-`) })
    .sort({ createdAt: -1 })
    .limit(1);

  let nextNum = 1;
  if (lastInvoice) {
    const match = lastInvoice.invoiceNumber.match(/INV-\d{4}-(\d+)/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  return `INV-${year}-${String(nextNum).padStart(3, '0')}`;
};

// Helper to check and update overdue invoices
const checkOverdueInvoices = async () => {
  const today = new Date();
  await Invoice.updateMany(
    {
      status: { $in: ['sent', 'partial'] },
      dueDate: { $lt: today },
    },
    { $set: { status: 'overdue' } },
  );
};

// GET all invoices
router.get('/', async (req, res) => {
  try {
    await checkOverdueInvoices();
    const invoices = await Invoice.find().sort({ invoiceDate: -1 });
    res.status(200).json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.status(200).json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create invoice
router.post('/', async (req, res) => {
  try {
    if (!req.body.invoiceNumber) {
      req.body.invoiceNumber = await generateInvoiceNumber();
    }
    const invoice = new Invoice(req.body);
    const savedInvoice = await invoice.save();
    res.status(201).json(savedInvoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update invoice
router.put('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.status(200).json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST mark invoice as paid
router.post('/:id/mark-paid', async (req, res) => {
  try {
    const {
      amount, method, reference, notes,
    } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        $inc: { paidAmount: amount },
        $push: {
          payments: {
            amount,
            date: new Date(),
            method,
            reference,
            notes,
          },
        },
        paidDate: new Date(),
      },
      { new: true },
    );

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Update status based on paid amount
    if (invoice.paidAmount >= invoice.total) {
      invoice.status = 'paid';
    } else if (invoice.paidAmount > 0) {
      invoice.status = 'partial';
    }
    await invoice.save();

    res.status(200).json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET overdue invoices
router.get('/reports/overdue', async (req, res) => {
  try {
    await checkOverdueInvoices();
    const overdueInvoices = await Invoice.find({ status: 'overdue' });
    res.status(200).json(overdueInvoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST send reminder
router.post('/:id/send-reminder', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { lastReminderSent: new Date() },
      { new: true },
    );
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.status(200).json({ message: 'Reminder sent', invoice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE invoice
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.status(200).json({ message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
