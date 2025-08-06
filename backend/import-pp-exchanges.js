#!/usr/bin/env node

require('dotenv').config();
const practicePartnerService = require('./services/practicePartnerService.js');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Import state
let importState = {
  status: 'running',
  startTime: Date.now(),
  totalExchanges: 0,
  processedCount: 0,
  createdCount: 0,
  updatedCount: 0,
  errorCount: 0,
  duplicateErrors: 0,
  currentPage: 1,
  lastProcessedId: null,
  errors: []
};

// Save progress to database
async function saveProgress() {
  try {
    const progress = {
      sync_type: 'exchanges_import',
      status: importState.status,
      total_records: importState.totalExchanges,
      processed_records: importState.processedCount,
      created_records: importState.createdCount,
      updated_records: importState.updatedCount,
      error_records: importState.errorCount,
      progress_percentage: importState.totalExchanges > 0 
        ? Math.round((importState.processedCount / importState.totalExchanges) * 100) 
        : 0,
      current_page: importState.currentPage,
      started_at: new Date(importState.startTime).toISOString(),
      last_update: new Date().toISOString(),
      estimated_completion: estimateCompletion(),
      metadata: {
        duplicateErrors: importState.duplicateErrors,
        lastProcessedId: importState.lastProcessedId,
        errors: importState.errors.slice(-10) // Last 10 errors
      }
    };

    await supabase
      .from('practice_partner_syncs')
      .upsert({
        sync_id: 'continuous_exchanges_import',
        sync_type: 'exchanges_import',
        status: importState.status,
        start_time: new Date(importState.startTime).toISOString(),
        records_processed: importState.processedCount,
        records_created: importState.createdCount,
        records_updated: importState.updatedCount,
        records_failed: importState.errorCount,
        statistics: progress,
        errors: importState.errors.slice(-50) // Keep last 50 errors
      }, {
        onConflict: 'sync_id'
      });
      
  } catch (error) {
    console.error('Failed to save progress:', error.message);
  }
}

function estimateCompletion() {
  if (importState.processedCount === 0) return null;
  
  const elapsed = Date.now() - importState.startTime;
  const rate = importState.processedCount / (elapsed / 1000); // exchanges per second
  const remaining = importState.totalExchanges - importState.processedCount;
  const estimatedSeconds = remaining / rate;
  
  return new Date(Date.now() + (estimatedSeconds * 1000)).toISOString();
}

// Display progress
function displayProgress() {
  const percentage = importState.totalExchanges > 0 
    ? Math.round((importState.processedCount / importState.totalExchanges) * 100) 
    : 0;
    
  const progressBar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
  
  console.clear();
  console.log('🏢 PRACTICEPANTHER EXCHANGES IMPORT');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`Status: ${importState.status.toUpperCase()}`);
  console.log(`Progress: [${progressBar}] ${percentage}%`);
  console.log(`Total: ${importState.processedCount} / ${importState.totalExchanges}`);
  console.log(`Created: ${importState.createdCount} | Updated: ${importState.updatedCount} | Errors: ${importState.errorCount}`);
  console.log(`Rate: ${(importState.processedCount / ((Date.now() - importState.startTime) / 1000)).toFixed(1)} exchanges/sec`);
  
  if (importState.errors.length > 0) {
    console.log('\\nRecent Errors:');
    importState.errors.slice(-3).forEach(err => {
      console.log(`  - ${err.message}`);
    });
  }
}

