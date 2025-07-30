const { createClient } = require('./backend/node_modules/@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDatabase() {
  console.log('🔍 Checking database tables and data...\n');

  try {
    // Check contacts table
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .limit(5);

    console.log('👥 CONTACTS TABLE:');
    console.log(`Records found: ${contacts?.length || 0}`);
    if (contacts && contacts.length > 0) {
      console.log('Sample data:', JSON.stringify(contacts[0], null, 2));
    }
    console.log('---\n');

    // Check exchanges table
    const { data: exchanges, error: exchangesError } = await supabase
      .from('exchanges')
      .select('*')
      .limit(5);

    console.log('🏢 EXCHANGES TABLE:');
    console.log(`Records found: ${exchanges?.length || 0}`);
    if (exchanges && exchanges.length > 0) {
      console.log('Sample data:', JSON.stringify(exchanges[0], null, 2));
    }
    console.log('---\n');

    // Check sync_logs table
    const { data: syncLogs, error: syncError } = await supabase
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('📊 SYNC_LOGS TABLE:');
    console.log(`Records found: ${syncLogs?.length || 0}`);
    if (syncLogs && syncLogs.length > 0) {
      console.log('Recent sync:', JSON.stringify(syncLogs[0], null, 2));
    }
    console.log('---\n');

    // Check replacement_properties table (if exists)
    const { data: replacementProps, error: propsError } = await supabase
      .from('replacement_properties')
      .select('*')
      .limit(5);

    console.log('🏠 REPLACEMENT_PROPERTIES TABLE:');
    console.log(`Records found: ${replacementProps?.length || 0}`);
    if (replacementProps && replacementProps.length > 0) {
      console.log('Sample data:', JSON.stringify(replacementProps[0], null, 2));
    }
    console.log('---\n');

    // Check contact_exchange_links table (if exists)
    const { data: contactLinks, error: linksError } = await supabase
      .from('contact_exchange_links')
      .select('*')
      .limit(5);

    console.log('🔗 CONTACT_EXCHANGE_LINKS TABLE:');
    console.log(`Records found: ${contactLinks?.length || 0}`);
    if (contactLinks && contactLinks.length > 0) {
      console.log('Sample data:', JSON.stringify(contactLinks[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

checkDatabase();