#!/usr/bin/env node

/**
 * Script to run the user-contact migration and link existing data
 * This script:
 * 1. Runs the SQL migration to add contact_id to users table
 * 2. Links existing users to contacts by email
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
  console.log('🚀 Starting User-Contact Migration...\n');

  try {
    // 1. Read and execute the migration SQL
    console.log('📄 Reading migration file...');
    const migrationPath = path.join(__dirname, '..', '..', 'database', 'migrations', '016-add-user-contact-link.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('🔧 Executing migration SQL...');
    // Note: Supabase doesn't support direct SQL execution via the JS client
    // You'll need to run this through the Supabase SQL editor or use the CLI
    console.log('\n⚠️  IMPORTANT: Please run the following migration in your Supabase SQL editor:');
    console.log(`📁 File: ${migrationPath}`);
    console.log('\nOr run using Supabase CLI:');
    console.log(`supabase db execute -f "${migrationPath}"\n`);

    // 2. Wait for user confirmation
    console.log('Press Enter after you\'ve run the migration SQL...');
    await new Promise(resolve => process.stdin.once('data', resolve));

    // 3. Run the linking script
    console.log('\n🔗 Starting user-contact linking process...\n');
    
    // Get all users without contact_id
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, first_name, last_name, contact_id')
      .is('contact_id', null)
      .order('created_at');

    if (usersError) throw usersError;

    console.log(`Found ${users.length} users without contact links\n`);

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

        // Try to find existing contact by email
        const { data: contacts, error: contactError } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, pp_contact_id')
          .ilike('email', user.email)
          .limit(1);

        if (contactError) throw contactError;

        if (contacts && contacts.length > 0) {
          // Link to existing contact
          const contact = contacts[0];
          const { error: updateError } = await supabase
            .from('users')
            .update({ contact_id: contact.id })
            .eq('id', user.id);

          if (updateError) throw updateError;

          console.log(`  → Linked to existing contact: ${contact.id}`);
          if (contact.pp_contact_id) {
            console.log(`    (PracticePanther ID: ${contact.pp_contact_id})`);
          }
          console.log('');
          linked++;
        } else if (user.role === 'client') {
          // Create new contact for client users
          const { data: newContact, error: createError } = await supabase
            .from('contacts')
            .insert({
              email: user.email,
              first_name: user.first_name || user.email.split('@')[0],
              last_name: user.last_name || 'User'
            })
            .select()
            .single();

          if (createError) throw createError;

          // Link to new contact
          const { error: updateError } = await supabase
            .from('users')
            .update({ contact_id: newContact.id })
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
    console.log(`Total users processed: ${users.length}`);
    console.log(`✅ Linked to existing contacts: ${linked}`);
    console.log(`✅ New contacts created: ${created}`);
    console.log(`⏭️  Skipped (no contact needed): ${skipped}`);
    if (errors > 0) {
      console.log(`❌ Errors encountered: ${errors}`);
    }

    // 4. Verify exchanges are now accessible
    console.log('\n=== Verifying Exchange Access ===');
    
    const { data: clientUsers, error: clientError } = await supabase
      .from('users')
      .select('id, email, contact_id')
      .eq('role', 'client')
      .not('contact_id', 'is', null)
      .limit(5);

    if (clientError) throw clientError;

    for (const client of clientUsers) {
      // Count exchanges for this client
      const { data: clientExchanges, error: exchangeError } = await supabase
        .from('exchanges')
        .select('id', { count: 'exact' })
        .eq('client_id', client.contact_id);

      const { data: participantExchanges, error: partError } = await supabase
        .from('exchange_participants')
        .select('exchange_id', { count: 'exact' })
        .eq('contact_id', client.contact_id);

      const totalExchanges = (clientExchanges?.length || 0) + (participantExchanges?.length || 0);

      console.log(`\nClient: ${client.email}`);
      console.log(`  Contact ID: ${client.contact_id}`);
      console.log(`  Direct exchanges: ${clientExchanges?.length || 0}`);
      console.log(`  Participant exchanges: ${participantExchanges?.length || 0}`);
      console.log(`  Total accessible: ${totalExchanges}`);
    }

    // 5. Data integrity check
    console.log('\n=== Data Integrity Check ===');
    
    // Check for users still without contact_id
    const { data: orphanedUsers, error: orphanError } = await supabase
      .from('users')
      .select('id, email, role', { count: 'exact' })
      .is('contact_id', null)
      .in('role', ['client', 'third_party', 'agency']);

    if (!orphanError && orphanedUsers) {
      if (orphanedUsers.length > 0) {
        console.log(`\n⚠️  Found ${orphanedUsers.length} users that still need contact links:`);
        orphanedUsers.slice(0, 5).forEach(u => {
          console.log(`  - ${u.email} (${u.role})`);
        });
      } else {
        console.log('✅ All client/third-party/agency users have contact links');
      }
    }

    // Check for duplicate contacts by email
    const { data: contactEmails } = await supabase
      .from('contacts')
      .select('email')
      .not('email', 'is', null);

    if (contactEmails) {
      const emailCounts = {};
      contactEmails.forEach(c => {
        emailCounts[c.email] = (emailCounts[c.email] || 0) + 1;
      });
      
      const duplicates = Object.entries(emailCounts).filter(([_, count]) => count > 1);
      if (duplicates.length > 0) {
        console.log('\n⚠️  Found duplicate emails in contacts:');
        duplicates.slice(0, 5).forEach(([email, count]) => {
          console.log(`  - ${email}: ${count} records`);
        });
      } else {
        console.log('✅ No duplicate emails found in contacts');
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Test client login and verify they can see their exchanges');
    console.log('2. Monitor error logs for any issues');
    console.log('3. Consider running periodic integrity checks');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();