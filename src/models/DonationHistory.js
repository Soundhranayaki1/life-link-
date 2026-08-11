const mongoose = require('mongoose');

const donationHistorySchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodRequest',
    required: false
  },
  bloodBankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodBank',
    required: false
  },
  bloodGroup: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  unitsDonated: {
    type: Number,
    default: 1
  },
  donationDate: {
    type: Date,
    default: Date.now
  },
  location: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DonationHistory', donationHistorySchema);
