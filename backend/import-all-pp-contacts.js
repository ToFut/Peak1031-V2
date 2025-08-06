#!/usr/bin/env node

require('dotenv').config();
const practicePartnerService = require('./services/practicePartnerService.js');

async function importAllContacts() {
  try {
    if (!practicePartnerService) {
      console.log('❌ PracticePartnerService is not initialized');
      console.log('Please check your Supabase configuration in .env file');
      return;
    }
    
    console.log('🚀 IMPORTING ALL PRACTICEPANTHER CONTACTS');
    console.log('════════════════════════════════════════════════════\n');
    
    // Test authentication first
    console.log('🔑 Testing PracticePanther authentication...');
    try {
      await practicePartnerService.authenticate();
      console.log('✅ Authentication successful\n');
    } catch (authError) {
      console.error('❌ Authentication failed:', authError.message);
      console.log('\nPlease ensure you have a valid PP token. Steps:');
      console.log('1. Run: node generate-pp-auth-url.js');
      console.log('2. Complete OAuth authorization');
      console.log('3. Update PP_AUTH_CODE in .env');
      console.log('4. Run: node setup-pp-oauth.js');
      return;
    }
    
    // Run full contacts sync
    console.log('📥 Starting full contacts import from PracticePanther...');
    console.log('This will fetch ALL contacts and sync them to your database.\n');
    
    const startTime = Date.now();
    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let page = 1;
    const pageSize = 100; // PP API typically allows 100 per page
    
    // Keep fetching until no more contacts
    while (true) {
      try {
        console.log(`📄 Fetching page ${page} (${pageSize} contacts per page)...`);
        
        // Fetch contacts page
        const response = await practicePartnerService.client.get('/contacts', {
          params: {
            page: page,
            limit: pageSize,
            sort: 'created_at',
            order: 'asc'
          }
        });
        
        // Handle PP API returning array directly
        const contacts = Array.isArray(response.data) ? response.data : 
                        (response.data.items || response.data.data || response.data.contacts || []);
        const totalCount = response.data.total_count || response.data.total || 
                          (Array.isArray(response.data) ? response.data.length : 0);
        
        if (contacts.length === 0) {
          console.log('✅ No more contacts to fetch');
          break;
        }
        
        console.log(`📊 Processing ${contacts.length} contacts from page ${page}...`);
        
        // Process each contact
        for (const ppContact of contacts) {
          try {
            const result = await practicePartnerService.syncContact(ppContact);
            processedCount++;
            
            if (result.action === 'created') {
              createdCount++;
            } else if (result.action === 'updated') {
              updatedCount++;
            } else if (result.action === 'error') {
              errorCount++;
              console.log(`   ❌ Error syncing contact ${ppContact.id}: ${result.error}`);
            }
            
            // Progress indicator every 10 contacts
            if (processedCount % 10 === 0) {
              process.stdout.write(`   Processed: ${processedCount}/${totalCount || '?'} contacts\r`);
            }
          } catch (contactError) {
            errorCount++;
            console.error(`   ❌ Failed to sync contact ${ppContact.id}:`, contactError.message);
          }
        }
        
        console.log(`\n✅ Page ${page} complete: ${contacts.length} contacts processed`);
        console.log(`   Running totals - Created: ${createdCount}, Updated: ${updatedCount}, Errors: ${errorCount}\n`);
        
        // Check if we have more pages
        if (contacts.length < pageSize) {
          console.log('📊 Reached last page of contacts');
          break;
        }
        
        page++;
        
        // Rate limit protection - pause between pages
        if (page % 5 === 0) {
          console.log('⏸️  Pausing for rate limit protection...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second pause
        }
      } catch (pageError) {
        console.error(`❌ Error fetching page ${page}:`, pageError.message);
        if (pageError.response?.status === 429) {
          console.log('⏸️  Rate limit hit, waiting 30 seconds...');
          await new Promise(resolve => setTimeout(resolve, 30000));
          continue; // Retry same page
        }
        break;
      }
    }
    
    // Calculate duration
    const duration = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    // Final summary
    console.log('\n🎉 IMPORT COMPLETE!');
    console.log('════════════════════════════════════════════════════');
    console.log(`⏱️  Duration: ${minutes}m ${seconds}s`);
    console.log(`📊 Total processed: ${processedCount} contacts`);
    console.log(`✅ Created: ${createdCount} new contacts`);
    console.log(`🔄 Updated: ${updatedCount} existing contacts`);
    console.log(`❌ Errors: ${errorCount} contacts`);
    console.log(`📈 Success rate: ${Math.round(((createdCount + updatedCount) / processedCount) * 100)}%`);
    console.log('════════════════════════════════════════════════════');
    
    // Show sample of imported contacts
    const { data: samples } = await practicePartnerService.supabase
      .from('people')
      .select('*')
      .eq('source', 'practice_partner')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (samples && samples.length > 0) {
      console.log('\n📋 Sample imported contacts (newest first):');
      samples.forEach((contact, i) => {
        console.log(`\n${i + 1}. ${contact.first_name} ${contact.last_name}`);
        console.log(`   Email: ${contact.email}`);
        console.log(`   Company: ${contact.company || 'N/A'}`);
        console.log(`   Phone: ${contact.phone || 'N/A'}`);
        console.log(`   PP ID: ${contact.pp_contact_id}`);
        console.log(`   Last sync: ${new Date(contact.last_sync_at).toLocaleString()}`);
      });
    }
    
    // Log sync activity
    await practicePartnerService.logSyncActivity('contacts', 'completed', {
      startedAt: new Date(Date.now() - (duration * 1000)).toISOString(),
      completedAt: new Date().toISOString(),
      recordsProcessed: processedCount,
      recordsCreated: createdCount,
      recordsUpdated: updatedCount,
      triggeredBy: 'manual_import_all',
      additionalInfo: {
        pages: page,
        duration: `${minutes}m ${seconds}s`,
        errors: errorCount
      }
    });
    
    console.log('\n✅ Sync activity logged to database');
    console.log('\n🎯 Next steps:');
    console.log('1. Verify contacts in your database');
    console.log('2. Import matters: node import-all-pp-matters.js');
    console.log('3. Import tasks: node import-all-pp-tasks.js');
    console.log('4. Set up automated sync schedule');
    
  } catch (error) {
    console.error('❌ Import process failed:', error.message);
    console.error(error.stack);
  }
}

// Run the import
importAllContacts().then(() => {
  console.log('\n🏁 Import process finished.');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});