require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingColumnsDirect() {
  console.log('🔧 ADDING MISSING DATABASE COLUMNS FOR COMPLETE PP DISPLAY...\\n');
  
  const exchangeId = 'e00bfb0f-df96-438e-98f0-87ef91b708a7';
  
  try {
    // List of missing columns we need to add
    const missingColumns = [
      { name: 'pp_matter_guid', type: 'text', description: 'PracticePanther matter GUID' },
      { name: 'property_type', type: 'text', description: 'Property type (Residential, Commercial)' },
      { name: 'rel_purchase_contract_title', type: 'text', description: 'Purchase contract title' },
      { name: 'client_1_signatory_title', type: 'text', description: 'Client signatory title (Trustee)' },
      { name: 'referral_source', type: 'text', description: 'Referral source name' },
      { name: 'referral_source_email', type: 'text', description: 'Referral source email' },
      { name: 'settlement_agent', type: 'text', description: 'Settlement agent name' },
      { name: 'rep_1_settlement_agent', type: 'text', description: 'Replacement property settlement agent' },
      { name: 'internal_credit_to', type: 'text', description: 'Internal credit assignment' },
      { name: 'pp_account_name', type: 'text', description: 'PP account name' },
      { name: 'pp_account_id', type: 'text', description: 'PP account ID' }
    ];

    console.log(`📋 Adding ${missingColumns.length} missing columns...\\n`);

    // Try to add columns one by one using SQL
    for (const column of missingColumns) {
      console.log(`🔧 Adding ${column.name}...`);
      
      try {
        // Use raw SQL to add column
        const { error } = await supabase
          .rpc('execute_sql', { 
            sql: `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};`
          });
        
        if (error) {
          // Try alternative method
          console.log(`   ⚠️  Standard method failed: ${error.message}`);
          console.log(`   📝 Manual SQL needed: ALTER TABLE exchanges ADD COLUMN ${column.name} ${column.type};`);
        } else {
          console.log(`   ✅ Added ${column.name}`);
        }
      } catch (sqlError) {
        console.log(`   ❌ SQL execution failed: ${sqlError.message}`);
        console.log(`   📝 Manual SQL: ALTER TABLE exchanges ADD COLUMN ${column.name} ${column.type};`);
      }
    }

    // Since direct SQL may not work, let's check current columns and create a workaround
    console.log('\\n🔍 Checking current table structure...');
    
    const { data: sampleData } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();
    
    const currentColumns = Object.keys(sampleData);
    console.log(`📊 Current table has ${currentColumns.length} columns`);

    // Check which target columns exist
    console.log('\\n📋 Column status check:');
    const existingTargetColumns = [];
    const stillMissingColumns = [];
    
    missingColumns.forEach(({ name }) => {
      if (currentColumns.includes(name)) {
        existingTargetColumns.push(name);
        console.log(`✅ ${name} - EXISTS`);
      } else {
        stillMissingColumns.push(name);
        console.log(`❌ ${name} - STILL MISSING`);
      }
    });

    if (stillMissingColumns.length > 0) {
      console.log('\\n⚠️  MANUAL COLUMN ADDITION REQUIRED:');
      console.log('Execute these in Supabase SQL Editor:');
      console.log('');
      stillMissingColumns.forEach(colName => {
        const col = missingColumns.find(c => c.name === colName);
        console.log(`ALTER TABLE exchanges ADD COLUMN ${col.name} ${col.type}; -- ${col.description}`);
      });
      
      console.log('\\n🔄 After adding columns manually, we can populate them with PP data.');
    }

    if (existingTargetColumns.length > 0) {
      console.log(`\\n✅ Found ${existingTargetColumns.length} existing columns that can be populated now`);
    }

    // Create SQL script file for manual execution
    const sqlScript = `-- Add missing PracticePanther columns
-- Execute in Supabase SQL Editor

${missingColumns.map(col => 
  `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}; -- ${col.description}`
).join('\\n')}

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_exchanges_pp_matter_guid ON exchanges(pp_matter_guid);
CREATE INDEX IF NOT EXISTS idx_exchanges_referral_source ON exchanges(referral_source);
CREATE INDEX IF NOT EXISTS idx_exchanges_property_type ON exchanges(property_type);
`;

    console.log('\\n📄 SQL SCRIPT FOR MANUAL EXECUTION:');
    console.log('=====================================');
    console.log(sqlScript);
    
    console.log('\\n🎯 NEXT STEPS:');
    console.log('1. Copy the SQL above and execute in Supabase Dashboard > SQL Editor');
    console.log('2. Run the mapping script to populate the new columns');
    console.log('3. Update ExchangeOverview component to display new fields');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addMissingColumnsDirect();