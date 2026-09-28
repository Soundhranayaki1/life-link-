const express = require('express');
const router = express.Router();
const { getDonors, matchDonors, toggleAvailability, getDonationHistory } = require('../controllers/donorController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getDonors);
router.get('/match', matchDonors);
router.patch('/availability', protect, toggleAvailability);
router.get('/history', protect, getDonationHistory);

module.exports = router;
