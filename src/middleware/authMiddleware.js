const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organization');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'lifelink_super_secret_jwt_key_2026');

      if (User.db && User.db.readyState === 1) {
        req.user = await User.findById(decoded.id).select('-password');
      } else {
        req.user = decoded;
      }
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized, token validation failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, login required' });
  }
};

// Ensure user is an Admin
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: System Administrator permission required' });
};

// Ensure user is a VERIFIED Donor (Mobile OTP verified)
const verifiedDonorOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'Donor') {
    return res.status(403).json({ success: false, message: 'Access denied: Donor account required' });
  }
  if (req.user.status !== 'VERIFIED' && req.user.isMobileVerified !== true) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Mobile number verification via OTP is required before performing donor actions'
    });
  }
  next();
};

// Ensure user belongs to a VERIFIED Organization (Govt Hospital / Certified Blood Bank)
const verifiedOrgOnly = async (req, res, next) => {
  if (!req.user || !['Organization', 'BloodBank', 'Admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Only authorized healthcare organizations can post emergency blood requests'
    });
  }

  if (req.user.role === 'Admin') return next();

  if (Organization.db && Organization.db.readyState === 1) {
    const org = await Organization.findOne({ userId: req.user._id || req.user.id });
    if (!org || org.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Your organization status is PENDING_VERIFICATION or REJECTED. Only VERIFIED organizations approved by the Admin can post emergency blood requests.'
      });
    }
    req.organization = org;
    return next();
  } else {
    // Demo Fallback
    return next();
  }
};

module.exports = {
  protect,
  adminOnly,
  verifiedDonorOnly,
  verifiedOrgOnly
};
