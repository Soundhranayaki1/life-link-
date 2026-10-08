const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  refereeName: {
    type: String,
    required: [true, 'Referee name is required'],
    trim: true
  },
  refereePhone: {
    type: String,
    required: [true, 'Referee phone number is required'],
    trim: true
  },
  referralCode: {
    type: String,
    required: true,
    unique: true
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodRequest',
    default: null
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null
  },
  hospitalUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['Sent', 'Contacted', 'Verified', 'Registered', 'Matched', 'Responded', 'Donation Completed'],
    default: 'Sent'
  },
  refereeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Referral', referralSchema);
