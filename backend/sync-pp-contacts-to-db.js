require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔄 PRACTICEPANTHER CONTACTS SYNC TO DATABASE\n');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getPPToken() {
  console.log('🔑 Getting PP access token...');
  
  const { data: tokenData, error: tokenError } = await supabase
    .from('oauth_tokens')
    .select('access_token')
    .eq('provider', 'practicepanther')
    .eq('is_active', true)
    .single();
  
  if (tokenError || !tokenData) {
    console.log('❌ No active PP token found.');
    return null;
  }
  
  console.log('✅ PP token retrieved');
  return tokenData.access_token;
}

async function getContactsCount(token) {
  console.log('📊 Getting total contacts count...');
  
  try {
    const response = await fetch('https://app.practicepanther.com/api/v2/contacts?per_page=1', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log('❌ Failed to get contacts count:', response.status);
      return 0;
    }
    
    const data = await response.json();
    const totalCount = data.total_count || 0;
    console.log(`📊 Total contacts in PP: ${totalCount.toLocaleString()}`);
    return totalCount;
    
  } catch (error) {
    console.log('❌ Error getting contacts count:', error.message);
    return 0;
  }
}

function transformContact(ppContact) {
  // Transform PP contact to our database format
  return {
    pp_contact_id: ppContact.id,
    first_name: ppContact.first_name || '',
    last_name: ppContact.last_name || '',
    email: ppContact.email || null,
    phone: ppContact.phone_mobile || ppContact.phone_work || null,
    company: ppContact.account_ref?.display_name || null,
    role: ppContact.is_primary_contact ? 'client' : 'contact',
    is_user: false,
    is_active: true,
    pp_data: ppContact, // Store all original PP data
    source: 'practice_partner',
    last_sync_at: new Date().toISOString()
  };
}

async function syncContactsBatch(token, page = 1, perPage = 50) {
  console.log(`📄 Syncing contacts page ${page} (${perPage} per page)...`);
  
  try {
    const response = await fetch(`https://app.practicepanther.com/api/v2/contacts?per_page=${perPage}&page=${page}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log(`❌ Failed to fetch contacts page ${page}:`, response.status);
      return { success: false, count: 0 };
    }
    
    const data = await response.json();
    const contacts = data.data || [];
    
    if (contacts.length === 0) {
      console.log(`📄 No contacts found on page ${page}`);
      return { success: true, count: 0 };
    }
    
    console.log(`📄 Fetched ${contacts.length} contacts from page ${page}`);
    
    // Transform contacts
    const transformedContacts = contacts.map(transformContact);
    
    // Insert into database
    const { data: insertedData, error } = await supabase
      .from('people')
      .upsert(transformedContacts, {
        onConflict: 'pp_contact_id',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.log(`❌ Database error on page ${page}:`, error.message);
      return { success: false, count: 0 };
    }
    
    console.log(`✅ Successfully synced ${contacts.length} contacts from page ${page}`);
    return { success: true, count: contacts.length };
    
  } catch (error) {
    console.log(`❌ Error syncing page ${page}:`, error.message);
    return { success: false, count: 0 };
  }
}

async function syncAllContacts(token, totalCount) {
  console.log('\n🚀 Starting full contacts sync...');
  
  const perPage = 50; // PP API limit
  const totalPages = Math.ceil(totalCount / perPage);
  
  console.log(`📊 Sync plan: ${totalPages} pages, ${perPage} contacts per page`);
  
  let totalSynced = 0;
  let successfulPages = 0;
  let failedPages = 0;
  
  for (let page = 1; page <= totalPages; page++) {
    console.log(`\n📄 Processing page ${page}/${totalPages}...`);
    
    const result = await syncContactsBatch(token, page, perPage);
    
    if (result.success) {
      totalSynced += result.count;
      successfulPages++;
      console.log(`✅ Page ${page} completed. Total synced: ${totalSynced.toLocaleString()}`);
    } else {
      failedPages++;
      console.log(`❌ Page ${page} failed`);
    }
    
    // Add a small delay to avoid rate limiting
    if (page < totalPages) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return { totalSynced, successfulPages, failedPages, totalPages };
}

async function checkCurrentContacts() {
  console.log('\n📊 Checking current contacts in database...');
  
  const { count, error } = await supabase
    .from('people')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'practice_partner');
  
  if (error) {
    console.log('❌ Error checking database:', error.message);
    return 0;
  }
  
  console.log(`📊 Current PP contacts in database: ${count || 0}`);
  return count || 0;
}

async function runContactsSync() {
  console.log('🔄 PRACTICEPANTHER CONTACTS SYNC\n');
  
  // Get token
  const token = await getPPToken();
  if (!token) {
    console.log('❌ Cannot proceed without valid token');
    return;
  }
  
  // Get total count
  const totalCount = await getContactsCount(token);
  if (totalCount === 0) {
    console.log('❌ No contacts found or API error');
    return;
  }
  
  // Check current database state
  const currentCount = await checkCurrentContacts();
  
  // Confirm sync
  console.log('\n📋 SYNC SUMMARY:');
  console.log(`📊 PP Contacts Available: ${totalCount.toLocaleString()}`);
  console.log(`📊 Current in Database: ${currentCount.toLocaleString()}`);
  console.log(`📊 To Sync: ${(totalCount - currentCount).toLocaleString()}`);
  
  if (totalCount === currentCount) {
    console.log('✅ All contacts already synced!');
    return;
  }
  
  // Start sync
  console.log('\n🚀 Starting sync...');
  const startTime = Date.now();
  
  const result = await syncAllContacts(token, totalCount);
  
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  // Final summary
  console.log('\n📊 SYNC COMPLETED');
  console.log('='.repeat(50));
  console.log(`⏱️  Duration: ${duration} seconds`);
  console.log(`📄 Pages processed: ${result.successfulPages}/${result.totalPages}`);
  console.log(`✅ Contacts synced: ${result.totalSynced.toLocaleString()}`);
  console.log(`❌ Failed pages: ${result.failedPages}`);
  
  if (result.failedPages === 0) {
    console.log('\n🎉 SUCCESS: All contacts synced successfully!');
  } else {
    console.log('\n⚠️  WARNING: Some pages failed to sync');
  }
  
  // Final database check
  const finalCount = await checkCurrentContacts();
  console.log(`📊 Final database count: ${finalCount.toLocaleString()}`);
}

runContactsSync(); 