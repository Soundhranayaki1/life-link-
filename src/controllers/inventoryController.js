const Inventory = require('../models/Inventory');
const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');
const { mockUsers, mockRequests, mockInventory } = require('../utils/mockStore');

// @desc    Get blood bank inventory levels
// @route   GET /api/inventory
// @access  Public
const getInventory = async (req, res, next) => {
  try {
    if (Inventory.db && Inventory.db.readyState === 1) {
      const items = await Inventory.find().sort({ bloodGroup: 1 });
      
      // Ensure all 8 blood groups are represented
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
    } else {
      return res.json({
        success: true,
        inventory: mockInventory
      });
    }
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

    if (Inventory.db && Inventory.db.readyState === 1) {
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
    } else {
      const item = mockInventory.find(i => i.bloodGroup === bloodGroup);
      let units = parseInt(unitsAvailable) || 0;

      if (item) {
        if (action === 'add') {
          item.unitsAvailable += units;
        } else if (action === 'subtract') {
          item.unitsAvailable = Math.max(0, item.unitsAvailable - units);
        } else {
          item.unitsAvailable = Math.max(0, units);
        }
        item.lastUpdated = new Date();

        return res.json({
          success: true,
          message: `Inventory for ${bloodGroup} updated successfully (Demo)`,
          item
        });
      } else {
        const newItem = { bloodGroup, unitsAvailable: Math.max(0, units), lastUpdated: new Date() };
        mockInventory.push(newItem);
        return res.json({
          success: true,
          message: `Inventory for ${bloodGroup} updated successfully (Demo)`,
          item: newItem
        });
      }
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get key system statistics & analytics
// @route   GET /api/inventory/stats
// @access  Public
const getStats = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

    let totalDonors = 0;
    let availableDonors = 0;
    let totalRequests = 0;
    let activeRequests = 0;
    let fulfilledRequests = 0;
    let totalUnitsInStock = 0;
    let donorMap = {};

    if (isDbConnected) {
      const allUsers = await User.find();
      const donors = allUsers.filter(u => u.role === 'Donor' || !u.role);
      totalDonors = donors.length;
      availableDonors = donors.filter(d => d.isAvailable !== false).length;

      const requests = await BloodRequest.find();
      totalRequests = requests.length;
      activeRequests = requests.filter(r => ['Pending', 'In Progress'].includes(r.status)).length;
      fulfilledRequests = requests.filter(r => r.status === 'Fulfilled').length;

      const stockItems = await Inventory.find();
      totalUnitsInStock = stockItems.reduce((acc, curr) => acc + (curr.unitsAvailable || 0), 0);

      donors.forEach(d => {
        if (d.bloodGroup) {
          donorMap[d.bloodGroup] = (donorMap[d.bloodGroup] || 0) + 1;
        }
      });
    }

    // Fallback if DB returns 0 (e.g. before initial seed)
    if (totalDonors === 0) {
      const donors = mockUsers.filter(u => u.role === 'Donor');
      totalDonors = donors.length;
      availableDonors = donors.filter(u => u.isAvailable).length;
      totalRequests = mockRequests.length;
      activeRequests = mockRequests.filter(r => ['Pending', 'In Progress'].includes(r.status)).length;
      fulfilledRequests = mockRequests.filter(r => r.status === 'Fulfilled').length;
      totalUnitsInStock = mockInventory.reduce((acc, i) => acc + i.unitsAvailable, 0);

      donors.forEach(d => {
        donorMap[d.bloodGroup] = (donorMap[d.bloodGroup] || 0) + 1;
      });
    }

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
