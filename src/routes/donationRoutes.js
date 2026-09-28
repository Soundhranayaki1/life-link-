const express = require('express');
const router = express.Router();
const { recordDonation } = require('../controllers/donationController');
const { protect } = require('../middleware/authMiddleware');

router.post('/record', protect, recordDonation);

module.exports = router;
