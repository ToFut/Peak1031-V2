require('dotenv').config();
const jwt = require('jsonwebtoken');
const databaseService = require('./services/database');

async function checkUserIdMismatch() {
  try {
    console.log('🔍 Checking user ID consistency...\n');
    
    // Get admin user from database
    const adminUser = await databaseService.getUserByEmail('admin@peak1031.com');
    console.log('📊 Admin user in database:');
    console.log('   ID:', adminUser.id);
    console.log('   Email:', adminUser.email);
    console.log('   Role:', adminUser.role);
    
    // Create a token to see what ID it contains
    const token = jwt.sign(
      { 
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    // Decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('\n🎫 Token payload:');
    console.log('   ID:', decoded.id);
    console.log('   Email:', decoded.email);
    console.log('   Role:', decoded.role);
    
    // Check if user ID exists in users table
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    const { data: userCheck, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', adminUser.id)
      .single();
      
    console.log('\n✅ User verification:');
    if (userCheck) {
      console.log('   User exists in users table');
      console.log('   ID matches:', userCheck.id === adminUser.id);
    } else {
      console.log('   ❌ User NOT found in users table!');
      console.log('   Error:', error?.message);
    }
    
    // Check what IDs exist in the users table
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, email')
      .order('created_at', { ascending: false })
      .limit(5);
      
    console.log('\n📋 Recent users in table:');
    allUsers?.forEach(u => {
      console.log(`   ${u.id} - ${u.email}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

checkUserIdMismatch();