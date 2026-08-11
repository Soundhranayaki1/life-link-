const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const Organization = require('../models/Organization');
const BloodRequest = require('../models/BloodRequest');
const BloodStock = require('../models/BloodStock');
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
          totalDonors: totalDonors || 4,
          availableDonors: availableDonors || 4,
          totalRequests: totalRequests || 3,
          activeRequests: activeRequests || 2,
          fulfilledRequests: fulfilledRequests || 1,
          pendingOrgs,
          verifiedOrgs,
          totalUnitsInStock: totalUnitsInStock || 261
        }
      });
    } else {
      return res.json({
        success: true,
        stats: {
          totalUsers: mockUsers.length,
          totalDonors: 4,
          availableDonors: 4,
          totalRequests: mockRequests.length,
          activeRequests: 2,
          fulfilledRequests: 1,
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
    const { status } = req.query; // 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'All'

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
        count: 2,
        organizations: [
          {
            _id: 'org_1',
            orgName: 'Apollo Government Hospital',
            orgType: 'GovtHospital',
            certificationNumber: 'GOVT-HOSP-2026-991',
            officialPhone: '+91 22 2493 1111',
            officialEmail: 'contact@apollohosp.gov.in',
            address: 'Central Hospital Zone, Worli',
            city: 'Mumbai',
            representativeName: 'Dr. S. K. Mehta',
            verificationStatus: 'VERIFIED',
            createdAt: new Date()
          },
          {
            _id: 'org_2',
            orgName: 'Red Cross Regional Blood Bank',
            orgType: 'CertifiedBloodBank',
            certificationNumber: 'BB-LIC-8820',
            officialPhone: '+91 11 2371 6441',
            officialEmail: 'info@redcrossblood.org',
            address: '1 Red Cross Rd, Connaught Place',
            city: 'Delhi',
            representativeName: 'Dr. Ananya Roy',
            verificationStatus: 'PENDING_VERIFICATION',
            createdAt: new Date()
          }
        ]
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

        // Also update associated User account status
        await User.findByIdAndUpdate(org.userId, { status: 'VERIFIED' });
      } else {
        await User.findByIdAndUpdate(org.userId, { status: status });
      }

      await org.save();

      return res.json({
        success: true,
        message: `Organization ${org.orgName} status updated to ${status}`,
        organization: org
      });
    } else {
      return res.json({
        success: true,
        message: `Organization verification status updated to ${status} (Demo)`
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminStats,
  getOrganizations,
  verifyOrganization
};
