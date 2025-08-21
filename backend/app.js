const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
require('dotenv').config();

const app = express();

// Trust proxy configuration for rate limiting behind nginx
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Session middleware (for OAuth state management)
app.use(session({
  secret: process.env.SESSION_SECRET || 'peak1031-oauth-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/exchanges', require('./routes/exchanges'));
app.use('/api/exchange-participants', require('./routes/exchange-participants'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/templates', require('./routes/template-management'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/oauth', require('./routes/oauth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/mobile-reports', require('./routes/mobile-reports'));
app.use('/api/user-audit', require('./routes/user-audit'));
app.use('/api/security-audit', require('./routes/security-audit'));
app.use('/api', require('./routes/exchangePermissions'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app; 