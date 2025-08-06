#!/usr/bin/env node

/**
 * Script to check current database state after migration
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDatabaseState() {
  console.log('🔍 Checking current database state...\n');

  try {
    // 1. Check if contact_link_id column exists
    console.log('1️⃣ Checking people table structure...');
    const { data: samplePerson, error: personError } = await supabase
      .from('people')
      .select('*')
      .limit(1);

    if (personError) {
      console.error('❌ Error querying people table:', personError);
    } else if (samplePerson && samplePerson.length > 0) {
      const columns = Object.keys(samplePerson[0]);
      console.log('✅ People table columns:', columns.length);
      console.log('   Has contact_link_id:', columns.includes('contact_link_id') ? '✅ YES' : '❌ NO');
      console.log('   Has is_user:', columns.includes('is_user') ? '✅ YES' : '❌ NO');
    }

    // 2. Check user and contact records
    console.log('\n2️⃣ Checking user and contact records...');
    const { data: userCount, count: uCount } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true })
      .eq('is_user', true);

    const { data: contactCount, count: cCount } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true })
      .eq('is_user', false);

    console.log(`   User records (is_user=true): ${uCount || 0}`);
    console.log(`   Contact records (is_user=false): ${cCount || 0}`);

    // 3. Check linked records
    console.log('\n3️⃣ Checking linked records...');
    const { data: linkedUsers, error: linkedError } = await supabase
      .from('people')
      .select('id, email, role, contact_link_id')
      .eq('is_user', true)
      .not('contact_link_id', 'is', null)
      .limit(5);

    if (linkedUsers && linkedUsers.length > 0) {
      console.log(`✅ Found ${linkedUsers.length} users with contact links:`);
      linkedUsers.forEach(u => {
        console.log(`   - ${u.email} (${u.role}) → Contact: ${u.contact_link_id}`);
      });
    } else {
      console.log('⚠️  No users with contact links found');
    }

    // 4. Check unlinked client users
    console.log('\n4️⃣ Checking unlinked client users...');
    const { data: unlinkedClients, count: unlinkedCount } = await supabase
      .from('people')
      .select('id, email, role', { count: 'exact' })
      .eq('is_user', true)
      .eq('role', 'client')
      .is('contact_link_id', null);

    if (unlinkedCount > 0) {
      console.log(`⚠️  Found ${unlinkedCount} client users without contact links`);
      if (unlinkedClients && unlinkedClients.length > 0) {
        unlinkedClients.slice(0, 3).forEach(u => {
          console.log(`   - ${u.email}`);
        });
      }
    } else {
      console.log('✅ All client users have contact links');
    }

    // 5. Check exchanges
    console.log('\n5️⃣ Checking exchanges...');
    const { data: exchanges, error: exError } = await supabase
      .from('exchanges')
      .select('id, name, client_id, coordinator_id')
      .limit(5);

    if (exchanges && exchanges.length > 0) {
      console.log(`✅ Found ${exchanges.length} sample exchanges`);
      
      // Check if client_ids reference contact records
      for (const ex of exchanges.slice(0, 2)) {
        const { data: client } = await supabase
          .from('people')
          .select('id, email, is_user')
          .eq('id', ex.client_id)
          .single();

        console.log(`   Exchange: ${ex.name || ex.id}`);
        console.log(`   - Client ID: ${ex.client_id} → ${client ? `${client.email} (is_user=${client.is_user})` : 'NOT FOUND'}`);
      }
    }

    // 6. Check if functions were created
    console.log('\n6️⃣ Checking functions...');
    try {
      // Test the get_user_exchanges function
      const { data: testUser } = await supabase
        .from('people')
        .select('id')
        .eq('is_user', true)
        .eq('role', 'client')
        .not('contact_link_id', 'is', null)
        .limit(1)
        .single();

      if (testUser) {
        const { data: userExchanges, error: funcError } = await supabase
          .rpc('get_user_exchanges', { p_user_id: testUser.id });

        if (funcError) {
          console.log('❌ get_user_exchanges function error:', funcError.message);
        } else {
          console.log(`✅ get_user_exchanges function works! Returns ${userExchanges?.length || 0} exchanges`);
        }
      }
    } catch (e) {
      console.log('⚠️  Could not test functions');
    }

    // 7. Summary
    console.log('\n📊 SUMMARY:');
    console.log('===========');
    if (samplePerson && samplePerson[0] && samplePerson[0].contact_link_id !== undefined) {
      console.log('✅ Migration appears to be applied (contact_link_id exists)');
      
      if (unlinkedCount > 0) {
        console.log('⚠️  But some client users still need linking');
        console.log('   Run: node backend/scripts/run-people-table-migration.js');
      } else {
        console.log('✅ All client users are properly linked');
      }
    } else {
      console.log('❌ Migration NOT applied yet (contact_link_id missing)');
      console.log('   Please run the migration SQL first');
    }

  } catch (error) {
    console.error('\n❌ Error checking database:', error);
  }
}

// Run the check
checkDatabaseState();