const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { connectDB, getDbStatus } = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const donorRoutes = require('./src/routes/donorRoutes');
const requestRoutes = require('./src/routes/requestRoutes');
const stockRoutes = require('./src/routes/stockRoutes');
const bankRoutes = require('./src/routes/bankRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();

// Initialize Database connection
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/blood-banks', bankRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Health & Status Endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    appName: 'LIFE LINK - Blood Donor Management System',
    dbStatus: getDbStatus(),
    timestamp: new Date()
  });
});

// SPA static fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ success: false, message: 'API Endpoint not found' });
  }
});

// Central error handler
app.use(errorHandler);

let PORT = parseInt(process.env.PORT) || 5000;

const startServer = (portToTry) => {
  const server = app.listen(portToTry, () => {
    console.log(`
  =======================================================
     LIFE LINK - Blood Donor Management System
     Running on: http://localhost:${portToTry}
     Environment: ${process.env.NODE_ENV || 'development'}
  =======================================================
    `);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Port Alert] Port ${portToTry} is already in use. Trying port ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('[Server Error]', err);
    }
  });
};

startServer(PORT);
