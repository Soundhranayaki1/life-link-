const express = require('express');
const router = express.Router();
const {
  getOrgSupportRequests,
  createOrgSupportRequest,
  updateOrgSupportStatus
} = require('../controllers/orgSupportController');
const { protect, verifiedOrgOnly } = require('../middleware/authMiddleware');

router.get('/', protect, verifiedOrgOnly, getOrgSupportRequests);
router.post('/', protect, verifiedOrgOnly, createOrgSupportRequest);
router.patch('/:id/status', protect, verifiedOrgOnly, updateOrgSupportStatus);

module.exports = router;
