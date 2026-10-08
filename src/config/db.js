const mongoose = require('mongoose');

const bcrypt = require('bcryptjs');

let isConnected = false;
let isUsingMockDb = false;

const ensureAdminUser = async () => {
  try {
    const User = require('../models/User');
    let admin = await User.findOne({ $or: [{ username: 'admin' }, { email: 'admin@lifelink.org' }, { role: 'Admin' }] });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    if (!admin) {
      await User.create({
        name: 'System Administrator',
        email: 'admin@lifelink.org',
        username: 'admin',
        password: hashedPassword,
        phone: '+919000000000',
        role: 'Admin',
        status: 'VERIFIED',
        isMobileVerified: true
      });
      console.log('[Database] Default Admin user created: username="admin", password="admin123"');
    } else {
      admin.username = 'admin';
      admin.email = 'admin@lifelink.org';
      admin.password = hashedPassword;
      admin.role = 'Admin';
      await admin.save();
      console.log('[Database] Default Admin user verified/updated: username="admin", password="admin123"');
    }
  } catch (err) {
    console.error('[Database Error] Unable to ensure Admin user:', err.message);
  }
};

const cleanIncompatibleNotifications = async () => {
  try {
    const Notification = require('../models/Notification');
    const DonorProfile = require('../models/DonorProfile');
    const { isCompatible } = require('../utils/compatibility');

    const notifs = await Notification.find({ type: 'EmergencyRequest' });
    let purgedCount = 0;
    for (const n of notifs) {
      const profile = await DonorProfile.findOne({ userId: n.recipientId });
      if (profile) {
        const match = n.title.match(/([A-Z]{1,2}[+-])/);
        if (match) {
          const reqGroup = match[1];
          if (!isCompatible(profile.bloodGroup, reqGroup)) {
            await Notification.findByIdAndDelete(n._id);
            purgedCount++;
          }
        }
      }
    }
    if (purgedCount > 0) {
      console.log(`[Database Cleanup] Purged ${purgedCount} incompatible notification(s) from MongoDB.`);
    }
  } catch (err) {
    console.error('[Database Cleanup Error]:', err.message);
  }
};

const connectDB = async () => {
  const connUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lifelink';

  try {
    const options = {
      serverSelectionTimeoutMS: 3000,
      dbName: 'lifelink'
    };
    
    await mongoose.connect(connUri, options);
    isConnected = true;
    isUsingMockDb = false;
    console.log(`[Database] MongoDB Connected: ${mongoose.connection.host} (DB: ${mongoose.connection.name})`);
    await ensureAdminUser();
    await cleanIncompatibleNotifications();
  } catch (error) {
    console.warn(`[Database Warning] Unable to connect to MongoDB (${error.message}).`);
    isConnected = false;
    isUsingMockDb = true;
  }
};

const getDbStatus = () => ({
  isConnected,
  isUsingMockDb,
  readyState: mongoose.connection ? mongoose.connection.readyState : 0,
  dbName: mongoose.connection ? mongoose.connection.name : 'none',
  uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lifelink'
});

module.exports = { connectDB, getDbStatus };
