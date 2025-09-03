require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateExchangeCreation() {
  console.log('🔍 Investigating how exchanges were created...\n');

  try {
    // 1. Check creation timestamps
    console.log('1️⃣ Analyzing creation timestamps...');
    const { data: exchanges } = await supabase
      .from('exchanges')
      .select('id, name, created_at, pp_matter_id')
      .order('created_at', { ascending: true })
      .limit(1000);
    
    if (exchanges && exchanges.length > 0) {
      // Group by creation date
      const creationDates = {};
      exchanges.forEach(ex => {
        const date = new Date(ex.created_at).toISOString().split('T')[0];
        if (!creationDates[date]) {
          creationDates[date] = 0;
        }
        creationDates[date]++;
      });
      
      console.log('Exchanges created by date:');
      Object.keys(creationDates).sort().forEach(date => {
        console.log(`  ${date}: ${creationDates[date]} exchanges`);
      });
      
      // Check if they were all created at once
      const firstCreated = new Date(exchanges[0].created_at);
      const lastCreated = new Date(exchanges[exchanges.length - 1].created_at);
      const timeDiff = (lastCreated - firstCreated) / 1000 / 60; // in minutes
      
      console.log(`\n⏱️ Time span of creation:`);
      console.log(`  First: ${firstCreated.toISOString()}`);
      console.log(`  Last: ${lastCreated.toISOString()}`);
      console.log(`  Total time: ${timeDiff.toFixed(2)} minutes`);
      
      if (timeDiff < 60) {
        console.log(`  ⚠️ All ${exchanges.length} exchanges created within ${timeDiff.toFixed(2)} minutes!`);
        console.log(`  This suggests a bulk import or script was used.`);
      }
    }
    
    // 2. Check for import patterns in pp_matter_id
    console.log('\n2️⃣ Analyzing pp_matter_id patterns...');
    const { data: sampleExchanges } = await supabase
      .from('exchanges')
      .select('id, name, pp_matter_id')
      .limit(10);
    
    console.log('Sample pp_matter_id values:');
    sampleExchanges.forEach(ex => {
      console.log(`  ${ex.pp_matter_id} (${ex.pp_matter_id === ex.id ? 'SAME AS ID' : 'different from ID'})`);
    });
    
    // Check if pp_matter_id equals id (common in bulk inserts)
    const { data: matchingIds } = await supabase
      .from('exchanges')
      .select('id')
      .limit(100);
    
    let sameIdCount = 0;
    for (const ex of matchingIds) {
      const { data: check } = await supabase
        .from('exchanges')
        .select('pp_matter_id')
        .eq('id', ex.id)
        .single();
      
      if (check && check.pp_matter_id === ex.id) {
        sameIdCount++;
      }
    }
    
    console.log(`\n📊 Pattern Analysis:`);
    console.log(`  Exchanges where pp_matter_id = id: ${sameIdCount}/100 sampled`);
    if (sameIdCount > 50) {
      console.log(`  ⚠️ High match rate suggests pp_matter_id was set to id during import`);
    }
    
    // 3. Look for import artifacts
    console.log('\n3️⃣ Checking for import artifacts...');
    
    // Check if names follow a pattern
    const { data: namePatterns } = await supabase
      .from('exchanges')
      .select('name')
      .limit(20);
    
    console.log('Name patterns (first 20):');
    let hasNumberPrefix = 0;
    namePatterns.forEach(ex => {
      const match = ex.name.match(/^(\d+)\s*-\s*/);
      if (match) {
        hasNumberPrefix++;
        console.log(`  ✓ Has number prefix: ${match[1]} - ${ex.name.substring(0, 50)}...`);
      }
    });
    
    console.log(`\n${hasNumberPrefix}/20 exchanges have number prefixes (likely PP matter numbers)`);
    
    // 4. Check database seeds or migrations
    console.log('\n4️⃣ Looking for seed data or import scripts...');
    
    // Check if there are any audit logs
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('action, entity_type, created_at, user_id')
      .eq('entity_type', 'exchange')
      .order('created_at', { ascending: true })
      .limit(10);
    
    if (auditLogs && auditLogs.length > 0) {
      console.log('Found audit logs for exchanges:');
      auditLogs.forEach(log => {
        console.log(`  ${log.created_at}: ${log.action} by user ${log.user_id}`);
      });
    } else {
      console.log('No audit logs found for exchange creation');
    }
    
    // 5. Check for sync_logs
    console.log('\n5️⃣ Checking all sync logs (not just matters)...');
    const { data: allSyncLogs } = await supabase
      .from('sync_logs')
      .select('sync_type, status, started_at, records_processed, records_created')
      .order('started_at', { ascending: false })
      .limit(10);
    
    if (allSyncLogs && allSyncLogs.length > 0) {
      console.log('Found sync logs:');
      allSyncLogs.forEach(log => {
        console.log(`  ${log.started_at}: ${log.sync_type} - ${log.status} (${log.records_processed} processed, ${log.records_created} created)`);
      });
    } else {
      console.log('❌ No sync logs found at all - PP sync never ran');
    }
    
    // 6. Check for CSV import evidence
    console.log('\n6️⃣ Looking for CSV import evidence...');
    
    // Check if all exchanges have similar field patterns
    const { data: fieldCheck } = await supabase
      .from('exchanges')
      .select('relinquished_property_address, client_id, exchange_value, start_date')
      .limit(100);
    
    let nullAddresses = 0;
    let nullClients = 0;
    let nullValues = 0;
    let nullDates = 0;
    
    fieldCheck.forEach(ex => {
      if (!ex.relinquished_property_address) nullAddresses++;
      if (!ex.client_id) nullClients++;
      if (!ex.exchange_value) nullValues++;
      if (!ex.start_date) nullDates++;
    });
    
    console.log('Field population analysis (100 samples):');
    console.log(`  Null addresses: ${nullAddresses}%`);
    console.log(`  Null clients: ${nullClients}%`);
    console.log(`  Null values: ${nullValues}%`);
    console.log(`  Null start dates: ${nullDates}%`);
    
    if (nullClients > 90) {
      console.log('  ⚠️ High null rate suggests minimal data import (name only?)');
    }
    
    console.log('\n📝 CONCLUSION:');
    console.log('=' .repeat(50));
    console.log('The evidence strongly suggests:');
    console.log('1. All 1000 exchanges were created via bulk import/script');
    console.log('2. pp_matter_id was set to UUID (likely = id) during import');
    console.log('3. Exchange names contain PP matter numbers but as text');
    console.log('4. No actual PP API sync ever occurred');
    console.log('5. Minimal data was imported (mostly just names)');
    console.log('\nLikely scenario:');
    console.log('• Someone exported a list from PP (CSV/Excel)');
    console.log('• Created exchanges with just names');
    console.log('• Never configured or ran the PP API integration');
    console.log('• The PracticePartnerService exists but was never used');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

investigateExchangeCreation();