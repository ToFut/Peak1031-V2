require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkPeopleTable() {
  try {
    console.log('🔍 Checking people table...');
    
    // Check if people table exists and get sample data
    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('*')
      .limit(5);
    
    if (peopleError) {
      console.log('❌ People table error:', peopleError.message);
      return;
    }
    
    console.log(`✅ People table exists with ${people.length} records (showing first 5):`);
    people.forEach(person => {
      console.log(`   - ${person.email} (ID: ${person.id})`);
    });
    
    // Check specifically for admin user
    console.log('\n🔍 Checking for admin user in people table...');
    const { data: adminPeople, error: adminError } = await supabase
      .from('people')
      .select('*')
      .eq('email', 'admin@peak1031.com');
    
    if (adminError) {
      console.log('❌ Admin query error:', adminError.message);
    } else if (adminPeople.length === 0) {
      console.log('❌ Admin user NOT found in people table');
    } else {
      console.log('✅ Admin user found in people table:');
      adminPeople.forEach(admin => {
        console.log(`   - ${admin.email} (ID: ${admin.id})`);
      });
    }
    
    // Check for the specific user ID from the error
    console.log('\n🔍 Checking for user ID 330d014d-ecd8-433d-9c3d-eeacab3c8396...');
    const { data: specificUser, error: specificError } = await supabase
      .from('people')
      .select('*')
      .eq('id', '330d014d-ecd8-433d-9c3d-eeacab3c8396');
    
    if (specificError) {
      console.log('❌ Specific user query error:', specificError.message);
    } else if (specificUser.length === 0) {
      console.log('❌ User ID 330d014d-ecd8-433d-9c3d-eeacab3c8396 NOT found in people table');
    } else {
      console.log('✅ User ID found in people table:');
      specificUser.forEach(user => {
        console.log(`   - ${user.email} (ID: ${user.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPeopleTable();