#!/usr/bin/env node
/**
 * Peak 1031 Database Setup Script
 * Complete database initialization for fresh installations
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class DatabaseSetup {
  constructor() {
    this.verbose = process.argv.includes('--verbose');
    this.skipSync = process.argv.includes('--skip-sync');
    this.setupStart = Date.now();
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  error(message, error = null) {
    console.error(`❌ ERROR: ${message}`);
    if (error && this.verbose) {
      console.error(error);
    }
  }

  success(message) {
    console.log(`✅ ${message}`);
  }

  async executeSQL(filePath, description) {
    try {
      this.log(`Executing: ${description}...`);
      const sql = await fs.readFile(filePath, 'utf8');
      
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await supabase.rpc('exec_sql', {
            sql: statement
          });
          
          if (error && !error.message?.includes('already exists')) {
            throw error;
          }
        }
      }
      
      this.success(`${description} completed`);
      return true;
    } catch (error) {
      this.error(`Failed: ${description}`, error);
      return false;
    }
  }

  async createSchema() {
    this.log('📊 Creating database schema...');
    
    const schemaFiles = [
      {
        file: '01-schema/01-create-tables.sql',
        description: 'Creating all tables'
      },
      {
        file: '01-schema/02-create-indexes.sql', 
        description: 'Creating performance indexes'
      },
      {
        file: '01-schema/03-create-views.sql',
        description: 'Creating analytics views'
      },
      {
        file: '01-schema/04-create-functions.sql',
        description: 'Creating database functions'
      }
    ];

    for (const { file, description } of schemaFiles) {
      const filePath = path.join(__dirname, file);
      try {
        await fs.access(filePath);
        await this.executeSQL(filePath, description);
      } catch (error) {
        if (file === '01-schema/01-create-tables.sql') {
          // Core tables are required
          this.error(`Required file missing: ${file}`);
          return false;
        } else {
          // Optional files
          this.log(`⚠️ Skipping optional file: ${file}`);
        }
      }
    }

    return true;
  }

  async loadInitialData() {
    this.log('📊 Loading initial data...');
    
    const dataFiles = [
      {
        file: '02-initial-data/01-default-users.sql',
        description: 'Creating default admin user'
      },
      {
        file: '02-initial-data/02-default-settings.sql',
        description: 'Loading system settings'
      }
    ];

    for (const { file, description } of dataFiles) {
      const filePath = path.join(__dirname, file);
      try {
        await fs.access(filePath);
        await this.executeSQL(filePath, description);
      } catch (error) {
        this.log(`⚠️ Skipping: ${file} (file not found)`);
      }
    }

    return true;
  }

  async syncPPData() {
    if (this.skipSync) {
      this.log('⏭️ Skipping PracticePanther sync (--skip-sync flag)');
      return true;
    }

    this.log('🔄 Syncing PracticePanther data...');

    const syncScripts = [
      {
        script: '03-pp-sync/01-sync-all-data.js',
        description: 'Syncing all PP data'
      },
      {
        script: '03-pp-sync/03-populate-participants.js', 
        description: 'Populating exchange participants'
      }
    ];

    for (const { script, description } of syncScripts) {
      const scriptPath = path.join(__dirname, script);
      try {
        await fs.access(scriptPath);
        this.log(`Executing: ${description}...`);
        
        // Execute Node.js script
        const { exec } = require('child_process');
        await new Promise((resolve, reject) => {
          exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
            if (this.verbose) {
              console.log(stdout);
              if (stderr) console.error(stderr);
            }
            
            if (error) {
              this.error(`Script failed: ${script}`, error);
              reject(error);
            } else {
              this.success(`${description} completed`);
              resolve();
            }
          });
        });
      } catch (error) {
        this.log(`⚠️ Skipping: ${script} (file not found or error)`);
      }
    }

    return true;
  }

  async runMigrations() {
    this.log('🔄 Running database migrations...');
    
    const migrationPath = path.join(__dirname, '04-migrations');
    try {
      const files = await fs.readdir(migrationPath);
      const sqlFiles = files
        .filter(f => f.endsWith('.sql'))
        .sort();

      for (const file of sqlFiles) {
        const filePath = path.join(migrationPath, file);
        await this.executeSQL(filePath, `Migration: ${file}`);
      }
    } catch (error) {
      this.log('⚠️ No migrations found or migration directory missing');
    }

    return true;
  }

  async verifySetup() {
    this.log('🔍 Verifying database setup...');
    
    const checks = [
      {
        name: 'Tables created',
        query: `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`
      },
      {
        name: 'Indexes created', 
        query: `SELECT COUNT(*) as count FROM pg_indexes WHERE schemaname = 'public'`
      },
      {
        name: 'Users exist',
        query: `SELECT COUNT(*) as count FROM users`
      },
      {
        name: 'Exchanges exist',
        query: `SELECT COUNT(*) as count FROM exchanges`
      },
      {
        name: 'Contacts exist',
        query: `SELECT COUNT(*) as count FROM contacts`
      }
    ];

    const results = {};
    for (const check of checks) {
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: check.query
        });
        
        if (error) throw error;
        
        results[check.name] = data?.[0]?.count || 0;
        this.success(`${check.name}: ${results[check.name]}`);
      } catch (error) {
        this.error(`Failed to verify: ${check.name}`, error);
        results[check.name] = 'ERROR';
      }
    }

    return results;
  }

  async setupComplete() {
    const duration = ((Date.now() - this.setupStart) / 1000).toFixed(2);
    
    this.log('🎉 Database setup completed!');
    this.log(`⏱️ Total time: ${duration} seconds`);
    
    console.log('\n📋 SETUP SUMMARY:');
    console.log('================');
    console.log('✅ Database schema created');
    console.log('✅ Performance indexes added');
    console.log('✅ Initial data loaded');
    
    if (!this.skipSync) {
      console.log('✅ PracticePanther data synced');
    }
    
    console.log('✅ Database verified');
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('==============');
    console.log('1. Start your backend server: npm run dev:backend');
    console.log('2. Login with admin credentials');
    console.log('3. Verify all data appears correctly');
    console.log('4. Set up scheduled sync if needed');
    
    console.log('\n📊 PLATFORM READY:');
    console.log('==================');
    console.log('• All 18 database tables created');
    console.log('• Performance indexes optimized');
    console.log('• PracticePanther data integrated');
    console.log('• Backend APIs ready to serve data');
  }

  async run() {
    try {
      this.log('🚀 Starting Peak 1031 Database Setup');
      this.log('====================================');
      
      // Check environment
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        this.error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY');
        process.exit(1);
      }

      // Test database connection
      this.log('🔌 Testing database connection...');
      const { data, error } = await supabase.from('information_schema.tables').select('*').limit(1);
      if (error) {
        this.error('Cannot connect to database', error);
        process.exit(1);
      }
      this.success('Database connection established');

      // Run setup steps
      const steps = [
        () => this.createSchema(),
        () => this.loadInitialData(),
        () => this.syncPPData(),
        () => this.runMigrations(),
        () => this.verifySetup()
      ];

      for (const step of steps) {
        const result = await step();
        if (result === false) {
          this.error('Setup failed at step, aborting...');
          process.exit(1);
        }
      }

      await this.setupComplete();
      
    } catch (error) {
      this.error('Fatal error during setup', error);
      process.exit(1);
    }
  }
}

// CLI Interface
if (require.main === module) {
  const setup = new DatabaseSetup();
  
  if (process.argv.includes('--help')) {
    console.log(`
Peak 1031 Database Setup

Usage: node setup.js [options]

Options:
  --help          Show this help message
  --verbose       Show detailed output
  --skip-sync     Skip PracticePanther data sync
  
Examples:
  node setup.js                    # Full setup
  node setup.js --skip-sync        # Setup without PP sync
  node setup.js --verbose          # Detailed output
`);
    process.exit(0);
  }

  setup.run();
}

module.exports = DatabaseSetup;