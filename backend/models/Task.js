const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      unique: true,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'overdue', 'on-hold', 'cancelled'],
      default: 'pending',
    },
    dueDate: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    category: {
      type: String,
      trim: true,
    },
    relatedTo: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: String,
      trim: true,
      default: 'System',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Task', taskSchema);
