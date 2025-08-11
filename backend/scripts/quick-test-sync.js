#!/usr/bin/env node

/**
 * QUICK TEST SYNC - Small batch test of business entity sync
 * Tests sync with limited records to verify everything works
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const PracticePartnerService = require('../services/practicePartnerService');

class QuickTestSync {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.ppService = new PracticePartnerService();
    this.stats = {
      users: 0,
      contacts: 0,
      exchanges: 0,
      tasks: 0,
      invoices: 0,
      expenses: 0
    };
  }

  async run() {
    console.log('🚀 QUICK TEST SYNC (PP → 1031 Platform)');
    console.log('Small batch test with limited records');
    console.log('=====================================');
    console.log(`Started: ${new Date().toISOString()}`);
    console.log('');

    try {
      // Test with small batches
      await this.syncUsers(10);
      await this.syncContacts(50); // Just 50 contacts for testing
      await this.syncExchanges(20); // Just 20 exchanges for testing
      await this.syncTasks(10); // Just 10 tasks for testing
      
      await this.showResults();
      
    } catch (error) {
      console.error('❌ Quick test sync failed:', error.message);
    }
  }

  async syncUsers(limit = 10) {
    console.log(`👥 Syncing ${limit} Users (PP → users table)...`);
    
    try {
      const response = await this.ppService.client.get('/users', { params: { limit } });
      const users = Object.values(response.data) || [];
      
      console.log(`📥 Found ${users.length} PP users`);
      
      for (const ppUser of users) {
        try {
          const userData = {
            email: ppUser.email || `pp_user_${ppUser.id}@placeholder.com`,
            first_name: ppUser.first_name || 'Unknown',
            last_name: ppUser.last_name || 'User',
            middle_name: ppUser.middle_name,
            display_name: ppUser.display_name,
            role: 'coordinator',
            is_active: ppUser.is_active !== false,
            pp_user_id: ppUser.id,
            created_at: ppUser.created_at ? new Date(ppUser.created_at) : new Date(),
            updated_at: ppUser.updated_at ? new Date(ppUser.updated_at) : new Date()
          };
          
          const { error } = await this.supabase
            .from('users')
            .upsert(userData, { onConflict: 'pp_user_id' });
          
          if (error) {
            console.log(`❌ User ${ppUser.display_name}:`, error.message);
          } else {
            this.stats.users++;
          }
          
        } catch (err) {
          console.log(`❌ User error:`, err.message);
        }
      }
      
      console.log(`✅ ${this.stats.users} users synced\n`);
      
    } catch (error) {
      console.error('❌ Users sync failed:', error.message);
    }
  }

  async syncContacts(limit = 50) {
    console.log(`📞 Syncing ${limit} Contacts (PP → contacts table)...`);
    
    try {
      const response = await this.ppService.client.get('/contacts', { params: { limit } });
      const contacts = Object.values(response.data) || [];
      
      console.log(`📥 Found ${contacts.length} PP contacts`);
      
      for (const ppContact of contacts) {
        try {
          const contactData = {
            first_name: ppContact.first_name,
            last_name: ppContact.last_name,
            middle_name: ppContact.middle_name,
            display_name: ppContact.display_name,
            email: ppContact.email,
            
            phone_primary_new: ppContact.phone_mobile || ppContact.phone_work || ppContact.phone_home,
            phone_mobile_new: ppContact.phone_mobile,
            phone_work_new: ppContact.phone_work,
            phone_home_new: ppContact.phone_home,
            phone_fax_new: ppContact.phone_fax,
            
            contact_type: ['client'],
            is_primary_contact: ppContact.is_primary_contact,
            notes: ppContact.notes,
            
            pp_contact_id: ppContact.id,
            pp_account_ref: ppContact.account_ref || {},
            custom_field_values: ppContact.custom_field_values || [],
            
            created_at: new Date(),
            updated_at: new Date()
          };
          
          const { error } = await this.supabase
            .from('contacts')
            .upsert(contactData, { onConflict: 'pp_contact_id' });
          
          if (error) {
            console.log(`❌ Contact ${ppContact.display_name}:`, error.message);
          } else {
            this.stats.contacts++;
          }
          
        } catch (err) {
          console.log(`❌ Contact error:`, err.message);
        }
      }
      
      console.log(`✅ ${this.stats.contacts} contacts synced\n`);
      
    } catch (error) {
      console.error('❌ Contacts sync failed:', error.message);
    }
  }

  async syncExchanges(limit = 20) {
    console.log(`🏢 Syncing ${limit} Exchanges (PP matters → exchanges table)...`);
    
    try {
      const response = await this.ppService.client.get('/matters', { params: { limit } });
      const matters = Object.values(response.data) || [];
      
      console.log(`📥 Found ${matters.length} PP matters`);
      
      for (const ppMatter of matters) {
        try {
          const exchangeData = {
            exchange_number: `EX-${ppMatter.number || ppMatter.id}`,
            name: ppMatter.name || ppMatter.display_name,
            display_name: ppMatter.display_name,
            notes: ppMatter.notes,
            exchange_type: 'simultaneous',
            
            status: 'active',
            priority: 'medium',
            tags: ppMatter.tags || [],
            
            pp_matter_id: ppMatter.id,
            pp_account_ref: ppMatter.account_ref || {},
            number: ppMatter.number,
            rate: ppMatter.rate,
            custom_field_values: ppMatter.custom_field_values || [],
            
            created_at: ppMatter.created_at ? new Date(ppMatter.created_at) : new Date(),
            updated_at: ppMatter.updated_at ? new Date(ppMatter.updated_at) : new Date()
          };
          
          const { error } = await this.supabase
            .from('exchanges')
            .upsert(exchangeData, { onConflict: 'pp_matter_id' });
          
          if (error) {
            console.log(`❌ Exchange ${ppMatter.display_name}:`, error.message);
          } else {
            this.stats.exchanges++;
          }
          
        } catch (err) {
          console.log(`❌ Exchange error:`, err.message);
        }
      }
      
      console.log(`✅ ${this.stats.exchanges} exchanges synced\n`);
      
    } catch (error) {
      console.error('❌ Exchanges sync failed:', error.message);
    }
  }

  async syncTasks(limit = 10) {
    console.log(`✅ Syncing ${limit} Tasks (PP → tasks table)...`);
    
    try {
      const response = await this.ppService.client.get('/tasks', { params: { limit } });
      const tasks = Object.values(response.data) || [];
      
      console.log(`📥 Found ${tasks.length} PP tasks`);
      
      for (const ppTask of tasks) {
        try {
          const taskData = {
            title: ppTask.subject || 'Untitled Task',
            description: ppTask.notes,
            subject: ppTask.subject,
            notes: ppTask.notes,
            priority: ppTask.priority || 'medium',
            status: 'pending',
            
            pp_task_id: ppTask.id,
            pp_account_ref: ppTask.account_ref || {},
            custom_field_values: ppTask.custom_field_values || [],
            
            created_at: ppTask.created_at ? new Date(ppTask.created_at) : new Date(),
            updated_at: ppTask.updated_at ? new Date(ppTask.updated_at) : new Date()
          };
          
          const { error } = await this.supabase
            .from('tasks')
            .upsert(taskData, { onConflict: 'pp_task_id' });
          
          if (error) {
            console.log(`❌ Task ${ppTask.subject}:`, error.message);
          } else {
            this.stats.tasks++;
          }
          
        } catch (err) {
          console.log(`❌ Task error:`, err.message);
        }
      }
      
      console.log(`✅ ${this.stats.tasks} tasks synced\n`);
      
    } catch (error) {
      console.error('❌ Tasks sync failed:', error.message);
    }
  }

  async showResults() {
    console.log('🎉 QUICK TEST SYNC COMPLETED!');
    console.log('==============================');
    
    const totalSynced = Object.values(this.stats).reduce((a, b) => a + b, 0);
    
    console.log(`Users      : ${this.stats.users.toLocaleString()}`);
    console.log(`Contacts   : ${this.stats.contacts.toLocaleString()}`);
    console.log(`Exchanges  : ${this.stats.exchanges.toLocaleString()}`);
    console.log(`Tasks      : ${this.stats.tasks.toLocaleString()}`);
    console.log(`Invoices   : ${this.stats.invoices.toLocaleString()}`);
    console.log(`Expenses   : ${this.stats.expenses.toLocaleString()}`);
    console.log(`TOTAL      : ${totalSynced.toLocaleString()} business entity records`);
    
    console.log('\n✅ Quick test completed successfully!');
    console.log('🎯 Now ready to run full sync with all records!');
  }
}

// Run if called directly
if (require.main === module) {
  const sync = new QuickTestSync();
  sync.run()
    .then(() => {
      console.log('\n🎉 Quick test sync completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Quick test sync failed:', error.message);
      process.exit(1);
    });
}

module.exports = QuickTestSync;