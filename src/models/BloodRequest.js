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
  district: {
    type: String,
    default: ''
  },
  locationCoords: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },
  contactPhone: {
    type: String,
    required: [true, 'Contact phone is required']
  },
  urgency: {
    type: String,
    enum: [
      'Critical', 'Urgent', 'Standard',
      'CRITICAL', 'URGENT', 'STANDARD',
      'critical', 'urgent', 'standard',
      'HIGH', 'High', 'high', 'MEDIUM', 'Medium', 'medium', 'LOW', 'Low', 'low',
      'Critical (Immediate Dispatch)', 'Urgent (Within 4-6 Hours)', 'Standard (Routine)'
    ],
    default: 'Urgent'
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Fulfilled', 'Cancelled', 'Closed', 'Expired'],
    default: 'Pending'
  },
  additionalNotes: {
    type: String,
    default: ''
  },
  dispatchWave: {
    type: String,
    default: 'Round 1 (0–3 km)'
  },
  dispatchStatus: {
    type: String,
    enum: ['IN_PROGRESS', 'COMPLETED', 'MAX_RADIUS_REACHED', 'CANCELLED', 'FULFILLED', 'EXPIRED'],
    default: 'IN_PROGRESS'
  },
  currentWaveNumber: {
    type: Number,
    default: 1
  },
  currentRadiusKm: {
    type: Number,
    default: 3
  },
  nextWaveRadiusKm: {
    type: Number,
    default: 5
  },
  initialRadius: {
    type: Number,
    default: 3
  },
  maxRadius: {
    type: Number,
    default: 8
  },
  targetConfirmations: {
    type: Number,
    default: 2
  },
  evaluationWindowMinutes: {
    type: Number,
    default: 15
  },
  lastEvaluatedAt: {
    type: Date,
    default: Date.now
  },
  nextEvaluationAt: {
    type: Date
  },
  waveHistory: [{
    waveNumber: Number,
    waveTitle: String,
    minRadiusKm: Number,
    maxRadiusKm: Number,
    donorsNotifiedCount: Number,
    newlyNotifiedCount: Number,
    confirmedDonorsAtTrigger: Number,
    triggeredAt: { type: Date, default: Date.now },
    triggerType: { type: String, enum: ['INITIAL', 'AUTO', 'MANUAL'], default: 'INITIAL' }
  }],
  donorsNotifiedCount: {
    type: Number,
    default: 0
  },
  notifiedDonorIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  requiredBy: {
    type: String,
    default: 'Within 3 Hours'
  },
  respondedDonors: [{
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    donorName: String,
    donorPhone: String,
    bloodGroup: String,
    approxDistance: String,
    status: {
      type: String,
      enum: ['Accepted', 'ACCEPTED', 'Standby', 'STANDBY', 'Contacted', 'CONTACTED', 'Confirmed', 'CONFIRMED', 'Arrived', 'ARRIVED', 'Completed', 'COMPLETED', 'Declined', 'DECLINED', 'Unable', 'UNABLE', 'Withdrawn', 'WITHDRAWN'],
      default: 'Confirmed'
    },
    respondedAt: { type: Date, default: Date.now },
    confirmedAt: { type: Date, default: Date.now },
    withdrawnAt: { type: Date },
    arrivedAt: { type: Date },
    fulfilledAt: { type: Date }
  }],
  referrals: [{
    referringDonorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referringDonorName: String,
    referringDonorPhone: String,
    referredPhone: String,
    referredName: String,
    status: {
      type: String,
      enum: ['Pending', 'Verified', 'Responded', 'Declined'],
      default: 'Pending'
    },
    referredAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
