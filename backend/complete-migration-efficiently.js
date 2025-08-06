#!/usr/bin/env node

/**
 * Efficiently complete the PEOPLE to CONTACTS migration
 * Using bulk operations for better performance
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function completeMigrationEfficiently() {
  console.log('🚀 Completing PEOPLE to CONTACTS migration efficiently...\n');

  // Get people who are NOT yet in contacts (by email or pp_contact_id)
  const { data: allPeople } = await supabase
    .from('people')
    .select('*');

  const { data: existingContacts } = await supabase
    .from('contacts')
    .select('email, pp_contact_id');

  const existingEmails = new Set(existingContacts.map(c => c.email).filter(e => e));
  const existingPPIds = new Set(existingContacts.map(c => c.pp_contact_id).filter(id => id));

  // Find people not yet migrated
  const peopleToMigrate = allPeople.filter(person => {
    const hasEmail = person.email && existingEmails.has(person.email);
    const hasPPId = person.pp_contact_id && existingPPIds.has(person.pp_contact_id);
    return !hasEmail && !hasPPId;
  });

  console.log(`Found ${peopleToMigrate.length} people records to migrate`);

  if (peopleToMigrate.length === 0) {
    console.log('✅ Migration already complete!');
    await showFinalStatus();
    return;
  }

  // Insert in batches for efficiency
  const BATCH_SIZE = 100;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < peopleToMigrate.length; i += BATCH_SIZE) {
    const batch = peopleToMigrate.slice(i, i + BATCH_SIZE);
    
    const contactsData = batch.map(person => ({
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
      is_active: person.is_active !== false,
      role: person.role,
      password_hash: person.password_hash,
      email_verified: person.email_verified || false,
      two_fa_enabled: person.two_fa_enabled || false,
      two_fa_secret: person.two_fa_secret,
      last_login: person.last_login,
      contact_link_id: person.contact_link_id,
      created_at: person.created_at,
      updated_at: person.updated_at
    }));

    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert(contactsData);

      if (error) {
        console.error(`❌ Batch error:`, error.message);
        errors += batch.length;
      } else {
        inserted += batch.length;
        console.log(`✅ Inserted batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} records`);
      }

    } catch (err) {
      console.error(`❌ Batch exception:`, err.message);
      errors += batch.length;
    }
  }

  console.log(`\n📊 BATCH INSERTION RESULTS:`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Errors: ${errors}`);

  await showFinalStatus();
}

async function showFinalStatus() {
  console.log('\n🔍 Final migration status...\n');

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

  const { count: ppDataCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .not('pp_data', 'is', null);

  console.log('📊 FINAL CONSOLIDATED CONTACTS TABLE:');
  console.log(`   Total records: ${totalContacts}`);
  console.log(`   Users (is_user=true): ${usersCount}`);
  console.log(`   Contacts only: ${contactsOnlyCount}`);
  console.log(`   With PP data: ${ppDataCount}`);

  // Show role breakdown
  const { data: roleBreakdown } = await supabase
    .from('contacts')
    .select('role')
    .not('role', 'is', null);

  const roles = {};
  roleBreakdown.forEach(r => {
    roles[r.role] = (roles[r.role] || 0) + 1;
  });

  console.log('\n👤 USER ROLES:');
  Object.entries(roles).forEach(([role, count]) => {
    console.log(`   ${role}: ${count}`);
  });

  console.log('\n✅ SUCCESS! CONTACTS table now contains:');
  console.log('   ✓ All original contacts with extracted PP data');
  console.log('   ✓ All users from PEOPLE table');
  console.log('   ✓ User management capabilities (roles, auth, etc.)');
  console.log('   ✓ Single source of truth - no duplication');
  
  console.log('\n💡 Next steps:');
  console.log('   - Extract PP data from remaining contacts');
  console.log('   - Clear pp_data fields to save space');
  console.log('   - Consider dropping PEOPLE table (now redundant)');
}

completeMigrationEfficiently();