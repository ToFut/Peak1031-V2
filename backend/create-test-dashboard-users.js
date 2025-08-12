require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function createTestUsers() {
  console.log('🔧 Creating test users for dashboard testing...\n');
  
  const testUsers = [
    {
      email: 'test-coordinator@peak1031.com',
      password: 'test123',
      role: 'coordinator',
      first_name: 'Test',
      last_name: 'Coordinator'
    },
    {
      email: 'test-agency@peak1031.com',
      password: 'test123',
      role: 'agency',
      first_name: 'Test',
      last_name: 'Agency'
    },
    {
      email: 'test-admin@peak1031.com',
      password: 'test123',
      role: 'admin',
      first_name: 'Test',
      last_name: 'Admin'
    },
    {
      email: 'test-client-new@peak1031.com',
      password: 'test123',
      role: 'client',
      first_name: 'Test',
      last_name: 'Client'
    }
  ];
  
  for (const user of testUsers) {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', user.email)
        .single();
        
      if (existingUser) {
        console.log(`⏭️ User ${user.email} already exists, skipping...`);
        continue;
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Create user
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
          email: user.email,
          password_hash: hashedPassword,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          is_active: true,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
        
      if (error) {
        console.log(`❌ Failed to create ${user.email}:`, error.message);
      } else {
        console.log(`✅ Created ${user.role} user: ${user.email} (ID: ${newUser.id})`);
      }
      
    } catch (error) {
      console.log(`❌ Error creating ${user.email}:`, error.message);
    }
  }
  
  console.log('\n🎯 Test users created! You can now use these credentials:');
  testUsers.forEach(user => {
    console.log(`- ${user.email} / ${user.password} (${user.role})`);
  });
}

createTestUsers().then(() => process.exit(0));