async function syncExchange(ppExchange) {
  try {
    // Map PracticePanther matter to our exchange format
    const exchangeData = {
      pp_matter_id: ppExchange.id?.toString(),
      name: ppExchange.name || ppExchange.matter_name || `Exchange ${ppExchange.id}`,
      exchange_name: ppExchange.name || ppExchange.matter_name || `Exchange ${ppExchange.id}`,
      description: ppExchange.description || ppExchange.notes || null,
      status: 'PENDING', // Default status from schema
      exchange_type: '1031_exchange', // Default type from schema
      start_date: ppExchange.date_opened || new Date().toISOString().split('T')[0],
      pp_data: ppExchange, // Store original PP data
      last_sync_at: new Date().toISOString()
    };

    // Check if exchange already exists
    const { data: existingExchange, error: checkError } = await supabase
      .from('exchanges')
      .select('id')
      .eq('pp_matter_id', exchangeData.pp_matter_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    let result;
    if (existingExchange) {
      // Update existing exchange
      const { data, error } = await supabase
        .from('exchanges')
        .update({
          ...exchangeData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingExchange.id)
        .select()
        .single();

      if (error) throw error;
      result = { action: 'updated', data };
    } else {
      // Create new exchange
      const { data, error } = await supabase
        .from('exchanges')
        .insert({
          ...exchangeData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      result = { action: 'created', data };
    }

    return result;
  } catch (error) {
    console.error('Error syncing exchange:', error);
    return { action: 'error', error: error.message };
  }
}

async function importExchanges() {
  try {
    if (!practicePartnerService) {
      console.log('❌ PracticePartnerService is not initialized');
      return;
    }
    
    console.log('🔑 Testing authentication...');
    await practicePartnerService.authenticate();
    
    // Get total count first (limit to 1000 as requested)
    console.log('📊 Getting total exchange count...');
    const countResponse = await practicePartnerService.client.get('/matters', {
      params: { limit: 1 }
    });
    
    // Limit to 1000 exchanges as requested
    const totalAvailable = countResponse.data.total_count || 
                          (Array.isArray(countResponse.data) ? countResponse.data.length : 0);
    importState.totalExchanges = Math.min(1000, totalAvailable);
    
    console.log(`📋 Total exchanges to import: ${importState.totalExchanges} (limited from ${totalAvailable})`);
    
    // Start progress display
    const progressInterval = setInterval(() => {
      displayProgress();
      saveProgress();
    }, 2000);
    
    // Import exchanges in batches
    const batchSize = 100;
    let hasMore = true;
    let offset = 0;
    
    while (hasMore && importState.status === 'running' && importState.processedCount < 1000) {
      try {
        // Fetch batch
        const response = await practicePartnerService.client.get('/matters', {
          params: {
            limit: Math.min(batchSize, 1000 - importState.processedCount),
            offset: offset,
            sort: 'id',
            order: 'asc'
          }
        });
        
        const exchanges = Array.isArray(response.data) ? response.data : 
                         (response.data.items || response.data.data || []);
        
        if (exchanges.length === 0) {
          hasMore = false;
          break;
        }
        
        // Process exchanges
        for (const ppExchange of exchanges) {
          if (importState.status !== 'running' || importState.processedCount >= 1000) break;
          
          try {
            const result = await syncExchange(ppExchange);
            importState.processedCount++;
            importState.lastProcessedId = ppExchange.id;
            
            if (result.action === 'created') {
              importState.createdCount++;
            } else if (result.action === 'updated') {
              importState.updatedCount++;
            } else if (result.action === 'error') {
              importState.errorCount++;
              
              // Track duplicate errors separately
              if (result.error?.includes('duplicate key')) {
                importState.duplicateErrors++;
              } else {
                importState.errors.push({
                  exchangeId: ppExchange.id,
                  message: result.error,
                  timestamp: new Date().toISOString()
                });
              }
            }
            
          } catch (error) {
            importState.errorCount++;
            importState.errors.push({
              exchangeId: ppExchange.id,
              message: error.message,
              timestamp: new Date().toISOString()
            });
          }
          
          // Rate limiting - pause every 50 exchanges
          if (importState.processedCount % 50 === 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        offset += batchSize;
        importState.currentPage = Math.floor(offset / batchSize) + 1;
        
        // Check if we've processed enough or all
        if (exchanges.length < batchSize || importState.processedCount >= 1000) {
          hasMore = false;
        }
        
      } catch (error) {
        console.error('Batch error:', error.message);
        
        // Handle rate limiting
        if (error.response?.status === 429) {
          console.log('Rate limit hit, waiting...');
          await new Promise(resolve => setTimeout(resolve, 30000));
          continue;
        }
        
        // For other errors, try to continue
        importState.errors.push({
          message: `Batch error: ${error.message}`,
          timestamp: new Date().toISOString()
        });
        
        offset += batchSize; // Skip this batch
      }
    }
    
    // Import complete
    importState.status = 'completed';
    clearInterval(progressInterval);
    displayProgress();
    await saveProgress();
    
    console.log('\\n✅ Exchanges import completed!');
    console.log(`Total time: ${Math.round((Date.now() - importState.startTime) / 1000 / 60)} minutes`);
    
  } catch (error) {
    importState.status = 'failed';
    importState.errors.push({
      message: `Fatal error: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    console.error('Import failed:', error);
    await saveProgress();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\\n⏸️  Pausing import...');
  importState.status = 'paused';
  await saveProgress();
  process.exit(0);
});

// Run the import
importExchanges();