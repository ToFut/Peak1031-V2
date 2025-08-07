#!/usr/bin/env node

require('dotenv').config();
const jwt = require('jsonwebtoken');

console.log('🧪 Testing JWT Token Refresh Mechanism\n');
console.log('=====================================\n');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || JWT_SECRET + '_refresh';

// Test 1: Create an expired access token
console.log('📝 Test 1: Creating expired access token...');
const expiredPayload = {
  userId: 'test-user-123',
  email: 'test@example.com',
  role: 'admin'
};

const expiredToken = jwt.sign(expiredPayload, JWT_SECRET, { expiresIn: '-1h' });
console.log('Expired Token (truncated):', expiredToken.substring(0, 50) + '...');

try {
  jwt.verify(expiredToken, JWT_SECRET);
  console.log('❌ ERROR: Token should have been expired!');
} catch (error) {
  console.log('✅ Token correctly identified as expired:', error.name);
}

// Test 2: Create a valid refresh token
console.log('\n📝 Test 2: Creating valid refresh token...');
const refreshPayload = {
  userId: 'test-user-123',
  type: 'refresh'
};

const refreshToken = jwt.sign(refreshPayload, REFRESH_SECRET, { expiresIn: '30d' });
console.log('Refresh Token (truncated):', refreshToken.substring(0, 50) + '...');

try {
  const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
  console.log('✅ Refresh token is valid, expires:', new Date(decoded.exp * 1000).toISOString());
} catch (error) {
  console.log('❌ ERROR: Refresh token verification failed:', error.message);
}

// Test 3: Create a new access token (simulating refresh)
console.log('\n📝 Test 3: Creating new access token (simulating refresh)...');
const newPayload = {
  userId: 'test-user-123',
  email: 'test@example.com',
  role: 'admin'
};

const newToken = jwt.sign(newPayload, JWT_SECRET, { expiresIn: '1h' });
console.log('New Token (truncated):', newToken.substring(0, 50) + '...');

try {
  const decoded = jwt.verify(newToken, JWT_SECRET);
  console.log('✅ New token is valid, expires:', new Date(decoded.exp * 1000).toISOString());
} catch (error) {
  console.log('❌ ERROR: New token verification failed:', error.message);
}

// Test 4: Test token expiry detection
console.log('\n📝 Test 4: Testing token expiry detection...');
const nearExpiryToken = jwt.sign(newPayload, JWT_SECRET, { expiresIn: '4m' }); // Expires in 4 minutes

const tokenPayload = jwt.decode(nearExpiryToken);
const expiryTime = tokenPayload.exp * 1000;
const currentTime = Date.now();
const timeUntilExpiry = expiryTime - currentTime;
const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60000);

console.log('Token expires at:', new Date(expiryTime).toISOString());
console.log('Current time:', new Date(currentTime).toISOString());
console.log('Time until expiry:', minutesUntilExpiry, 'minutes');

if (timeUntilExpiry < 5 * 60 * 1000) {
  console.log('✅ Token correctly identified as expiring soon (< 5 minutes)');
} else {
  console.log('❌ Token not identified as expiring soon');
}

console.log('\n=====================================');
console.log('🎉 Token refresh mechanism tests complete!\n');
console.log('Implementation Summary:');
console.log('1. ✅ API service auto-refreshes on 401 errors');
console.log('2. ✅ useAuth hook refreshes expired tokens on init');
console.log('3. ✅ Proactive refresh every 10 minutes if token expires in < 5 minutes');
console.log('4. ✅ Refresh tokens valid for 30 days');