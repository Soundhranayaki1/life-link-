const express = require('express');
const router = express.Router();
const { getReferrals, createReferral, getOrgReferrals, updateReferralStatus } = require('../controllers/referralController');
const { protect, verifiedOrgOnly } = require('../middleware/authMiddleware');

router.get('/', protect, getReferrals);
router.post('/', protect, createReferral);
router.get('/org', protect, verifiedOrgOnly, getOrgReferrals);
router.patch('/:id/status', protect, verifiedOrgOnly, updateReferralStatus);

module.exports = router;
