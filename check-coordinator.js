const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkCoordinator() {
  try {
    console.log('🔍 Checking coordinator user...');
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, first_name, last_name, role, is_active')
      .eq('email', 'coordinator@peak1031.com')
      .single();
    
    if (error) {
      console.error('❌ Error fetching coordinator:', error);
      return;
    }
    
    if (!user) {
      console.log('❌ Coordinator user not found');
      return;
    }
    
    console.log('✅ Coordinator user found:', {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      isActive: user.is_active,
      hasPasswordHash: !!user.password_hash,
      passwordHashLength: user.password_hash ? user.password_hash.length : 0
    });
    
    // Test password validation
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare('coordinator123', user.password_hash);
    console.log('🔐 Password validation test:', isValidPassword ? '✅ Valid' : '❌ Invalid');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

checkCoordinator();
















