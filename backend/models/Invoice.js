const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },
    // Client Information
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    clientEmail: {
      type: String,
      trim: true,
    },
    clientPhone: {
      type: String,
      trim: true,
    },
    clientAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    // Invoice Dates
    invoiceDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },
    // Payment Terms
    paymentTerms: {
      type: String,
      enum: ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Custom'],
      default: 'Net 30',
    },
    customPaymentTerms: {
      type: String,
      trim: true,
    },
    // Currency
    currency: {
      type: String,
      enum: ['UGX', 'USD', 'EUR', 'GBP'],
      default: 'UGX',
    },
    // Invoice Items
    items: [
      {
        description: String,
        quantity: Number,
        unitPrice: Number,
        discount: {
          type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
          value: { type: Number, default: 0 },
        },
        amount: Number,
      },
    ],
    // Amounts
    subtotal: {
      type: Number,
      default: 0,
    },
    discountTotal: {
      type: Number,
      default: 0,
    },
    taxRate: {
      type: Number,
      default: 10,
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    // Payment Information
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'],
      default: 'draft',
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    payments: [
      {
        amount: Number,
        date: Date,
        method: String,
        reference: String,
        notes: String,
      },
    ],
    paidDate: {
      type: Date,
    },
    // Notes and Attachments
    notes: {
      type: String,
      trim: true,
    },
    attachments: [
      {
        filename: String,
        url: String,
        uploadDate: Date,
      },
    ],
    // Branding
    companyInfo: {
      name: String,
      address: String,
      phone: String,
      email: String,
      website: String,
      logo: String,
    },
    // Metadata
    user: {
      type: String,
      trim: true,
      default: 'System',
    },
    lastReminderSent: {
      type: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Invoice', invoiceSchema);
