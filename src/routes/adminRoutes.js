const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getOrganizations,
  verifyOrganization,
  getAdminDonors,
  updateDonorStatus
} = require('../controllers/adminController');
const { getSystemSettings, updateSystemSettings } = require('../controllers/systemSettingsController');
const { getAuditLogs, logAudit } = require('../controllers/auditLogController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/stats', protect, adminOnly, getAdminStats);
router.get('/organizations', protect, adminOnly, getOrganizations);
router.patch('/organizations/:id/verify', protect, adminOnly, verifyOrganization);
router.get('/donors', protect, adminOnly, getAdminDonors);
router.patch('/donors/:id/status', protect, adminOnly, updateDonorStatus);

router.get('/settings', protect, getSystemSettings);
router.post('/settings', protect, adminOnly, updateSystemSettings);

router.get('/audit-logs', protect, adminOnly, getAuditLogs);
router.post('/audit-logs', protect, logAudit);

module.exports = router;
