const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err.stack || err.message);

  const isDbError = err.message && (
    err.message.includes('buffering timed out') ||
    err.name === 'MongooseError' ||
    err.name === 'MongooseServerSelectionError' ||
    err.message.includes('Client must be connected') ||
    err.message.includes('topology was destroyed') ||
    err.message.includes('timing out')
  );

  if (isDbError) {
    return res.status(503).json({
      success: false,
      message: 'Database Connection Error: Unable to connect to MongoDB. Please ensure MONGODB_URI is set correctly in Render environment variables and MongoDB Atlas IP Access List permits 0.0.0.0/0.',
      error: err.message
    });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = errorHandler;
