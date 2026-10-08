const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const mongoose = require('mongoose');
    const recipientObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    if (Notification.db && Notification.db.readyState === 1) {
      const notifications = await Notification.find({
        $or: [{ recipientId: recipientObjId }, { recipientId: userId.toString() }]
      }).sort({ createdAt: -1 });
      const unreadCount = notifications.filter(n => !n.isRead).length;
      return res.json({ success: true, count: notifications.length, unreadCount, notifications });
    } else {
      return res.json({
        success: true,
        count: 0,
        unreadCount: 0,
        notifications: []
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (Notification.db && Notification.db.readyState === 1) {
      await Notification.findByIdAndUpdate(id, { isRead: true });
    }
    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all user notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllRead = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (Notification.db && Notification.db.readyState === 1) {
      await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });
    }
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markRead,
  markAllRead
};
