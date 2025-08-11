#!/usr/bin/env node

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

async function addMissingColumns() {
  console.log('🔧 Adding Missing Columns to Exchanges Table');
  console.log('=============================================');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // SQL statements to add missing columns
  const alterStatements = [
    // Timeline columns for 1031 exchanges
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS sale_date DATE;`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS identification_deadline DATE;`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS exchange_deadline DATE;`,
    
    // Financial columns
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS relinquished_property_value DECIMAL(15,2);`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS replacement_property_value DECIMAL(15,2);`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS cash_boot DECIMAL(12,2) DEFAULT 0;`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS financing_amount DECIMAL(15,2);`,
    
    // Status columns
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS substatus VARCHAR(100);`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'medium';`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0;`,
    
    // Chat system
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS exchange_chat_id UUID DEFAULT gen_random_uuid();`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN DEFAULT true;`,
    
    // Properties
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS relinquished_properties JSONB DEFAULT '[]';`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS replacement_properties JSONB DEFAULT '[]';`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS property_types TEXT[] DEFAULT '{}';`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS property_locations JSONB DEFAULT '{}';`,
    
    // Compliance
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS compliance_checklist JSONB DEFAULT '{}';`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS regulatory_requirements JSONB DEFAULT '{}';`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(50) DEFAULT 'pending';`,
    
    // Analytics
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS estimated_fees DECIMAL(12,2);`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS actual_fees DECIMAL(12,2);`,
    
    // More PP fields
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_account_ref_id VARCHAR(36);`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_account_ref_display_name TEXT;`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_number INTEGER;`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_display_name TEXT;`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_name TEXT;`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_notes TEXT;`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_rate VARCHAR(50);`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_open_date TIMESTAMP WITH TIME ZONE;`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_close_date TIMESTAMP WITH TIME ZONE;`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_statute_of_limitation_date DATE;`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_tags TEXT[] DEFAULT '{}';`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_status VARCHAR(50);`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_assigned_to_users JSONB DEFAULT '[]';`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_practice_area VARCHAR(100);`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_matter_type VARCHAR(100);`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_billing_info JSONB DEFAULT '{}';`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_custom_field_values JSONB DEFAULT '[]';`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_created_at TIMESTAMP WITH TIME ZONE;`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_updated_at TIMESTAMP WITH TIME ZONE;`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_synced_at TIMESTAMP WITH TIME ZONE;`,
    `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_raw_data JSONB DEFAULT '{}';`
  ];

  let successCount = 0;
  let skipCount = 0;

  console.log(`📝 Executing ${alterStatements.length} ALTER TABLE statements...`);

  for (let i = 0; i < alterStatements.length; i++) {
    const statement = alterStatements[i];
    
    try {
      console.log(`[${i + 1}/${alterStatements.length}] Adding column...`);
      
      // Execute using raw SQL
      const { error } = await supabase.rpc('sql', { 
        query: statement 
      });

      if (error) {
        // Try alternative approach
        try {
          const { error: altError } = await supabase.rpc('exec', { 
            sql: statement 
          });
          
          if (altError) {
            throw altError;
          }
          
          successCount++;
        } catch (altErr) {
          if (altErr.message.includes('already exists') || altErr.message.includes('duplicate')) {
            console.log(`⚠️  Column already exists (skipping)`);
            skipCount++;
          } else {
            console.log(`❌ Error: ${altErr.message}`);
          }
        }
      } else {
        successCount++;
      }

    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log(`⚠️  Column already exists (skipping)`);
        skipCount++;
      } else if (err.message.includes('function') && err.message.includes('does not exist')) {
        console.log('⚠️  Direct SQL execution not available. Using Supabase Dashboard approach...');
        
        console.log('\n📋 MANUAL COLUMN ADDITION REQUIRED');
        console.log('==================================');
        console.log('Please run this SQL in your Supabase SQL Editor:');
        console.log('https://app.supabase.com/project/fozdhmlcjnjkwilmiiem/sql/new');
        console.log('\nSQL to execute:');
        console.log(alterStatements.join('\n'));
        console.log('\n==================================');
        return;
      } else {
        console.log(`❌ Error: ${err.message}`);
      }
    }
  }

  console.log('\n📊 Column Addition Summary:');
  console.log(`✅ Successfully added: ${successCount}`);
  console.log(`⚠️  Skipped (already exist): ${skipCount}`);
  console.log(`❌ Failed: ${alterStatements.length - successCount - skipCount}`);

  // Test the columns that were causing issues
  console.log('\n🧪 Testing previously missing columns...');
  
  const testColumns = [
    'identification_deadline', 'exchange_deadline', 'sale_date', 'exchange_chat_id'
  ];
  
  for (const col of testColumns) {
    try {
      const { data, error } = await supabase
        .from('exchanges')
        .select(col)
        .limit(1);
      
      if (error) {
        console.log(`❌ ${col}: Still missing - ${error.message}`);
      } else {
        console.log(`✅ ${col}: Now available`);
      }
    } catch (err) {
      console.log(`❌ ${col}: Error - ${err.message}`);
    }
  }

  console.log('\n🎉 Column addition process completed!');
}

addMissingColumns();