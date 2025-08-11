require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function executeMigration() {
  console.log('🔄 Starting migration from people to users table...\n');
  
  const results = {
    dropped: [],
    created: [],
    failed: []
  };

  // Define all the foreign key updates needed
  const foreignKeyUpdates = [
    {
      table: 'documents',
      column: 'uploaded_by',
      oldConstraint: 'documents_uploaded_by_fkey',
      newConstraint: 'documents_uploaded_by_users_fkey'
    },
    {
      table: 'document_templates',
      column: 'created_by',
      oldConstraint: 'document_templates_created_by_fkey',
      newConstraint: 'document_templates_created_by_users_fkey'
    },
    {
      table: 'generated_documents',
      column: 'generated_by',
      oldConstraint: 'generated_documents_generated_by_fkey',
      newConstraint: 'generated_documents_generated_by_users_fkey'
    },
    {
      table: 'tasks',
      column: 'assigned_to',
      oldConstraint: 'tasks_assigned_to_fkey',
      newConstraint: 'tasks_assigned_to_users_fkey'
    },
    {
      table: 'tasks',
      column: 'created_by',
      oldConstraint: 'tasks_created_by_fkey',
      newConstraint: 'tasks_created_by_users_fkey'
    },
    {
      table: 'audit_logs',
      column: 'user_id',
      oldConstraint: 'audit_logs_user_id_fkey',
      newConstraint: 'audit_logs_user_id_users_fkey'
    },
    {
      table: 'exchange_participants',
      column: 'user_id',
      oldConstraint: 'exchange_participants_user_id_fkey',
      newConstraint: 'exchange_participants_user_id_users_fkey'
    },
    {
      table: 'invitations',
      column: 'invited_by',
      oldConstraint: 'invitations_invited_by_fkey',
      newConstraint: 'invitations_invited_by_users_fkey'
    }
  ];

  console.log('📋 Processing foreign key updates...\n');

  for (const fk of foreignKeyUpdates) {
    console.log(`Processing ${fk.table}.${fk.column}...`);
    
    try {
      // Since Supabase doesn't allow direct DDL through the client, 
      // we'll verify the current state and prepare the migration SQL
      
      // Check if the column has any non-null values that don't exist in users
      const { data: orphanedRecords, error: checkError } = await supabase
        .from(fk.table)
        .select(`${fk.column}`)
        .not(fk.column, 'is', null)
        .limit(1000);
        
      if (checkError && checkError.code === '42P01') {
        console.log(`  ⏭️  Table ${fk.table} doesn't exist, skipping`);
        continue;
      }
      
      if (orphanedRecords && orphanedRecords.length > 0) {
        // Check if these IDs exist in users table
        const ids = [...new Set(orphanedRecords.map(r => r[fk.column]).filter(Boolean))];
        const { data: validUsers } = await supabase
          .from('users')
          .select('id')
          .in('id', ids);
          
        const validUserIds = new Set(validUsers?.map(u => u.id) || []);
        const orphanedIds = ids.filter(id => !validUserIds.has(id));
        
        if (orphanedIds.length > 0) {
          console.log(`  ⚠️  Found ${orphanedIds.length} orphaned references`);
          // Set orphaned references to NULL
          const { error: updateError } = await supabase
            .from(fk.table)
            .update({ [fk.column]: null })
            .in(fk.column, orphanedIds);
            
          if (updateError) {
            console.log(`  ❌ Failed to clean orphaned references:`, updateError.message);
            results.failed.push(fk);
            continue;
          } else {
            console.log(`  ✅ Cleaned orphaned references`);
          }
        }
      }
      
      results.created.push(fk);
      console.log(`  ✅ Ready for migration`);
      
    } catch (error) {
      console.log(`  ❌ Error:`, error.message);
      results.failed.push(fk);
    }
  }

  // Generate the final migration SQL
  console.log('\n📝 Generating migration SQL...');
  
  const migrationSQL = generateMigrationSQL(foreignKeyUpdates);
  const fs = require('fs');
  const migrationFile = './FINAL_MIGRATION_TO_USERS.sql';
  fs.writeFileSync(migrationFile, migrationSQL);
  
  console.log(`✅ Migration SQL saved to: ${migrationFile}`);
  
  // Summary
  console.log('\n📊 Migration Summary:');
  console.log(`   Tables ready for migration: ${results.created.length}`);
  console.log(`   Tables failed/skipped: ${results.failed.length}`);
  
  console.log('\n⚠️  IMPORTANT: Supabase does not allow DDL operations through the client API.');
  console.log('    You need to run the migration SQL directly in Supabase:');
  console.log('\n    1. Go to your Supabase dashboard');
  console.log('    2. Navigate to SQL Editor');
  console.log('    3. Copy and paste the contents of FINAL_MIGRATION_TO_USERS.sql');
  console.log('    4. Execute the migration');
  console.log('    5. Run the cleanup script after verification');
  
  // Test if we can already use users table
  console.log('\n🧪 Testing current state...');
  try {
    // Try to insert a test document with user reference
    const { data: testUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();
      
    if (testUser) {
      const testDoc = {
        original_filename: 'migration-test.txt',
        stored_filename: 'migration-test.txt',
        file_path: 'test/migration-test.txt',
        file_size: 100,
        mime_type: 'text/plain',
        exchange_id: 'df7ea956-a936-45c6-b683-143e9dda5230',
        uploaded_by: testUser.id,
        category: 'test'
      };
      
      const { error: insertError } = await supabase
        .from('documents')
        .insert([testDoc]);
        
      if (insertError) {
        console.log('❌ Current constraint still points to people table');
        console.log('   Error:', insertError.message);
      } else {
        console.log('✅ Constraint might already be updated!');
        // Clean up test
        await supabase
          .from('documents')
          .delete()
          .eq('original_filename', 'migration-test.txt');
      }
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
  
  process.exit();
}

function generateMigrationSQL(foreignKeyUpdates) {
  let sql = `-- Migration to update all foreign keys from people to users table
-- Generated on ${new Date().toISOString()}
-- This eliminates the need for the people table

BEGIN;

-- 1. Drop existing foreign key constraints
`;

  for (const fk of foreignKeyUpdates) {
    sql += `ALTER TABLE ${fk.table} DROP CONSTRAINT IF EXISTS ${fk.oldConstraint};\n`;
  }

  sql += `
-- 2. Add new foreign key constraints to users table
`;

  for (const fk of foreignKeyUpdates) {
    const onDelete = fk.column === 'user_id' && fk.table === 'exchange_participants' ? 'CASCADE' : 'SET NULL';
    sql += `ALTER TABLE ${fk.table} ADD CONSTRAINT ${fk.newConstraint} 
  FOREIGN KEY (${fk.column}) REFERENCES users(id) ON DELETE ${onDelete};\n\n`;
  }

  sql += `COMMIT;

-- Verification query
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name IN ('people', 'users')
ORDER BY tc.table_name, kcu.column_name;
`;

  return sql;
}

executeMigration();