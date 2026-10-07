const express = require('express');
const router = express.Router();
const {
  createRequest,
  expandDispatchWave,
  getDonorFeed,
  getRequests,
  getOrgRequests,
  getRequestById,
  respondToRequest,
  updateResponderStatus,
  fulfillRequest
} = require('../controllers/requestController');
const { protect, verifiedOrgOnly, verifiedDonorOnly } = require('../middleware/authMiddleware');

router.get('/', getRequests);
router.get('/donor-feed', protect, verifiedDonorOnly, getDonorFeed);
router.get('/org', protect, verifiedOrgOnly, getOrgRequests);
router.get('/:id', getRequestById);
router.post('/', protect, verifiedOrgOnly, createRequest);
router.patch('/:id/expand-wave', protect, verifiedOrgOnly, expandDispatchWave);
router.post('/:id/evaluate-dispatch', protect, verifiedOrgOnly, expandDispatchWave);
router.post('/:id/respond', protect, verifiedDonorOnly, respondToRequest);
router.patch('/:id/responders/:donorId', protect, verifiedOrgOnly, updateResponderStatus);
router.patch('/:id/fulfill', protect, verifiedOrgOnly, fulfillRequest);

module.exports = router;
