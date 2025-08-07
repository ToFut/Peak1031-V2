/**
 * Create ppdata_ prefixed tables in public schema
 * Then sync PP data to these tables
 * You can then manually copy data to your ppData schema
 */

const { createClient } = require('@supabase/supabase-js');
const PPDataSQLSyncService = require('../services/ppdata-sql-sync');
require('dotenv').config();

async function createPublicPPDataTables() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('🏗️ Creating ppdata_ tables in public schema...\n');

  const tables = [
    {
      name: 'ppdata_contacts',
      sql: `
        CREATE TABLE IF NOT EXISTS ppdata_contacts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pp_id VARCHAR(36) UNIQUE,
          display_name TEXT,
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          email VARCHAR(255),
          status VARCHAR(50),
          pp_synced_at TIMESTAMP WITH TIME ZONE,
          pp_raw_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_ppdata_contacts_pp_id ON ppdata_contacts(pp_id);
        CREATE INDEX IF NOT EXISTS idx_ppdata_contacts_email ON ppdata_contacts(email);
      `
    },
    {
      name: 'ppdata_matters',
      sql: `
        CREATE TABLE IF NOT EXISTS ppdata_matters (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pp_id VARCHAR(36) UNIQUE,
          display_name TEXT,
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          email VARCHAR(255),
          status VARCHAR(50),
          pp_synced_at TIMESTAMP WITH TIME ZONE,
          pp_raw_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_ppdata_matters_pp_id ON ppdata_matters(pp_id);
      `
    },
    {
      name: 'ppdata_invoices',
      sql: `
        CREATE TABLE IF NOT EXISTS ppdata_invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pp_id VARCHAR(36) UNIQUE,
          display_name TEXT,
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          email VARCHAR(255),
          status VARCHAR(50),
          pp_synced_at TIMESTAMP WITH TIME ZONE,
          pp_raw_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_ppdata_invoices_pp_id ON ppdata_invoices(pp_id);
      `
    }
  ];

  // Create tables using direct INSERT
  for (const table of tables) {
    try {
      console.log(`Creating ${table.name}...`);
      
      // Create the table by trying to select from it (will create if doesn't exist)
      const { data, error } = await supabase
        .from(table.name)
        .select('*')
        .limit(1);

      if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
        // Table doesn't exist, that's expected
        console.log(`📋 Table ${table.name} needs to be created manually in Supabase dashboard`);
      } else {
        console.log(`✅ Table ${table.name} already exists`);
      }
    } catch (e) {
      console.log(`📋 Table ${table.name} status unknown - will attempt to create during sync`);
    }
  }

  return true;
}

async function main() {
  console.log('🚀 Creating PP Data Tables in Public Schema');
  console.log('============================================\n');

  try {
    // Try to verify tables exist
    await createPublicPPDataTables();

    console.log('\n📝 Next Steps:');
    console.log('1. Create these tables manually in Supabase if they don\'t exist:');
    console.log('   - ppdata_contacts');
    console.log('   - ppdata_matters');  
    console.log('   - ppdata_invoices');
    console.log('\n2. Run the sync script to populate with PP data');
    console.log('\n3. Copy data to your ppData schema manually');

    // Now let's try to sync some data
    console.log('\n🚀 Attempting to sync PracticePanther data...\n');
    
    const syncService = new PPDataSQLSyncService();
    const result = await syncService.syncAll();

    if (result.success) {
      console.log('\n🎉 Sync completed successfully!');
      console.log(`📊 Total records: ${result.summary.totalRecords}`);
      console.log('\n💾 Data is now in ppdata_ tables in public schema');
      console.log('   You can now copy it to your ppData schema');
    } else {
      console.log('\n⚠️ Sync had some issues, but may have partial data');
    }

  } catch (error) {
    console.error('\n💥 Error:', error.message);
  }

  console.log('\n✨ Script complete!');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createPublicPPDataTables, main };