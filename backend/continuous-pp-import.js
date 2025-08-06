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
  totalContacts: 0,
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
      sync_type: 'contacts_import',
      status: importState.status,
      total_records: importState.totalContacts,
      processed_records: importState.processedCount,
      created_records: importState.createdCount,
      updated_records: importState.updatedCount,
      error_records: importState.errorCount,
      progress_percentage: importState.totalContacts > 0 
        ? Math.round((importState.processedCount / importState.totalContacts) * 100) 
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
        sync_id: 'continuous_contacts_import',
        sync_type: 'contacts_import',
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
  const rate = importState.processedCount / (elapsed / 1000); // contacts per second
  const remaining = importState.totalContacts - importState.processedCount;
  const estimatedSeconds = remaining / rate;
  
  return new Date(Date.now() + (estimatedSeconds * 1000)).toISOString();
}

// Display progress
function displayProgress() {
  const percentage = importState.totalContacts > 0 
    ? Math.round((importState.processedCount / importState.totalContacts) * 100) 
    : 0;
    
  const progressBar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
  
  console.clear();
  console.log('🚀 CONTINUOUS PRACTICEPANTHER IMPORT');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`Status: ${importState.status.toUpperCase()}`);
  console.log(`Progress: [${progressBar}] ${percentage}%`);
  console.log(`Total: ${importState.processedCount} / ${importState.totalContacts}`);
  console.log(`Created: ${importState.createdCount} | Updated: ${importState.updatedCount} | Errors: ${importState.errorCount}`);
  console.log(`Duplicate Errors: ${importState.duplicateErrors}`);
  console.log(`Rate: ${(importState.processedCount / ((Date.now() - importState.startTime) / 1000)).toFixed(1)} contacts/sec`);
  
  if (importState.errors.length > 0) {
    console.log('\nRecent Errors:');
    importState.errors.slice(-3).forEach(err => {
      console.log(`  - ${err.message}`);
    });
  }
}

async function importAllContacts() {
  try {
    if (!practicePartnerService) {
      console.log('❌ PracticePartnerService is not initialized');
      return;
    }
    
    console.log('🔑 Testing authentication...');
    await practicePartnerService.authenticate();
    
    // Get total count first
    console.log('📊 Getting total contact count...');
    const countResponse = await practicePartnerService.client.get('/contacts', {
      params: { limit: 1 }
    });
    
    importState.totalContacts = countResponse.data.total_count || 
                                (Array.isArray(countResponse.data) ? countResponse.data.length : 0);
    
    console.log(`📋 Total contacts to import: ${importState.totalContacts}`);
    
    // Start progress display
    const progressInterval = setInterval(() => {
      displayProgress();
      saveProgress();
    }, 1000);
    
    // Import all contacts in batches
    const batchSize = 500; // Larger batch for efficiency
    let hasMore = true;
    let offset = 0;
    
    while (hasMore && importState.status === 'running') {
      try {
        // Fetch batch
        const response = await practicePartnerService.client.get('/contacts', {
          params: {
            limit: batchSize,
            offset: offset,
            sort: 'id',
            order: 'asc'
          }
        });
        
        const contacts = Array.isArray(response.data) ? response.data : 
                        (response.data.items || response.data.data || []);
        
        if (contacts.length === 0) {
          hasMore = false;
          break;
        }
        
        // Process contacts
        for (const ppContact of contacts) {
          if (importState.status !== 'running') break;
          
          try {
            // Skip if already processed
            if (importState.lastProcessedId && ppContact.id <= importState.lastProcessedId) {
              continue;
            }
            
            const result = await practicePartnerService.syncContact(ppContact);
            importState.processedCount++;
            importState.lastProcessedId = ppContact.id;
            
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
                  contactId: ppContact.id,
                  message: result.error,
                  timestamp: new Date().toISOString()
                });
              }
            }
            
          } catch (error) {
            importState.errorCount++;
            importState.errors.push({
              contactId: ppContact.id,
              message: error.message,
              timestamp: new Date().toISOString()
            });
          }
          
          // Rate limiting - pause every 100 contacts
          if (importState.processedCount % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        offset += batchSize;
        importState.currentPage = Math.floor(offset / batchSize) + 1;
        
        // Check if we've processed all
        if (contacts.length < batchSize || importState.processedCount >= importState.totalContacts) {
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
    
    console.log('\n✅ Import completed!');
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
  console.log('\n⏸️  Pausing import...');
  importState.status = 'paused';
  await saveProgress();
  process.exit(0);
});

// Run the import
importAllContacts();