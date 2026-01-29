const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['sale', 'expense', 'procurement', 'invoice-payment', 'adjustment'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    account: {
      type: String,
      enum: ['cash', 'bank', 'credit'],
      default: 'cash',
    },
    description: {
      type: String,
      trim: true,
    },
    user: {
      type: String,
      trim: true,
      default: 'System',
    },
    reference: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Transaction', transactionSchema);
