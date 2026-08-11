const mongoose = require('mongoose');

let isConnected = false;
let isUsingMockDb = false;

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
  } catch (error) {
    console.warn(`[Database Warning] Unable to connect to MongoDB (${error.message}).`);
    console.warn('[Database] Operating in In-Memory / Hybrid Mode for smooth seamless evaluation.');
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
