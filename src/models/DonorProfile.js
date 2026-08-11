const mongoose = require('mongoose');

const donorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  bloodGroup: {
    type: String,
    required: [true, 'Blood Group is required'],
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
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
  state: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  verificationStatus: {
    type: String,
    enum: ['MOBILE_VERIFICATION_PENDING', 'VERIFIED', 'SUSPENDED'],
    default: 'VERIFIED'
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  lastDonationDate: {
    type: Date,
    default: null
  },
  totalDonations: {
    type: Number,
    default: 0
  },
  age: {
    type: Number,
    min: 18,
    max: 65
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    default: 'Male'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DonorProfile', donorProfileSchema);
