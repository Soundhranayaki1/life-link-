const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  bloodGroup: {
    type: String,
    required: true,
    unique: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  unitsAvailable: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Inventory', inventorySchema);
