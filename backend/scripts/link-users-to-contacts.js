#!/usr/bin/env node

/**
 * Script to link existing users to contacts by email
 * Run this after applying the migration to ensure all users are properly linked
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function linkUsersToContacts() {
  console.log('Starting user-contact linking process...\n');

  try {
    // 1. Get all users without contact_id
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, first_name, last_name')
      .is('contact_id', null)
      .order('created_at');

    if (usersError) throw usersError;

    console.log(`Found ${users.length} users without contact links\n`);

    let linked = 0;
    let created = 0;
    let skipped = 0;

    for (const user of users) {
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
            first_name: user.first_name,
            last_name: user.last_name
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
    }

    console.log('\n=== Summary ===');
    console.log(`Total users processed: ${users.length}`);
    console.log(`Linked to existing contacts: ${linked}`);
    console.log(`New contacts created: ${created}`);
    console.log(`Skipped (no contact needed): ${skipped}`);

    // 2. Verify exchanges are now accessible
    console.log('\n=== Verifying Exchange Access ===');
    
    const { data: clientUsers, error: clientError } = await supabase
      .from('users')
      .select('id, email, contact_id')
      .eq('role', 'client')
      .not('contact_id', 'is', null)
      .limit(5);

    if (clientError) throw clientError;

    for (const client of clientUsers) {
      // Use the RPC function to get exchanges
      const { data: exchanges, error: exchangeError } = await supabase
        .rpc('get_user_exchanges', { p_user_id: client.id });

      if (exchangeError) throw exchangeError;

      console.log(`\nClient: ${client.email}`);
      console.log(`  Contact ID: ${client.contact_id}`);
      console.log(`  Accessible exchanges: ${exchanges.length}`);
      
      if (exchanges.length > 0) {
        exchanges.slice(0, 3).forEach(ex => {
          console.log(`    - ${ex.exchange_name} (${ex.status}) - Role: ${ex.role}`);
        });
        if (exchanges.length > 3) {
          console.log(`    ... and ${exchanges.length - 3} more`);
        }
      }
    }

    // 3. Check for any data issues
    console.log('\n=== Data Integrity Check ===');
    
    // Check for duplicate email addresses
    const { data: duplicates, error: dupError } = await supabase
      .from('contacts')
      .select('email, count')
      .not('email', 'is', null)
      .order('count', { ascending: false });

    if (!dupError && duplicates) {
      const dupEmails = duplicates.filter(d => d.count > 1);
      if (dupEmails.length > 0) {
        console.log('\n⚠️  Found duplicate emails in contacts:');
        dupEmails.forEach(d => {
          console.log(`  - ${d.email}: ${d.count} records`);
        });
      } else {
        console.log('✓ No duplicate emails found');
      }
    }

    // Check for users still without exchanges
    const { data: orphanedClients, error: orphanError } = await supabase
      .rpc('get_user_exchanges', { p_user_id: null })
      .eq('role', 'client');

    console.log('\n✅ User-Contact linking completed successfully!');

  } catch (error) {
    console.error('\n❌ Error linking users to contacts:', error);
    process.exit(1);
  }
}

// Run the script
linkUsersToContacts();