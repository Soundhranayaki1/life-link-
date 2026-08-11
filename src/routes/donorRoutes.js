const express = require('express');
const router = express.Router();
const { getDonors, toggleAvailability, getDonationHistory } = require('../controllers/donorController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getDonors);
router.patch('/availability', protect, toggleAvailability);
router.get('/history', protect, getDonationHistory);

module.exports = router;
