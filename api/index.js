// Vercel serverless function wrapper for the Express backend
require('dotenv').config();

// Set environment for production
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Import and create the Express server
const PeakServer = require('../backend/server');

// Global app instance for serverless reuse
let serverInstance;

function createApp() {
  if (!serverInstance) {
    serverInstance = new PeakServer();
  }
  return serverInstance.app;
}

// Export the Express app for Vercel
module.exports = createApp();