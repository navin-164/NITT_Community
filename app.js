// src/app.js
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true
}));

// Static assets (if you serve frontend from Express)
app.use(express.static(path.join(__dirname, '../public')));

// Simple health route
app.get('/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }));

// Mount API routers (placeholders — create these files later)
try {
  app.use('/api/auth', require('./routes/auth'));        // implement auth routes
  app.use('/api/services', require('./routes/services'));// implement services routes
  app.use('/api/market', require('./routes/marketplace'));// implement marketplace routes
  app.use('/api/complaints', require('./routes/complaints'));
  app.use('/api/chat', require('./routes/chat'));
} catch (e) {
  // If routers don't exist yet, don't crash — log to console and continue.
  // Remove this try/catch once actual route files exist.
  console.log(e)
  console.warn('Some API route modules are not yet implemented. Create src/routes/*.js to remove this warning.');
}

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
