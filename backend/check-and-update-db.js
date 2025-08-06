#!/usr/bin/env node

/**
 * Check and Update Database for Enterprise Features
 * This script checks what's missing and adds enterprise columns
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndUpdate() {
  console.log('🔍 Checking database structure...\n');
  
  try {
    // 1. Check exchanges table structure
    console.log('📊 Checking exchanges table...');
    const { data: exchanges, error: exchangeError } = await supabase
      .from('exchanges')
      .select('*')
      .limit(1);
    
    if (exchangeError) {
      console.error('❌ Error accessing exchanges table:', exchangeError.message);
      return;
    }
    
    console.log('✅ Exchanges table exists');
    
    // Check if we have any exchanges
    const { count } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   Found ${count || 0} exchanges in database`);
    
    // 2. Check what columns exist
    if (exchanges && exchanges.length > 0) {
      const sampleExchange = exchanges[0];
      console.log('\n📋 Current exchange columns:');
      const columns = Object.keys(sampleExchange);
      
      // Check for enterprise columns
      const enterpriseColumns = [
        'lifecycle_stage',
        'compliance_status', 
        'risk_level',
        'stage_progress',
        'days_in_current_stage',
        'on_track',
        'total_replacement_value',
        'completion_percentage'
      ];
      
      const missingColumns = enterpriseColumns.filter(col => !columns.includes(col));
      const existingColumns = enterpriseColumns.filter(col => columns.includes(col));
      
      if (existingColumns.length > 0) {
        console.log('\n✅ Enterprise columns already present:');
        existingColumns.forEach(col => console.log(`   - ${col}`));
      }
      
      if (missingColumns.length > 0) {
        console.log('\n⚠️  Missing enterprise columns:');
        missingColumns.forEach(col => console.log(`   - ${col}`));
        
        console.log('\n🔧 To add missing columns, run this SQL in Supabase Dashboard:');
        console.log('============================================================');
        console.log(`
ALTER TABLE exchanges 
ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(50) DEFAULT 'INITIATION',
ADD COLUMN IF NOT EXISTS stage_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_in_current_stage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(50) DEFAULT 'LOW',
ADD COLUMN IF NOT EXISTS on_track BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS total_replacement_value DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0;
        `);
        console.log('============================================================');
      } else {
        console.log('\n🎉 All enterprise columns are present!');
      }
    }
    
    // 3. Check for admin users
    console.log('\n👤 Checking admin users...');
    const { data: admins, error: adminError } = await supabase
      .from('people')
      .select('id, email, first_name, last_name, role')
      .eq('role', 'admin')
      .eq('is_active', true);
    
    if (admins && admins.length > 0) {
      console.log(`✅ Found ${admins.length} active admin user(s):`);
      admins.forEach(admin => {
        console.log(`   - ${admin.email} (${admin.first_name} ${admin.last_name})`);
      });
      console.log('\n✨ These admins can now:');
      console.log('   • View ALL exchanges in the system');
      console.log('   • See complete lifecycle details');
      console.log('   • Monitor compliance and risk');
      console.log('   • Advance exchanges through stages');
    } else {
      console.log('⚠️  No active admin users found');
      console.log('\nTo create an admin user:');
      console.log('1. Register a new user or use existing');
      console.log('2. Update their role in the database:');
      console.log(`   UPDATE people SET role = 'admin' WHERE email = 'user@example.com';`);
    }
    
    // 4. Check for enterprise tables
    console.log('\n📊 Checking for enterprise tables...');
    const enterpriseTables = [
      'exchange_workflow_history',
      'financial_transactions',
      'exchange_milestones',
      'compliance_checks',
      'risk_assessments',
      'exchange_analytics',
      'exchange_properties'
    ];
    
    for (const tableName of enterpriseTables) {
      try {
        const { error } = await supabase
          .from(tableName)
          .select('id')
          .limit(1);
        
        if (!error) {
          console.log(`   ✅ ${tableName} exists`);
        } else {
          console.log(`   ⚠️  ${tableName} missing`);
        }
      } catch (err) {
        console.log(`   ⚠️  ${tableName} missing`);
      }
    }
    
    // 5. Test data visibility
    console.log('\n🔍 Testing data visibility...');
    
    // Get all exchanges (as admin would see)
    const { data: allExchanges, error: allError } = await supabase
      .from('exchanges')
      .select(`
        *,
        exchange_participants (
          id,
          role,
          people (
            id,
            email,
            first_name,
            last_name
          )
        )
      `)
      .order('created_at', { ascending: false });
    
    if (allExchanges) {
      console.log(`\n📊 Admin View - All Exchanges (${allExchanges.length} total):`);
      
      if (allExchanges.length > 0) {
        allExchanges.slice(0, 5).forEach(exchange => {
          console.log(`\n   Exchange: ${exchange.name || exchange.id}`);
          console.log(`   Status: ${exchange.status}`);
          console.log(`   Lifecycle: ${exchange.lifecycle_stage || 'Not set'}`);
          console.log(`   Compliance: ${exchange.compliance_status || 'Not set'}`);
          console.log(`   Risk: ${exchange.risk_level || 'Not set'}`);
          console.log(`   Participants: ${exchange.exchange_participants?.length || 0}`);
        });
        
        if (allExchanges.length > 5) {
          console.log(`\n   ... and ${allExchanges.length - 5} more exchanges`);
        }
      } else {
        console.log('   No exchanges found. Create some test data to see the features.');
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📝 Summary:');
    console.log('='.repeat(60));
    
    if (exchanges && exchanges[0]) {
      const hasEnterprise = exchanges[0].lifecycle_stage !== undefined;
      
      if (hasEnterprise) {
        console.log('✅ Enterprise features are READY!');
        console.log('\nAdmins can now:');
        console.log('• See ALL exchanges with enhanced details');
        console.log('• Track lifecycle stages and compliance');
        console.log('• Monitor risk levels and milestones');
        console.log('• View comprehensive analytics');
      } else {
        console.log('⚠️  Enterprise columns need to be added');
        console.log('\nNext steps:');
        console.log('1. Copy the SQL above');
        console.log('2. Go to Supabase Dashboard > SQL Editor');
        console.log('3. Paste and run the SQL');
        console.log('4. Run this script again to verify');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the check
checkAndUpdate();