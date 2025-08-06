#!/usr/bin/env node

const databaseService = require('./services/database');
const AuthService = require('./services/auth');
const bcrypt = require('bcryptjs');

async function debugUserLookup() {
  console.log('🔍 Debugging user lookup...');
  
  try {
    // Test 1: Get user by email
    console.log('\n1. Getting user by email: admin@peak1031.com');
    const userByEmail = await databaseService.getUserByEmail('admin@peak1031.com');
    console.log('User by email:', {
      id: userByEmail?.id,
      email: userByEmail?.email,
      first_name: userByEmail?.first_name,
      last_name: userByEmail?.last_name,
      role: userByEmail?.role,
      is_active: userByEmail?.is_active
    });
    
    // Test 2: Get all users
    console.log('\n2. Getting all users...');
    const allUsers = await databaseService.getUsers();
    console.log('All users count:', allUsers.length);
    const adminUser = allUsers.find(u => u.email === 'admin@peak1031.com');
    console.log('Admin user from all users:', {
      id: adminUser?.id,
      email: adminUser?.email,
      first_name: adminUser?.first_name,
      last_name: adminUser?.last_name,
      role: adminUser?.role,
      is_active: adminUser?.is_active
    });
    
    // Test 3: Generate token with the user
    if (userByEmail) {
      console.log('\n3. Generating token with user...');
      const tokens = AuthService.generateTokens(userByEmail);
      console.log('Generated token payload:', {
        userId: userByEmail.id,
        email: userByEmail.email,
        role: userByEmail.role
      });
      
      // Decode the token to verify
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(tokens.token);
      console.log('Decoded token:', decoded);
    }
    
    // Test 4: Check if user IDs match
    console.log('\n4. Comparing user IDs...');
    if (userByEmail && adminUser) {
      console.log('User by email ID:', userByEmail.id);
      console.log('Admin user from all users ID:', adminUser.id);
      console.log('IDs match:', userByEmail.id === adminUser.id);
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error.message);
    console.error(error.stack);
  }
}

debugUserLookup().then(() => {
  console.log('\n✅ Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Debug failed:', error);
  process.exit(1);
}); 