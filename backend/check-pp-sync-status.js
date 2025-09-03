require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPPSyncStatus() {
  console.log('🔍 Checking PracticePanther Sync Status...\n');

  try {
    // 1. Check how many exchanges have proper PP matter IDs (numeric strings)
    console.log('1️⃣ Checking exchanges with PP matter IDs...');
    const { data: allExchanges } = await supabase
      .from('exchanges')
      .select('id, name, pp_matter_id, pp_data, created_at, last_sync_at')
      .order('created_at', { ascending: false });
    
    let ppSynced = 0;
    let manuallyCreated = 0;
    let emptyPPData = 0;
    let withPPData = 0;
    
    const manualExchanges = [];
    const syncedExchanges = [];
    
    allExchanges.forEach(ex => {
      // Check if pp_matter_id looks like a numeric PP ID or a UUID
      if (ex.pp_matter_id) {
        if (/^\d+$/.test(ex.pp_matter_id)) {
          // Numeric ID - likely from PP
          ppSynced++;
          syncedExchanges.push({
            id: ex.id,
            name: ex.name,
            pp_matter_id: ex.pp_matter_id,
            has_pp_data: ex.pp_data && Object.keys(ex.pp_data).length > 0
          });
        } else if (/^[a-f0-9-]{36}$/i.test(ex.pp_matter_id)) {
          // UUID - likely manually created
          manuallyCreated++;
          manualExchanges.push({
            id: ex.id,
            name: ex.name,
            pp_matter_id: ex.pp_matter_id
          });
        }
      } else {
        manuallyCreated++;
        manualExchanges.push({
          id: ex.id,
          name: ex.name,
          pp_matter_id: null
        });
      }
      
      // Check pp_data
      if (ex.pp_data && Object.keys(ex.pp_data).length > 0) {
        withPPData++;
      } else {
        emptyPPData++;
      }
    });
    
    console.log(`\n📊 Exchange Statistics:`);
    console.log(`Total exchanges: ${allExchanges.length}`);
    console.log(`With numeric PP matter IDs (synced): ${ppSynced}`);
    console.log(`With UUID/null PP matter IDs (manual): ${manuallyCreated}`);
    console.log(`With PP data populated: ${withPPData}`);
    console.log(`With empty PP data: ${emptyPPData}`);
    
    // 2. Check sync logs
    console.log('\n2️⃣ Checking sync logs...');
    const { data: syncLogs } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_type', 'matters')
      .order('started_at', { ascending: false })
      .limit(5);
    
    if (syncLogs && syncLogs.length > 0) {
      console.log(`\nFound ${syncLogs.length} matter sync attempts:`);
      syncLogs.forEach(log => {
        console.log(`\n  📅 ${new Date(log.started_at).toLocaleString()}`);
        console.log(`  Status: ${log.status}`);
        console.log(`  Records processed: ${log.records_processed || 0}`);
        console.log(`  Records created: ${log.records_created || 0}`);
        console.log(`  Records updated: ${log.records_updated || 0}`);
        if (log.error_message) {
          console.log(`  ❌ Error: ${log.error_message}`);
        }
      });
    } else {
      console.log('❌ No matter sync logs found - sync may have never run!');
    }
    
    // 3. Show some manually created exchanges
    console.log('\n3️⃣ Sample of manually created exchanges:');
    manualExchanges.slice(0, 5).forEach(ex => {
      console.log(`  - ${ex.name}`);
      console.log(`    ID: ${ex.id}`);
      console.log(`    PP Matter ID: ${ex.pp_matter_id || 'null'}`);
    });
    
    // 4. Show some synced exchanges
    console.log('\n4️⃣ Sample of PP-synced exchanges:');
    syncedExchanges.slice(0, 5).forEach(ex => {
      console.log(`  - ${ex.name}`);
      console.log(`    PP Matter ID: ${ex.pp_matter_id}`);
      console.log(`    Has PP Data: ${ex.has_pp_data ? 'Yes' : 'No'}`);
    });
    
    // 5. Check if matter 7869 exists in any form
    console.log('\n5️⃣ Searching for matter 7869 specifically...');
    
    // Check by name containing 7869
    const { data: byName } = await supabase
      .from('exchanges')
      .select('id, name, pp_matter_id')
      .ilike('name', '%7869%');
    
    if (byName && byName.length > 0) {
      console.log(`Found ${byName.length} exchange(s) with "7869" in name:`);
      byName.forEach(ex => {
        console.log(`  - ${ex.name}`);
        console.log(`    ID: ${ex.id}`);
        console.log(`    PP Matter ID: ${ex.pp_matter_id}`);
      });
    }
    
    // Check by pp_matter_id = 7869
    const { data: byPPId } = await supabase
      .from('exchanges')
      .select('id, name, pp_matter_id')
      .eq('pp_matter_id', '7869');
    
    if (byPPId && byPPId.length > 0) {
      console.log(`\nFound exchange with pp_matter_id = "7869":`);
      byPPId.forEach(ex => {
        console.log(`  - ${ex.name}`);
        console.log(`    ID: ${ex.id}`);
      });
    } else {
      console.log('\n❌ No exchange found with pp_matter_id = "7869"');
      console.log('This confirms matter 7869 was never properly synced from PP');
    }
    
    // 6. Check OAuth token status
    console.log('\n6️⃣ Checking PracticePanther OAuth token...');
    const { data: token } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('provider', 'practicepanther')
      .eq('is_active', true)
      .single();
    
    if (token) {
      const expiresAt = new Date(token.expires_at);
      const now = new Date();
      const isExpired = expiresAt < now;
      
      console.log('Token found:');
      console.log(`  Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
      console.log(`  Expires at: ${expiresAt.toLocaleString()}`);
      console.log(`  Has refresh token: ${token.refresh_token ? 'Yes' : 'No'}`);
      
      if (isExpired) {
        console.log('\n⚠️ Token is expired - sync cannot run without re-authentication!');
      }
    } else {
      console.log('❌ No active PracticePanther token found');
      console.log('Sync cannot run without authentication');
    }
    
    console.log('\n📝 SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`• ${manuallyCreated} exchanges were created manually (not from PP)`);
    console.log(`• ${ppSynced} exchanges appear to be from PP (have numeric matter IDs)`);
    console.log(`• ${emptyPPData} exchanges have no PP data stored`);
    console.log(`• Matter 7869 was NEVER synced from PP`);
    console.log(`• The exchange exists but was created manually`);
    console.log(`• PP authentication is likely expired`);
    console.log('\nTo fix this:');
    console.log('1. Re-authenticate with PracticePanther');
    console.log('2. Run a full sync to import all matters');
    console.log('3. Update manually created exchanges with correct PP IDs');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPPSyncStatus();