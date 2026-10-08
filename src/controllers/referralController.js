const Referral = require('../models/Referral');
const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const BloodRequest = require('../models/BloodRequest');
const Organization = require('../models/Organization');
const Notification = require('../models/Notification');

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

// @desc    Create a new donor referral (Sent to hospital & stored in DB)
// @route   POST /api/referrals
// @access  Private (Donor Only)
const createReferral = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const referrerUser = await User.findById(userId);
    const referrerName = referrerUser ? referrerUser.name : 'A Voluntary Donor';

    const { refereeName, refereePhone, requestId, organizationId } = req.body;

    if (!refereeName || !refereePhone) {
      return res.status(400).json({ success: false, message: 'Friend/Family name and mobile number are required' });
    }

    const referralCode = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    let reqObj = null;
    let targetOrgId = organizationId || null;
    let targetHospitalUserId = null;

    if (requestId) {
      reqObj = await BloodRequest.findById(requestId);
      if (reqObj) {
        if (reqObj.organizationId) targetOrgId = reqObj.organizationId;
        if (reqObj.authorizedUserId) targetHospitalUserId = reqObj.authorizedUserId;
      }
    }

    if (!targetHospitalUserId && targetOrgId) {
      const orgDoc = await Organization.findById(targetOrgId);
      if (orgDoc) targetHospitalUserId = orgDoc.userId;
    }

    // Fallback: If no specific request passed, route to latest emergency blood request hospital user
    if (!targetHospitalUserId) {
      const latestReq = await BloodRequest.findOne().sort({ createdAt: -1 });
      if (latestReq) {
        reqObj = latestReq;
        targetOrgId = latestReq.organizationId || targetOrgId;
        targetHospitalUserId = latestReq.authorizedUserId || targetHospitalUserId;
      }
    }

    if (Referral.db && Referral.db.readyState === 1) {
      const referral = await Referral.create({
        referrerId: userId,
        refereeName: refereeName.trim(),
        refereePhone: refereePhone.trim(),
        referralCode,
        requestId: requestId || (reqObj ? reqObj._id : null),
        organizationId: targetOrgId,
        hospitalUserId: targetHospitalUserId,
        status: 'Sent'
      });

      // Send Notification to Hospital / Organization
      if (targetHospitalUserId) {
        await Notification.create({
          recipientId: targetHospitalUserId,
          title: `👥 New Donor Referral: ${refereeName.trim()}`,
          message: `Donor ${referrerName} referred ${refereeName.trim()} (${refereePhone.trim()}) for blood donation${reqObj ? ` (Request: ${reqObj.bloodGroup} for ${reqObj.patientName})` : ''}. Referral Code: ${referralCode}.`,
          type: 'ReferralAlert',
          link: 'org-dashboard.html'
        });
      }

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

// @desc    Get referrals sent to authenticated organization/hospital
// @route   GET /api/referrals/org
// @access  Private (Organization Only)
const getOrgReferrals = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const org = await Organization.findOne({ userId });

    const query = org
      ? { $or: [{ hospitalUserId: userId }, { organizationId: org._id }] }
      : { hospitalUserId: userId };

    const referrals = await Referral.find(query)
      .populate('referrerId', 'name phone email bloodGroup')
      .populate('requestId', 'bloodGroup patientName hospitalName unitsNeeded urgency')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: referrals.length,
      referrals
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update referral status (Organization action)
// @route   PATCH /api/referrals/:id/status
// @access  Private (Organization Only)
const updateReferralStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const referral = await Referral.findById(id);
    if (!referral) return res.status(404).json({ success: false, message: 'Referral not found' });

    referral.status = status;
    if (status === 'Donation Completed') referral.completedAt = new Date();
    await referral.save();

    // Notify referrer donor of status update
    if (referral.referrerId) {
      await Notification.create({
        recipientId: referral.referrerId,
        title: `🎉 Referral Update: ${referral.refereeName}`,
        message: `Your referral for ${referral.refereeName} status has been updated to: ${status}. Thank you for helping save lives!`,
        type: 'ReferralUpdate',
        link: 'referrals-recognition.html'
      });
    }

    return res.json({ success: true, message: `Referral status updated to ${status}`, referral });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReferrals,
  createReferral,
  getOrgReferrals,
  updateReferralStatus
};
