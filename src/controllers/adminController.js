const bcrypt = require('bcryptjs');
const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const Organization = require('../models/Organization');
const BloodRequest = require('../models/BloodRequest');
const BloodStock = require('../models/BloodStock');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

// @desc    Get system administration dashboard metrics
// @route   GET /api/admin/stats
// @access  Private (Admin Only)
const getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDonors = await User.countDocuments({ role: 'Donor' });
    const availableDonors = await DonorProfile.countDocuments({ isAvailable: true });
    const totalRequests = await BloodRequest.countDocuments();
    const activeRequests = await BloodRequest.countDocuments({ status: { $in: ['Pending', 'In Progress'] } });
    const fulfilledRequests = await BloodRequest.countDocuments({ status: 'Fulfilled' });

    const totalOrgs = await Organization.countDocuments();
    const pendingOrgs = await Organization.countDocuments({ verificationStatus: 'PENDING_VERIFICATION' });
    const verifiedOrgs = await Organization.countDocuments({ verificationStatus: 'VERIFIED' });
    const suspendedOrgs = await Organization.countDocuments({ verificationStatus: 'SUSPENDED' });

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
        totalOrgs,
        pendingOrgs,
        verifiedOrgs,
        suspendedOrgs,
        totalUnitsInStock
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all organizations for verification review and governance
// @route   GET /api/admin/organizations
// @access  Private (Admin Only)
const getOrganizations = async (req, res, next) => {
  try {
    const { status, type } = req.query;

    let query = {};
    if (status && status !== 'ALL' && status !== 'All') {
      query.verificationStatus = status === 'PENDING' ? 'PENDING_VERIFICATION' : status;
    }
    if (type && type !== 'ALL' && type !== 'All') {
      query.orgType = type;
    }

    const orgs = await Organization.find(query).populate('userId', 'username email status phone name').sort({ createdAt: -1 });

    const formattedOrgs = orgs.map(o => ({
      id: o._id,
      name: o.orgName,
      type: o.orgType === 'GovtHospital' ? 'Government Hospital' : o.orgType === 'CertifiedBloodBank' ? 'Government Blood Bank' : 'Authorized Healthcare Organization',
      orgType: o.orgType,
      certificationNumber: o.certificationNumber,
      regNumber: o.certificationNumber,
      issuingAuthority: 'Health Department',
      validUntil: '2030-12-31',
      location: `${o.city}${o.district ? ', ' + o.district : ''}`,
      city: o.city,
      district: o.district,
      address: o.address,
      phone: o.officialPhone,
      email: o.officialEmail,
      emergencyContact: o.emergencyHotline || o.officialPhone,
      representative: o.representativeName,
      username: o.userId ? o.userId.username : '',
      registeredMobile: o.officialPhone,
      status: o.verificationStatus,
      portalAccess: o.verificationStatus === 'VERIFIED' ? 'ACTIVE' : 'LOCKED',
      createdAt: o.createdAt,
      lastUpdated: o.updatedAt ? new Date(o.updatedAt).toLocaleDateString() : 'Recently'
    }));

    return res.json({ success: true, count: formattedOrgs.length, organizations: formattedOrgs });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Create New Hospital / Organization in MongoDB
// @route   POST /api/admin/create-org
// @access  Private (Admin Only)
const createOrganization = async (req, res, next) => {
  try {
    const {
      name,
      orgType,
      phone,
      officialEmail,
      emergencyContact,
      officialAddress,
      city,
      district,
      state,
      pincode,
      certificationNumber,
      issuingAuthority,
      validUntil,
      representativeName,
      username,
      password,
      registeredMobile
    } = req.body;

    if (!name || !username || !password || !phone || !city) {
      return res.status(400).json({ success: false, message: 'Organization name, username, password, phone, and city are required' });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    const cleanEmail = (officialEmail || `${cleanUsername}@lifelink.org`).trim().toLowerCase();

    const existingByUsername = await User.findOne({ username: cleanUsername });
    if (existingByUsername) {
      return res.status(400).json({ success: false, message: `The username "${cleanUsername}" is already in use. Please enter a different Organization Username.` });
    }

    const existingByEmail = await User.findOne({ email: cleanEmail });
    if (existingByEmail) {
      return res.status(400).json({ success: false, message: `The email "${cleanEmail}" is already registered in the system. Please enter a different Official Email.` });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: cleanEmail,
      username: cleanUsername,
      password: hashedPassword,
      phone: (registeredMobile || phone).trim(),
      role: 'Organization',
      status: 'VERIFIED',
      isMobileVerified: true
    });

    let org;
    try {
      org = await Organization.create({
        userId: user._id,
        orgName: name,
        orgType: orgType || 'GovtHospital',
        certificationNumber: certificationNumber || 'GOVT-TN-HOSP-' + Math.floor(1000 + Math.random() * 9000),
        officialPhone: phone.trim(),
        officialEmail: cleanEmail,
        address: officialAddress || `${city}, ${state || ''}`,
        city: city.trim(),
        district: district ? district.trim() : city.trim(),
        representativeName: representativeName || 'Medical Director',
        emergencyHotline: emergencyContact || phone,
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedBy: req.user ? (req.user._id || req.user.id) : null
      });
    } catch (createErr) {
      await User.findByIdAndDelete(user._id);
      throw createErr;
    }

    try {
      await AuditLog.create({
        action: 'Organization Account Created',
        performerName: (req.user && req.user.name) || 'Admin',
        role: 'Admin',
        category: 'ORGANIZATION_GOVERNANCE',
        description: `Created organization account for ${name} with username "${cleanUsername}". Access: VERIFIED & ACTIVE.`,
        target: name
      });
    } catch (auditErr) {
      console.warn('AuditLog creation warning:', auditErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `Organization "${name}" created successfully in MongoDB! Username: ${cleanUsername}`,
      organization: org,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
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
    const { status } = req.body;

    if (!['VERIFIED', 'REJECTED', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status parameter' });
    }

    const org = await Organization.findById(id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization record not found' });

    org.verificationStatus = status;
    if (status === 'VERIFIED') {
      org.verifiedAt = new Date();
      org.verifiedBy = req.user.id || req.user._id;
      await User.findByIdAndUpdate(org.userId, { status: 'VERIFIED' });

      await Notification.create({
        recipientId: org.userId,
        title: '🎉 Organization Account Approved & Verified!',
        message: `Your organization (${org.orgName}) verification request has been approved by Admin. Emergency request broadcasting is now active.`,
        type: 'Verification',
        link: 'org-dashboard.html'
      });
    } else {
      await User.findByIdAndUpdate(org.userId, { status });
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
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Reset Organization Password
// @route   POST /api/admin/organizations/:id/reset-password
// @access  Private (Admin Only)
const resetOrgPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const org = await Organization.findById(id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(org.userId, {
      password: hashedPassword,
      status: 'VERIFIED'
    });

    org.verificationStatus = 'VERIFIED';
    await org.save();

    await AuditLog.create({
      action: 'Organization Password Reset by Admin',
      performerName: req.user.name || 'Admin',
      role: 'Admin',
      category: 'SECURITY',
      description: `Temporary password reset completed for organization ${org.orgName}.`,
      target: org.orgName
    });

    return res.json({
      success: true,
      message: `Password reset successfully for ${org.orgName}!`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all donors for governance
// @route   GET /api/admin/donors
// @access  Private (Admin Only)
const getAdminDonors = async (req, res, next) => {
  try {
    const profiles = await DonorProfile.find().populate('userId', 'name email phone status role createdAt');
    const donors = profiles.map(p => ({
      id: p._id,
      userId: p.userId ? p.userId._id : null,
      name: p.userId ? p.userId.name : 'Voluntary Donor',
      email: p.userId ? p.userId.email : '',
      phone: p.userId ? p.userId.phone : '',
      bloodGroup: p.bloodGroup,
      city: p.city,
      district: p.district,
      approxArea: `${p.city}${p.district ? ', ' + p.district : ''}`,
      isAvailable: p.isAvailable,
      totalDonations: p.totalDonations,
      verificationStatus: p.verificationStatus,
      status: p.userId ? p.userId.status : 'VERIFIED',
      accountStatus: p.userId ? p.userId.status : 'VERIFIED',
      createdAt: p.createdAt
    }));

    return res.json({ success: true, count: donors.length, donors });
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
    const { status } = req.body;

    const profile = await DonorProfile.findById(id);
    if (profile) {
      profile.verificationStatus = status;
      await profile.save();
      if (profile.userId) {
        await User.findByIdAndUpdate(profile.userId, { status });
      }
    }
    return res.json({ success: true, message: `Donor status updated to ${status}` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminStats,
  getOrganizations,
  createOrganization,
  verifyOrganization,
  resetOrgPassword,
  getAdminDonors,
  updateDonorStatus
};
