#!/usr/bin/env node

/**
 * SYNC EXCHANGES ONLY - Focus on getting PP matters into exchanges table
 * This is the core entity for 1031 platform
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const PracticePartnerService = require('../services/practicePartnerService');

class ExchangesOnlySync {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.ppService = new PracticePartnerService();
    this.stats = {
      exchanges: 0,
      errors: 0
    };
  }

  async run() {
    console.log('🏢 SYNC EXCHANGES ONLY - PP Matters → Exchanges');
    console.log('===============================================');
    console.log(`Started: ${new Date().toISOString()}`);
    console.log('');

    try {
      // Sync exchanges in smaller batches to avoid timeout
      await this.syncExchangesBatch(100); // Just 100 exchanges for testing
      await this.showResults();
      
    } catch (error) {
      console.error('❌ Exchanges sync failed:', error.message);
    }
  }

  async syncExchangesBatch(limit = 500) {
    console.log(`🏢 Syncing ${limit} Exchanges (PP matters → exchanges table)...`);
    
    try {
      const response = await this.ppService.client.get('/matters', { 
        params: { limit }, 
        timeout: 60000 // 60 second timeout
      });
      const matters = Object.values(response.data) || [];
      
      console.log(`📥 Found ${matters.length} PP matters`);
      
      let processed = 0;
      for (const ppMatter of matters) {
        try {
          // Simplified exchange data - no complex relationships for now
          const exchangeData = {
            exchange_number: `EX-${ppMatter.number || ppMatter.id}`,
            name: (ppMatter.name || ppMatter.display_name || 'Untitled Exchange').substring(0, 255), // Truncate long names
            display_name: ppMatter.display_name ? ppMatter.display_name.substring(0, 255) : null,
            notes: ppMatter.notes,
            exchange_type: 'simultaneous', // Default
            
            // No coordinator assignment for now - avoid FK issues
            coordinator_id: null,
            assigned_users: ppMatter.assigned_to_users || [],
            
            // Status and priority
            status: this.mapPPStatusToExchangeStatus(ppMatter.status),
            priority: 'medium',
            tags: ppMatter.tags || [],
            
            // PP metadata for relationships later
            pp_matter_id: ppMatter.id,
            pp_account_ref: ppMatter.account_ref || {},
            number: ppMatter.number,
            rate: ppMatter.rate,
            open_date: ppMatter.open_date ? this.parseDate(ppMatter.open_date) : null,
            close_date: ppMatter.close_date ? this.parseDate(ppMatter.close_date) : null,
            custom_field_values: ppMatter.custom_field_values || [],
            
            created_at: ppMatter.created_at ? new Date(ppMatter.created_at) : new Date(),
            updated_at: ppMatter.updated_at ? new Date(ppMatter.updated_at) : new Date()
          };
          
          const { error } = await this.supabase
            .from('exchanges')
            .upsert(exchangeData, { onConflict: 'pp_matter_id' });
          
          if (error) {
            console.log(`❌ Exchange ${ppMatter.display_name}:`, error.message);
            this.stats.errors++;
          } else {
            this.stats.exchanges++;
          }
          
          processed++;
          if (processed % 100 === 0) {
            console.log(`   📊 Processed ${processed}/${matters.length} matters...`);
          }
          
        } catch (err) {
          console.log(`❌ Exchange error:`, err.message);
          this.stats.errors++;
        }
      }
      
      console.log(`✅ ${this.stats.exchanges} exchanges synced (${this.stats.errors} errors)\n`);
      
    } catch (error) {
      console.error('❌ Exchanges sync failed:', error.message);
      
      if (error.message.includes('timeout')) {
        console.log('⚠️  Timeout occurred - try with smaller batch size');
      }
    }
  }

  // Helper methods
  mapPPStatusToExchangeStatus(ppStatus) {
    const statusMap = {
      'open': 'active',
      'closed': 'completed',
      'pending': 'pending',
      'hold': 'on_hold'
    };
    return statusMap[ppStatus] || 'active';
  }

  parseDate(dateString) {
    if (!dateString) return null;
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  async showResults() {
    console.log('🎉 EXCHANGES SYNC COMPLETED!');
    console.log('============================');
    
    console.log(`Exchanges Synced: ${this.stats.exchanges.toLocaleString()}`);
    console.log(`Errors          : ${this.stats.errors.toLocaleString()}`);
    
    // Verify database count
    try {
      const { count } = await this.supabase
        .from('exchanges')
        .select('*', { count: 'exact', head: true });
      
      console.log(`Database Total  : ${(count || 0).toLocaleString()} exchanges`);
      
      // Show sample exchanges
      if (count > 0) {
        const { data: samples } = await this.supabase
          .from('exchanges')
          .select('exchange_number, name, status, pp_matter_id')
          .limit(3);
        
        if (samples && samples.length > 0) {
          console.log('\n📋 Sample Exchanges:');
          samples.forEach((ex, i) => {
            console.log(`   ${i + 1}. ${ex.exchange_number}: ${ex.name} (${ex.status})`);
          });
        }
      }
      
    } catch (err) {
      console.log(`❌ Database verification failed: ${err.message}`);
    }
    
    if (this.stats.exchanges > 0) {
      console.log('\n✅ Your 1031 platform now has exchanges data!');
      console.log('🚀 Core business entity successfully integrated from PracticePanther!');
    } else {
      console.log('\n❌ No exchanges were synced. Check the errors above.');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const sync = new ExchangesOnlySync();
  sync.run()
    .then(() => {
      console.log('\n🎉 Exchanges sync completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Exchanges sync failed:', error.message);
      process.exit(1);
    });
}

module.exports = ExchangesOnlySync;