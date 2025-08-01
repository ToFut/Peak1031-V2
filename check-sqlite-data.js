const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database at:', dbPath);
});

// Function to query and display table data
function queryTable(tableName, limit = 5) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== ${tableName.toUpperCase()} TABLE ===`);
    
    // First, get count
    db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
      if (err) {
        console.error(`Error querying ${tableName}:`, err.message);
        resolve();
        return;
      }
      
      console.log(`Total records: ${row.count}`);
      
      if (row.count > 0) {
        // Get sample records
        db.all(`SELECT * FROM ${tableName} LIMIT ${limit}`, (err, rows) => {
          if (err) {
            console.error(`Error getting records:`, err);
          } else {
            console.log(`Sample records (showing ${Math.min(limit, rows.length)}):`, JSON.stringify(rows, null, 2));
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

// Check all relevant tables
async function checkDatabase() {
  const tables = [
    'users',
    'exchanges',
    'exchange_participants',
    'messages',
    'contacts',
    'tasks',
    'documents'
  ];
  
  // First, list all tables
  console.log('\n=== DATABASE TABLES ===');
  db.all("SELECT name FROM sqlite_master WHERE type='table'", async (err, rows) => {
    if (err) {
      console.error('Error listing tables:', err);
      return;
    }
    
    console.log('Tables in database:', rows.map(r => r.name).join(', '));
    
    // Query each table
    for (const table of tables) {
      await queryTable(table);
    }
    
    // Close database
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      }
      console.log('\nDatabase connection closed.');
    });
  });
}

checkDatabase();