const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testPPTasks() {
  try {
    console.log('🧪 TESTING PRACTICEPANTHER TASK FETCHING\n');

    // Check if we have a PP token
    const { data: tokens, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('provider', 'practicepanther')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (tokenError) {
      console.log('❌ Error fetching PP tokens:', tokenError.message);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.log('❌ No active PracticePanther tokens found');
      console.log('💡 You need to set up PP OAuth first');
      return;
    }

    const token = tokens[0];
    console.log('✅ Found PP token:', token.id);
    console.log('   Scope:', token.scope);
    console.log('   Created:', token.created_at);

    // Test PP Tasks API
    console.log('\n🔍 Testing PP Tasks API...');
    
    try {
      const response = await fetch('https://app.practicepanther.com/api/v2/tasks?per_page=5&page=1', {
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log(`Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ PP Tasks API Response:`);
        console.log(`   Total Count: ${data.total_count || 'N/A'}`);
        console.log(`   Data Length: ${data.data?.length || 0}`);
        
        if (data.data && data.data.length > 0) {
          console.log('\n📋 SAMPLE PP TASKS:');
          data.data.slice(0, 3).forEach((task, index) => {
            console.log(`${index + 1}. ${task.name || 'Unnamed Task'} (${task.id})`);
            console.log(`   Status: ${task.status || 'N/A'}`);
            console.log(`   Priority: ${task.priority || 'N/A'}`);
            console.log(`   Due Date: ${task.due_date || 'N/A'}`);
            console.log(`   Matter ID: ${task.matter_id || 'N/A'}`);
            console.log(`   Assigned To: ${task.assigned_to || 'N/A'}`);
          });
        } else {
          console.log('ℹ️  No tasks returned from PP');
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ PP Tasks API Error: ${errorText.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`❌ PP Tasks API Error: ${error.message}`);
    }

    // Check current tasks in our database
    console.log('\n📊 Checking current tasks in database...');
    const { data: dbTasks, error: dbError } = await supabase
      .from('tasks')
      .select('id, title, status, pp_task_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (dbError) {
      console.log('❌ Error fetching database tasks:', dbError.message);
    } else {
      console.log(`📋 Found ${dbTasks?.length || 0} tasks in database:`);
      dbTasks?.forEach((task, index) => {
        console.log(`${index + 1}. ${task.title} (${task.id})`);
        console.log(`   Status: ${task.status || 'N/A'}`);
        console.log(`   PP Task ID: ${task.pp_task_id || 'Not synced'}`);
        console.log(`   Created: ${task.created_at}`);
      });
    }

    // Test sync endpoint
    console.log('\n🔄 Testing sync endpoint...');
    try {
      const syncResponse = await fetch('http://localhost:5001/api/sync/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.access_token}`
        }
      });

      console.log(`Sync Status: ${syncResponse.status} ${syncResponse.statusText}`);
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        console.log('✅ Sync response:', syncData);
      } else {
        const errorText = await syncResponse.text();
        console.log(`❌ Sync Error: ${errorText.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`❌ Sync Error: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPPTasks();





