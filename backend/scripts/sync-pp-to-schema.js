/**
 * Script to sync all PracticePanther data to ppData schema
 * 
 * This script will:
 * 1. Create the ppData schema tables if they don't exist
 * 2. Fetch all data from PracticePanther API
 * 3. Store it in the dedicated ppData schema
 */

const { createClient } = require('@supabase/supabase-js');
const PPDataSyncService = require('../services/ppdata-sync');
require('dotenv').config();

async function createPPDataTables() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('🏗️ Creating ppdata_ prefixed tables...\n');

  // Table creation statements
  const tables = [
    {
      name: 'contacts',
      sql: `
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
        CREATE INDEX IF NOT EXISTS idx_ppdata_contacts_pp_id ON ppdata_contacts(pp_id);
        CREATE INDEX IF NOT EXISTS idx_ppdata_contacts_email ON ppdata_contacts(email);
        CREATE INDEX IF NOT EXISTS idx_ppdata_contacts_sync ON ppdata_contacts(pp_synced_at);
      `
    },
    {
      name: 'matters',
      sql: `
        CREATE TABLE IF NOT EXISTS "ppData".matters (
          id VARCHAR(36) PRIMARY KEY,
          display_name TEXT,
          matter_number VARCHAR(100),
          status VARCHAR(50),
          practice_area VARCHAR(100),
          responsible_attorney JSONB,
          client_ref JSONB,
          opened_date DATE,
          closed_date DATE,
          billing_info JSONB,
          custom_field_values JSONB,
          pp_synced_at TIMESTAMP WITH TIME ZONE,
          pp_raw_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_ppdata_matters_status ON "ppData".matters(status);
        CREATE INDEX IF NOT EXISTS idx_ppdata_matters_sync ON "ppData".matters(pp_synced_at);
      `
    },
    {
      name: 'tasks',
      sql: `
        CREATE TABLE IF NOT EXISTS "ppData".tasks (
          id VARCHAR(36) PRIMARY KEY,
          name TEXT,
          description TEXT,
          status VARCHAR(50),
          priority VARCHAR(20),
          due_date DATE,
          completed_date DATE,
          matter_ref JSONB,
          assigned_to_users JSONB,
          assigned_to_contacts JSONB,
          tags JSONB,
          custom_field_values JSONB,
          pp_synced_at TIMESTAMP WITH TIME ZONE,
          pp_raw_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_ppdata_tasks_status ON "ppData".tasks(status);
        CREATE INDEX IF NOT EXISTS idx_ppdata_tasks_due_date ON "ppData".tasks(due_date);
        CREATE INDEX IF NOT EXISTS idx_ppdata_tasks_sync ON "ppData".tasks(pp_synced_at);
      `
    },
    {
      name: 'invoices',
      sql: `
        CREATE TABLE IF NOT EXISTS "ppData".invoices (
          id VARCHAR(36) PRIMARY KEY,
          invoice_number VARCHAR(100),
          issue_date DATE,
          due_date DATE,
          status VARCHAR(50),
          invoice_type VARCHAR(50),
          subtotal INTEGER,
          tax INTEGER,
          discount INTEGER,
          total INTEGER,
          total_paid INTEGER,
          total_outstanding INTEGER,
          account_ref JSONB,
          matter_ref JSONB,
          items_time_entries JSONB,
          items_expenses JSONB,
          items_flat_fees JSONB,
          pp_synced_at TIMESTAMP WITH TIME ZONE,
          pp_raw_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_ppdata_invoices_status ON "ppData".invoices(status);
        CREATE INDEX IF NOT EXISTS idx_ppdata_invoices_due_date ON "ppData".invoices(due_date);
        CREATE INDEX IF NOT EXISTS idx_ppdata_invoices_sync ON "ppData".invoices(pp_synced_at);
      `
    },
    {
      name: 'expenses',
      sql: `
        CREATE TABLE IF NOT EXISTS "ppData".expenses (
          id VARCHAR(36) PRIMARY KEY,
          description TEXT,
          expense_date DATE,
          category VARCHAR(100),
          quantity INTEGER,
          price INTEGER,
          amount INTEGER,
          is_billable BOOLEAN,
          is_billed BOOLEAN,
          matter_ref JSONB,
          account_ref JSONB,
          expense_category_ref JSONB,
          billed_by_user_ref JSONB,
          private_notes TEXT,
          pp_synced_at TIMESTAMP WITH TIME ZONE,
          pp_raw_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_ppdata_expenses_date ON "ppData".expenses(expense_date);
        CREATE INDEX IF NOT EXISTS idx_ppdata_expenses_billable ON "ppData".expenses(is_billable);
        CREATE INDEX IF NOT EXISTS idx_ppdata_expenses_sync ON "ppData".expenses(pp_synced_at);
      `
    },
    {
      name: 'time_entries',
      sql: `
        CREATE TABLE IF NOT EXISTS "ppData".time_entries (
          id VARCHAR(36) PRIMARY KEY,
          description TEXT,
          date DATE,
          duration_minutes INTEGER,
          hourly_rate INTEGER,
          amount INTEGER,
          is_billable BOOLEAN,
          is_billed BOOLEAN,
          matter_ref JSONB,
          account_ref JSONB,
          user_ref JSONB,
          time_category_ref JSONB,
          private_notes TEXT,
          pp_synced_at TIMESTAMP WITH TIME ZONE,
          pp_raw_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_ppdata_time_entries_date ON "ppData".time_entries(date);
        CREATE INDEX IF NOT EXISTS idx_ppdata_time_entries_billable ON "ppData".time_entries(is_billable);
        CREATE INDEX IF NOT EXISTS idx_ppdata_time_entries_sync ON "ppData".time_entries(pp_synced_at);
      `
    },
    {
      name: 'users',
      sql: `
        CREATE TABLE IF NOT EXISTS "ppData".users (
          id VARCHAR(36) PRIMARY KEY,
          display_name VARCHAR(255),
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          email VARCHAR(255),
          is_active BOOLEAN,
          role VARCHAR(100),
          permissions JSONB,
          custom_field_values JSONB,
          pp_synced_at TIMESTAMP WITH TIME ZONE,
          pp_raw_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_ppdata_users_email ON "ppData".users(email);
        CREATE INDEX IF NOT EXISTS idx_ppdata_users_active ON "ppData".users(is_active);
        CREATE INDEX IF NOT EXISTS idx_ppdata_users_sync ON "ppData".users(pp_synced_at);
      `
    },
    {
      name: 'notes',
      sql: `
        CREATE TABLE IF NOT EXISTS "ppData".notes (
          id VARCHAR(36) PRIMARY KEY,
          subject VARCHAR(255),
          content TEXT,
          note_type VARCHAR(50),
          is_private BOOLEAN,
          matter_ref JSONB,
          account_ref JSONB,
          user_ref JSONB,
          pp_synced_at TIMESTAMP WITH TIME ZONE,
          pp_raw_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_ppdata_notes_type ON "ppData".notes(note_type);
        CREATE INDEX IF NOT EXISTS idx_ppdata_notes_private ON "ppData".notes(is_private);
        CREATE INDEX IF NOT EXISTS idx_ppdata_notes_sync ON "ppData".notes(pp_synced_at);
      `
    },
    {
      name: 'documents',
      sql: `
        CREATE TABLE IF NOT EXISTS "ppData".documents (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255),
          description TEXT,
          file_type VARCHAR(100),
          file_size INTEGER,
          matter_ref JSONB,
          account_ref JSONB,
          folder_ref JSONB,
          uploaded_by_user_ref JSONB,
          tags JSONB,
          pp_synced_at TIMESTAMP WITH TIME ZONE,
          pp_raw_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_ppdata_documents_type ON "ppData".documents(file_type);
        CREATE INDEX IF NOT EXISTS idx_ppdata_documents_sync ON "ppData".documents(pp_synced_at);
      `
    }
  ];

  // Create each table
  for (const table of tables) {
    try {
      await supabase.rpc('exec_sql', { sql: table.sql });
      console.log(`✅ Table ppData.${table.name} created/verified`);
    } catch (error) {
      console.error(`❌ Error creating table ${table.name}:`, error.message);
    }
  }

  console.log('\n🎯 ppData schema setup complete!\n');
}

async function main() {
  console.log('🚀 PracticePanther Data Sync to ppData Schema');
  console.log('================================================\n');

  try {
    // Step 1: Create/verify schema and tables
    await createPPDataTables();

    // Step 2: Initialize sync service
    const syncService = new PPDataSyncService();

    // Step 3: Run full sync
    const result = await syncService.syncAll();

    if (result.success) {
      console.log('\n🎉 SUCCESS! All PracticePanther data synced to ppData schema');
      console.log('\n📋 Summary:');
      console.log(`   • Operations: ${result.summary.operations}`);
      console.log(`   • Successful: ${result.summary.successful}`);
      console.log(`   • Total records: ${result.summary.totalRecords}`);
      console.log(`   • Duration: ${result.summary.duration}s`);
      
      // Show status
      console.log('\n📊 Final Status:');
      const status = await syncService.getSyncStatus();
      for (const [table, info] of Object.entries(status)) {
        console.log(`   ${table.padEnd(15)} - ${info.count} records`);
      }

    } else {
      console.error('\n❌ Sync failed:', result.error);
      console.log('\nPartial results:', result.results);
    }

  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    console.error(error.stack);
  }

  console.log('\n✨ Script complete!');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createPPDataTables, main };