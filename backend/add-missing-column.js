#!/usr/bin/env node

/**
 * Add missing email_verified column to users table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function addEmailVerifiedColumn() {
    console.log('🔧 Adding missing email_verified column...');
    
    try {
        // Use raw SQL to add the column
        const { error } = await supabase
            .from('users')
            .update({ email_verified: true })
            .eq('id', '278304de-568f-4138-b35b-6fdcfbd2f1ce'); // Try to update admin user
            
        if (error && error.message.includes('email_verified')) {
            console.log('✅ Confirmed: email_verified column is missing');
            
            // Try to use the SQL editor approach by making a direct HTTP request
            const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
                    'apikey': process.env.SUPABASE_SERVICE_KEY
                },
                body: JSON.stringify({
                    query: 'ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT true;'
                })
            });
            
            if (response.ok) {
                console.log('✅ Successfully added email_verified column');
            } else {
                const errorText = await response.text();
                console.log('❌ Failed to add column via RPC:', errorText);
                return false;
            }
        } else if (!error) {
            console.log('✅ email_verified column already exists');
        } else {
            console.log('❌ Unexpected error:', error.message);
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        return false;
    }
}

async function testColumnExists() {
    console.log('🧪 Testing if email_verified column now exists...');
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('email_verified')
            .limit(1)
            .single();
            
        if (error) {
            console.log('❌ email_verified column still missing:', error.message);
            return false;
        }
        
        console.log('✅ email_verified column exists! Value:', data.email_verified);
        return true;
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
        return false;
    }
}

async function main() {
    console.log('🔧 Peak 1031 - Fix Missing email_verified Column\n');
    
    // First test if column exists
    const columnExists = await testColumnExists();
    
    if (!columnExists) {
        console.log('\n📝 Need to add email_verified column manually...');
        console.log('Since we cannot execute DDL via Supabase REST API, please:');
        console.log('');
        console.log('1. Go to https://supabase.com/dashboard');
        console.log('2. Open your Peak1031 project');
        console.log('3. Go to SQL Editor');
        console.log('4. Run this SQL command:');
        console.log('');
        console.log('   ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT true;');
        console.log('');
        console.log('5. Then run the tests again');
        console.log('');
        console.log('Alternatively, you can update the backend code to use the correct column names.');
        
        return false;
    }
    
    return true;
}

if (require.main === module) {
    main().then(success => {
        if (success) {
            console.log('\n🎉 Database schema is ready for tests!');
        } else {
            console.log('\n❌ Manual intervention required');
            process.exit(1);
        }
    }).catch(console.error);
}

module.exports = { main };