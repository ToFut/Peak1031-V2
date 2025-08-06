require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkDatabaseSchema() {
  try {
    console.log('🔍 CHECKING DATABASE SCHEMA\n');
    
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    // Get all tables using direct SQL
    const { data: tables, error: tablesError } = await supabase
      .rpc('exec_sql', { 
        sql_query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `
      });
    
    if (tablesError) {
      console.log('❌ Error getting tables:', tablesError.message);
      // Try alternative approach
      console.log('\n🔄 Trying alternative approach...\n');
    } else {
      console.log('📋 TABLES FOUND:');
      tables.forEach(table => {
        console.log(`- ${table.table_name}`);
      });
    }
    
    // Check contacts table directly
    console.log('\n📊 CHECKING CONTACTS TABLE:');
    const { data: contactsSample, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .limit(1);
    
    if (contactsError) {
      console.log('❌ Contacts table error:', contactsError.message);
    } else {
      console.log('✅ Contacts table exists');
      if (contactsSample.length > 0) {
        console.log('Sample contact structure:');
        console.log(JSON.stringify(contactsSample[0], null, 2));
      } else {
        console.log('Contacts table is empty');
      }
    }
    
    // Check people table directly
    console.log('\n📊 CHECKING PEOPLE TABLE:');
    const { data: peopleSample, error: peopleError } = await supabase
      .from('people')
      .select('*')
      .limit(1);
    
    if (peopleError) {
      console.log('❌ People table error:', peopleError.message);
    } else {
      console.log('✅ People table exists');
      if (peopleSample.length > 0) {
        console.log('Sample people structure:');
        console.log(JSON.stringify(peopleSample[0], null, 2));
      } else {
        console.log('People table is empty');
      }
    }
    
    // Check exchanges table
    console.log('\n📊 CHECKING EXCHANGES TABLE:');
    const { data: exchangesSample, error: exchangesError } = await supabase
      .from('exchanges')
      .select('*')
      .limit(1);
    
    if (exchangesError) {
      console.log('❌ Exchanges table error:', exchangesError.message);
    } else {
      console.log('✅ Exchanges table exists');
      if (exchangesSample.length > 0) {
        console.log('Sample exchange structure:');
        console.log(JSON.stringify(exchangesSample[0], null, 2));
      } else {
        console.log('Exchanges table is empty');
      }
    }
    
    // Try to get table columns using a simple query
    console.log('\n🔍 CHECKING TABLE COLUMNS:');
    try {
      const { data: columns, error: columnsError } = await supabase
        .rpc('exec_sql', {
          sql_query: `
            SELECT 
              table_name,
              column_name,
              data_type,
              is_nullable,
              column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name IN ('contacts', 'people', 'exchanges')
            ORDER BY table_name, ordinal_position;
          `
        });
      
      if (columnsError) {
        console.log('❌ Error getting columns:', columnsError.message);
      } else {
        console.log('📋 TABLE COLUMNS:');
        let currentTable = '';
        columns.forEach(col => {
          if (col.table_name !== currentTable) {
            currentTable = col.table_name;
            console.log(`\n${currentTable.toUpperCase()}:`);
          }
          console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' (NOT NULL)' : ''}`);
        });
      }
    } catch (error) {
      console.log('❌ Error in column query:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabaseSchema(); 