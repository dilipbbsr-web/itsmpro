const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const serviceRequestRoutes = require('./routes/serviceRequests');
const problemRoutes = require('./routes/problems');
const changeRoutes = require('./routes/changes');
const assetRoutes = require('./routes/assets');
const pool = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected:', res.rows[0]);
  }
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/incidents', incidentRoutes);
app.use('/api/v1/service-requests', serviceRequestRoutes);
app.use('/api/v1/problems', problemRoutes);
app.use('/api/v1/changes', changeRoutes);
app.use('/api/v1/assets', assetRoutes);
// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    message: 'Server is running',
    timestamp: new Date(),
    environment: process.env.NODE_ENV
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     ⚡ ITSMPro Backend Server          ║
╠════════════════════════════════════════╣
║ Server:   http://localhost:${PORT}      ║
║ API:      http://localhost:${PORT}/api/v1 ║
║ Health:   http://localhost:${PORT}/api/v1/health ║
║ Status:   🟢 Running                   ║
╚════════════════════════════════════════╝
  `);
});