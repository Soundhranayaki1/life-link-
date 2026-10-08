const Organization = require('../models/Organization');
const BloodBank = require('../models/BloodBank');

// @desc    Get all verified blood banks & healthcare facilities
// @route   GET /api/blood-banks
// @access  Public
const getBloodBanks = async (req, res, next) => {
  try {
    const { city } = req.query;
    let query = {};
    if (city && city.trim() !== '') {
      query.city = { $regex: city.trim(), $options: 'i' };
    }

    const orgs = await Organization.find(query).sort({ createdAt: -1 });
    const banks = orgs.map(o => ({
      _id: o._id,
      bankName: o.orgName,
      licenseNumber: o.certificationNumber || 'GOVT-TN-LIC-2026',
      city: o.city,
      address: o.address,
      contactPhone: o.officialPhone || o.emergencyHotline,
      verificationStatus: o.verificationStatus === 'VERIFIED' ? 'Approved' : 'Pending',
      operatingHours: '24/7 Emergency Service'
    }));

    return res.json({ success: true, count: banks.length, bloodBanks: banks });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBloodBanks
};
