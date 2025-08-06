/**
 * Enterprise-Enhanced Server
 * Integrates all new enterprise routes and functionality
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import existing routes
const exchangesRoutes = require('./routes/exchanges');
const contactsRoutes = require('./routes/contacts');
const documentsRoutes = require('./routes/documents');
const messagesRoutes = require('./routes/messages');
const tasksRoutes = require('./routes/tasks');

// Import new enterprise routes
const enterpriseExchangesRoutes = require('./routes/enterprise-exchanges');
const accountManagementRoutes = require('./routes/account-management');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  
  // Log request body for non-GET requests (excluding sensitive data)
  if (req.method !== 'GET' && Object.keys(req.body).length > 0) {
    const logBody = { ...req.body };
    // Remove sensitive fields
    delete logBody.password;
    delete logBody.password_hash;
    delete logBody.token;
    console.log('Request body:', JSON.stringify(logBody, null, 2));
  }
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/exchanges', exchangesRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/tasks', tasksRoutes);

// New Enterprise Routes
app.use('/api/enterprise-exchanges', enterpriseExchangesRoutes);
app.use('/api/account', accountManagementRoutes);

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Peak 1031 Enterprise API',
    version: '2.0.0',
    description: 'Enterprise 1031 Exchange Management Platform',
    endpoints: {
      // Original endpoints
      exchanges: '/api/exchanges',
      contacts: '/api/contacts',
      documents: '/api/documents',
      messages: '/api/messages',
      tasks: '/api/tasks',
      
      // New enterprise endpoints
      enterpriseExchanges: '/api/enterprise-exchanges',
      account: '/api/account',
      
      // Utility endpoints
      health: '/health',
      api: '/api'
    },
    features: [
      'Complete 1031 exchange lifecycle management',
      'Enterprise-scale user and role management',
      'Real-time messaging with file attachments',
      'Document management with compliance tracking',
      'Task automation and deadline management',
      'Comprehensive audit logging',
      'Financial transaction tracking',
      'Risk assessment and compliance monitoring',
      'Performance analytics and reporting'
    ],
    database: {
      provider: 'Supabase PostgreSQL',
      tables: [
        'contacts (users + contacts unified)',
        'exchanges (enhanced with lifecycle management)',
        'exchange_participants (role-based access)',
        'messages (exchange-specific chat)',
        'documents (lifecycle-aware)',
        'tasks (automated + manual)',
        'financial_transactions',
        'compliance_checks',
        'risk_assessments',
        'audit_logs',
        'exchange_milestones',
        'exchange_analytics'
      ]
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  
  // Log error details
  console.error('Error stack:', err.stack);
  console.error('Request URL:', req.url);
  console.error('Request method:', req.method);
  console.error('Request headers:', req.headers);
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500,
      ...(isDevelopment && { stack: err.stack, details: err })
    }
  });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      status: 404,
      path: req.originalUrl,
      method: req.method,
      availableEndpoints: {
        api: '/api',
        health: '/health',
        exchanges: '/api/exchanges',
        enterpriseExchanges: '/api/enterprise-exchanges',
        account: '/api/account'
      }
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Enterprise Peak 1031 Server Started');
  console.log('=====================================');
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`🔗 API available at: http://localhost:${PORT}/api`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('=====================================');
  console.log('🏢 Enterprise Features Available:');
  console.log('   ✅ Complete exchange lifecycle management');
  console.log('   ✅ Role-based access control');
  console.log('   ✅ Real-time messaging system');
  console.log('   ✅ Document management with compliance');
  console.log('   ✅ Task automation and deadlines');
  console.log('   ✅ Financial transaction tracking');
  console.log('   ✅ Audit logging and analytics');
  console.log('   ✅ Risk assessment and monitoring');
  console.log('=====================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;