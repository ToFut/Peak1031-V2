const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkTables() {
  // Check users table
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(1);
  
  // Check people table
  const { data: people, error: peopleError } = await supabase
    .from('people')
    .select('*')
    .limit(1);
  
  console.log('Users table exists:', !usersError);
  console.log('People table exists:', !peopleError);
  
  if (!peopleError) {
    const { count } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true });
    console.log('People table has', count, 'records');
  }
  
  if (!usersError) {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    console.log('Users table has', count, 'records');
  }
}

checkTables();