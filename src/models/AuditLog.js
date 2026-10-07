const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true
  },
  performerName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'System'
  },
  category: {
    type: String,
    default: 'GENERAL'
  },
  description: {
    type: String,
    required: true
  },
  target: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
