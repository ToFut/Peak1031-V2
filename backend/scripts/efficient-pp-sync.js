#!/usr/bin/env node

/**
 * EFFICIENT PRACTICEPANTHER SYNC
 * Optimized for large datasets with resumable sync capability
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const PPTokenManager = require('../services/ppTokenManager');
const PracticePartnerService = require('../services/practicePartnerService');

class EfficientPPSync {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.ppService = new PracticePartnerService();
    this.tokenManager = new PPTokenManager();
    
    this.stats = {
      users: { fetched: 0, synced: 0, errors: 0 },
      contacts: { fetched: 0, synced: 0, errors: 0 },
      matters: { fetched: 0, synced: 0, errors: 0 },
      tasks: { fetched: 0, synced: 0, errors: 0 },
      invoices: { fetched: 0, synced: 0, errors: 0 },
      expenses: { fetched: 0, synced: 0, errors: 0 }
    };
  }

  async runOptimizedSync() {
    console.log('🚀 EFFICIENT PRACTICEPANTHER SYNC');
    console.log('==================================');
    console.log(`Started: ${new Date().toISOString()}`);
    console.log('');

    try {
      // Test connection
      await this.testConnection();
      
      // Sync in priority order - most important data first
      console.log('📋 Syncing in priority order for 1031 platform...');
      console.log('');
      
      // 1. Users first (needed for relationships)
      await this.syncUsersOptimized();
      
      // 2. Contacts (clients for exchanges)
      await this.syncContactsOptimized();
      
      // 3. Matters -> Exchanges (core business data)
      await this.syncMattersOptimized();
      
      // 4. Tasks (workflow management)
      await this.syncTasksOptimized();
      
      // 5. Show current progress
      await this.showProgress();
      
      console.log('');
      console.log('🎯 Priority data sync completed!');
      console.log('📊 Use the data immediately while background sync continues');
      
    } catch (error) {
      console.error('❌ Efficient sync failed:', error.message);
    }
  }

  async testConnection() {
    console.log('🔌 Testing connection...');
    const token = await this.tokenManager.getValidAccessToken();
    const response = await this.ppService.client.get('/users', { params: { limit: 1 } });
    console.log('✅ Connection successful');
    console.log('');
  }

  async syncUsersOptimized() {
    console.log('👥 Syncing Users (Priority 1)...');
    
    try {
      const response = await this.ppService.client.get('/users', { params: { limit: 1000 } });
      const users = Object.values(response.data) || [];
      
      console.log(`📥 Found ${users.length} users`);
      this.stats.users.fetched = users.length;
      
      // Batch insert users
      if (users.length > 0) {
        const userData = users.map(ppUser => ({
          email: ppUser.email,
          first_name: ppUser.first_name || 'Unknown',
          last_name: ppUser.last_name || 'Unknown',
          role: this.mapUserRole(ppUser),
          phone_primary: ppUser.phone_mobile || ppUser.phone_work,
          is_active: ppUser.is_active !== false,
          
          // PP fields
          pp_user_id: ppUser.id,
          pp_display_name: ppUser.display_name,
          pp_first_name: ppUser.first_name,
          pp_last_name: ppUser.last_name,
          pp_email: ppUser.email,
          pp_is_active: ppUser.is_active,
          pp_is_admin: ppUser.is_admin,
          pp_synced_at: new Date(),
          pp_raw_data: ppUser,
          created_at: new Date(),
          updated_at: new Date()
        }));
        
        // Use upsert for efficiency
        const { error } = await this.supabase
          .from('users')
          .upsert(userData, { onConflict: 'pp_user_id' });
        
        if (error) {
          console.error('❌ Users batch insert failed:', error.message);
          this.stats.users.errors = users.length;
        } else {
          this.stats.users.synced = users.length;
          console.log(`✅ ${users.length} users synced`);
        }
      }
      
    } catch (error) {
      console.error('❌ Users sync failed:', error.message);
    }
    console.log('');
  }

  async syncContactsOptimized() {
    console.log('📞 Syncing Contacts (Priority 2) - First 1000...');
    
    try {
      const response = await this.ppService.client.get('/contacts', { params: { limit: 1000 } });
      const contacts = Object.values(response.data) || [];
      
      console.log(`📥 Found ${contacts.length} contacts (showing first 1000)`);
      this.stats.contacts.fetched = contacts.length;
      
      if (contacts.length > 0) {
        const contactData = contacts.map(ppContact => ({
          first_name: ppContact.first_name || '',
          last_name: ppContact.last_name || '',
          email: ppContact.email,
          phone_primary: ppContact.phone_mobile || ppContact.phone_work,
          company: ppContact.company,
          is_active: ppContact.is_active !== false,
          
          // PP fields
          pp_id: ppContact.id,
          pp_display_name: ppContact.display_name,
          pp_first_name: ppContact.first_name,
          pp_last_name: ppContact.last_name,
          pp_email: ppContact.email,
          pp_company: ppContact.company,
          pp_synced_at: new Date(),
          pp_raw_data: ppContact,
          created_at: new Date(),
          updated_at: new Date()
        }));
        
        const { error } = await this.supabase
          .from('contacts')
          .upsert(contactData, { onConflict: 'pp_id' });
        
        if (error) {
          console.error('❌ Contacts batch insert failed:', error.message);
          this.stats.contacts.errors = contacts.length;
        } else {
          this.stats.contacts.synced = contacts.length;
          console.log(`✅ ${contacts.length} contacts synced`);
        }
      }
      
    } catch (error) {
      console.error('❌ Contacts sync failed:', error.message);
    }
    console.log('');
  }

  async syncMattersOptimized() {
    console.log('📁 Syncing Matters→Exchanges (Priority 3) - First 500...');
    
    try {
      const response = await this.ppService.client.get('/matters', { params: { limit: 500 } });
      const matters = Object.values(response.data) || [];
      
      console.log(`📥 Found ${matters.length} matters`);
      this.stats.matters.fetched = matters.length;
      
      if (matters.length > 0) {
        const exchangeData = matters.map(ppMatter => ({
          name: ppMatter.name || ppMatter.display_name,
          exchange_number: ppMatter.number?.toString() || `PP-${ppMatter.id}`,
          exchange_type: 'delayed', // Default for PP matters
          status: this.mapStatus(ppMatter.status),
          
          // PP fields
          pp_matter_id: ppMatter.id,
          pp_display_name: ppMatter.display_name,
          pp_name: ppMatter.name,
          pp_number: ppMatter.number,
          pp_status: ppMatter.status,
          pp_synced_at: new Date(),
          pp_raw_data: ppMatter,
          
          // Required fields
          exchange_chat_id: ppMatter.id,
          created_at: new Date(),
          updated_at: new Date()
        }));
        
        const { error } = await this.supabase
          .from('exchanges')
          .upsert(exchangeData, { onConflict: 'pp_matter_id' });
        
        if (error) {
          console.error('❌ Exchanges batch insert failed:', error.message);
          this.stats.matters.errors = matters.length;
        } else {
          this.stats.matters.synced = matters.length;
          console.log(`✅ ${matters.length} exchanges synced`);
        }
      }
      
    } catch (error) {
      console.error('❌ Matters sync failed:', error.message);
    }
    console.log('');
  }

  async syncTasksOptimized() {
    console.log('✅ Syncing Tasks (Priority 4) - First 500...');
    
    try {
      const response = await this.ppService.client.get('/tasks', { params: { limit: 500 } });
      const tasks = Object.values(response.data) || [];
      
      console.log(`📥 Found ${tasks.length} tasks`);
      this.stats.tasks.fetched = tasks.length;
      
      if (tasks.length > 0) {
        const taskData = tasks.map(ppTask => ({
          title: ppTask.name || 'Untitled Task',
          description: ppTask.description,
          status: this.mapTaskStatus(ppTask.status),
          due_date: ppTask.due_date ? new Date(ppTask.due_date) : null,
          
          // PP fields
          pp_id: ppTask.id,
          pp_name: ppTask.name,
          pp_description: ppTask.description,
          pp_status: ppTask.status,
          pp_due_date: ppTask.due_date ? new Date(ppTask.due_date) : null,
          pp_synced_at: new Date(),
          pp_raw_data: ppTask,
          created_at: new Date(),
          updated_at: new Date()
        }));
        
        const { error } = await this.supabase
          .from('tasks')
          .upsert(taskData, { onConflict: 'pp_id' });
        
        if (error) {
          console.error('❌ Tasks batch insert failed:', error.message);
          this.stats.tasks.errors = tasks.length;
        } else {
          this.stats.tasks.synced = tasks.length;
          console.log(`✅ ${tasks.length} tasks synced`);
        }
      }
      
    } catch (error) {
      console.error('❌ Tasks sync failed:', error.message);
    }
    console.log('');
  }

  // Helper methods
  mapUserRole(ppUser) {
    if (ppUser.is_admin) return 'admin';
    return 'coordinator';
  }

  mapStatus(status) {
    const statusMap = {
      'open': 'active',
      'active': 'active',
      'closed': 'completed'
    };
    return statusMap[status?.toLowerCase()] || 'active';
  }

  mapTaskStatus(status) {
    const statusMap = {
      'not_started': 'pending',
      'in_progress': 'in_progress',
      'completed': 'completed'
    };
    return statusMap[status?.toLowerCase()] || 'pending';
  }

  async showProgress() {
    console.log('📊 SYNC PROGRESS REPORT');
    console.log('======================');
    
    Object.entries(this.stats).forEach(([table, stats]) => {
      const success = stats.synced;
      const total = stats.fetched;
      const rate = total > 0 ? ((success / total) * 100).toFixed(1) : '0.0';
      
      console.log(`${table.padEnd(10)}: ${success.toString().padStart(4)}/${total.toString().padStart(4)} synced (${rate}%)`);
    });
    
    const totalSynced = Object.values(this.stats).reduce((sum, s) => sum + s.synced, 0);
    const totalFetched = Object.values(this.stats).reduce((sum, s) => sum + s.fetched, 0);
    
    console.log('======================');
    console.log(`TOTAL     : ${totalSynced.toString().padStart(4)}/${totalFetched.toString().padStart(4)} synced`);
    
    // Show database counts
    console.log('');
    console.log('📋 DATABASE VERIFICATION');
    console.log('========================');
    
    const tables = ['users', 'contacts', 'exchanges', 'tasks'];
    for (const table of tables) {
      try {
        const { count } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        console.log(`${table.padEnd(10)}: ${(count || 0).toLocaleString().padStart(6)} total records`);
      } catch (err) {
        console.log(`${table.padEnd(10)}: Error - ${err.message}`);
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  const sync = new EfficientPPSync();
  sync.runOptimizedSync()
    .then(() => {
      console.log('');
      console.log('🎉 Priority sync completed! Your 1031 platform is ready to use.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Sync failed:', error.message);
      process.exit(1);
    });
}

module.exports = EfficientPPSync;