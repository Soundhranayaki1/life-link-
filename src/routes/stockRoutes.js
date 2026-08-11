const express = require('express');
const router = express.Router();
const { getStock, updateStock } = require('../controllers/stockController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getStock);
router.put('/', protect, updateStock);

module.exports = router;
