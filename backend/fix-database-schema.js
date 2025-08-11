#!/usr/bin/env node

/**
 * DATABASE SCHEMA FIX SCRIPT
 * Fixes missing columns that are causing test failures
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const log = {
    info: (msg) => console.log(`ℹ️  ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    warning: (msg) => console.log(`⚠️  ${msg}`)
};

async function checkTableStructure() {
    log.info('Checking current database structure...');
    
    try {
        // Get current users table structure
        const { data: columns, error } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'users')
            .eq('table_schema', 'public');
            
        if (error) {
            log.error('Could not check table structure: ' + error.message);
            return null;
        }
        
        log.info(`Found ${columns.length} columns in users table:`);
        columns.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });
        
        return columns;
        
    } catch (error) {
        log.error('Error checking table structure: ' + error.message);
        return null;
    }
}

async function addMissingColumns() {
    log.info('Adding missing columns to users table...');
    
    const sqlCommands = [
        // Add email_verified column if it doesn't exist
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;`,
        
        // Add other potentially missing columns
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT false;`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
        
        // Update existing data to set email_verified = true for existing users
        `UPDATE users SET email_verified = true WHERE email_verified IS NULL;`,
        
        // Create indexes for performance
        `CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);`,
        `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`,
        `CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);`
    ];
    
    for (const sql of sqlCommands) {
        try {
            const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
            
            if (error) {
                // Try alternative method if RPC doesn't work
                log.warning(`RPC method failed for: ${sql.substring(0, 50)}...`);
                log.warning(`Error: ${error.message}`);
                continue;
            }
            
            log.success(`Executed: ${sql.substring(0, 50)}...`);
            
        } catch (error) {
            log.warning(`Could not execute: ${sql.substring(0, 50)}...`);
            log.warning(`Error: ${error.message}`);
        }
    }
}

async function createRPCFunction() {
    log.info('Creating SQL execution function...');
    
    const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
            EXECUTE sql_query;
        END;
        $$;
    `;
    
    try {
        // Try to create the function using direct SQL
        const { error } = await supabase.rpc('exec_sql', { 
            sql_query: createFunctionSQL 
        });
        
        if (error) {
            log.warning('Could not create RPC function: ' + error.message);
            return false;
        }
        
        log.success('SQL execution function created');
        return true;
        
    } catch (error) {
        log.warning('RPC function creation failed: ' + error.message);
        return false;
    }
}

async function directSchemaFix() {
    log.info('Attempting direct schema fixes using Supabase client...');
    
    try {
        // Method 1: Try to get and update user record to see current schema
        const { data: testUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .limit(1)
            .single();
            
        if (fetchError) {
            log.error('Could not fetch test user: ' + fetchError.message);
            return false;
        }
        
        log.info('Current user record structure:');
        console.log(JSON.stringify(testUser, null, 2));
        
        // Check if email_verified column exists
        if (testUser.hasOwnProperty('email_verified')) {
            log.success('email_verified column already exists');
        } else if (testUser.hasOwnProperty('emailVerified')) {
            log.warning('Found emailVerified (camelCase) instead of email_verified (snake_case)');
            log.info('The API expects email_verified but database has emailVerified');
        } else {
            log.error('Neither email_verified nor emailVerified column found');
        }
        
        return true;
        
    } catch (error) {
        log.error('Direct schema check failed: ' + error.message);
        return false;
    }
}

async function fixCasingIssues() {
    log.info('Checking for camelCase vs snake_case column issues...');
    
    // Common column mappings that might be causing issues
    const columnMappings = [
        { api: 'email_verified', db: 'emailVerified' },
        { api: 'two_fa_enabled', db: 'twoFaEnabled' },
        { api: 'last_login', db: 'lastLogin' },
        { api: 'created_at', db: 'createdAt' },
        { api: 'updated_at', db: 'updatedAt' },
        { api: 'is_active', db: 'isActive' },
        { api: 'first_name', db: 'firstName' },
        { api: 'last_name', db: 'lastName' }
    ];
    
    try {
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .limit(1)
            .single();
            
        if (!user) {
            log.error('No user found to check column structure');
            return false;
        }
        
        log.info('Analyzing column naming patterns...');
        
        for (const mapping of columnMappings) {
            if (user.hasOwnProperty(mapping.db)) {
                log.success(`✅ Found: ${mapping.db} (camelCase)`);
            } else if (user.hasOwnProperty(mapping.api)) {
                log.success(`✅ Found: ${mapping.api} (snake_case)`);
            } else {
                log.warning(`❌ Missing: ${mapping.api} / ${mapping.db}`);
            }
        }
        
        return true;
        
    } catch (error) {
        log.error('Column analysis failed: ' + error.message);
        return false;
    }
}

async function createTestUser() {
    log.info('Creating a test user to verify schema works...');
    
    try {
        // Try to insert a test user with the fields our API expects
        const testUserData = {
            email: 'schema-test-user@peak1031.com',
            password_hash: '$2b$10$example.hash.for.testing.purposes',
            firstName: 'Schema',
            lastName: 'Test', 
            role: 'client',
            isActive: true,
            emailVerified: true,
            twoFaEnabled: false
        };
        
        const { data, error } = await supabase
            .from('users')
            .insert([testUserData])
            .select()
            .single();
            
        if (error) {
            log.error('Test user creation failed: ' + error.message);
            log.error('This indicates schema issues that need to be fixed');
            return false;
        }
        
        log.success('✅ Test user created successfully!');
        log.info('User data: ' + JSON.stringify(data, null, 2));
        
        // Clean up test user
        await supabase
            .from('users')
            .delete()
            .eq('email', 'schema-test-user@peak1031.com');
            
        log.success('✅ Test user cleaned up');
        return true;
        
    } catch (error) {
        log.error('Test user creation error: ' + error.message);
        return false;
    }
}

async function main() {
    console.log('🔧 Peak 1031 Database Schema Fix Tool\n');
    
    // Step 1: Check current structure
    const columns = await checkTableStructure();
    if (!columns) {
        log.error('Could not analyze current schema');
    }
    
    // Step 2: Analyze column naming issues
    await fixCasingIssues();
    
    // Step 3: Try direct schema analysis
    await directSchemaFix();
    
    // Step 4: Create test user to verify schema
    const testResult = await createTestUser();
    
    // Step 5: Try to create RPC function for schema fixes
    // await createRPCFunction();
    
    // Step 6: Add missing columns
    // await addMissingColumns();
    
    if (testResult) {
        log.success('\n🎉 Database schema appears to be compatible!');
        log.info('The issue might be in how the API code is accessing the columns.');
        log.info('Check backend/services/auth.js for column name mismatches.');
    } else {
        log.error('\n❌ Database schema needs fixes');
        log.info('Manual fixes required - see output above for details');
    }
    
    console.log('\n📋 SUMMARY:');
    console.log('1. Check output above for column naming issues');
    console.log('2. Update API code to match database column names');
    console.log('3. Or update database to match API expectations');
    console.log('4. Run tests again after fixes');
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };