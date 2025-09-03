#!/usr/bin/env node

/**
 * Add assigned_exchanges column to people table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY
);

async function addColumn() {
  console.log('Checking people table structure...');
  
  // First, test if we can query the table
  const { data: testQuery, error: testError } = await supabase
    .from('people')
    .select('id')
    .limit(1);
    
  if (testError) {
    console.error('Error accessing people table:', testError);
    return;
  }
  
  console.log('✅ People table is accessible');
  
  // Try to select the column to see if it exists
  const { data: checkColumn, error: checkError } = await supabase
    .from('people')
    .select('id, assigned_exchanges')
    .limit(1);
    
  if (!checkError) {
    console.log('✅ assigned_exchanges column already exists');
    return;
  }
  
  if (checkError.message.includes('assigned_exchanges')) {
    console.log('Column does not exist. Manual addition required.');
    console.log('\n📝 Please run this SQL in your Supabase SQL Editor:');
    console.log('----------------------------------------');
    console.log('ALTER TABLE people ADD COLUMN IF NOT EXISTS assigned_exchanges UUID[] DEFAULT \'{}\';');
    console.log('----------------------------------------');
    console.log('\nThen re-run the entity extraction script.');
  } else {
    console.error('Unexpected error:', checkError);
  }
}

addColumn().then(() => {
  console.log('\n✅ Done');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});