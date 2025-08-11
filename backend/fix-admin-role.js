require('dotenv').config();
const supabaseService = require('./services/supabase');

async function fixAdminRole() {
  try {
    console.log('🔧 Fixing admin user role in database...\n');
    
    const adminUserId = '278304de-568f-4138-b35b-6fdcfbd2f1ce';
    const adminEmail = 'admin@peak1031.com';
    
    // Check current role
    const { data: currentUser, error: fetchError } = await supabaseService.client
      .from('users')
      .select('id, email, first_name, last_name, role, is_active')
      .eq('id', adminUserId)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching user:', fetchError);
      return;
    }
    
    console.log('📋 Current user data:', currentUser);
    
    // Update the role to admin
    const { data: updatedUser, error: updateError } = await supabaseService.client
      .from('users')
      .update({ 
        role: 'admin',
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', adminUserId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating user role:', updateError);
      return;
    }
    
    console.log('✅ User role updated successfully:', updatedUser);
    
    // Also check if there are other @peak1031.com users who need admin role
    console.log('\n📋 Checking other @peak1031.com users...');
    
    const { data: peakUsers, error: peakUsersError } = await supabaseService.client
      .from('users')
      .select('id, email, first_name, last_name, role')
      .like('email', '%@peak1031.com');
    
    if (!peakUsersError && peakUsers) {
      console.log(`Found ${peakUsers.length} @peak1031.com users:`);
      peakUsers.forEach(user => {
        console.log(`   • ${user.email} - Role: ${user.role || 'NULL'}`);
      });
      
      // Update any other users with null roles to appropriate roles
      const usersToUpdate = peakUsers.filter(u => !u.role && u.id !== adminUserId);
      
      if (usersToUpdate.length > 0) {
        console.log(`\n🔧 Updating ${usersToUpdate.length} users with null roles...`);
        
        for (const user of usersToUpdate) {
          let newRole = 'client'; // default
          
          if (user.email.includes('admin')) newRole = 'admin';
          else if (user.email.includes('coordinator')) newRole = 'coordinator';
          else if (user.email.includes('staff')) newRole = 'staff';
          
          const { error: userUpdateError } = await supabaseService.client
            .from('users')
            .update({ role: newRole })
            .eq('id', user.id);
          
          if (userUpdateError) {
            console.error(`❌ Failed to update ${user.email}:`, userUpdateError);
          } else {
            console.log(`✅ Updated ${user.email} to role: ${newRole}`);
          }
        }
      }
    }
    
    console.log('\n✅ Role fix complete!');
    console.log('The admin user now has the correct role and should be able to access all exchanges.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAdminRole().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});