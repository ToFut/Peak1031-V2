#!/usr/bin/env node

/**
 * Script to check the new database structure after SQL implementation
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkNewStructure() {
  console.log('🔍 Checking new database structure...\n');

  try {
    // Check if we now have separate users and contacts tables
    console.log('1️⃣ CHECKING TABLES:');
    console.log('==================');
    
    // Check users table
    const { data: usersData, error: usersError, count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .limit(1);

    if (!usersError) {
      console.log(`✅ USERS table exists with ${usersCount || 0} records`);
      if (usersData && usersData.length > 0) {
        console.log('   Columns:', Object.keys(usersData[0]).slice(0, 10).join(', ') + '...');
      }
    } else {
      console.log('❌ USERS table error:', usersError.message);
    }

    // Check contacts table
    const { data: contactsData, error: contactsError, count: contactsCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .limit(1);

    if (!contactsError) {
      console.log(`✅ CONTACTS table exists with ${contactsCount || 0} records`);
      if (contactsData && contactsData.length > 0) {
        console.log('   Columns:', Object.keys(contactsData[0]).slice(0, 10).join(', ') + '...');
      }
    } else {
      console.log('❌ CONTACTS table error:', contactsError.message);
    }

    // Check if people table still exists
    const { error: peopleError } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true });

    if (!peopleError) {
      console.log('⚠️  PEOPLE table still exists (should be removed if using separate tables)');
    } else {
      console.log('✅ PEOPLE table removed (good - using separate users/contacts)');
    }

    // Check organizations table (new feature)
    const { count: orgCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    if (orgCount !== undefined) {
      console.log(`✅ ORGANIZATIONS table exists with ${orgCount} records`);
    }

    // Check agencies table (new feature)
    const { count: agencyCount } = await supabase
      .from('agencies')
      .select('*', { count: 'exact', head: true });

    if (agencyCount !== undefined) {
      console.log(`✅ AGENCIES table exists with ${agencyCount} records`);
    }

    // 2. Check relationships
    console.log('\n2️⃣ CHECKING RELATIONSHIPS:');
    console.log('===========================');

    // Check if users have contact_id
    const { data: userSample } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single();

    if (userSample) {
      console.log('User table has columns:', Object.keys(userSample));
      if ('contact_id' in userSample) {
        console.log('✅ Users have contact_id field');
      } else {
        console.log('❌ Users missing contact_id field');
      }
    }

    // 3. Check exchanges
    console.log('\n3️⃣ CHECKING EXCHANGES:');
    console.log('======================');

    const { data: exchanges, count: exchangeCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact' })
      .not('client_contact_id', 'is', null)
      .limit(5);

    console.log(`Total exchanges: ${exchangeCount || 0}`);
    
    if (exchanges && exchanges.length > 0) {
      console.log('Exchange columns:', Object.keys(exchanges[0]).filter(k => k.includes('client') || k.includes('contact')));
    }

    // Check exchanges with clients
    const { count: withClientCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true })
      .not('client_contact_id', 'is', null);

    console.log(`Exchanges with clients: ${withClientCount || 0}`);

    // 4. Test client access
    console.log('\n4️⃣ TESTING CLIENT ACCESS:');
    console.log('=========================');

    // Get a test client user
    const { data: testClient } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'client')
      .limit(1)
      .single();

    if (testClient) {
      console.log(`Test client: ${testClient.email}`);
      
      // Check if they have a contact
      if (testClient.contact_id) {
        console.log(`  ✅ Has contact_id: ${testClient.contact_id}`);
        
        // Check exchanges
        const { count: clientExchanges } = await supabase
          .from('exchanges')
          .select('*', { count: 'exact', head: true })
          .eq('client_contact_id', testClient.contact_id);

        console.log(`  📊 Has ${clientExchanges || 0} exchanges`);
      } else {
        console.log('  ❌ No contact_id linked');
      }
    }

    console.log('\n✅ Database check complete!');

  } catch (error) {
    console.error('Error:', error);
  }
}

checkNewStructure();