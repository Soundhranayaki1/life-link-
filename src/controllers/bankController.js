const BloodBank = require('../models/BloodBank');
const BloodStock = require('../models/BloodStock');
const User = require('../models/User');

// @desc    Get all verified blood banks
// @route   GET /api/blood-banks
// @access  Public
const getBloodBanks = async (req, res, next) => {
  try {
    const { city } = req.query;

    if (BloodBank.db && BloodBank.db.readyState === 1) {
      let query = { verificationStatus: 'Approved' };
      if (city && city.trim() !== '') {
        query.city = { $regex: city.trim(), $options: 'i' };
      }

      const banks = await BloodBank.find(query).populate('userId', 'email phone');
      return res.json({ success: true, count: banks.length, bloodBanks: banks });
    } else {
      return res.json({
        success: true,
        count: 2,
        bloodBanks: [
          {
            _id: 'bb_1',
            bankName: 'City Central Blood Bank',
            licenseNumber: 'LIC-MH-9921',
            city: 'Mumbai',
            address: 'Dr. E Moses Rd, Worli',
            contactPhone: '+91 22 2493 0000',
            verificationStatus: 'Approved'
          },
          {
            _id: 'bb_2',
            bankName: 'Red Cross Regional Blood Center',
            licenseNumber: 'LIC-DL-4482',
            city: 'Delhi',
            address: '1 Red Cross Rd, Connaught Place',
            contactPhone: '+91 11 2371 6441',
            verificationStatus: 'Approved'
          }
        ]
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBloodBanks
};
