const express = require('express');
const router = express.Router();
const { getAdminStats, getOrganizations, verifyOrganization } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/stats', protect, adminOnly, getAdminStats);
router.get('/organizations', protect, adminOnly, getOrganizations);
router.patch('/organizations/:id/verify', protect, adminOnly, verifyOrganization);

module.exports = router;
