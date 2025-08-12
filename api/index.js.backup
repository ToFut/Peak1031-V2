// Vercel serverless function wrapper for the Express backend
require('dotenv').config();

// Set environment for production
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Import the PeakServer class
const PeakServer = require('../backend/server');

// Global app instance for serverless reuse
let appInstance;

function getApp() {
  if (!appInstance) {
    console.log('🚀 Initializing Peak1031 serverless function...');
    const server = new PeakServer();
    appInstance = server.app;
    console.log('✅ Peak1031 serverless function ready');
  }
  return appInstance;
}

// Export the Express app for Vercel
module.exports = getApp();