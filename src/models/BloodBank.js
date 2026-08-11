const mongoose = require('mongoose');

const bloodBankSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  bankName: {
    type: String,
    required: [true, 'Blood Bank / Hospital name is required'],
    trim: true
  },
  licenseNumber: {
    type: String,
    required: [true, 'Government License number is required'],
    trim: true
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
  address: {
    type: String,
    required: [true, 'Full address is required']
  },
  contactPhone: {
    type: String,
    required: [true, 'Contact phone is required']
  },
  verificationStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BloodBank', bloodBankSchema);
