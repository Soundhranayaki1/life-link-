const Inventory = require('../models/Inventory');
const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');

// @desc    Get blood bank inventory levels
// @route   GET /api/inventory
// @access  Public
const getInventory = async (req, res, next) => {
  try {
    const items = await Inventory.find().sort({ bloodGroup: 1 });
    const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const map = {};
    items.forEach(i => map[i.bloodGroup] = i.unitsAvailable);

    const fullInventory = groups.map(bg => ({
      bloodGroup: bg,
      unitsAvailable: map[bg] !== undefined ? map[bg] : 0,
      lastUpdated: new Date()
    }));

    return res.json({
      success: true,
      inventory: fullInventory
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update stock for a specific blood group
// @route   PUT /api/inventory
// @access  Private (Admin Only)
const updateInventory = async (req, res, next) => {
  try {
    const { bloodGroup, unitsAvailable, action } = req.body;

    if (!bloodGroup) {
      return res.status(400).json({ success: false, message: 'Blood group is required' });
    }

    let item = await Inventory.findOne({ bloodGroup });
    let units = parseInt(unitsAvailable) || 0;

    if (!item) {
      item = new Inventory({ bloodGroup, unitsAvailable: Math.max(0, units) });
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

    return res.json({
      success: true,
      message: `Inventory for ${bloodGroup} updated successfully`,
      item
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get key system statistics & analytics
// @route   GET /api/inventory/stats
// @access  Public
const getStats = async (req, res, next) => {
  try {
    const allUsers = await User.find();
    const donors = allUsers.filter(u => u.role === 'Donor');
    const totalDonors = donors.length;
    const availableDonors = donors.filter(d => d.status === 'VERIFIED').length;

    const requests = await BloodRequest.find();
    const totalRequests = requests.length;
    const activeRequests = requests.filter(r => ['Pending', 'In Progress'].includes(r.status)).length;
    const fulfilledRequests = requests.filter(r => r.status === 'Fulfilled').length;

    const stockItems = await Inventory.find();
    const totalUnitsInStock = stockItems.reduce((acc, curr) => acc + (curr.unitsAvailable || 0), 0);

    const donorMap = {};
    donors.forEach(d => {
      if (d.bloodGroup) {
        donorMap[d.bloodGroup] = (donorMap[d.bloodGroup] || 0) + 1;
      }
    });

    return res.json({
      success: true,
      stats: {
        totalDonors,
        availableDonors,
        totalRequests,
        activeRequests,
        fulfilledRequests,
        totalUnitsInStock,
        donorBreakdown: donorMap
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventory,
  updateInventory,
  getStats
};
