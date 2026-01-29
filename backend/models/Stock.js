const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Vegetables', 'Fruits', 'Grains', 'Dairy', 'Meat', 'Drinks', 'Other'],
      default: 'Other',
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    minQuantity: {
      type: Number,
      required: true,
      default: 10,
    },
    unit: {
      type: String,
      required: true,
      enum: ['kg', 'liters', 'pieces', 'boxes', 'bags', 'crates'],
      default: 'kg',
    },
    purchasePrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    supplier: {
      type: String,
      trim: true,
    },
    lastRestockDate: {
      type: Date,
      default: Date.now,
    },
    warehouse: {
      type: String,
      trim: true,
      default: 'Main',
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Stock', stockSchema);
