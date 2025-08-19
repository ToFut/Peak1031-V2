require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabaseService = require('./services/supabase');

async function testCoordinatorLogin() {
  console.log('🔍 Testing coordinator login...');
  
  try {
    // Get the coordinator user
    const coordinatorUser = await supabaseService.getUserByEmail('coordinator@peak1031.com');
    
    if (!coordinatorUser) {
      console.log('❌ Coordinator user not found');
      return;
    }
    
    console.log('✅ Coordinator user found:', {
      id: coordinatorUser.id,
      email: coordinatorUser.email,
      role: coordinatorUser.role,
      isActive: coordinatorUser.is_active,
      hasPasswordHash: !!coordinatorUser.password_hash
    });
    
    // Test password validation
    const testPassword = 'coordinator123';
    console.log('🔐 Testing password validation...');
    
    if (!coordinatorUser.password_hash) {
      console.log('❌ No password hash found for coordinator user');
      return;
    }
    
    const isValidPassword = await bcrypt.compare(testPassword, coordinatorUser.password_hash);
    console.log('🔐 Password validation result:', isValidPassword);
    
    if (isValidPassword) {
      console.log('✅ Password is valid!');
    } else {
      console.log('❌ Password is invalid');
      console.log('🔍 Password hash:', coordinatorUser.password_hash);
      
      // Try to generate a new hash for comparison
      const newHash = await bcrypt.hash(testPassword, 12);
      console.log('🔍 New hash for coordinator123:', newHash);
      
      // Check if the hash from the seed file matches
      const seedHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.Oi';
      const seedHashValid = await bcrypt.compare(testPassword, seedHash);
      console.log('🔍 Seed hash validation result:', seedHashValid);
    }
    
  } catch (error) {
    console.error('❌ Error testing coordinator login:', error);
  }
}

testCoordinatorLogin();
