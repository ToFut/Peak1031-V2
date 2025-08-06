#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function convertPeopleToUsers() {
  try {
    console.log('👥 Converting people to users (unified schema)...');
    
    // Get all people from the database who have email but are not users yet
    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('*')
      .not('email', 'is', null)
      .eq('is_user', false)
      .limit(100); // Process in batches of 100
    
    if (peopleError) {
      throw peopleError;
    }
    
    console.log(`📋 Found ${people.length} people with email addresses who are not users yet`);
    
    let converted = 0;
    let errors = 0;
    
    for (const person of people) {
      try {
        // Determine role based on person data
        let role = 'client'; // Default role
        if (person.email && person.email.toLowerCase().includes('admin')) {
          role = 'admin';
        } else if (person.contact_type === 'Attorney' || person.contact_type === 'CPA') {
          role = 'third_party';
        } else if (person.contact_type === 'Broker' || person.contact_type === 'Agent') {
          role = 'agency';
        }
        
        // Generate a default password hash (users will need to reset)
        const defaultPassword = 'TempPass123!';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        
        // Update person to be a user
        const { error: updateError } = await supabase
          .from('people')
          .update({
            is_user: true,
            role: role,
            password_hash: passwordHash,
            is_active: true,
            two_fa_enabled: false,
            email_verified: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', person.id);
        
        if (updateError) throw updateError;
        
        converted++;
        console.log(`✅ Converted to user: ${person.email} (role: ${role})`);
        
      } catch (error) {
        errors++;
        console.error(`❌ Error processing ${person.email}:`, error.message);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\\n📊 Conversion Summary:');
    console.log(`✅ Converted: ${converted} people to users`);
    console.log(`❌ Errors: ${errors} people`);
    console.log('\\n⚠️  Note: All converted users have temporary password "TempPass123!" and must change it on first login');
    
    // Save conversion progress
    await supabase
      .from('practice_partner_syncs')
      .upsert({
        sync_id: 'people_to_users_conversion',
        sync_type: 'people_to_users',
        status: 'completed',
        start_time: new Date().toISOString(),
        records_processed: people.length,
        records_created: converted,
        records_updated: 0,
        records_failed: errors,
        statistics: {
          total_records: people.length,
          progress_percentage: 100,
          converted: converted,
          errors: errors
        }
      }, {
        onConflict: 'sync_id'
      });
    
  } catch (error) {
    console.error('❌ Conversion failed:', error);
  }
}

convertPeopleToUsers();