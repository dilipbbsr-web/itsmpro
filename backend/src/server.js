'use strict';
require('dotenv').config();
require('express-async-errors');

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const fs         = require('fs');

const { errorHandler, notFound } = require('./middleware/errorHandler');
const { testConnection }         = require('./config/db');

// ── Route imports ──────────────────────────────
const authRoutes       = require('./routes/auth');
const userRoutes       = require('./routes/users');
const incidentRoutes   = require('./routes/incidents');
const serviceReqRoutes = require('./routes/serviceRequests');
const imacRoutes       = require('./routes/imac');
const problemRoutes    = require('./routes/problems');
const changeRoutes     = require('./routes/changes');
const cmdbRoutes       = require('./routes/cmdb');
const kbRoutes         = require('./routes/knowledge');
const slaRoutes        = require('./routes/sla');
const employeeRoutes   = require('./routes/employees');
const reportRoutes     = require('./routes/reports');
const integrationRoutes = require('./routes/integrations');
const webhookRoutes    = require('./routes/webhooks');
const dashboardRoutes  = require('./routes/dashboard');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Ensure upload & log dirs exist ─────────────
['./uploads', './logs'].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── Security & parsing middleware ───────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      scriptSrc:  ["'self'"],
      imgSrc:     ["'self'", 'data:', 'blob:'],
    }
  }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request logging ─────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  const logStream = fs.createWriteStream('./logs/access.log', { flags: 'a' });
  app.use(morgan('combined', { stream: logStream }));
  app.use(morgan('dev'));
}

// ── Global rate limiter ─────────────────────────
app.use('/api/', rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:       parseInt(process.env.RATE_LIMIT_MAX)       || 200,
  message:   { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
}));

// ── Health check (public) ───────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    service: 'ITSM Pro API',
    version: '1.0.0',
    time:    new Date().toISOString(),
    env:     process.env.NODE_ENV,
  });
});

// ── API routes ──────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`,            authRoutes);
app.use(`${API}/users`,           userRoutes);
app.use(`${API}/dashboard`,       dashboardRoutes);
app.use(`${API}/incidents`,       incidentRoutes);
app.use(`${API}/service-requests`, serviceReqRoutes);
app.use(`${API}/imac`,            imacRoutes);
app.use(`${API}/problems`,        problemRoutes);
app.use(`${API}/changes`,         changeRoutes);
app.use(`${API}/cmdb`,            cmdbRoutes);
app.use(`${API}/knowledge`,       kbRoutes);
app.use(`${API}/sla`,             slaRoutes);
app.use(`${API}/employees`,       employeeRoutes);
app.use(`${API}/reports`,         reportRoutes);
app.use(`${API}/integrations`,    integrationRoutes);
app.use(`${API}/webhooks`,        webhookRoutes);

// ── Static uploads ──────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Serve React frontend in production ──────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// ── 404 + error handlers ────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start server ────────────────────────────────
async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`\n⚡ ITSM Pro API running on port ${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV}`);
    console.log(`   API Base    : http://localhost:${PORT}/api/v1`);
    console.log(`   Health      : http://localhost:${PORT}/health\n`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app; // for testing
