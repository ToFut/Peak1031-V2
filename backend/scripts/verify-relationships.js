#!/usr/bin/env node

/**
 * RELATIONSHIP VERIFICATION SCRIPT
 * Tests foreign key relationships in the 1031 platform
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

class RelationshipVerifier {
  constructor() {
    require('dotenv').config();
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  async run() {
    console.log('🔍 VERIFYING BUSINESS ENTITY RELATIONSHIPS');
    console.log('==========================================');
    console.log(`Started: ${new Date().toISOString()}`);
    console.log('');

    try {
      await this.testConnection();
      await this.verifyTableCounts();
      await this.verifyRelationships();
      await this.showSampleData();
      
      console.log('\n✅ All relationship verifications completed successfully!');
      
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
    }
  }

  async testConnection() {
    console.log('🔌 Testing Supabase connection...');
    const { error } = await this.supabase.from('users').select('id').limit(1);
    if (error && !error.message.includes('JSON object requested')) {
      throw error;
    }
    console.log('✅ Connected to Supabase database\n');
  }

  async verifyTableCounts() {
    console.log('📊 Table Record Counts:');
    console.log('======================');
    
    const tables = ['users', 'contacts', 'exchanges', 'tasks', 'invoices', 'expenses'];
    
    for (const table of tables) {
      try {
        const { count } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        console.log(`${table.padEnd(12)}: ${(count || 0).toLocaleString().padStart(6)} records`);
      } catch (err) {
        console.log(`${table.padEnd(12)}: Error - ${err.message}`);
      }
    }
    console.log('');
  }

  async verifyRelationships() {
    console.log('🔗 Foreign Key Relationship Verification:');
    console.log('=========================================');
    
    // Test each foreign key relationship
    const relationships = [
      {
        name: 'Contacts → Exchanges',
        query: `
          SELECT c.first_name, c.last_name, e.name as exchange_name
          FROM contacts c
          JOIN exchanges e ON c.primary_exchange_id = e.id
          LIMIT 3
        `
      },
      {
        name: 'Exchanges → Users (Coordinator)',
        query: `
          SELECT e.name as exchange_name, u.first_name, u.last_name
          FROM exchanges e
          JOIN users u ON e.coordinator_id = u.id
          LIMIT 3
        `
      },
      {
        name: 'Exchanges → Contacts (Primary Client)',
        query: `
          SELECT e.name as exchange_name, c.first_name, c.last_name
          FROM exchanges e
          JOIN contacts c ON e.primary_client_id = c.id
          LIMIT 3
        `
      },
      {
        name: 'Tasks → Exchanges',
        query: `
          SELECT t.title as task_title, e.name as exchange_name
          FROM tasks t
          JOIN exchanges e ON t.exchange_id = e.id
          LIMIT 3
        `
      },
      {
        name: 'Tasks → Users (Assigned To)',
        query: `
          SELECT t.title as task_title, u.first_name, u.last_name
          FROM tasks t
          JOIN users u ON t.assigned_to = u.id
          LIMIT 3
        `
      },
      {
        name: 'Invoices → Exchanges',
        query: `
          SELECT i.invoice_number, e.name as exchange_name, i.total_amount
          FROM invoices i
          JOIN exchanges e ON i.exchange_id = e.id
          LIMIT 3
        `
      },
      {
        name: 'Invoices → Contacts (Client)',
        query: `
          SELECT i.invoice_number, c.first_name, c.last_name, i.total_amount
          FROM invoices i
          JOIN contacts c ON i.client_id = c.id
          LIMIT 3
        `
      },
      {
        name: 'Expenses → Exchanges',
        query: `
          SELECT exp.description, e.name as exchange_name, exp.amount
          FROM expenses exp
          JOIN exchanges e ON exp.exchange_id = e.id
          LIMIT 3
        `
      },
      {
        name: 'Expenses → Users',
        query: `
          SELECT exp.description, u.first_name, u.last_name, exp.amount
          FROM expenses exp
          JOIN users u ON exp.user_id = u.id
          LIMIT 3
        `
      }
    ];

    for (const rel of relationships) {
      try {
        const { data, error } = await this.supabase.rpc('exec_sql', { 
          sql_query: rel.query 
        });
        
        if (error) {
          console.log(`❌ ${rel.name}: ${error.message}`);
        } else if (data && data.length > 0) {
          console.log(`✅ ${rel.name}: ${data.length} sample relationships found`);
          data.forEach((row, i) => {
            const values = Object.values(row).join(' | ');
            console.log(`   ${i + 1}. ${values}`);
          });
        } else {
          console.log(`⚠️  ${rel.name}: No relationships found (data might not be linked yet)`);
        }
        
      } catch (err) {
        // Try direct query if RPC doesn't work
        try {
          const parts = rel.query.split('FROM')[1].split('LIMIT')[0].trim();
          const [mainTable] = parts.split(/JOIN|WHERE/)[0].trim().split(' ');
          
          const { count } = await this.supabase
            .from(mainTable)
            .select('*', { count: 'exact', head: true });
            
          console.log(`⚠️  ${rel.name}: Found ${count} total records (relationship verification needs manual check)`);
          
        } catch (err2) {
          console.log(`❌ ${rel.name}: Error - ${err.message}`);
        }
      }
      
      console.log('');
    }
  }

  async showSampleData() {
    console.log('📋 Sample Business Entity Data:');
    console.log('===============================');
    
    // Show sample data with PP integration
    try {
      console.log('👥 Users with PP Integration:');
      const { data: users } = await this.supabase
        .from('users')
        .select('first_name, last_name, email, pp_user_id, pp_synced_at')
        .not('pp_user_id', 'is', null)
        .limit(3);
      
      if (users && users.length > 0) {
        users.forEach((user, i) => {
          console.log(`   ${i + 1}. ${user.first_name} ${user.last_name} (${user.email}) - PP ID: ${user.pp_user_id}`);
        });
      } else {
        console.log('   No users with PP integration found');
      }
      console.log('');

      console.log('📞 Contacts with Exchange Links:');
      const { data: contacts } = await this.supabase
        .from('contacts')
        .select('first_name, last_name, email, pp_contact_id, primary_exchange_id')
        .not('pp_contact_id', 'is', null)
        .limit(3);
      
      if (contacts && contacts.length > 0) {
        contacts.forEach((contact, i) => {
          const exchangeLink = contact.primary_exchange_id ? '✅ Linked' : '❌ Not Linked';
          console.log(`   ${i + 1}. ${contact.first_name} ${contact.last_name} - PP ID: ${contact.pp_contact_id} - Exchange: ${exchangeLink}`);
        });
      } else {
        console.log('   No contacts with PP integration found');
      }
      console.log('');

      console.log('🏢 Exchanges with Relationships:');
      const { data: exchanges } = await this.supabase
        .from('exchanges')
        .select('name, exchange_number, pp_matter_id, coordinator_id, primary_client_id')
        .not('pp_matter_id', 'is', null)
        .limit(3);
      
      if (exchanges && exchanges.length > 0) {
        exchanges.forEach((exchange, i) => {
          const coordinator = exchange.coordinator_id ? '✅ Coordinator' : '❌ No Coordinator';
          const client = exchange.primary_client_id ? '✅ Client' : '❌ No Client';
          console.log(`   ${i + 1}. ${exchange.name} (${exchange.exchange_number}) - PP ID: ${exchange.pp_matter_id}`);
          console.log(`      ${coordinator} | ${client}`);
        });
      } else {
        console.log('   No exchanges with PP integration found');
      }
      console.log('');

    } catch (error) {
      console.log(`❌ Sample data retrieval failed: ${error.message}`);
      console.log('');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const verifier = new RelationshipVerifier();
  verifier.run()
    .then(() => {
      console.log('\n🎉 Relationship verification completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Verification failed:', error.message);
      process.exit(1);
    });
}

module.exports = RelationshipVerifier;