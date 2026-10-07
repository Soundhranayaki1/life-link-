const AuditLog = require('../models/AuditLog');

// @desc    Get system audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (Admin Only)
const getAuditLogs = async (req, res, next) => {
  try {
    if (AuditLog.db && AuditLog.db.readyState === 1) {
      const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
      return res.json({ success: true, count: logs.length, logs });
    } else {
      return res.json({ success: true, count: 0, logs: [] });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create audit log entry
// @route   POST /api/admin/audit-logs
// @access  Private
const logAudit = async (req, res, next) => {
  try {
    const { action, category, description, target } = req.body;
    const performerName = req.user ? req.user.name : 'System';
    const role = req.user ? req.user.role : 'System';

    if (AuditLog.db && AuditLog.db.readyState === 1) {
      const log = await AuditLog.create({
        action: action || 'System Event',
        performerName,
        role,
        category: category || 'GENERAL',
        description: description || '',
        target: target || ''
      });
      return res.status(201).json({ success: true, log });
    }
    return res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
  logAudit
};
