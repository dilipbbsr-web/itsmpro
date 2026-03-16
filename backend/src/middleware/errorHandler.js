'use strict';

function notFound(req, res) {
  res.status(404).json({
    error:  'Route not found',
    path:   req.originalUrl,
    method: req.method,
  });
}

function errorHandler(err, req, res, _next) {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err.message);

  // PostgreSQL unique violation
  if (err.code === '23505') {
    const field = err.detail?.match(/Key \((\w+)\)/)?.[1] || 'field';
    return res.status(409).json({ error: `${field} already exists` });
  }
  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record not found' });
  }
  // Validation errors from express-validator
  if (err.type === 'validation') {
    return res.status(422).json({ errors: err.errors });
  }
  // JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error:   err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

// Helper to create HTTP errors
function createError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

module.exports = { notFound, errorHandler, createError };
