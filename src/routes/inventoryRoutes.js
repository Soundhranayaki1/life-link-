const express = require('express');
const router = express.Router();
const { getInventory, updateInventory, getStats } = require('../controllers/inventoryController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', getInventory);
router.get('/stats', getStats);
router.put('/', protect, adminOnly, updateInventory);

module.exports = router;
