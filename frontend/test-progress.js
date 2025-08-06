// Test the progress component connection to Supabase
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fozdhmlcjnjkwilmiiem.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvemRobWxjam5qa3dpbG1paWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzOTY3MzUsImV4cCI6MjA2OTk3MjczNX0.weNOabt19invzL5-WOcnGInClruQOUPEo1T20W-PISA'
);

async function testProgressFetch() {
  try {
    console.log('🧪 Testing progress component data fetch...');
    
    const { data, error } = await supabase
      .from('practice_partner_syncs')
      .select('*')
      .eq('sync_id', 'continuous_contacts_import')
      .single();

    if (error) {
      console.log('❌ Error:', error.message);
      console.log('Error code:', error.code);
      console.log('Error details:', error.details);
      return;
    }

    console.log('✅ Successfully fetched progress data!');
    console.log('📊 Progress Data:');
    console.log('  Status:', data.status);
    console.log('  Records processed:', data.records_processed);
    console.log('  Records created:', data.records_created);
    console.log('  Records failed:', data.records_failed);
    
    if (data.statistics) {
      console.log('  Total records:', data.statistics.total_records);
      console.log('  Progress %:', data.statistics.progress_percentage);
      console.log('  Current page:', data.statistics.current_page);
    }
    
    console.log('🎯 Component should display:');
    console.log(`  Progress bar: ${data.records_processed} / ${data.statistics?.total_records || 'unknown'}`);
    console.log(`  Percentage: ${data.statistics?.progress_percentage || 0}%`);
    console.log(`  Status: ${data.status}`);
    
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }
}

testProgressFetch();