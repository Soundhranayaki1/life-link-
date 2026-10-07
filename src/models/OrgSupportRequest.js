const mongoose = require('mongoose');

const orgSupportRequestSchema = new mongoose.Schema({
  requestingOrgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  requestingOrgName: {
    type: String,
    required: true
  },
  receivingOrgName: {
    type: String,
    required: true
  },
  bloodGroup: {
    type: String,
    default: 'O+'
  },
  component: {
    type: String,
    default: 'Packed Red Cells'
  },
  unitsRequired: {
    type: Number,
    required: true,
    min: 1
  },
  urgency: {
    type: String,
    enum: ['Critical', 'Urgent', 'Standard'],
    default: 'Critical'
  },
  requiredBy: {
    type: String,
    default: 'Within 3 Hours'
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Support Requested', 'Accepted', 'Declined', 'Fulfilled', 'Closed'],
    default: 'Support Requested'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('OrgSupportRequest', orgSupportRequestSchema);
