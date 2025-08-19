const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://fozdhmlcjnjkwilmiiem.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvemRobWxjam5qa3dpbG1paWVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM5NjczNSwiZXhwIjoyMDY5OTcyNzM1fQ.9Rgobs72hgeXtue4fG7Yqz0cWsri6JV88fn3UbKmI8g'
);

async function checkFunctions() {
  console.log('🔍 Checking available database functions...\n');

  try {
    // Try to get the users table structure
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError) {
      console.error('❌ Error accessing users table:', usersError);
    } else {
      console.log('✅ Users table accessible');
      console.log('📊 Sample user data:', users[0]);
    }

    // Try to add columns directly
    console.log('\n🔄 Trying to add SMS 2FA columns...');
    
    // First, let's check if the columns already exist
    const { data: columns, error: columnsError } = await supabase
      .from('users')
      .select('two_fa_type, two_fa_expires_at')
      .limit(1);

    if (columnsError) {
      console.log('❌ Columns do not exist yet:', columnsError.message);
      
      // Try to add them using a simple update
      console.log('🔄 Attempting to add columns...');
      
      // For now, let's just test if we can update a user
      const { data: updateResult, error: updateError } = await supabase
        .from('users')
        .update({ phone: '+15551234567' })
        .eq('email', 'admin@peak1031.com')
        .select();

      if (updateError) {
        console.error('❌ Update error:', updateError);
      } else {
        console.log('✅ Update successful:', updateResult);
      }
    } else {
      console.log('✅ SMS 2FA columns already exist');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
checkFunctions();
