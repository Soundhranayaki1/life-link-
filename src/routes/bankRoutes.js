const express = require('express');
const router = express.Router();
const { getBloodBanks } = require('../controllers/bankController');

router.get('/', getBloodBanks);

module.exports = router;
