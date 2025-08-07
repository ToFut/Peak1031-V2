/**
 * Create ppdata_ prefixed tables for PracticePanther data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createPPDataTables() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('🏗️ Creating ppdata_ prefixed tables for PracticePanther data...\n');

  // Create a unified table for all PP data with flexible JSONB structure
  const createTableSQL = `
    -- Create ppdata_contacts table
    CREATE TABLE IF NOT EXISTS ppdata_contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pp_id VARCHAR(36) UNIQUE,
      display_name TEXT,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      email VARCHAR(255),
      phone_mobile VARCHAR(50),
      phone_home VARCHAR(50),
      phone_work VARCHAR(50),
      phone_fax VARCHAR(50),
      account_ref_id VARCHAR(36),
      account_ref_name TEXT,
      is_primary_contact BOOLEAN,
      pp_synced_at TIMESTAMP WITH TIME ZONE,
      pp_raw_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create ppdata_matters table
    CREATE TABLE IF NOT EXISTS ppdata_matters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pp_id VARCHAR(36) UNIQUE,
      display_name TEXT,
      matter_number VARCHAR(100),
      status VARCHAR(50),
      practice_area VARCHAR(100),
      account_ref_id VARCHAR(36),
      account_ref_name TEXT,
      opened_date DATE,
      closed_date DATE,
      pp_synced_at TIMESTAMP WITH TIME ZONE,
      pp_raw_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create ppdata_tasks table
    CREATE TABLE IF NOT EXISTS ppdata_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pp_id VARCHAR(36) UNIQUE,
      name TEXT,
      description TEXT,
      status VARCHAR(50),
      priority VARCHAR(20),
      due_date DATE,
      completed_date DATE,
      matter_ref_id VARCHAR(36),
      matter_ref_name TEXT,
      pp_synced_at TIMESTAMP WITH TIME ZONE,
      pp_raw_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create ppdata_invoices table
    CREATE TABLE IF NOT EXISTS ppdata_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pp_id VARCHAR(36) UNIQUE,
      invoice_number VARCHAR(100),
      issue_date DATE,
      due_date DATE,
      status VARCHAR(50),
      subtotal INTEGER,
      tax INTEGER,
      total INTEGER,
      total_paid INTEGER,
      total_outstanding INTEGER,
      account_ref_id VARCHAR(36),
      account_ref_name TEXT,
      matter_ref_id VARCHAR(36),
      matter_ref_name TEXT,
      pp_synced_at TIMESTAMP WITH TIME ZONE,
      pp_raw_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create ppdata_expenses table
    CREATE TABLE IF NOT EXISTS ppdata_expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pp_id VARCHAR(36) UNIQUE,
      description TEXT,
      expense_date DATE,
      amount INTEGER,
      is_billable BOOLEAN,
      is_billed BOOLEAN,
      matter_ref_id VARCHAR(36),
      matter_ref_name TEXT,
      account_ref_id VARCHAR(36),
      account_ref_name TEXT,
      pp_synced_at TIMESTAMP WITH TIME ZONE,
      pp_raw_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create ppdata_time_entries table
    CREATE TABLE IF NOT EXISTS ppdata_time_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pp_id VARCHAR(36) UNIQUE,
      description TEXT,
      date DATE,
      duration_minutes INTEGER,
      amount INTEGER,
      is_billable BOOLEAN,
      is_billed BOOLEAN,
      matter_ref_id VARCHAR(36),
      matter_ref_name TEXT,
      account_ref_id VARCHAR(36),
      account_ref_name TEXT,
      pp_synced_at TIMESTAMP WITH TIME ZONE,
      pp_raw_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create ppdata_users table
    CREATE TABLE IF NOT EXISTS ppdata_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pp_id VARCHAR(36) UNIQUE,
      display_name VARCHAR(255),
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      email VARCHAR(255),
      is_active BOOLEAN,
      pp_synced_at TIMESTAMP WITH TIME ZONE,
      pp_raw_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create ppdata_notes table
    CREATE TABLE IF NOT EXISTS ppdata_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pp_id VARCHAR(36) UNIQUE,
      name TEXT,
      description TEXT,
      matter_ref_id VARCHAR(36),
      matter_ref_name TEXT,
      account_ref_id VARCHAR(36),
      account_ref_name TEXT,
      pp_synced_at TIMESTAMP WITH TIME ZONE,
      pp_raw_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create ppdata_documents table
    CREATE TABLE IF NOT EXISTS ppdata_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pp_id VARCHAR(36) UNIQUE,
      name VARCHAR(255),
      description TEXT,
      matter_ref_id VARCHAR(36),
      matter_ref_name TEXT,
      account_ref_id VARCHAR(36),
      account_ref_name TEXT,
      pp_synced_at TIMESTAMP WITH TIME ZONE,
      pp_raw_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_ppdata_contacts_pp_id ON ppdata_contacts(pp_id);
    CREATE INDEX IF NOT EXISTS idx_ppdata_contacts_email ON ppdata_contacts(email);
    CREATE INDEX IF NOT EXISTS idx_ppdata_matters_pp_id ON ppdata_matters(pp_id);
    CREATE INDEX IF NOT EXISTS idx_ppdata_matters_status ON ppdata_matters(status);
    CREATE INDEX IF NOT EXISTS idx_ppdata_tasks_pp_id ON ppdata_tasks(pp_id);
    CREATE INDEX IF NOT EXISTS idx_ppdata_tasks_status ON ppdata_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_ppdata_invoices_pp_id ON ppdata_invoices(pp_id);
    CREATE INDEX IF NOT EXISTS idx_ppdata_invoices_status ON ppdata_invoices(status);
    CREATE INDEX IF NOT EXISTS idx_ppdata_expenses_pp_id ON ppdata_expenses(pp_id);
    CREATE INDEX IF NOT EXISTS idx_ppdata_time_entries_pp_id ON ppdata_time_entries(pp_id);
    CREATE INDEX IF NOT EXISTS idx_ppdata_users_pp_id ON ppdata_users(pp_id);
    CREATE INDEX IF NOT EXISTS idx_ppdata_notes_pp_id ON ppdata_notes(pp_id);
    CREATE INDEX IF NOT EXISTS idx_ppdata_documents_pp_id ON ppdata_documents(pp_id);
  `;

  try {
    // Execute the SQL using rpc
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: createTableSQL 
    });

    if (error) {
      console.error('❌ Error creating tables:', error.message);
      return false;
    }

    console.log('✅ All ppdata_ tables created successfully!\n');
    
    // Verify tables exist
    const tables = [
      'ppdata_contacts', 'ppdata_matters', 'ppdata_tasks', 'ppdata_invoices',
      'ppdata_expenses', 'ppdata_time_entries', 'ppdata_users', 'ppdata_notes', 'ppdata_documents'
    ];

    for (const table of tables) {
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!countError) {
        console.log(`✅ Table ${table} verified (${count || 0} records)`);
      } else {
        console.log(`❌ Table ${table} not accessible:`, countError.message);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Exception creating tables:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Creating PracticePanther Data Tables');
  console.log('======================================\n');

  const success = await createPPDataTables();
  
  if (success) {
    console.log('\n🎉 Tables created successfully! Ready to sync PP data.');
  } else {
    console.log('\n💥 Failed to create tables. Check error messages above.');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createPPDataTables };