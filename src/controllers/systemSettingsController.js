const SystemSetting = require('../models/SystemSetting');
const AuditLog = require('../models/AuditLog');

const DEFAULT_SETTINGS = {
  initial_radius: 3,
  expansion_step: 2,
  max_radius: 8,
  required_confirmations: 2,
  evaluation_window: 15,
  notification_cooldown: 48,
  enable_auto_expansion: true,
  sms_gateway_active: true,
  fatigue_protection_mode: 'STRICT'
};

// @desc    Get Central Admin System Settings
// @route   GET /api/admin/settings
// @access  Private (Admin & Verified Orgs)
const getSystemSettings = async (req, res, next) => {
  try {
    let settingsObj = { ...DEFAULT_SETTINGS };

    if (SystemSetting.db && SystemSetting.db.readyState === 1) {
      const records = await SystemSetting.find();
      records.forEach(r => {
        settingsObj[r.key] = r.value;
      });
    }

    return res.json({
      success: true,
      settings: settingsObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Central Admin System Settings
// @route   POST /api/admin/settings
// @access  Private (Admin Only)
const updateSystemSettings = async (req, res, next) => {
  try {
    const settingsMap = req.body;
    const userId = req.user ? (req.user.id || req.user._id) : null;
    const userName = req.user ? req.user.name : 'Administrator';

    if (SystemSetting.db && SystemSetting.db.readyState === 1) {
      for (const [key, value] of Object.entries(settingsMap)) {
        await SystemSetting.findOneAndUpdate(
          { key },
          { key, value, updatedBy: userId },
          { upsert: true, new: true }
        );
      }

      await AuditLog.create({
        action: 'System Settings Updated',
        performerName: userName,
        role: 'Admin',
        category: 'SYSTEM_SETTINGS',
        description: `Adaptive dispatch configuration parameters updated centrally.`,
        target: 'SystemSettings'
      });
    }

    return res.json({
      success: true,
      message: 'Central system settings updated successfully! New dispatch parameters are live.',
      settings: settingsMap
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSystemSettings,
  updateSystemSettings
};
