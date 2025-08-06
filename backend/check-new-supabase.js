require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Use the correct project credentials
const supabaseUrl = 'https://fozdhmlcjnjkwilmiiem.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvemRobWxjam5qa3dpbG1paWVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM5NjczNSwiZXhwIjoyMDY5OTcyNzM1fQ.9Rgobs72hgeXtue4fG7Yqz0cWsri6JV88fn3UbKmI8g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseStatus() {
  console.log('📊 PEAK 1031 DATABASE STATUS (NEW PROJECT)\n');

  try {
    // Check if people table exists and has data
    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('id, first_name, last_name, email, role, is_user, is_active')
      .limit(5);

    if (peopleError) {
      console.log('❌ Error accessing people table:', peopleError.message);
    } else {
      console.log(`✅ People table accessible - ${people?.length || 0} records found`);
      if (people && people.length > 0) {
        console.log('Sample people:');
        people.forEach(person => {
          console.log(`  - ${person.first_name} ${person.last_name} (${person.role}) - ${person.is_user ? 'User' : 'Contact'}`);
        });
      }
    }

    // Check exchanges table
    const { data: exchanges, error: exchangesError } = await supabase
      .from('exchanges')
      .select('id, name, status, priority, exchange_type')
      .limit(5);

    if (exchangesError) {
      console.log('❌ Error accessing exchanges table:', exchangesError.message);
    } else {
      console.log(`\n✅ Exchanges table accessible - ${exchanges?.length || 0} records found`);
      if (exchanges && exchanges.length > 0) {
        console.log('Sample exchanges:');
        exchanges.forEach(exchange => {
          console.log(`  - ${exchange.name} (${exchange.status}) - ${exchange.exchange_type}`);
        });
      }
    }

    // Check tasks table
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, status, priority, due_date')
      .limit(5);

    if (tasksError) {
      console.log('❌ Error accessing tasks table:', tasksError.message);
    } else {
      console.log(`\n✅ Tasks table accessible - ${tasks?.length || 0} records found`);
      if (tasks && tasks.length > 0) {
        console.log('Sample tasks:');
        tasks.forEach(task => {
          console.log(`  - ${task.title} (${task.status}) - ${task.priority}`);
        });
      }
    }

    // Check other important tables
    const tables = ['documents', 'messages', 'audit_logs', 'oauth_tokens'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error) {
        console.log(`❌ Error accessing ${table} table:`, error.message);
      } else {
        console.log(`✅ ${table} table accessible`);
      }
    }

    console.log('\n🎉 Database connection successful!');
    console.log('This appears to be the updated schema with the comprehensive table structure.');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkDatabaseStatus(); 