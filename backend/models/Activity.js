const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    activityId: {
      type: String,
      unique: true,
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    user: {
      type: String,
      trim: true,
      default: 'System',
    },
    module: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Activity', activitySchema);
