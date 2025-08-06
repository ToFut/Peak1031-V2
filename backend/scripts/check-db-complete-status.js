#!/usr/bin/env node

/**
 * Script to check what's missing in the database for full functionality
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDatabaseStatus() {
  console.log('🔍 Checking Database Status for Full Functionality...\n');

  const issues = [];
  const working = [];

  try {
    // 1. Check table structure
    console.log('1️⃣ CURRENT TABLE STRUCTURE:');
    console.log('============================');
    
    // Check if we have people table or separate users/contacts
    const { data: peopleCheck, error: peopleError } = await supabase
      .from('people')
      .select('*', { count: 'exact' })
      .limit(1);

    if (!peopleError) {
      console.log('✅ You have a PEOPLE table (combined users + contacts)');
      console.log(`   - Total records: ${await getPeopleCount()}`);
      console.log(`   - User records (is_user=true): ${await getUserCount()}`);
      console.log(`   - Contact records (is_user=false): ${await getContactCount()}`);
      working.push('People table exists with user/contact data');
    }

    // 2. Check relationships
    console.log('\n2️⃣ CHECKING RELATIONSHIPS:');
    console.log('==========================');
    
    // Check if users are linked to contacts
    const { data: linkedUsers, count: linkedCount } = await supabase
      .from('people')
      .select('*', { count: 'exact' })
      .eq('is_user', true)
      .not('contact_link_id', 'is', null);

    console.log(`✅ Linked users: ${linkedCount || 0} users have contact_link_id`);
    
    // Check unlinked client users
    const { data: unlinkedClients, count: unlinkedCount } = await supabase
      .from('people')
      .select('*', { count: 'exact' })
      .eq('is_user', true)
      .eq('role', 'client')
      .is('contact_link_id', null);

    if (unlinkedCount > 0) {
      console.log(`❌ Unlinked clients: ${unlinkedCount} client users without contact links`);
      issues.push(`${unlinkedCount} client users need contact linking`);
    } else {
      console.log('✅ All client users are linked to contacts');
      working.push('Client users properly linked to contacts');
    }

    // 3. Check exchanges
    console.log('\n3️⃣ CHECKING EXCHANGES:');
    console.log('======================');
    
    const { data: exchanges, count: exchangeCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact' })
      .limit(10);

    console.log(`Total exchanges: ${exchangeCount || 0}`);
    
    // Check exchanges without clients
    const { count: noClientCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact' })
      .is('client_id', null);

    if (noClientCount > 0) {
      console.log(`❌ Exchanges without clients: ${noClientCount}`);
      issues.push(`${noClientCount} exchanges have no client assigned`);
    }

    // 4. Check PracticePanther integration
    console.log('\n4️⃣ CHECKING PRACTICEPANTHER INTEGRATION:');
    console.log('=========================================');
    
    const { data: ppContacts, count: ppCount } = await supabase
      .from('people')
      .select('*', { count: 'exact' })
      .eq('is_user', false)
      .not('pp_contact_id', 'is', null);

    console.log(`✅ PracticePanther contacts: ${ppCount || 0} contacts synced`);
    working.push(`${ppCount || 0} contacts synced from PracticePanther`);

    const { data: ppExchanges, count: ppExCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact' })
      .not('pp_matter_id', 'is', null);

    console.log(`✅ PracticePanther matters: ${ppExCount || 0} exchanges synced`);
    working.push(`${ppExCount || 0} exchanges synced from PracticePanther`);

    // 5. Check what's needed vs what exists
    console.log('\n5️⃣ DATABASE DESIGN ANALYSIS:');
    console.log('=============================');
    console.log('\nCURRENT STATE:');
    console.log('- Using a unified PEOPLE table (not separate users/contacts)');
    console.log('- People table has is_user flag to distinguish users from contacts');
    console.log('- contact_link_id links user records to contact records');
    
    console.log('\nWHAT YOU WANT:');
    console.log('- Separate USERS table (authentication)');
    console.log('- Separate CONTACTS table (business data)');
    console.log('- Users.contact_id → Contacts.id relationship');

    // 6. Summary
    console.log('\n\n📊 SUMMARY - WHAT\'S MISSING:');
    console.log('================================');
    
    if (issues.length === 0) {
      console.log('✅ Database is functional with current people table structure!');
      console.log('\nHowever, if you want separate users/contacts tables:');
      console.log('1. Run migration: 020-split-people-to-users-contacts.sql');
      console.log('2. Update backend services to use users/contacts instead of people');
      console.log('3. Test thoroughly before dropping people table');
    } else {
      console.log('Issues to fix:');
      issues.forEach(issue => console.log(`  ❌ ${issue}`));
    }

    console.log('\n\n✅ WHAT\'S WORKING:');
    console.log('==================');
    working.forEach(item => console.log(`  ✅ ${item}`));

    // Test if clients can access exchanges
    console.log('\n\n🧪 TESTING CLIENT ACCESS:');
    console.log('========================');
    
    const { data: testClient } = await supabase
      .from('people')
      .select('*')
      .eq('is_user', true)
      .eq('role', 'client')
      .not('contact_link_id', 'is', null)
      .limit(1)
      .single();

    if (testClient) {
      console.log(`Testing with client: ${testClient.email}`);
      
      // Check direct exchanges
      const { count: directCount } = await supabase
        .from('exchanges')
        .select('*', { count: 'exact' })
        .eq('client_id', testClient.contact_link_id);

      console.log(`  - Direct exchanges (as client): ${directCount || 0}`);
      
      // Check participant exchanges
      const { count: partCount } = await supabase
        .from('exchange_participants')
        .select('*', { count: 'exact' })
        .eq('contact_id', testClient.contact_link_id);

      console.log(`  - Participant exchanges: ${partCount || 0}`);
      console.log(`  - Total accessible: ${(directCount || 0) + (partCount || 0)}`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

async function getPeopleCount() {
  const { count } = await supabase
    .from('people')
    .select('*', { count: 'exact', head: true });
  return count || 0;
}

async function getUserCount() {
  const { count } = await supabase
    .from('people')
    .select('*', { count: 'exact', head: true })
    .eq('is_user', true);
  return count || 0;
}

async function getContactCount() {
  const { count } = await supabase
    .from('people')
    .select('*', { count: 'exact', head: true })
    .eq('is_user', false);
  return count || 0;
}

checkDatabaseStatus();