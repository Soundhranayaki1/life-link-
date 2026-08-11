const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const DonationHistory = require('../models/DonationHistory');
const { mockUsers } = require('../utils/mockStore');
const { getCompatibleDonors } = require('../utils/compatibility');

// @desc    Search voluntary blood donors by blood group, city & availability
// @route   GET /api/donors
// @access  Public
const getDonors = async (req, res, next) => {
  try {
    const { bloodGroup, city, availableOnly, compatibleWith, search } = req.query;

    if (User.db && User.db.readyState === 1) {
      let donorFilter = {};

      if (bloodGroup && bloodGroup !== 'All') {
        donorFilter.bloodGroup = bloodGroup;
      } else if (compatibleWith) {
        const compatibleGroups = getCompatibleDonors(compatibleWith);
        donorFilter.bloodGroup = { $in: compatibleGroups };
      }

      if (city && city.trim() !== '') {
        donorFilter.city = { $regex: city.trim(), $options: 'i' };
      }

      if (availableOnly === 'true') {
        donorFilter.isAvailable = true;
      }

      const profiles = await DonorProfile.find(donorFilter).populate('userId', 'name email phone role');

      const donors = profiles.map(p => ({
        id: p._id,
        userId: p.userId ? p.userId._id : null,
        name: p.userId ? p.userId.name : 'Voluntary Donor',
        phone: p.userId ? p.userId.phone : '',
        email: p.userId ? p.userId.email : '',
        bloodGroup: p.bloodGroup,
        city: p.city,
        district: p.district,
        address: p.address,
        isAvailable: p.isAvailable,
        totalDonations: p.totalDonations,
        lastDonationDate: p.lastDonationDate
      }));

      // Search text filter
      let filteredDonors = donors;
      if (search && search.trim() !== '') {
        const s = search.trim().toLowerCase();
        filteredDonors = donors.filter(d =>
          d.name.toLowerCase().includes(s) ||
          d.city.toLowerCase().includes(s) ||
          d.bloodGroup.toLowerCase().includes(s)
        );
      }

      return res.json({
        success: true,
        count: filteredDonors.length,
        donors: filteredDonors
      });
    } else {
      let results = mockUsers.filter(u => u.role === 'Donor' || !u.role);

      if (bloodGroup && bloodGroup !== 'All') {
        results = results.filter(u => u.bloodGroup === bloodGroup);
      } else if (compatibleWith) {
        const compatibleGroups = getCompatibleDonors(compatibleWith);
        results = results.filter(u => compatibleGroups.includes(u.bloodGroup));
      }

      if (city && city.trim() !== '') {
        results = results.filter(u => u.city.toLowerCase().includes(city.trim().toLowerCase()));
      }

      if (availableOnly === 'true') {
        results = results.filter(u => u.isAvailable === true);
      }

      const donors = results.map(u => ({
        id: u._id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        bloodGroup: u.bloodGroup,
        city: u.city,
        address: u.address || '',
        isAvailable: u.isAvailable !== false,
        totalDonations: u.totalDonations || 0,
        lastDonationDate: u.lastDonationDate || null
      }));

      return res.json({
        success: true,
        count: donors.length,
        donors
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle donor availability status
// @route   PATCH /api/donors/availability
// @access  Private (Donor Only)
const toggleAvailability = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (User.db && User.db.readyState === 1) {
      let profile = await DonorProfile.findOne({ userId });
      if (!profile) {
        profile = await DonorProfile.create({ userId, bloodGroup: req.user.bloodGroup || 'O+', city: 'Mumbai' });
      }

      profile.isAvailable = !profile.isAvailable;
      await profile.save();

      return res.json({
        success: true,
        message: `Availability updated to ${profile.isAvailable ? 'Available' : 'Unavailable'}`,
        isAvailable: profile.isAvailable
      });
    } else {
      const donor = mockUsers.find(u => u._id.toString() === userId.toString());
      if (donor) {
        donor.isAvailable = !donor.isAvailable;
        return res.json({
          success: true,
          message: `Availability updated to ${donor.isAvailable ? 'Available' : 'Unavailable'} (Demo)`,
          isAvailable: donor.isAvailable
        });
      }
      return res.json({ success: true, message: 'Status updated', isAvailable: true });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get donor donation history
// @route   GET /api/donors/history
// @access  Private (Donor Only)
const getDonationHistory = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (DonationHistory.db && DonationHistory.db.readyState === 1) {
      const history = await DonationHistory.find({ donorId: userId }).sort({ donationDate: -1 });
      return res.json({ success: true, history });
    } else {
      return res.json({
        success: true,
        history: [
          {
            _id: 'dh_1',
            bloodGroup: req.user.bloodGroup || 'O+',
            unitsDonated: 1,
            donationDate: new Date('2026-01-15'),
            location: 'Apollo Speciality Hospital, Mumbai'
          }
        ]
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDonors,
  toggleAvailability,
  getDonationHistory
};
