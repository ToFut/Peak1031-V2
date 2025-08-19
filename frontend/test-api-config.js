// Test script to check API configuration
console.log('🔍 Testing API configuration...');

// Check environment variables
console.log('Environment variables:');
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Simulate the API service logic
let baseUrl = process.env.REACT_APP_API_URL;

if (!baseUrl) {
  // If no env var, try to construct from current domain
  const isProduction = false; // Simulate development
  if (isProduction) {
    // In production, try common backend URL patterns
    const hostname = 'localhost';
    if (hostname.includes('vercel.app')) {
      // For Vercel deployments, use the known Railway backend URL
      baseUrl = 'https://peak1031-production.up.railway.app/api';
      console.log('🚀 Using production Railway backend URL');
    } else {
      // Fallback: assume API is on same domain with /api path
      baseUrl = `http://${hostname}/api`;
    }
  } else {
    // Development fallback - use localhost backend
    baseUrl = 'http://localhost:5001/api';
  }
}

baseUrl = baseUrl.replace(/\/+$/, '');
console.log('🔗 Final API base URL:', baseUrl);

// Test the URL
const testUrl = `${baseUrl}/health`;
console.log('🧪 Testing URL:', testUrl);

// Note: This would need to be run in the browser context to actually test the connection
console.log('✅ Configuration test complete');
