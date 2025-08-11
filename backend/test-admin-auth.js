require('dotenv').config();
const databaseService = require('./services/database');
const AuthService = require('./services/auth');

async function testAdminAuth() {
  try {
    console.log('🔍 Testing admin authentication...');
    
    // Test 1: Get user by email directly
    console.log('\n📋 Test 1: Getting admin user by email...');
    const user = await databaseService.getUserByEmail('admin@peak1031.com');
    console.log('User found:', user ? 'Yes' : 'No');
    if (user) {
      console.log('User details:', {
        id: user.id,
        email: user.email,
        role: user.role,
        hasPasswordHash: !!user.password_hash,
        isActive: user.is_active
      });
    }
    
    // Test 2: Try authentication
    console.log('\n🔐 Test 2: Testing authentication...');
    try {
      const authUser = await AuthService.authenticateUser('admin@peak1031.com', 'admin123');
      console.log('✅ Authentication successful!');
      console.log('Authenticated user:', {
        id: authUser.id,
        email: authUser.email,
        role: authUser.role
      });
    } catch (authError) {
      console.log('❌ Authentication failed:', authError.message);
      console.log('Error details:', authError);
    }
    
    // Test 3: Check Supabase service directly
    console.log('\n🌐 Test 3: Testing Supabase service directly...');
    const supabaseService = require('./services/supabase');
    try {
      const supabaseUser = await supabaseService.getUserByEmail('admin@peak1031.com');
      console.log('Supabase user found:', supabaseUser ? 'Yes' : 'No');
      if (supabaseUser) {
        console.log('Supabase user details:', {
          id: supabaseUser.id,
          email: supabaseUser.email,
          role: supabaseUser.role,
          hasPasswordHash: !!supabaseUser.password_hash
        });
      }
    } catch (supabaseError) {
      console.log('❌ Supabase error:', supabaseError.message);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error('Full error:', error);
  }
}

testAdminAuth();
