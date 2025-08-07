require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

console.log('👤 CREATING CLIENT USER ACCOUNT\n');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createClientUser() {
  try {
    const email = process.env.CLIENT_EMAIL || 'client@peak1031.com';
    const password = process.env.CLIENT_PASSWORD || crypto.randomBytes(16).toString('hex');
    const role = 'client';
    
    if (!process.env.CLIENT_PASSWORD) {
      console.log(`⚠️  Generated temporary password for security`);
      console.log('   Please set CLIENT_PASSWORD in .env file for production use');
    }
    
    console.log('🔍 Checking if user already exists...');
    
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('people')
      .select('id, email, password_hash, role, is_user')
      .eq('email', email)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.log('❌ Error checking user:', checkError.message);
      return;
    }
    
    if (existingUser) {
      console.log('⚠️  User already exists:');
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Has password: ${!!existingUser.password_hash}`);
      console.log(`   Is user: ${existingUser.is_user}`);
      
      // If user exists but no password, update it
      if (!existingUser.password_hash) {
        console.log('\n🔧 Updating user with password...');
        
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
          console.log('❌ Error updating user:', updateError.message);
          return;
        }
        
        console.log('✅ User updated successfully!');
        console.log(`   Email: ${updatedUser.email}`);
        console.log(`   Role: ${updatedUser.role}`);
        console.log(`   Is user: ${updatedUser.is_user}`);
        console.log(`   Is active: ${updatedUser.is_active}`);
        
      } else {
        console.log('✅ User already has password set up');
      }
      
    } else {
      console.log('👤 Creating new client user...');
      
      // Hash the password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Create the user
      const { data: newUser, error: createError } = await supabase
        .from('people')
        .insert({
          email: email,
          password_hash: passwordHash,
          first_name: 'Client',
          last_name: 'User',
          role: role,
          is_user: true,
          is_active: true,
          source: 'manual'
        })
        .select()
        .single();
      
      if (createError) {
        console.log('❌ Error creating user:', createError.message);
        return;
      }
      
      console.log('✅ Client user created successfully!');
      console.log(`   ID: ${newUser.id}`);
      console.log(`   Email: ${newUser.email}`);
      console.log(`   Role: ${newUser.role}`);
      console.log(`   Is user: ${newUser.is_user}`);
      console.log(`   Is active: ${newUser.is_active}`);
    }
    
    console.log('\n🔐 LOGIN CREDENTIALS:');
    console.log('='.repeat(40));
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: ${role}`);
    console.log('='.repeat(40));
    
    console.log('\n✅ User account is ready for login!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

createClientUser();