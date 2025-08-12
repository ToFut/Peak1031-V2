/**
 * Check what columns exist in the exchanges table
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const checkSchema = async () => {
  try {
    console.log('🔍 Checking exchanges table schema...');
    
    // Get one exchange to see available columns
    const { data: sample, error } = await supabase
      .from('exchanges')
      .select('*')
      .limit(1)
      .single();
      
    if (error) {
      console.error('Error fetching sample exchange:', error);
      return;
    }
    
    console.log('📊 Available columns:');
    Object.keys(sample).forEach(column => {
      console.log(`- ${column}: ${typeof sample[column]} (${sample[column] === null ? 'null' : sample[column]})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

checkSchema();