const express = require('express');
const router = express.Router();
const {
  createRequest,
  getRequests,
  respondToRequest
} = require('../controllers/requestController');
const { protect, verifiedOrgOnly, verifiedDonorOnly } = require('../middleware/authMiddleware');

router.get('/', getRequests);
router.post('/', protect, verifiedOrgOnly, createRequest);
router.post('/:id/respond', protect, verifiedDonorOnly, respondToRequest);

module.exports = router;
