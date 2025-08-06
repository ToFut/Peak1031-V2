#!/usr/bin/env node

/**
 * Script to run the people table migration and link user/contact records
 * This script:
 * 1. Runs the SQL migration to add contact_link_id to people table
 * 2. Links existing user records to contact records
 * 3. Verifies the migration was successful
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  console.log('🚀 Starting People Table Migration...\n');

  try {
    // 1. First check current state
    console.log('📊 Checking current database state...\n');
    
    const { data: userRecords, error: userError } = await supabase
      .from('people')
      .select('id, email, role, is_user')
      .eq('is_user', true)
      .limit(5);

    const { data: contactRecords, error: contactError } = await supabase
      .from('people')
      .select('id, email, pp_contact_id, is_user')
      .eq('is_user', false)
      .limit(5);

    console.log(`Sample user records (is_user=true): ${userRecords?.length || 0}`);
    if (userRecords && userRecords.length > 0) {
      console.log('Sample:', userRecords[0]);
    }

    console.log(`\nSample contact records (is_user=false): ${contactRecords?.length || 0}`);
    if (contactRecords && contactRecords.length > 0) {
      console.log('Sample:', contactRecords[0]);
    }

    // 2. Show migration SQL to run
    console.log('\n📄 Migration SQL to run...');
    const migrationPath = path.join(__dirname, '..', '..', 'database', 'migrations', '017-fix-people-table-relationships.sql');
    
    console.log('\n⚠️  IMPORTANT: Please run the following migration in your Supabase SQL editor:');
    console.log(`📁 File: ${migrationPath}`);
    console.log('\nOr run using Supabase CLI:');
    console.log(`supabase db push --db-url "${process.env.DATABASE_URL || process.env.SUPABASE_DB_URL}"\n`);

    // 3. Wait for user confirmation
    console.log('Press Enter after you\'ve run the migration SQL...');
    await new Promise(resolve => process.stdin.once('data', resolve));

    // 4. Run the linking process
    console.log('\n🔗 Starting user-contact linking process...\n');
    
    // Get all user records without contact_link_id
    const { data: users, error: usersError } = await supabase
      .from('people')
      .select('id, email, role, first_name, last_name, contact_link_id')
      .eq('is_user', true)
      .is('contact_link_id', null)
      .order('created_at');

    if (usersError) throw usersError;

    console.log(`Found ${users.length} user records without contact links\n`);

    let linked = 0;
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        console.log(`Processing user: ${user.email} (${user.role})`);

        // Skip admin and coordinator roles
        if (['admin', 'coordinator'].includes(user.role)) {
          console.log(`  → Skipped (${user.role}s don't need contact records)\n`);
          skipped++;
          continue;
        }

        // Try to find existing contact record by email
        const { data: contacts, error: contactError } = await supabase
          .from('people')
          .select('id, first_name, last_name, pp_contact_id')
          .eq('is_user', false)
          .ilike('email', user.email)
          .limit(1);

        if (contactError) throw contactError;

        if (contacts && contacts.length > 0) {
          // Link to existing contact
          const contact = contacts[0];
          const { error: updateError } = await supabase
            .from('people')
            .update({ contact_link_id: contact.id })
            .eq('id', user.id);

          if (updateError) throw updateError;

          console.log(`  → Linked to existing contact: ${contact.id}`);
          if (contact.pp_contact_id) {
            console.log(`    (PracticePanther ID: ${contact.pp_contact_id})`);
          }
          console.log('');
          linked++;
        } else if (user.role === 'client') {
          // Create new contact record for client users
          const { data: newContact, error: createError } = await supabase
            .from('people')
            .insert({
              email: user.email,
              first_name: user.first_name || user.email.split('@')[0],
              last_name: user.last_name || 'User',
              is_user: false,
              source: 'user_creation'
            })
            .select()
            .single();

          if (createError) throw createError;

          // Link to new contact
          const { error: updateError } = await supabase
            .from('people')
            .update({ contact_link_id: newContact.id })
            .eq('id', user.id);

          if (updateError) throw updateError;

          console.log(`  → Created new contact: ${newContact.id}\n`);
          created++;
        } else {
          console.log(`  → No contact found (${user.role} doesn't require one)\n`);
          skipped++;
        }
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}\n`);
        errors++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total user records processed: ${users.length}`);
    console.log(`✅ Linked to existing contacts: ${linked}`);
    console.log(`✅ New contact records created: ${created}`);
    console.log(`⏭️  Skipped (no contact needed): ${skipped}`);
    if (errors > 0) {
      console.log(`❌ Errors encountered: ${errors}`);
    }

    // 5. Verify exchanges are now accessible
    console.log('\n=== Verifying Exchange Access ===');
    
    const { data: clientUsers, error: clientError } = await supabase
      .from('people')
      .select('id, email, contact_link_id')
      .eq('role', 'client')
      .eq('is_user', true)
      .not('contact_link_id', 'is', null)
      .limit(5);

    if (clientError) throw clientError;

    for (const client of clientUsers) {
      // Count exchanges for this client
      const { data: clientExchanges, count: directCount } = await supabase
        .from('exchanges')
        .select('id', { count: 'exact' })
        .eq('client_id', client.contact_link_id);

      const { data: participantExchanges, count: partCount } = await supabase
        .from('exchange_participants')
        .select('exchange_id', { count: 'exact' })
        .eq('contact_id', client.contact_link_id);

      console.log(`\nClient: ${client.email}`);
      console.log(`  Contact Link ID: ${client.contact_link_id}`);
      console.log(`  Direct exchanges: ${directCount || 0}`);
      console.log(`  Participant exchanges: ${partCount || 0}`);
      console.log(`  Total accessible: ${(directCount || 0) + (partCount || 0)}`);
    }

    // 6. Data integrity check
    console.log('\n=== Data Integrity Check ===');
    
    // Check for users still without contact_link_id
    const { data: orphanedUsers, count: orphanCount } = await supabase
      .from('people')
      .select('id, email, role', { count: 'exact' })
      .eq('is_user', true)
      .is('contact_link_id', null)
      .in('role', ['client', 'third_party', 'agency']);

    if (orphanCount > 0) {
      console.log(`\n⚠️  Found ${orphanCount} users that still need contact links:`);
      orphanedUsers?.slice(0, 5).forEach(u => {
        console.log(`  - ${u.email} (${u.role})`);
      });
    } else {
      console.log('✅ All client/third-party/agency users have contact links');
    }

    // Check for duplicate emails across user and contact records
    const { data: allPeople } = await supabase
      .from('people')
      .select('email, is_user')
      .not('email', 'is', null);

    if (allPeople) {
      const emailMap = {};
      allPeople.forEach(p => {
        if (!emailMap[p.email]) {
          emailMap[p.email] = { users: 0, contacts: 0 };
        }
        if (p.is_user) {
          emailMap[p.email].users++;
        } else {
          emailMap[p.email].contacts++;
        }
      });
      
      const goodLinks = Object.entries(emailMap).filter(([_, counts]) => 
        counts.users === 1 && counts.contacts === 1
      ).length;
      
      console.log(`\n✅ ${goodLinks} emails have both user and contact records (good for linking)`);
      
      const orphanedEmails = Object.entries(emailMap).filter(([_, counts]) => 
        counts.users === 1 && counts.contacts === 0
      );
      
      if (orphanedEmails.length > 0) {
        console.log(`⚠️  ${orphanedEmails.length} user emails without matching contacts`);
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Test client login and verify they can see their exchanges');
    console.log('2. Monitor error logs for any issues');
    console.log('3. Update any backend code that references user.contact_id to use user.contact_link_id');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();