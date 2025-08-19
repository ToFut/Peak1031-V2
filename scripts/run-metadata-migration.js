const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/peak1031',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running metadata migration for tasks table...');
    
    // Check if metadata column already exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'metadata';
    `;
    
    const { rows } = await client.query(checkQuery);
    
    if (rows.length > 0) {
      console.log('✅ Metadata column already exists in tasks table');
      return;
    }
    
    // Add metadata column
    await client.query(`
      ALTER TABLE tasks ADD COLUMN metadata JSONB DEFAULT '{}';
    `);
    
    // Add index for metadata queries
    await client.query(`
      CREATE INDEX idx_tasks_metadata ON tasks USING GIN (metadata);
    `);
    
    // Add comment
    await client.query(`
      COMMENT ON COLUMN tasks.metadata IS 'Additional task metadata including notify_all_users flag and other custom properties';
    `);
    
    console.log('✅ Successfully added metadata column to tasks table');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
