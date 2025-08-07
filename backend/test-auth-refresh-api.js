#!/usr/bin/env node

require('dotenv').config();
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET || JWT_SECRET + '_refresh';

console.log('🧪 Testing Auth Token Refresh API\n');
console.log('=====================================\n');

async function testAuthRefresh() {
  try {
    // Step 1: Create an expired access token and valid refresh token
    console.log('📝 Step 1: Creating test tokens...');
    
    const userId = '1'; // Use a real user ID from your database
    
    // Create expired access token (expired 1 hour ago)
    const expiredToken = jwt.sign(
      { userId, email: 'test@example.com', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '-1h' }
    );
    
    // Create valid refresh token
    const validRefreshToken = jwt.sign(
      { userId, type: 'refresh' },
      REFRESH_SECRET,
      { expiresIn: '30d' }
    );
    
    console.log('✅ Created expired access token');
    console.log('✅ Created valid refresh token\n');
    
    // Step 2: Try to call /auth/me with expired token (should fail)
    console.log('📝 Step 2: Testing /auth/me with expired token...');
    
    try {
      const response1 = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${expiredToken}`
        }
      });
      
      const data1 = await response1.json();
      
      if (response1.status === 401) {
        console.log('✅ Correctly returned 401 for expired token');
        console.log('   Error:', data1.error);
      } else {
        console.log('❌ Should have returned 401, got:', response1.status);
      }
    } catch (error) {
      console.log('❌ Network error:', error.message);
    }
    
    // Step 3: Test refresh endpoint
    console.log('\n📝 Step 3: Testing /auth/refresh endpoint...');
    
    try {
      const response2 = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: validRefreshToken })
      });
      
      const data2 = await response2.json();
      
      if (response2.ok && data2.token) {
        console.log('✅ Refresh endpoint working!');
        console.log('   New token received (truncated):', data2.token.substring(0, 50) + '...');
        
        // Step 4: Test new token works
        console.log('\n📝 Step 4: Testing /auth/me with new token...');
        
        const response3 = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${data2.token}`
          }
        });
        
        if (response3.ok) {
          const userData = await response3.json();
          console.log('✅ New token works! User data retrieved:');
          console.log('   User ID:', userData.id);
          console.log('   Email:', userData.email);
          console.log('   Role:', userData.role);
        } else {
          console.log('❌ New token failed:', response3.status);
        }
      } else {
        console.log('❌ Refresh failed:', response2.status);
        console.log('   Error:', data2.error || data2.message);
        console.log('\n⚠️  Note: This might fail because we\'re using a synthetic refresh token.');
        console.log('   In production, refresh tokens are generated during actual login.');
      }
    } catch (error) {
      console.log('❌ Network error:', error.message);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testAuthRefresh().then(() => {
  console.log('\n=====================================');
  console.log('🎉 Auth refresh API test complete!\n');
  console.log('Summary:');
  console.log('1. Frontend will detect 401 errors');
  console.log('2. Frontend will automatically call /auth/refresh');
  console.log('3. Frontend will retry the original request with new token');
  console.log('4. User stays logged in seamlessly!');
});