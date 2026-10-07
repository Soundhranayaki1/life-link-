const Referral = require('../models/Referral');
const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');

// @desc    Get donor referrals and statistics
// @route   GET /api/referrals
// @access  Private (Donor Only)
const getReferrals = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (Referral.db && Referral.db.readyState === 1) {
      const referrals = await Referral.find({ referrerId: userId }).sort({ createdAt: -1 });

      const totalSent = referrals.length;
      const registered = referrals.filter(r => ['Registered', 'Matched', 'Responded', 'Donation Completed'].includes(r.status)).length;
      const completed = referrals.filter(r => r.status === 'Donation Completed').length;
      const milestonePoints = completed * 100 + registered * 25;

      return res.json({
        success: true,
        count: referrals.length,
        referrals,
        stats: {
          totalSent,
          registered,
          completed,
          milestonePoints,
          badge: completed >= 5 ? 'LifeLink Champion' : completed >= 2 ? 'Active Ambassador' : 'Community Donor'
        }
      });
    } else {
      return res.json({
        success: true,
        count: 0,
        referrals: [],
        stats: {
          totalSent: 0,
          registered: 0,
          completed: 0,
          milestonePoints: 0,
          badge: 'Community Donor'
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new donor referral
// @route   POST /api/referrals
// @access  Private (Donor Only)
const createReferral = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { refereeName, refereePhone } = req.body;

    if (!refereeName || !refereePhone) {
      return res.status(400).json({ success: false, message: 'Friend/Family name and mobile number are required' });
    }

    const referralCode = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    if (Referral.db && Referral.db.readyState === 1) {
      const referral = await Referral.create({
        referrerId: userId,
        refereeName: refereeName.trim(),
        refereePhone: refereePhone.trim(),
        referralCode,
        status: 'Sent'
      });

      return res.status(201).json({
        success: true,
        message: `Referral invite sent to ${refereeName}! Code: ${referralCode}`,
        referral
      });
    } else {
      return res.status(201).json({
        success: true,
        message: `Referral invite recorded for ${refereeName}! Code: ${referralCode}`,
        referral: {
          _id: 'ref_' + Date.now(),
          referrerId: userId,
          refereeName,
          refereePhone,
          referralCode,
          status: 'Sent',
          createdAt: new Date()
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReferrals,
  createReferral
};
