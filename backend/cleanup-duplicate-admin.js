require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function cleanupDuplicateAdmin() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    console.log('🧹 Cleaning up duplicate admin users...');
    
    // Get all admin users
    const { data, error } = await supabase
      .from('people')
      .select('id, email, password_hash, is_user, is_active, created_at')
      .eq('email', 'admin@peak1031.com')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }
    
    console.log(`✅ Found ${data.length} admin users:`);
    data.forEach((user, index) => {
      console.log(`User ${index + 1}:`, {
        id: user.id,
        email: user.email,
        hasPassword: !!user.password_hash,
        isUser: user.is_user,
        isActive: user.is_active,
        createdAt: user.created_at
      });
    });
    
    if (data.length > 1) {
      // Keep the first one (oldest), delete the rest
      const usersToDelete = data.slice(1);
      
      for (const user of usersToDelete) {
        console.log(`🗑️ Deleting duplicate user: ${user.id}`);
        const { error: deleteError } = await supabase
          .from('people')
          .delete()
          .eq('id', user.id);
        
        if (deleteError) {
          console.error(`❌ Error deleting user ${user.id}:`, deleteError);
        } else {
          console.log(`✅ Deleted user: ${user.id}`);
        }
      }
    }
    
    console.log('✅ Cleanup completed');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

cleanupDuplicateAdmin();

