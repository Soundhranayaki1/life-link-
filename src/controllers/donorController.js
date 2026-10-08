const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const DonationHistory = require('../models/DonationHistory');
const { getCompatibleDonors } = require('../utils/compatibility');
const { calculateEligibility } = require('../utils/eligibility');
const { matchDonorsForRequest } = require('../utils/matching');

// @desc    Search voluntary blood donors by blood group, city & availability
// @route   GET /api/donors
// @access  Public
const getDonors = async (req, res, next) => {
  try {
    const { bloodGroup, city, availableOnly, compatibleWith, search } = req.query;

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

    const profiles = await DonorProfile.find(donorFilter).populate('userId', 'name email phone role status');

    const donors = profiles
      .filter(p => p.userId && p.userId.status !== 'SUSPENDED')
      .map(p => {
        const eligibility = calculateEligibility(p.lastDonationDate);
        return {
          id: p._id,
          userId: p.userId ? p.userId._id : null,
          name: p.userId ? p.userId.name : 'Voluntary Donor',
          phone: p.userId ? p.userId.phone : '',
          email: p.userId ? p.userId.email : '',
          bloodGroup: p.bloodGroup,
          city: p.city,
          district: p.district,
          approxDistance: `~3.0 km`,
          isAvailable: p.isAvailable,
          totalDonations: p.totalDonations,
          livesHelped: p.livesHelped || 0,
          lastDonationDate: p.lastDonationDate,
          isEligible: eligibility.isEligible,
          eligibilityStatus: eligibility.statusText,
          nextEligibleFormatted: eligibility.nextEligibleFormatted
        };
      });

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
  } catch (error) {
    next(error);
  }
};

// @desc    Smart Donor Search & Ranked Matching for an Emergency Request
// @route   GET /api/donors/match
// @access  Public
const matchDonors = async (req, res, next) => {
  try {
    const { bloodGroup, city, searchRadiusKm } = req.query;
    const reqObj = { bloodGroup: bloodGroup || 'O+', city: city || '', searchRadiusKm: searchRadiusKm || 8 };

    const profiles = await DonorProfile.find({ isAvailable: true }).populate('userId', 'name email phone role status');
    const rawDonors = profiles
      .filter(p => p.userId && p.userId.status !== 'SUSPENDED')
      .map(p => ({
        id: p._id,
        name: p.userId ? p.userId.name : 'Voluntary Donor',
        bloodGroup: p.bloodGroup,
        city: p.city,
        district: p.district,
        isAvailable: p.isAvailable,
        lastDonationDate: p.lastDonationDate,
        phone: p.userId ? p.userId.phone : ''
      }));

    const matchedList = matchDonorsForRequest(reqObj, rawDonors);

    return res.json({
      success: true,
      count: matchedList.length,
      matchedDonors: matchedList
    });
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

    let profile = await DonorProfile.findOne({ userId });
    if (!profile) {
      profile = await DonorProfile.create({ userId, bloodGroup: req.user.bloodGroup || 'O+', city: req.user.city || 'Hosur' });
    }

    profile.isAvailable = !profile.isAvailable;
    await profile.save();

    return res.json({
      success: true,
      message: `Availability updated to ${profile.isAvailable ? 'Available' : 'Unavailable'}`,
      isAvailable: profile.isAvailable
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get donor donation history and eligibility
// @route   GET /api/donors/history
// @access  Private (Donor Only)
const getDonationHistory = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    const historyList = await DonationHistory.find({ donorId: userId }).sort({ donationDate: -1 });
    const profile = await DonorProfile.findOne({ userId });
    const lastDate = (profile && profile.lastDonationDate) ? profile.lastDonationDate : (historyList.length > 0 ? historyList[0].donationDate : null);

    const eligibility = calculateEligibility(lastDate);

    return res.json({
      success: true,
      history: historyList,
      eligibility
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update donor radius
// @route   PATCH /api/donors/radius
// @access  Private (Donor Only)
const updateRadius = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { radiusKm } = req.body;

    let profile = await DonorProfile.findOne({ userId });
    if (profile) {
      profile.donationRadiusKm = parseFloat(radiusKm) || 10;
      await profile.save();
    }
    return res.json({ success: true, message: `Donation radius updated to ${radiusKm} km`, radiusKm });
  } catch (error) {
    next(error);
  }
};

// @desc    Update donor profile details
// @route   PATCH /api/donors/profile
// @access  Private (Donor Only)
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { name, bloodGroup, city, district, address, phone } = req.body;

    if (name || phone) {
      await User.findByIdAndUpdate(userId, {
        ...(name && { name: name.trim() }),
        ...(phone && { phone: phone.trim() })
      });
    }

    let profile = await DonorProfile.findOne({ userId });
    if (!profile) {
      profile = new DonorProfile({ userId, bloodGroup: bloodGroup || req.user.bloodGroup || 'O+', city: city || req.user.city || 'Hosur' });
    }

    if (bloodGroup) profile.bloodGroup = bloodGroup;
    if (city) profile.city = city.trim();
    if (district !== undefined) profile.district = district.trim();
    if (address !== undefined) profile.address = address.trim();

    await profile.save();

    const updatedUser = await User.findById(userId).select('-password');

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: updatedUser,
      profile
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDonors,
  matchDonors,
  toggleAvailability,
  getDonationHistory,
  updateRadius,
  updateProfile
};
