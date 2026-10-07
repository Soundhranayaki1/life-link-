const express = require('express');
const router = express.Router();
const { getReferrals, createReferral } = require('../controllers/referralController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getReferrals);
router.post('/', protect, createReferral);

module.exports = router;
