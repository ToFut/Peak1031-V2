const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const testUsers = [
  {
    email: 'admin@peak1031.com',
    password: 'admin123',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User'
  },
  {
    email: 'coordinator@peak1031.com',
    password: 'coordinator123',
    role: 'coordinator',
    firstName: 'Demo',
    lastName: 'Coordinator'
  },
  {
    email: 'client@peak1031.com',
    password: 'client123',
    role: 'client',
    firstName: 'Demo',
    lastName: 'Client'
  },
  {
    email: 'agency@peak1031.com',
    password: 'agency123',
    role: 'agency',
    firstName: 'Demo',
    lastName: 'Agency'
  },
  {
    email: 'thirdparty@peak1031.com',
    password: 'thirdparty123',
    role: 'third_party',
    firstName: 'Demo',
    lastName: 'Third Party'
  }
];

async function setupTestUsers() {
  console.log('🔧 Setting up test users...');
  
  for (const userData of testUsers) {
    try {
      console.log(`\n👤 Setting up ${userData.role} user: ${userData.email}`);
      
      // Check if user already exists in auth.users
      const { data: existingAuthUser } = await supabase.auth.admin.getUserByEmail(userData.email);
      
      if (existingAuthUser.user) {
        console.log(`✅ User already exists in auth.users: ${userData.email}`);
      } else {
        // Create user in auth.users
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: userData.role
          }
        });
        
        if (authError) {
          console.error(`❌ Error creating auth user ${userData.email}:`, authError.message);
          continue;
        }
        
        console.log(`✅ Created auth user: ${userData.email} (ID: ${authUser.user.id})`);
      }
      
      // Create user profile in users table
      const { data: profileUser, error: profileError } = await supabase
        .from('users')
        .upsert({
          id: existingAuthUser?.user?.id || (await supabase.auth.admin.getUserByEmail(userData.email)).data.user.id,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role,
          is_active: true,
          email_verified: true
        }, {
          onConflict: 'email'
        })
        .select()
        .single();
      
      if (profileError) {
        console.error(`❌ Error creating user profile for ${userData.email}:`, profileError.message);
        continue;
      }
      
      console.log(`✅ Created user profile: ${userData.email}`);
      
      // Test authentication
      const { data: authTest, error: authTestError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password
      });
      
      if (authTestError) {
        console.error(`❌ Authentication test failed for ${userData.email}:`, authTestError.message);
      } else {
        console.log(`✅ Authentication test successful for ${userData.email}`);
        await supabase.auth.signOut();
      }
      
    } catch (error) {
      console.error(`❌ Error setting up user ${userData.email}:`, error.message);
    }
  }
  
  console.log('\n🎉 Test users setup completed!');
  console.log('\n📋 Login credentials:');
  testUsers.forEach(user => {
    console.log(`   ${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
  });
}

setupTestUsers().catch(console.error);




