require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🔄 PRACTICEPANTHER DATA SYNC\n');

async function checkTokenStatus() {
  console.log('🔍 Checking token status...');
  
  const { data: tokens, error } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('provider', 'practicepanther')
    .eq('is_active', true)
    .limit(1);

  if (error || !tokens || tokens.length === 0) {
    console.log('❌ No active PracticePanther token found');
    console.log('Please run the setup script first: node setup-pp-integration.js');
    return null;
  }

  const token = tokens[0];
  const expiresAt = new Date(token.expires_at);
  const now = new Date();
  const hoursLeft = Math.round((expiresAt - now) / (1000 * 60 * 60));

  console.log('✅ Active token found');
  console.log('- Expires in:', hoursLeft, 'hours');
  
  if (hoursLeft < 1) {
    console.log('⚠️  Token expires soon, consider refreshing');
  }

  return token;
}

async function testPPConnection(token) {
  console.log('\n🧪 Testing PracticePanther API connection...');
  
  try {
    const response = await fetch('https://app.practicepanther.com/api/v2/contacts?limit=1', {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('❌ API connection failed:', response.status, response.statusText);
      return false;
    }

    const data = await response.json();
    console.log('✅ API connection successful!');
    console.log('- Available contacts:', data.total_count || 'Unknown');
    
    return true;
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
    return false;
  }
}

async function syncContacts(token) {
  console.log('\n👥 Syncing contacts...');
  
  try {
    const response = await fetch('https://app.practicepanther.com/api/v2/contacts?limit=10', {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('❌ Failed to fetch contacts:', response.status);
      return false;
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.contacts?.length || 0} contacts (sample)`);
    
    if (data.contacts && data.contacts.length > 0) {
      console.log('Sample contacts:');
      data.contacts.slice(0, 3).forEach((contact, i) => {
        console.log(`  ${i+1}. ${contact.first_name} ${contact.last_name} (${contact.email || 'no email'})`);
      });
    }

    return true;
    } catch (error) {
    console.log('❌ Error syncing contacts:', error.message);
    return false;
  }
}

async function syncMatters(token) {
  console.log('\n📄 Syncing matters...');
  
  try {
    const response = await fetch('https://app.practicepanther.com/api/v2/matters?limit=10', {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('❌ Failed to fetch matters:', response.status);
      return false;
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.matters?.length || 0} matters (sample)`);
    
    if (data.matters && data.matters.length > 0) {
      console.log('Sample matters:');
      data.matters.slice(0, 3).forEach((matter, i) => {
        console.log(`  ${i+1}. ${matter.name} (${matter.status || 'no status'})`);
      });
    }

    return true;
  } catch (error) {
    console.log('❌ Error syncing matters:', error.message);
    return false;
  }
}

async function runFullSync() {
  console.log('🚀 Starting PracticePanther data sync...\n');

  // Check token status
  const token = await checkTokenStatus();
  if (!token) {
    return;
  }

  // Test connection
  const connected = await testPPConnection(token);
  if (!connected) {
    console.log('\n❌ Cannot proceed without API connection');
    return;
  }

  // Sync contacts
  const contactsSynced = await syncContacts(token);
  
  // Sync matters
  const mattersSynced = await syncMatters(token);

  console.log('\n📊 Sync Summary:');
  console.log('- Contacts:', contactsSynced ? '✅ Synced' : '❌ Failed');
  console.log('- Matters:', mattersSynced ? '✅ Synced' : '❌ Failed');

  if (contactsSynced && mattersSynced) {
    console.log('\n🎉 Initial sync completed successfully!');
    console.log('You can now run the full sync service to import all your data.');
    console.log('\nNext steps:');
    console.log('1. Run the full sync service to import all contacts and matters');
    console.log('2. Set up automated sync scheduling');
    console.log('3. Start using the application with your PracticePanther data');
  } else {
    console.log('\n⚠️  Some sync operations failed. Check the errors above.');
  }
}

runFullSync();