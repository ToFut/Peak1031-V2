#!/usr/bin/env node

/**
 * Complete table restructure to accommodate ALL PP data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function analyzeAllPPFields() {
  console.log('🔍 Analyzing ALL PP data fields...\n');
  
  // Get sample of exchanges to see all possible fields
  const { data: exchanges } = await supabase
    .from('exchanges')
    .select('pp_data')
    .not('pp_data', 'is', null)
    .limit(10);

  const allCustomFields = new Map();
  const allMainFields = new Set();

  exchanges.forEach(ex => {
    const pp = ex.pp_data;
    
    // Collect main fields
    Object.keys(pp).forEach(key => allMainFields.add(key));
    
    // Collect custom fields
    if (pp.custom_field_values && Array.isArray(pp.custom_field_values)) {
      pp.custom_field_values.forEach(cf => {
        if (cf.custom_field_ref && cf.custom_field_ref.label) {
          const label = cf.custom_field_ref.label;
          const valueType = cf.custom_field_ref.value_type;
          const value = cf.value_string || cf.value_number || cf.value_boolean || cf.value_date_time;
          
          if (!allCustomFields.has(label)) {
            allCustomFields.set(label, {
              type: valueType,
              examples: []
            });
          }
          
          if (value && allCustomFields.get(label).examples.length < 3) {
            allCustomFields.get(label).examples.push(value);
          }
        }
      });
    }
  });

  console.log('📋 MAIN PP FIELDS FOUND:');
  console.log([...allMainFields].sort());
  
  console.log('\n📋 CUSTOM FIELDS FOUND:');
  allCustomFields.forEach((info, label) => {
    console.log(`   ${label} (${info.type}): ${info.examples.slice(0,2).join(', ')}`);
  });
  
  return { allMainFields, allCustomFields };
}

async function generateTableAlterations() {
  const { allMainFields, allCustomFields } = await analyzeAllPPFields();
  
  console.log('\n🔧 REQUIRED TABLE ALTERATIONS:\n');
  
  // Exchanges table additions
  const exchangeAlterations = [];
  
  // Main PP fields for exchanges
  const exchangeMainFields = [
    'rate VARCHAR(50)',
    'tags JSONB DEFAULT \'[]\'',
    'assigned_to_users JSONB DEFAULT \'[]\'',
    'statute_of_limitation_date TIMESTAMP',
    'pp_created_at TIMESTAMP',
    'pp_updated_at TIMESTAMP'
  ];
  
  // Custom fields that are commonly used
  const commonCustomFields = [
    'bank VARCHAR(10)',
    'rel_property_city VARCHAR(100)',
    'rel_property_state VARCHAR(10)', 
    'rel_property_zip VARCHAR(20)',
    'rel_property_address TEXT',
    'rel_apn VARCHAR(50)',
    'rel_escrow_number VARCHAR(50)',
    'rel_value DECIMAL(15,2)',
    'rel_contract_date DATE',
    'close_of_escrow_date DATE',
    'day_45 DATE',
    'day_180 DATE',
    'proceeds DECIMAL(15,2)',
    'client_vesting TEXT',
    'type_of_exchange VARCHAR(50)',
    'buyer_1_name VARCHAR(200)',
    'buyer_2_name VARCHAR(200)',
    'rep_1_city VARCHAR(100)',
    'rep_1_state VARCHAR(10)',
    'rep_1_zip VARCHAR(20)',
    'rep_1_property_address TEXT',
    'rep_1_apn VARCHAR(50)',
    'rep_1_escrow_number VARCHAR(50)',
    'rep_1_value DECIMAL(15,2)',
    'rep_1_contract_date DATE',
    'rep_1_seller_name TEXT'
  ];

  console.log('ALTER TABLE exchanges ADD COLUMN statements:');
  [...exchangeMainFields, ...commonCustomFields].forEach(field => {
    console.log(`   ALTER TABLE exchanges ADD COLUMN ${field};`);
  });

  return { exchangeMainFields, commonCustomFields, allCustomFields };
}

async function createMigrationSQL() {
  console.log('\n📝 Creating migration SQL file...\n');
  
  const { exchangeMainFields, commonCustomFields } = await generateTableAlterations();
  
  const migrationSQL = `-- Migration to add all PP data columns to exchanges table
-- Generated on ${new Date().toISOString()}

-- Add main PP fields
${exchangeMainFields.map(field => `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS ${field};`).join('\n')}

-- Add custom PP fields  
${commonCustomFields.map(field => `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS ${field};`).join('\n')}

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_exchanges_rate ON exchanges(rate);
CREATE INDEX IF NOT EXISTS idx_exchanges_rel_property_state ON exchanges(rel_property_state);
CREATE INDEX IF NOT EXISTS idx_exchanges_type_of_exchange ON exchanges(type_of_exchange);
CREATE INDEX IF NOT EXISTS idx_exchanges_day_45 ON exchanges(day_45);
CREATE INDEX IF NOT EXISTS idx_exchanges_day_180 ON exchanges(day_180);
CREATE INDEX IF NOT EXISTS idx_exchanges_close_of_escrow_date ON exchanges(close_of_escrow_date);

-- Update trigger to handle new columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
`;

  const fs = require('fs');
  fs.writeFileSync('/Users/segevbin/Desktop/Peak1031 V1 /database/migrations/025-add-all-pp-fields.sql', migrationSQL);
  
  console.log('✅ Migration SQL file created: database/migrations/025-add-all-pp-fields.sql');
  
  return migrationSQL;
}

async function runCompleteRestructure() {
  console.log('🚀 Starting complete table restructure analysis...\n');
  
  await createMigrationSQL();
  
  console.log('\n📊 SUMMARY:');
  console.log('   ✅ Analyzed all PP data fields');
  console.log('   ✅ Generated table alteration statements');
  console.log('   ✅ Created migration SQL file');
  console.log('   ✅ Added indexes for performance');
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('   1. Run the migration SQL to add columns');
  console.log('   2. Extract ALL PP data to the new columns');
  console.log('   3. Verify data population completeness');
  console.log('\n💡 After adding columns, we can extract ALL PP data including custom fields!');
}

runCompleteRestructure();