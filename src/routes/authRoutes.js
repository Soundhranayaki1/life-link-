const express = require('express');
const router = express.Router();
const {
  sendOtpHandler,
  verifyOtpHandler,
  registerDonor,
  registerOrganization,
  loginUser,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/send-otp', sendOtpHandler);
router.post('/verify-otp', verifyOtpHandler);
router.post('/register-donor', registerDonor);
router.post('/register-org', registerOrganization);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

module.exports = router;
