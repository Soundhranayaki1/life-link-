const express = require('express');
const router = express.Router();
const {
  getDonors,
  matchDonors,
  toggleAvailability,
  getDonationHistory,
  updateRadius,
  updateProfile
} = require('../controllers/donorController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getDonors);
router.get('/match', matchDonors);
router.patch('/availability', protect, toggleAvailability);
router.patch('/radius', protect, updateRadius);
router.patch('/profile', protect, updateProfile);
router.get('/history', protect, getDonationHistory);

module.exports = router;
