#!/usr/bin/env node

/**
 * Migrate data from PEOPLE table to CONTACTS table
 * This will consolidate both contacts and users into a single CONTACTS table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkTablesReady() {
  console.log('🔧 Checking if CONTACTS table has user columns...\n');
  
  const { data: sample } = await supabase.from('contacts').select('*').limit(1);
  const currentColumns = new Set(Object.keys(sample[0]));
  
  const requiredColumns = ['is_user', 'is_active', 'role', 'password_hash', 'email_verified', 'two_fa_enabled', 'two_fa_secret', 'last_login', 'contact_link_id'];
  
  const missingColumns = requiredColumns.filter(col => !currentColumns.has(col));
  
  if (missingColumns.length > 0) {
    console.log('⚠️  Please run MERGE_PEOPLE_TO_CONTACTS.sql first!');
    console.log('Missing columns:', missingColumns);
    return false;
  }
  
  console.log('✅ CONTACTS table has all required user columns');
  return true;
}

async function migratePeopleToContacts() {
  console.log('🚀 Starting PEOPLE to CONTACTS migration...\n');
  
  if (!(await checkTablesReady())) return;
  
  // Get all people records
  const { data: people, error } = await supabase
    .from('people')
    .select('*');

  if (error) {
    console.error('Error fetching people:', error);
    return;
  }

  console.log(`Found ${people.length} people records to process\n`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const person of people) {
    try {
      // Check if this person already exists in contacts (by pp_contact_id or email)
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .or(`pp_contact_id.eq.${person.pp_contact_id},email.eq.${person.email}`)
        .single();

      const contactData = {
        first_name: person.first_name,
        last_name: person.last_name,
        middle_name: person.middle_name,
        email: person.email,
        phone: person.phone,
        company: person.company,
        address_street: person.address_street,
        address_city: person.address_city,
        address_state: person.address_state,
        address_zip_code: person.address_zip_code,
        address_country: person.address_country,
        pp_contact_id: person.pp_contact_id,
        pp_data: person.pp_data,
        source: person.source,
        last_sync_at: person.last_sync_at,
        // User-specific fields
        is_user: person.is_user || false,
        is_active: person.is_active !== false, // default to true
        role: person.role,
        password_hash: person.password_hash,
        email_verified: person.email_verified || false,
        two_fa_enabled: person.two_fa_enabled || false,
        two_fa_secret: person.two_fa_secret,
        last_login: person.last_login,
        contact_link_id: person.contact_link_id,
        created_at: person.created_at,
        updated_at: person.updated_at
      };

      if (existingContact) {
        // Update existing contact with user fields from people
        const { error: updateError } = await supabase
          .from('contacts')
          .update({
            is_user: person.is_user || false,
            is_active: person.is_active !== false,
            role: person.role,
            password_hash: person.password_hash,
            email_verified: person.email_verified || false,
            two_fa_enabled: person.two_fa_enabled || false,
            two_fa_secret: person.two_fa_secret,
            last_login: person.last_login,
            contact_link_id: person.contact_link_id,
            // Also update any missing contact fields
            first_name: contactData.first_name || null,
            last_name: contactData.last_name || null,
            middle_name: contactData.middle_name || null,
            source: contactData.source || null,
            last_sync_at: contactData.last_sync_at || null
          })
          .eq('id', existingContact.id);

        if (updateError) {
          console.error(`❌ Error updating ${person.first_name} ${person.last_name}:`, updateError.message);
          errors++;
        } else {
          updated++;
          if (updated <= 10) {
            console.log(`✅ Updated: ${person.first_name} ${person.last_name} (${person.role || 'contact'})`);
          }
        }

      } else {
        // Insert new contact
        const { error: insertError } = await supabase
          .from('contacts')
          .insert(contactData);

        if (insertError) {
          console.error(`❌ Error inserting ${person.first_name} ${person.last_name}:`, insertError.message);
          errors++;
        } else {
          inserted++;
          if (inserted <= 10) {
            console.log(`✅ Inserted: ${person.first_name} ${person.last_name} (${person.role || 'contact'})`);
          }
        }
      }

    } catch (err) {
      console.error(`❌ Error processing ${person.first_name} ${person.last_name}:`, err.message);
      errors++;
    }
  }

  console.log(`\n📊 MIGRATION RESULTS:`);
  console.log(`   Total processed: ${people.length}`);
  console.log(`   Inserted new: ${inserted}`);
  console.log(`   Updated existing: ${updated}`);
  console.log(`   Errors: ${errors}`);

  // Verify results
  await verifyMigration();
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration results...\n');

  const { count: totalContacts } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true });

  const { count: usersCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('is_user', true);

  const { count: contactsOnlyCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('is_user', false);

  console.log('📊 CONSOLIDATED CONTACTS TABLE:');
  console.log(`   Total records: ${totalContacts}`);
  console.log(`   Users: ${usersCount}`);
  console.log(`   Contacts only: ${contactsOnlyCount}`);

  // Show sample users
  const { data: sampleUsers } = await supabase
    .from('contacts')
    .select('first_name, last_name, email, role, is_user, is_active')
    .eq('is_user', true)
    .limit(5);

  console.log('\n👤 SAMPLE USERS IN CONTACTS TABLE:');
  sampleUsers?.forEach((user, idx) => {
    console.log(`   ${idx + 1}. ${user.first_name} ${user.last_name} (${user.email})`);
    console.log(`      Role: ${user.role}, Active: ${user.is_active}`);
  });

  console.log('\n✅ CONTACTS table now contains both contacts AND users!');
  console.log('💡 You can now safely drop the PEOPLE table if desired.');
}

migratePeopleToContacts();