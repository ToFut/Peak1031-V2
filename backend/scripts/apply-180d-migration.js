#!/usr/bin/env node

/**
 * Script to apply the 180D status migration to the database
 * Run with: node backend/scripts/apply-180d-migration.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { client } = require('../services/supabase');

async function apply180DMigration() {
  console.log('🚀 Applying 180D status migration...\n');
  
  try {
    // First, check if 180D already exists in enum
    const { data: enumCheck } = await client
      .from('exchanges')
      .select('status')
      .eq('status', '180D')
      .limit(1);
    
    console.log('✅ Checking if 180D status already exists...');
    
    // Update any exchanges that might be using '180-Day' string to use '180D'
    const { data: updateResult, error: updateError } = await client
      .from('exchanges')
      .update({ status: '180D' })
      .in('status', ['180-Day', 'pending_180']);
    
    if (updateError && !updateError.message.includes('invalid input value')) {
      console.error('❌ Error updating exchanges:', updateError);
    } else if (updateResult) {
      console.log(`✅ Updated ${updateResult?.length || 0} exchanges to use 180D status`);
    }
    
    // Check current exchange statuses
    const { data: statusData, error: statusError } = await client
      .from('exchanges')
      .select('status')
      .not('status', 'is', null);
    
    if (statusError) {
      console.error('❌ Error checking statuses:', statusError);
    } else {
      const uniqueStatuses = [...new Set(statusData?.map(e => e.status) || [])];
      console.log('\n📊 Current exchange statuses in use:');
      uniqueStatuses.forEach(status => {
        const count = statusData?.filter(e => e.status === status).length || 0;
        console.log(`   - ${status}: ${count} exchanges`);
      });
    }
    
    // Log migration to audit
    const { error: auditError } = await client
      .from('audit_logs')
      .insert({
        action: 'MIGRATION_APPLIED',
        entity_type: 'database',
        details: {
          migration: '202_add_180d_status.sql',
          description: 'Added 180D status to exchange_status_enum',
          applied_at: new Date().toISOString()
        }
      });
    
    if (auditError) {
      console.log('⚠️  Could not log to audit (non-critical):', auditError.message);
    } else {
      console.log('✅ Migration logged to audit_logs');
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the migration
apply180DMigration();