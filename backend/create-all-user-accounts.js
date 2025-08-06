require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

console.log('👥 CREATING ALL USER ACCOUNTS\n');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createUser(email, password, role, firstName, lastName) {
  try {
    console.log(`🔍 Checking if ${email} exists...`);
    
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('people')
      .select('id, email, password_hash, role, is_user')
      .eq('email', email)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.log(`❌ Error checking ${email}:`, checkError.message);
      return false;
    }
    
    if (existingUser) {
      console.log(`⚠️  ${email} already exists`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Has password: ${!!existingUser.password_hash}`);
      
      // If user exists but no password, update it
      if (!existingUser.password_hash) {
        console.log(`🔧 Updating ${email} with password...`);
        
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        const { data: updatedUser, error: updateError } = await supabase
          .from('people')
          .update({
            password_hash: passwordHash,
            is_user: true,
            role: role,
            is_active: true
          })
          .eq('email', email)
          .select()
          .single();
        
        if (updateError) {
          console.log(`❌ Error updating ${email}:`, updateError.message);
          return false;
        }
        
        console.log(`✅ ${email} updated successfully!`);
        return true;
        
      } else {
        console.log(`✅ ${email} already has password set up`);
        return true;
      }
      
    } else {
      console.log(`👤 Creating ${email}...`);
      
      // Hash the password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Create the user
      const { data: newUser, error: createError } = await supabase
        .from('people')
        .insert({
          email: email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          role: role,
          is_user: true,
          is_active: true,
          source: 'manual'
        })
        .select()
        .single();
      
      if (createError) {
        console.log(`❌ Error creating ${email}:`, createError.message);
        return false;
      }
      
      console.log(`✅ ${email} created successfully!`);
      console.log(`   ID: ${newUser.id}`);
      console.log(`   Role: ${newUser.role}`);
      return true;
    }
    
  } catch (error) {
    console.log(`❌ Error with ${email}:`, error.message);
    return false;
  }
}

async function createAllUsers() {
  const users = [
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
      firstName: 'Exchange',
      lastName: 'Coordinator'
    },
    {
      email: 'client@peak1031.com',
      password: 'client123',
      role: 'client',
      firstName: 'Client',
      lastName: 'User'
    },
    {
      email: 'agency@peak1031.com',
      password: 'agency123',
      role: 'agency',
      firstName: 'Agency',
      lastName: 'User'
    },
    {
      email: 'thirdparty@peak1031.com',
      password: 'thirdparty123',
      role: 'third_party',
      firstName: 'Third',
      lastName: 'Party'
    }
  ];
  
  console.log('🚀 Creating all user accounts...\n');
  
  let successCount = 0;
  for (const user of users) {
    const success = await createUser(
      user.email,
      user.password,
      user.role,
      user.firstName,
      user.lastName
    );
    if (success) successCount++;
    console.log('');
  }
  
  console.log('📊 SUMMARY:');
  console.log('='.repeat(50));
  console.log(`✅ Successfully created/updated: ${successCount}/${users.length} users`);
  
  console.log('\n🔐 ALL LOGIN CREDENTIALS:');
  console.log('='.repeat(50));
  users.forEach(user => {
    console.log(`${user.role.toUpperCase()}:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log('');
  });
  
  console.log('✅ All user accounts are ready for login!');
}

createAllUsers(); 