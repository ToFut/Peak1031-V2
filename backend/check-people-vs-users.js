require('dotenv').config();
const supabaseService = require('./services/supabase');

async function checkTables() {
  try {
    console.log('🔍 Checking people table...');
    const { data: people, error: peopleError } = await supabaseService.client
      .from('people')
      .select('*')
      .limit(10);
    
    if (peopleError) {
      console.log('❌ Error fetching people:', peopleError);
    } else {
      console.log('✅ People table has', people.length, 'records');
      console.log('Sample people:', people.map(p => ({ id: p.id, email: p.email, first_name: p.first_name, last_name: p.last_name })));
    }
    
    console.log('\n🔍 Checking users table...');
    const { data: users, error: usersError } = await supabaseService.client
      .from('users')
      .select('*')
      .limit(10);
    
    if (usersError) {
      console.log('❌ Error fetching users:', usersError);
    } else {
      console.log('✅ Users table has', users.length, 'records');
      console.log('Sample users:', users.map(u => ({ id: u.id, email: u.email, first_name: u.first_name, last_name: u.last_name, role: u.role })));
    }
    
    console.log('\n🔍 Looking for abol@peakcorp.com...');
    const { data: abolPeople, error: abolPeopleError } = await supabaseService.client
      .from('people')
      .select('*')
      .eq('email', 'abol@peakcorp.com')
      .single();
    
    const { data: abolUsers, error: abolUsersError } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', 'abol@peakcorp.com')
      .single();
    
    console.log('abol@peakcorp.com in people table:', abolPeople ? 'YES' : 'NO');
    console.log('abol@peakcorp.com in users table:', abolUsers ? 'YES' : 'NO');
    
    console.log('\n🔍 Looking for segev@futurixs.com...');
    const { data: segevPeople, error: segevPeopleError } = await supabaseService.client
      .from('people')
      .select('*')
      .eq('email', 'segev@futurixs.com')
      .single();
    
    const { data: segevUsers, error: segevUsersError } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', 'segev@futurixs.com')
      .single();
    
    console.log('segev@futurixs.com in people table:', segevPeople ? 'YES' : 'NO');
    console.log('segev@futurixs.com in users table:', segevUsers ? 'YES' : 'NO');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTables();

