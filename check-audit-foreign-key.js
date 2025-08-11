const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkAuditForeignKey() {
  try {
    console.log('🔍 Checking audit_logs foreign key relationships...\n');

    // Check if the user ID exists in the users table
    const userId = 'd3af6a77-6766-435f-8313-a3be252f269f';
    
    console.log('🔍 Checking if user exists in users table...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (userError) {
      console.log('❌ Error checking user:', userError.message);
    } else if (user) {
      console.log('✅ User found in users table:', user.email);
    } else {
      console.log('❌ User not found in users table');
    }

    // Check if the user ID exists in the people table
    console.log('\n🔍 Checking if user exists in people table...');
    const { data: person, error: personError } = await supabase
      .from('people')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (personError) {
      console.log('❌ Error checking people table:', personError.message);
    } else if (person) {
      console.log('✅ User found in people table:', person.email);
    } else {
      console.log('❌ User not found in people table');
    }

    // Check the actual foreign key constraint
    console.log('\n🔍 Checking audit_logs table constraints...');
    const { data: constraints, error: constraintError } = await supabase
      .rpc('get_table_constraints', { table_name: 'audit_logs' });

    if (constraintError) {
      console.log('❌ Error checking constraints:', constraintError.message);
      
      // Try a different approach - check the actual table structure
      const { data: columns, error: columnError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', 'audit_logs')
        .order('ordinal_position');

      if (columnError) {
        console.log('❌ Error checking columns:', columnError.message);
      } else {
        console.log('📋 audit_logs table columns:');
        columns?.forEach(col => {
          console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
      }
    } else {
      console.log('📋 audit_logs table constraints:', constraints);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAuditForeignKey();





