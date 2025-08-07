#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createContactsForUsers() {
  console.log('🔧 Creating contact entries for users to enable messaging...');
  
  try {
    // Get all users that don't have contact_id
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .is('contact_id', null);
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }
    
    console.log(`📋 Found ${users.length} users without contact entries`);
    
    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.email}`);
      
      // Check if a contact already exists with this email
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', user.email)
        .single();
      
      let contactId;
      
      if (existingContact) {
        console.log(`✅ Contact already exists: ${existingContact.id}`);
        contactId = existingContact.id;
      } else {
        // Create a new contact for this user
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            id: user.id, // Use same ID as user for simplicity
            firstName: user.first_name || 'Unknown',
            lastName: user.last_name || 'User',
            email: user.email,
            phone: user.phone || '',
            company: 'Peak 1031',
            contactType: 'internal_user',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          .select()
          .single();
        
        if (contactError) {
          console.error(`❌ Error creating contact for ${user.email}:`, contactError);
          continue;
        }
        
        console.log(`✅ Created contact: ${newContact.id}`);
        contactId = newContact.id;
      }
      
      // Update user with contact_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ contact_id: contactId })
        .eq('id', user.id);
      
      if (updateError) {
        console.error(`❌ Error updating user ${user.email}:`, updateError);
      } else {
        console.log(`✅ Updated user with contact_id: ${contactId}`);
      }
    }
    
    console.log('\n✅ Contact mapping complete!');
    
    // Verify the admin user
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, email, contact_id')
      .eq('email', 'admin@peak1031.com')
      .single();
    
    console.log('\n📊 Admin user status:', adminUser);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  process.exit(0);
}

createContactsForUsers();