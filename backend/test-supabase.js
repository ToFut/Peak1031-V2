require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('🔧 Testing Supabase Connection...');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'NOT SET');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.log('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testConnection() {
  try {
    console.log('📊 Testing users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Users error:', usersError);
    } else {
      console.log('✅ Users count:', users.length);
      console.log('📋 Users:', users);
    }

    console.log('📊 Testing exchanges table...');
    const { data: exchanges, error: exchangesError } = await supabase
      .from('exchanges')
      .select('*')
      .limit(5);
    
    if (exchangesError) {
      console.log('❌ Exchanges error:', exchangesError);
    } else {
      console.log('✅ Exchanges count:', exchanges.length);
      console.log('📋 Exchanges:', exchanges);
    }

    console.log('📊 Testing contacts table...');
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .limit(5);
    
    if (contactsError) {
      console.log('❌ Contacts error:', contactsError);
    } else {
      console.log('✅ Contacts count:', contacts.length);
      console.log('📋 Contacts:', contacts);
    }

  } catch (error) {
    console.log('❌ Connection error:', error);
  }
}

testConnection(); 