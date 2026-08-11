const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
  patientName: {
    type: String,
    required: [true, 'Patient name is required'],
    trim: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false
  },
  authorizedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  orgName: {
    type: String,
    required: [true, 'Verified Organization name is required'],
    default: '✓ VERIFIED GOVERNMENT HOSPITAL'
  },
  orgType: {
    type: String,
    default: 'GovtHospital'
  },
  hospitalName: {
    type: String,
    required: [true, 'Hospital name is required'],
    trim: true
  },
  bloodGroup: {
    type: String,
    required: [true, 'Blood group is required'],
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  unitsNeeded: {
    type: Number,
    required: [true, 'Units needed is required'],
    min: [1, 'Must request at least 1 unit']
  },
  unitsFulfilled: {
    type: Number,
    default: 0
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  contactPhone: {
    type: String,
    required: [true, 'Contact phone is required']
  },
  urgency: {
    type: String,
    enum: ['Critical', 'Urgent', 'Standard'],
    default: 'Urgent'
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Fulfilled', 'Cancelled'],
    default: 'Pending'
  },
  additionalNotes: {
    type: String,
    default: ''
  },
  respondedDonors: [{
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    donorName: String,
    donorPhone: String,
    status: { type: String, enum: ['Accepted', 'Completed', 'Declined'], default: 'Accepted' },
    respondedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
