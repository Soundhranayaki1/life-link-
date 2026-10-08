const DonationHistory = require('../models/DonationHistory');
const DonorProfile = require('../models/DonorProfile');
const User = require('../models/User');
const BloodStock = require('../models/BloodStock');
const BloodRequest = require('../models/BloodRequest');
const { calculateEligibility } = require('../utils/eligibility');

// @desc    Record a completed donation (AUTHORIZED ORGANIZATIONS & ADMINS ONLY)
// @route   POST /api/donations/record
// @access  Private (Organization & Admin Only)
const recordDonation = async (req, res, next) => {
  try {
    const userRole = req.user ? req.user.role : null;
    if (userRole !== 'Organization' && userRole !== 'Admin' && userRole !== 'BloodBank') {
      return res.status(403).json({
        success: false,
        message: 'Security Alert: Donors cannot self-record completed donations. Only authorized healthcare organizations or admins can record donations.'
      });
    }

    const { donorId, bloodGroup, donationDate, hospitalName, unitsDonated, requestId } = req.body;

    if (!donorId || !bloodGroup) {
      return res.status(400).json({ success: false, message: 'Donor ID and Blood Group are required' });
    }

    const recUnits = parseInt(unitsDonated) || 1;
    const recDate = donationDate ? new Date(donationDate) : new Date();

    // 1. Create Donation Record in MongoDB
    const donationRecord = await DonationHistory.create({
      donorId,
      requestId: requestId || null,
      bloodGroup,
      unitsDonated: recUnits,
      donationDate: recDate,
      location: hospitalName || 'Certified Health Center'
    });

    // 2. Update Donor Profile lastDonationDate & Stats in MongoDB
    let profile = await DonorProfile.findOne({ userId: donorId });
    if (!profile) {
      profile = await DonorProfile.findOne({ _id: donorId });
    }

    if (profile) {
      profile.lastDonationDate = recDate;
      profile.totalDonations = (profile.totalDonations || 0) + recUnits;
      profile.livesHelped = (profile.livesHelped || 0) + (recUnits * 3);
      await profile.save();
    }

    // 3. Update Blood Stock Inventory (+units)
    let stockItem = await BloodStock.findOne({ bloodGroup });
    if (stockItem) {
      stockItem.unitsAvailable += recUnits;
      stockItem.lastUpdated = new Date();
      await stockItem.save();
    }

    // 4. Update Emergency Request if provided
    if (requestId) {
      const reqItem = await BloodRequest.findById(requestId);
      if (reqItem) {
        reqItem.unitsFulfilled = (reqItem.unitsFulfilled || 0) + recUnits;
        if (reqItem.unitsFulfilled >= reqItem.unitsNeeded) {
          reqItem.status = 'Fulfilled';
        }
        await reqItem.save();
      }
    }

    const eligibility = calculateEligibility(recDate);

    return res.status(201).json({
      success: true,
      message: 'Donation successfully recorded by Authorized Health Organization!',
      record: donationRecord,
      eligibility
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordDonation
};
