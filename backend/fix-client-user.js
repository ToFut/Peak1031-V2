// Quick script to add the missing client user to Supabase
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = 'https://ynwfrmykghcozqnuszho.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlud2ZybXlrZ2hjb3pxbnVzemhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzczNjI2NSwiZXhwIjoyMDY5MzEyMjY1fQ.zyFETz8fN0u_28pYSZPx9m6cvxsF1Oq1vnTSr2HxKYA';

const client = createClient(supabaseUrl, supabaseKey);

async function fixClientUser() {
  try {
    // Use a fresh UUID 
    const newUserId = 'f93eeb41-b42f-477f-9503-42ef597ad69a';
    console.log('Creating client user with ID:', newUserId);
    const { data, error } = await client
      .from('users')
      .insert({
        id: newUserId,
        email: 'client@peak1031.com',
        first_name: 'John',
        last_name: 'Client',
        role: 'client',
        is_active: true
      })
      .select();

    if (error) {
      console.error('❌ Error creating user:', error);
    } else {
      console.log('✅ Successfully created client user');
      console.log('New user ID:', data[0].id);
      console.log('Now the authentication system should use this ID for client@peak1031.com');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixClientUser();