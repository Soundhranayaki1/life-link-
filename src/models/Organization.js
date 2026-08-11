const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  orgName: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true
  },
  orgType: {
    type: String,
    enum: ['GovtHospital', 'CertifiedBloodBank', 'AuthorizedMedicalOrg'],
    required: [true, 'Organization type is required'],
    default: 'GovtHospital'
  },
  certificationNumber: {
    type: String,
    required: [true, 'Official Government Certification Number is required'],
    trim: true
  },
  officialPhone: {
    type: String,
    required: [true, 'Official phone number is required']
  },
  officialEmail: {
    type: String,
    required: [true, 'Official email is required']
  },
  address: {
    type: String,
    required: [true, 'Official physical address is required']
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
  representativeName: {
    type: String,
    required: [true, 'Authorized representative name is required']
  },
  verificationStatus: {
    type: String,
    enum: ['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'SUSPENDED'],
    default: 'PENDING_VERIFICATION'
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Organization', organizationSchema);
