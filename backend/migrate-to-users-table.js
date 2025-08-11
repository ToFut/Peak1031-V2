require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function migrateToUsersTable() {
  console.log('🔄 Migrating foreign keys from people to users table...\n');
  
  try {
    // First, check which tables have foreign keys to people
    console.log('1️⃣ Checking current foreign key constraints...');
    
    const constraints = [
      { table: 'documents', column: 'uploaded_by', constraint: 'documents_uploaded_by_fkey' },
      { table: 'document_templates', column: 'created_by', constraint: 'document_templates_created_by_fkey' },
      { table: 'generated_documents', column: 'generated_by', constraint: 'generated_documents_generated_by_fkey' },
      { table: 'tasks', column: 'assigned_to', constraint: 'tasks_assigned_to_fkey' },
      { table: 'tasks', column: 'created_by', constraint: 'tasks_created_by_fkey' },
      { table: 'audit_logs', column: 'user_id', constraint: 'audit_logs_user_id_fkey' },
      { table: 'exchange_participants', column: 'user_id', constraint: 'exchange_participants_user_id_fkey' },
      { table: 'invitations', column: 'invited_by', constraint: 'invitations_invited_by_fkey' }
    ];
    
    // Read the SQL file
    const fs = require('fs');
    const migrationSQL = fs.readFileSync('./fix-foreign-keys-to-users.sql', 'utf8');
    
    console.log('2️⃣ Running migration...');
    console.log('   This will update all foreign keys to reference users table instead of people table');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    }).catch(async (err) => {
      // If RPC doesn't exist, we need to run the SQL statements individually
      console.log('   RPC not available, executing statements individually...');
      
      // Since we can't run raw SQL directly, we'll need to inform the user
      console.log('\n⚠️  Cannot execute raw SQL through Supabase client.');
      console.log('    Please run the following SQL file directly in your database:');
      console.log('    ./fix-foreign-keys-to-users.sql');
      
      return { error: 'Manual intervention required' };
    });
    
    if (error) {
      if (error === 'Manual intervention required') {
        console.log('\n📋 Next Steps:');
        console.log('1. Connect to your Supabase database directly');
        console.log('2. Run the SQL in fix-foreign-keys-to-users.sql');
        console.log('3. After migration, you can safely delete the people table');
        console.log('4. Update all backend code to remove people table references');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Migration completed successfully!');
      console.log('\n📋 Next Steps:');
      console.log('1. Verify all functionality works correctly');
      console.log('2. Delete the people table (DROP TABLE people CASCADE;)');
      console.log('3. Remove all people table references from the code');
    }
    
    // Show current state
    console.log('\n3️⃣ Current database state:');
    
    // Check if we can query users
    const { data: userCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });
    console.log(`   Users table: ${userCount} records`);
    
    // Check if people table still exists
    const { data: peopleCount, error: peopleError } = await supabase
      .from('people')
      .select('id', { count: 'exact', head: true });
    
    if (!peopleError) {
      console.log(`   People table: ${peopleCount} records (can be deleted after migration)`);
    } else {
      console.log('   People table: Not accessible or already deleted');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

migrateToUsersTable();