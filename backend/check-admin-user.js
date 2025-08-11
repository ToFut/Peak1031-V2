require('dotenv').config();
const supabaseService = require('./services/supabase');

async function checkAdminUser() {
  try {
    console.log('🔍 Checking for admin user...\n');
    
    // Check users with admin role
    const { data: adminUsers, error } = await supabaseService.client
      .from('users')
      .select('id, email, first_name, last_name, role')
      .eq('role', 'admin');
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }
    
    if (adminUsers && adminUsers.length > 0) {
      console.log('✅ Found admin users:');
      adminUsers.forEach(user => {
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.first_name} ${user.last_name}`);
        console.log(`   Role: ${user.role}`);
        console.log('   ---');
      });
      
      // Update the create-test-jwt.js file with the correct admin ID
      if (adminUsers[0]) {
        console.log('\n📝 Use this ID in your JWT token:');
        console.log(`   userId: '${adminUsers[0].id}'`);
      }
    } else {
      console.log('❌ No admin users found in the database');
      console.log('\n📝 Creating a test admin user...');
      
      const { data: newUser, error: createError } = await supabaseService.client
        .from('users')
        .insert({
          email: 'admin@peak1031.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          is_active: true
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating admin user:', createError);
      } else {
        console.log('✅ Admin user created:');
        console.log(`   ID: ${newUser.id}`);
        console.log(`   Email: ${newUser.email}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAdminUser().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});