const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const Organization = require('../models/Organization');
const BloodRequest = require('../models/BloodRequest');
const BloodStock = require('../models/BloodStock');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { mockUsers, mockRequests, mockInventory } = require('../utils/mockStore');

// @desc    Get system administration dashboard metrics
// @route   GET /api/admin/stats
// @access  Private (Admin Only)
const getAdminStats = async (req, res, next) => {
  try {
    if (User.db && User.db.readyState === 1) {
      const totalUsers = await User.countDocuments();
      const totalDonors = await User.countDocuments({ role: 'Donor' });
      const availableDonors = await DonorProfile.countDocuments({ isAvailable: true });
      const totalRequests = await BloodRequest.countDocuments();
      const activeRequests = await BloodRequest.countDocuments({ status: { $in: ['Pending', 'In Progress'] } });
      const fulfilledRequests = await BloodRequest.countDocuments({ status: 'Fulfilled' });

      let pendingOrgs = 0;
      let verifiedOrgs = 0;

      if (Organization.db && Organization.db.readyState === 1) {
        pendingOrgs = await Organization.countDocuments({ verificationStatus: 'PENDING_VERIFICATION' });
        verifiedOrgs = await Organization.countDocuments({ verificationStatus: 'VERIFIED' });
      }

      const stockItems = await BloodStock.find();
      const totalUnitsInStock = stockItems.reduce((acc, curr) => acc + (curr.unitsAvailable || 0), 0);

      return res.json({
        success: true,
        stats: {
          totalUsers,
          totalDonors,
          availableDonors,
          totalRequests,
          activeRequests,
          fulfilledRequests,
          pendingOrgs,
          verifiedOrgs,
          totalUnitsInStock
        }
      });
    } else {
      return res.json({
        success: true,
        stats: {
          totalUsers: mockUsers.length,
          totalDonors: mockUsers.filter(u => u.role === 'Donor').length,
          availableDonors: mockUsers.filter(u => u.role === 'Donor' && u.isAvailable).length,
          totalRequests: mockRequests.length,
          activeRequests: mockRequests.filter(r => r.status === 'Pending' || r.status === 'In Progress').length,
          fulfilledRequests: mockRequests.filter(r => r.status === 'Fulfilled').length,
          pendingOrgs: 1,
          verifiedOrgs: 1,
          totalUnitsInStock: mockInventory.reduce((a, b) => a + b.unitsAvailable, 0)
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all organizations for verification review
// @route   GET /api/admin/organizations
// @access  Private (Admin Only)
const getOrganizations = async (req, res, next) => {
  try {
    const { status } = req.query;

    if (Organization.db && Organization.db.readyState === 1) {
      let query = {};
      if (status && status !== 'All') {
        query.verificationStatus = status;
      }
      const orgs = await Organization.find(query).sort({ createdAt: -1 });
      return res.json({ success: true, count: orgs.length, organizations: orgs });
    } else {
      return res.json({
        success: true,
        count: 0,
        organizations: []
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Approve (Verify), Reject, or Suspend Organization
// @route   PATCH /api/admin/organizations/:id/verify
// @access  Private (Admin Only)
const verifyOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'VERIFIED', 'REJECTED', 'SUSPENDED'

    if (!['VERIFIED', 'REJECTED', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status parameter' });
    }

    if (Organization.db && Organization.db.readyState === 1) {
      const org = await Organization.findById(id);
      if (!org) return res.status(404).json({ success: false, message: 'Organization record not found' });

      org.verificationStatus = status;
      if (status === 'VERIFIED') {
        org.verifiedAt = new Date();
        org.verifiedBy = req.user.id || req.user._id;
        await User.findByIdAndUpdate(org.userId, { status: 'VERIFIED' });

        // Create Notification for Org
        await Notification.create({
          recipientId: org.userId,
          title: '🎉 Organization Account Approved & Verified!',
          message: `Your organization (${org.orgName}) verification request has been approved by Admin. Emergency request broadcasting is now active.`,
          type: 'Verification',
          link: 'org-dashboard.html'
        });
      } else {
        await User.findByIdAndUpdate(org.userId, { status: status });
      }

      await org.save();

      await AuditLog.create({
        action: `Organization Verification ${status}`,
        performerName: req.user.name || 'Admin',
        role: 'Admin',
        category: 'ORGANIZATION_GOVERNANCE',
        description: `Organization ${org.orgName} status updated to ${status}.`,
        target: org.orgName
      });

      return res.json({
        success: true,
        message: `Organization ${org.orgName} status updated to ${status}`,
        organization: org
      });
    } else {
      return res.json({
        success: true,
        message: `Organization status updated to ${status}`
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all donors for governance
// @route   GET /api/admin/donors
// @access  Private (Admin Only)
const getAdminDonors = async (req, res, next) => {
  try {
    if (DonorProfile.db && DonorProfile.db.readyState === 1) {
      const profiles = await DonorProfile.find().populate('userId', 'name email phone status role createdAt');
      const donors = profiles.map(p => ({
        id: p._id,
        userId: p.userId ? p.userId._id : null,
        name: p.userId ? p.userId.name : 'Donor',
        email: p.userId ? p.userId.email : '',
        phone: p.userId ? p.userId.phone : '',
        bloodGroup: p.bloodGroup,
        city: p.city,
        isAvailable: p.isAvailable,
        totalDonations: p.totalDonations,
        verificationStatus: p.verificationStatus,
        status: p.userId ? p.userId.status : 'VERIFIED',
        createdAt: p.createdAt
      }));
      return res.json({ success: true, count: donors.length, donors });
    } else {
      return res.json({ success: true, count: 0, donors: [] });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update Donor account status (Suspend / Activate)
// @route   PATCH /api/admin/donors/:id/status
// @access  Private (Admin Only)
const updateDonorStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'VERIFIED', 'SUSPENDED'

    if (DonorProfile.db && DonorProfile.db.readyState === 1) {
      const profile = await DonorProfile.findById(id);
      if (profile) {
        profile.verificationStatus = status;
        await profile.save();
        if (profile.userId) {
          await User.findByIdAndUpdate(profile.userId, { status });
        }
      }
      return res.json({ success: true, message: `Donor status updated to ${status}` });
    } else {
      return res.json({ success: true, message: `Donor status updated to ${status}` });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminStats,
  getOrganizations,
  verifyOrganization,
  getAdminDonors,
  updateDonorStatus
};
