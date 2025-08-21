#!/usr/bin/env node

/**
 * Script to add metadata column to tasks table for rollover history tracking
 * Run with: node backend/scripts/add-task-metadata-column.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Client } = require('pg');

async function addMetadataColumn() {
  // Parse the Supabase connection string
  const supabaseUrl = process.env.SUPABASE_URL;
  const dbUrl = supabaseUrl.replace('https://', 'postgresql://postgres:').replace('.supabase.co', '@db.supabase.co:5432/postgres');
  
  // Use direct PostgreSQL connection
  const connectionString = process.env.DATABASE_URL || 
    `postgresql://postgres.fozdhmlcjnjkwilmiiem:${process.env.SUPABASE_SERVICE_KEY}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;
  
  console.log('🔧 Adding metadata column to tasks table...\n');
  
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if column exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' 
      AND column_name = 'metadata';
    `;
    
    const checkResult = await client.query(checkQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('ℹ️  Metadata column already exists in tasks table');
      return;
    }

    // Add metadata column
    const alterQuery = `
      ALTER TABLE tasks 
      ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    `;
    
    await client.query(alterQuery);
    console.log('✅ Successfully added metadata column to tasks table');
    
    // Add an index for better performance
    const indexQuery = `
      CREATE INDEX IF NOT EXISTS idx_tasks_metadata 
      ON tasks USING GIN (metadata);
    `;
    
    await client.query(indexQuery);
    console.log('✅ Added GIN index on metadata column for better performance');
    
    // Verify the column was added
    const verifyQuery = `
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'tasks' 
      AND column_name = 'metadata';
    `;
    
    const verifyResult = await client.query(verifyQuery);
    
    if (verifyResult.rows.length > 0) {
      console.log('\n📊 Column details:');
      console.log('  - Column name:', verifyResult.rows[0].column_name);
      console.log('  - Data type:', verifyResult.rows[0].data_type);
      console.log('  - Default value:', verifyResult.rows[0].column_default);
      console.log('\n✅ Metadata column is ready for use!');
    }
    
  } catch (error) {
    console.error('❌ Error adding metadata column:', error.message);
    console.log('\nPlease run this SQL manually in your database:');
    console.log("ALTER TABLE tasks ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;");
    console.log("CREATE INDEX idx_tasks_metadata ON tasks USING GIN (metadata);");
  } finally {
    await client.end();
    console.log('\n👋 Database connection closed');
  }
}

// Run the migration
addMetadataColumn();