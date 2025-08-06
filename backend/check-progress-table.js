#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAndCreateTable() {
  try {
    console.log('🔍 Checking if practice_partner_syncs table exists...');
    
    // Try to select from the table
    const { data, error } = await supabase
      .from('practice_partner_syncs')
      .select('sync_id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('❌ Table does not exist. Creating...');
      
      // Create the table using raw SQL
      const createTableSQL = `
        CREATE TABLE practice_partner_syncs (
          sync_id VARCHAR(255) PRIMARY KEY,
          sync_type VARCHAR(100) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
          end_time TIMESTAMP WITH TIME ZONE,
          records_processed INTEGER DEFAULT 0,
          records_created INTEGER DEFAULT 0,
          records_updated INTEGER DEFAULT 0,
          records_failed INTEGER DEFAULT 0,
          statistics JSONB DEFAULT '{}',
          errors JSONB DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );

        -- Enable RLS
        ALTER TABLE practice_partner_syncs ENABLE ROW LEVEL SECURITY;

        -- Create policy to allow all operations for authenticated users
        CREATE POLICY "Allow all operations for authenticated users" ON practice_partner_syncs
          FOR ALL USING (true);
      `;
      
      const { error: createError } = await supabase.rpc('exec', {
        sql: createTableSQL
      });
      
      if (createError) {
        console.log('❌ Error creating table:', createError.message);
        return false;
      }
      
      console.log('✅ Table created successfully!');
    } else if (error) {
      console.log('❌ Error checking table:', error.message);
      return false;
    } else {
      console.log('✅ Table already exists');
    }
    
    // Check for current progress
    const { data: progressData, error: progressError } = await supabase
      .from('practice_partner_syncs')
      .select('*')
      .eq('sync_id', 'continuous_contacts_import')
      .single();
    
    if (progressError && progressError.code !== 'PGRST116') {
      console.log('❌ Error fetching progress:', progressError.message);
    } else if (progressError && progressError.code === 'PGRST116') {
      console.log('ℹ️  No import progress found yet');
    } else {
      console.log('✅ Found progress data!');
      console.log('Status:', progressData.status);
      console.log('Processed:', progressData.records_processed);
      console.log('Created:', progressData.records_created);
      console.log('Failed:', progressData.records_failed);
      if (progressData.statistics) {
        console.log('Progress:', progressData.statistics.progress_percentage || 0, '%');
      }
    }
    
    return true;
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
    return false;
  }
}

checkAndCreateTable();