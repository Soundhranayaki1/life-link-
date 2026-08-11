const BloodStock = require('../models/BloodStock');
const { mockInventory } = require('../utils/mockStore');

// @desc    Get live blood stock levels by blood group
// @route   GET /api/stock
// @access  Public
const getStock = async (req, res, next) => {
  try {
    if (BloodStock.db && BloodStock.db.readyState === 1) {
      const items = await BloodStock.find().sort({ bloodGroup: 1 });
      const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      const map = {};
      items.forEach(i => map[i.bloodGroup] = i.unitsAvailable);

      const stockList = groups.map(bg => ({
        bloodGroup: bg,
        unitsAvailable: map[bg] !== undefined ? map[bg] : (mockInventory.find(m => m.bloodGroup === bg)?.unitsAvailable || 20),
        lastUpdated: new Date()
      }));

      return res.json({ success: true, stock: stockList });
    } else {
      return res.json({ success: true, stock: mockInventory });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update stock levels for a blood group
// @route   PUT /api/stock
// @access  Private (Blood Bank or Admin)
const updateStock = async (req, res, next) => {
  try {
    const { bloodGroup, unitsAvailable, action } = req.body;
    if (!bloodGroup) {
      return res.status(400).json({ success: false, message: 'Blood group is required' });
    }

    let units = parseInt(unitsAvailable) || 0;

    if (BloodStock.db && BloodStock.db.readyState === 1) {
      let item = await BloodStock.findOne({ bloodGroup });
      if (!item) {
        item = new BloodStock({ bloodGroup, unitsAvailable: Math.max(0, units) });
      } else {
        if (action === 'add') {
          item.unitsAvailable += units;
        } else if (action === 'subtract') {
          item.unitsAvailable = Math.max(0, item.unitsAvailable - units);
        } else {
          item.unitsAvailable = Math.max(0, units);
        }
        item.lastUpdated = new Date();
      }
      await item.save();

      return res.json({ success: true, message: `Blood stock for ${bloodGroup} updated`, item });
    } else {
      const item = mockInventory.find(i => i.bloodGroup === bloodGroup);
      if (item) {
        if (action === 'add') item.unitsAvailable += units;
        else if (action === 'subtract') item.unitsAvailable = Math.max(0, item.unitsAvailable - units);
        else item.unitsAvailable = Math.max(0, units);
        item.lastUpdated = new Date();
      }
      return res.json({ success: true, message: `Stock for ${bloodGroup} updated (Demo)`, item });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStock,
  updateStock
};
