const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['Donor', 'Organization', 'BloodBank', 'Admin'],
    default: 'Donor',
    required: true
  },
  status: {
    type: String,
    enum: ['MOBILE_VERIFICATION_PENDING', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'SUSPENDED'],
    default: 'MOBILE_VERIFICATION_PENDING'
  },
  isMobileVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
