// Test script to check API URL configuration
console.log('🔍 Testing API URL configuration...');

// Check environment variables
console.log('📋 Environment variables:');
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Simulate the API service logic
let baseUrl = process.env.REACT_APP_API_URL;

if (!baseUrl) {
  // If no env var, try to construct from current domain
  const isProduction = false; // Simulate localhost
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

// Test the API endpoint
const testLogin = async () => {
  try {
    console.log('🧪 Testing login endpoint...');
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'coordinator@peak1031.com',
        password: 'coordinator123'
      })
    });
    
    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Login successful!');
      console.log('👤 User:', data.user?.email);
    } else {
      console.log('❌ Login failed');
      const errorText = await response.text();
      console.log('📄 Error response:', errorText);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
};

// Run the test
testLogin();
