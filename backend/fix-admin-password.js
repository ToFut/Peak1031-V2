const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixAdminPassword() {
  try {
    console.log('🔐 Fixing admin password...');
    
    // Use environment variable or generate a secure password
    const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    if (!process.env.ADMIN_PASSWORD) {
      console.log(`⚠️  Generated temporary password: ${password}`);
      console.log('   Please set ADMIN_PASSWORD in .env file for production use');
    }
    
    // Update admin user
    const { data, error } = await supabase
      .from('people')
      .update({ 
        password_hash: hashedPassword,
        is_user: true,
        is_active: true
      })
      .eq('email', 'admin@peak1031.com');
    
    if (error) {
      console.error('❌ Error updating admin:', error);
    } else {
      console.log('✅ Admin password updated successfully');
    }
    
    // Verify the update
    const { data: admin, error: fetchError } = await supabase
      .from('people')
      .select('id, email, password_hash, is_user, is_active')
      .eq('email', 'admin@peak1031.com')
      .single();
      
    if (fetchError) {
      console.error('❌ Error fetching admin:', fetchError);
    } else {
      console.log('✅ Admin user verified:', {
        email: admin.email,
        hasPassword: !!admin.password_hash,
        isUser: admin.is_user,
        isActive: admin.is_active
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixAdminPassword();