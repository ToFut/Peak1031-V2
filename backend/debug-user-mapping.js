#!/usr/bin/env node

/**
 * Debug script to understand user-to-person mapping issues
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

const testUserMapping = async () => {
  console.log('🔍 Debugging User-to-Person Mapping');

  // Get auth token
  try {
    const authResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });
    
    const token = authResponse.data.token;
    console.log('✅ Authentication successful');

    // Test simple endpoint to see what user object looks like
    const healthResponse = await axios.get(`${API_BASE}/health`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Health check passed');

    // Test documents endpoint to see the error details
    console.log('\n🧪 Testing document upload without file...');
    try {
      await axios.post(`${API_BASE}/documents`, {}, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.log('Expected error (no file):', error.response?.data?.error || error.message);
    }

    // Check if we can see the user object structure by testing a user endpoint
    console.log('\n🧪 Testing user profile endpoint...');
    try {
      const userResponse = await axios.get(`${API_BASE}/users/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('User profile data:', JSON.stringify(userResponse.data, null, 2));
    } catch (error) {
      console.log('Profile error:', error.response?.data || error.message);
    }

    // Test exchanges endpoint
    console.log('\n🧪 Testing exchanges endpoint...');
    try {
      const exchangesResponse = await axios.get(`${API_BASE}/exchanges`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Exchanges loaded:', exchangesResponse.data.exchanges?.length || 0);
    } catch (error) {
      console.log('Exchanges error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Auth failed:', error.response?.data || error.message);
  }
};

testUserMapping().catch(console.error);