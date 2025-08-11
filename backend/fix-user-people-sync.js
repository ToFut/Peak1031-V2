require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function syncUserToPeople() {
  console.log('🔄 Syncing users to people table...\n');
  
  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (usersError) {
      throw usersError;
    }
    
    console.log(`📊 Found ${users.length} users to sync\n`);
    
    for (const user of users) {
      console.log(`Processing user: ${user.email}`);
      
      // Check if user already exists in people table
      const { data: existingPerson, error: checkError } = await supabase
        .from('people')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (existingPerson) {
        console.log(`  ✅ Already exists in people table`);
        continue;
      }
      
      // Create person record with same ID as user
      const { data: newPerson, error: insertError } = await supabase
        .from('people')
        .insert([{
          id: user.id, // Use same ID as users table
          email: user.email,
          password_hash: user.password_hash,
          first_name: user.first_name || user.firstName,
          last_name: user.last_name || user.lastName,
          phone: user.phone,
          company: user.company,
          role: user.role,
          is_user: true,
          is_active: user.is_active !== false,
          email_verified: user.email_verified || false,
          two_fa_enabled: user.two_fa_enabled || false,
          last_login: user.last_login,
          created_at: user.created_at,
          updated_at: user.updated_at
        }])
        .select()
        .single();
        
      if (insertError) {
        console.log(`  ❌ Failed to create in people table:`, insertError.message);
      } else {
        console.log(`  ✅ Created in people table with ID: ${newPerson.id}`);
      }
    }
    
    console.log('\n✅ Sync completed!');
    
    // Verify admin user specifically
    const { data: adminInPeople } = await supabase
      .from('people')
      .select('id, email')
      .eq('email', 'admin@peak1031.com')
      .single();
      
    if (adminInPeople) {
      console.log('\n🔍 Admin user verified in people table:');
      console.log('   ID:', adminInPeople.id);
      console.log('   Email:', adminInPeople.email);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

syncUserToPeople();