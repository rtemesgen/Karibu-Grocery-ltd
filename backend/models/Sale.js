const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema(
  {
    saleId: {
      type: String,
      unique: true,
      required: true,
    },
    clientName: {
      type: String,
      trim: true,
    },
    productId: {
      type: String,
      trim: true,
    },
    productName: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    saleDate: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'cheque', 'mobile', 'credit'],
      default: 'cash',
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'returned', 'cancelled'],
      default: 'completed',
    },
    notes: {
      type: String,
      trim: true,
    },
    user: {
      type: String,
      trim: true,
      default: 'System',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Sale', saleSchema);
