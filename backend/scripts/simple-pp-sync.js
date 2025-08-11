#!/usr/bin/env node

/**
 * SIMPLE PRACTICEPANTHER SYNC
 * Basic sync with only required fields to get data flowing quickly
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const PracticePartnerService = require('../services/practicePartnerService');

class SimplePPSync {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.ppService = new PracticePartnerService();
    this.stats = { users: 0, contacts: 0, exchanges: 0, tasks: 0 };
  }

  async run() {
    console.log('🚀 SIMPLE PP SYNC - Core Data Only');
    console.log('===================================');
    
    try {
      await this.syncUsers();
      await this.syncContacts();
      await this.syncExchanges();
      await this.syncTasks();
      await this.showResults();
    } catch (error) {
      console.error('❌ Sync failed:', error.message);
    }
  }

  async syncUsers() {
    console.log('👥 Syncing Users...');
    
    const response = await this.ppService.client.get('/users', { params: { limit: 100 } });
    const users = Object.values(response.data) || [];
    
    console.log(`📥 Found ${users.length} users`);
    
    for (const ppUser of users) {
      try {
        const userData = {
          email: ppUser.email,
          first_name: ppUser.first_name || 'Unknown',
          last_name: ppUser.last_name || 'Unknown',
          role: ppUser.is_admin ? 'admin' : 'coordinator',
          
          // PP fields
          pp_user_id: ppUser.id,
          pp_display_name: ppUser.display_name,
          pp_email: ppUser.email,
          pp_synced_at: new Date(),
          pp_raw_data: ppUser
        };
        
        const { error } = await this.supabase
          .from('users')
          .upsert(userData, { onConflict: 'pp_user_id' });
        
        if (error) {
          console.log(`❌ User ${ppUser.email}:`, error.message);
        } else {
          this.stats.users++;
        }
        
      } catch (err) {
        console.log(`❌ User error:`, err.message);
      }
    }
    
    console.log(`✅ ${this.stats.users} users synced\\n`);
  }

  async syncContacts() {
    console.log('📞 Syncing Contacts (first 200)...');
    
    const response = await this.ppService.client.get('/contacts', { params: { limit: 200 } });
    const contacts = Object.values(response.data) || [];
    
    console.log(`📥 Found ${contacts.length} contacts`);
    
    for (const ppContact of contacts) {
      try {
        const contactData = {
          first_name: ppContact.first_name || '',
          last_name: ppContact.last_name || '',
          email: ppContact.email,
          company: ppContact.company,
          
          // PP fields
          pp_id: ppContact.id,
          pp_display_name: ppContact.display_name,
          pp_email: ppContact.email,
          pp_synced_at: new Date(),
          pp_raw_data: ppContact
        };
        
        const { error } = await this.supabase
          .from('contacts')
          .upsert(contactData, { onConflict: 'pp_id' });
        
        if (error) {
          console.log(`❌ Contact ${ppContact.display_name}:`, error.message);
        } else {
          this.stats.contacts++;
        }
        
      } catch (err) {
        console.log(`❌ Contact error:`, err.message);
      }
    }
    
    console.log(`✅ ${this.stats.contacts} contacts synced\\n`);
  }

  async syncExchanges() {
    console.log('📁 Syncing Matters→Exchanges (first 100)...');
    
    const response = await this.ppService.client.get('/matters', { params: { limit: 100 } });
    const matters = Object.values(response.data) || [];
    
    console.log(`📥 Found ${matters.length} matters`);
    
    for (const ppMatter of matters) {
      try {
        const exchangeData = {
          name: ppMatter.name || ppMatter.display_name || `Matter ${ppMatter.id}`,
          exchange_number: ppMatter.number?.toString() || `PP-${ppMatter.id}`,
          exchange_type: 'delayed',
          status: ppMatter.status === 'closed' ? 'completed' : 'active',
          
          // PP fields
          pp_matter_id: ppMatter.id,
          pp_display_name: ppMatter.display_name,
          pp_name: ppMatter.name,
          pp_synced_at: new Date(),
          pp_raw_data: ppMatter,
          
          // Required field
          exchange_chat_id: ppMatter.id
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
    
    console.log(`✅ ${this.stats.exchanges} exchanges synced\\n`);
  }

  async syncTasks() {
    console.log('✅ Syncing Tasks (first 100)...');
    
    const response = await this.ppService.client.get('/tasks', { params: { limit: 100 } });
    const tasks = Object.values(response.data) || [];
    
    console.log(`📥 Found ${tasks.length} tasks`);
    
    for (const ppTask of tasks) {
      try {
        const taskData = {
          title: ppTask.name || 'Untitled Task',
          description: ppTask.description,
          status: ppTask.status === 'completed' ? 'completed' : 'pending',
          
          // PP fields
          pp_id: ppTask.id,
          pp_name: ppTask.name,
          pp_synced_at: new Date(),
          pp_raw_data: ppTask
        };
        
        const { error } = await this.supabase
          .from('tasks')
          .upsert(taskData, { onConflict: 'pp_id' });
        
        if (error) {
          console.log(`❌ Task ${ppTask.name}:`, error.message);
        } else {
          this.stats.tasks++;
        }
        
      } catch (err) {
        console.log(`❌ Task error:`, err.message);
      }
    }
    
    console.log(`✅ ${this.stats.tasks} tasks synced\\n`);
  }

  async showResults() {
    console.log('🎉 SYNC COMPLETED!');
    console.log('==================');
    console.log(`Users     : ${this.stats.users}`);
    console.log(`Contacts  : ${this.stats.contacts}`);
    console.log(`Exchanges : ${this.stats.exchanges}`);
    console.log(`Tasks     : ${this.stats.tasks}`);
    console.log(`TOTAL     : ${Object.values(this.stats).reduce((a, b) => a + b, 0)}`);
    
    console.log('\\n📊 Database Verification:');
    
    const tables = ['users', 'contacts', 'exchanges', 'tasks'];
    for (const table of tables) {
      const { count } = await this.supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      console.log(`${table.padEnd(10)}: ${(count || 0).toLocaleString()} total records`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const sync = new SimplePPSync();
  sync.run()
    .then(() => {
      console.log('\\n✅ Simple sync completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Simple sync failed:', error.message);
      process.exit(1);
    });
}

module.exports = SimplePPSync;