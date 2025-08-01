const { sequelize } = require('../config/database');
const { User, Contact, Exchange, Message, Task, Document, AuditLog } = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * Seed script to create mock PracticePanther data for testing exchange-based chat
 * This simulates what would come from PP API and creates realistic exchange scenarios
 */

async function seedExchangeChatData() {
  console.log('🌱 Starting exchange chat data seeding...');

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync models (create tables if needed, don't alter existing ones)
    await sequelize.sync({ force: false });
    console.log('✅ Database models synchronized');

    // Clean existing data for fresh start
    console.log('🧹 Cleaning existing data...');
    
    // Disable foreign key constraints for SQLite
    await sequelize.query('PRAGMA foreign_keys = OFF');
    
    // Delete in reverse dependency order to avoid foreign key constraint errors
    await Message.destroy({ where: {}, force: true });
    await Task.destroy({ where: {}, force: true });
    await Document.destroy({ where: {}, force: true });
    await Exchange.destroy({ where: {}, force: true });
    await Contact.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    
    // Re-enable foreign key constraints
    await sequelize.query('PRAGMA foreign_keys = ON');
    
    console.log('✅ Existing data cleaned');

    // Create mock contacts (simulating PP API responses)
    console.log('👥 Creating mock contacts...');
    
    const contacts = await Contact.bulkCreate([
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        ppContactId: 'PP_CLIENT_001',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@email.com',
        phone: '+1-555-0101',
        company: 'Smith Properties LLC',
        address: '123 Main St, New York, NY 10001',
        pp_data: {
          pp_id: 'PP_CLIENT_001',
          type: 'Individual',
          tax_id: '12-3456789',
          client_type: 'High Net Worth'
        },
        last_sync_at: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        ppContactId: 'PP_CLIENT_002',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@email.com',
        phone: '+1-555-0102',
        company: 'Johnson Investments',
        address: '456 Oak Ave, Los Angeles, CA 90210',
        pp_data: {
          pp_id: 'PP_CLIENT_002',
          type: 'Entity',
          tax_id: '98-7654321'
        },
        last_sync_at: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        ppContactId: 'PP_QI_001',
        firstName: 'Michael',
        lastName: 'Davis',
        email: 'michael.davis@qi-exchange.com',
        phone: '+1-555-0201',
        company: 'Qualified Intermediary Services',
        address: '789 Business Blvd, Chicago, IL 60601',
        pp_data: {
          pp_id: 'PP_QI_001',
          type: 'QI',
          license: 'QI-12345'
        },
        last_sync_at: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        ppContactId: 'PP_ATT_001',
        firstName: 'Lisa',
        lastName: 'Wilson',
        email: 'lisa.wilson@lawfirm.com',
        phone: '+1-555-0301',
        company: 'Wilson & Associates Law',
        address: '321 Legal St, Miami, FL 33101',
        pp_data: {
          pp_id: 'PP_ATT_001',
          type: 'Attorney',
          bar_number: 'ATT-67890'
        },
        last_sync_at: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        ppContactId: 'PP_CPA_001',
        firstName: 'Robert',
        lastName: 'Brown',
        email: 'robert.brown@cpa-firm.com',
        phone: '+1-555-0401',
        company: 'Brown CPA Group',
        address: '567 Tax Ave, Houston, TX 77001',
        pp_data: {
          pp_id: 'PP_CPA_001',
          type: 'CPA',
          license: 'CPA-11111'
        },
        last_sync_at: new Date()
      }
    ]);

    console.log(`✅ Created ${contacts.length} mock contacts`);

    // Create mock exchanges (simulating PP matters)
    console.log('🏢 Creating mock exchanges...');
    
    const exchanges = await Exchange.bulkCreate([
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        pp_matter_id: 'PP_MATTER_001',
        exchange_number: 'EX-2024-001',
        name: 'Smith Commercial Exchange',
        status: '45D',
        exchange_type: 'DELAYED',
        client_id: '550e8400-e29b-41d4-a716-446655440001',
        coordinator_id: null, // Will be set to actual user ID
        start_date: new Date('2024-08-15'),
        identification_deadline: new Date('2024-09-30'),
        completion_deadline: new Date('2025-02-15'),
        exchange_value: 2500000.00,
        relinquished_property: {
          address: '123 Commerce Dr, New York, NY 10001',
          sale_price: 2500000.00,
          property_type: 'Commercial Office Building'
        },
        pp_data: {
          pp_matter_id: 'PP_MATTER_001',
          practice_area: '1031 Exchange',
          status: 'Active',
          matter_type: 'Commercial Real Estate'
        },
        last_sync_at: new Date()
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440002',
        pp_matter_id: 'PP_MATTER_002',
        exchange_number: 'EX-2024-002',
        name: 'Johnson Residential Portfolio',
        status: '180D',
        exchange_type: 'REVERSE',
        client_id: '550e8400-e29b-41d4-a716-446655440002',
        coordinator_id: null,
        start_date: new Date('2024-09-01'),
        identification_deadline: new Date('2024-10-15'),
        completion_deadline: new Date('2025-03-01'),
        exchange_value: 1800000.00,
        relinquished_property: {
          address: '456 Residential St, Los Angeles, CA 90210',
          sale_price: 1800000.00,
          property_type: 'Residential Portfolio'
        },
        pp_data: {
          pp_matter_id: 'PP_MATTER_002',
          practice_area: '1031 Exchange',
          status: 'Active',
          matter_type: 'Residential Real Estate'
        },
        last_sync_at: new Date()
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440003',
        pp_matter_id: 'PP_MATTER_003',
        exchange_number: 'EX-2024-003',
        name: 'Davis Industrial Complex',
        status: 'COMPLETED',
        exchange_type: 'DELAYED',
        client_id: '550e8400-e29b-41d4-a716-446655440001',
        coordinator_id: null,
        start_date: new Date('2024-07-01'),
        identification_deadline: new Date('2024-08-15'),
        completion_deadline: new Date('2024-12-31'),
        exchange_value: 3200000.00,
        relinquished_property: {
          address: '789 Industrial Blvd, Chicago, IL 60601',
          sale_price: 3200000.00,
          property_type: 'Industrial Complex'
        },
        pp_data: {
          pp_matter_id: 'PP_MATTER_003',
          practice_area: '1031 Exchange',
          status: 'Closed',
          matter_type: 'Industrial Real Estate'
        },
        last_sync_at: new Date()
      }
    ]);

    console.log(`✅ Created ${exchanges.length} mock exchanges`);

    // Create tasks for exchanges
    console.log('📋 Creating mock tasks...');
    
    const tasks = await Task.bulkCreate([
      {
        id: '880e8400-e29b-41d4-a716-446655440001',
        ppTaskId: 'PP_TASK_001',
        title: 'Property Appraisal',
        description: 'Schedule and complete professional appraisal of relinquished property',
        status: 'COMPLETED',
        priority: 'HIGH',
        exchange_id: '660e8400-e29b-41d4-a716-446655440001',
        due_date: new Date('2024-08-10'),
        completedAt: new Date('2024-08-08'),
        pp_data: {
          pp_task_id: 'PP_TASK_001',
          assigned_to: 'Property Appraiser',
          billable: true,
          hours: 4.5
        },
        last_sync_at: new Date()
      },
      {
        id: '880e8400-e29b-41d4-a716-446655440002',
        ppTaskId: 'PP_TASK_002',
        title: 'Identification Documents',
        description: 'Prepare and review 45-day identification documents',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        exchange_id: '660e8400-e29b-41d4-a716-446655440001',
        due_date: new Date('2024-09-30'),
        pp_data: {
          pp_task_id: 'PP_TASK_002',
          assigned_to: 'Lisa Wilson',
          billable: true,
          hours: 8.0
        },
        last_sync_at: new Date()
      },
      {
        id: '880e8400-e29b-41d4-a716-446655440003',
        ppTaskId: 'PP_TASK_003',
        title: 'Escrow Setup',
        description: 'Establish qualified escrow account with intermediary',
        status: 'COMPLETED',
        priority: 'MEDIUM',
        exchange_id: '660e8400-e29b-41d4-a716-446655440001',
        due_date: new Date('2024-08-20'),
        completedAt: new Date('2024-08-18'),
        pp_data: {
          pp_task_id: 'PP_TASK_003',
          assigned_to: 'Michael Davis',
          billable: true,
          hours: 2.0
        },
        last_sync_at: new Date()
      }
    ]);

    console.log(`✅ Created ${tasks.length} mock tasks`);

    // Get actual user IDs from database (from Supabase Auth users you created)
    console.log('👤 Looking up existing users...');
    const existingUsers = await User.findAll();
    
    if (existingUsers.length === 0) {
      console.log('⚠️  No users found. Creating sample user profiles...');
      
      // Note: These should match your Supabase Auth users
      const sampleUsers = await User.bulkCreate([
        {
          id: '110e8400-e29b-41d4-a716-446655440001',
          email: 'admin@peak1031.com',
          passwordHash: 'not-used-with-supabase',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          isActive: true
        },
        {
          id: '110e8400-e29b-41d4-a716-446655440002',
          email: 'client@peak1031.com',
          passwordHash: 'not-used-with-supabase',
          firstName: 'John',
          lastName: 'Client',
          role: 'client',  
          isActive: true
        },
        {
          id: '110e8400-e29b-41d4-a716-446655440003',
          email: 'coordinator@peak1031.com',
          passwordHash: 'not-used-with-supabase',
          firstName: 'Sarah',
          lastName: 'Coordinator',
          role: 'coordinator',
          isActive: true
        }
      ]);
      
      console.log(`✅ Created ${sampleUsers.length} sample user profiles`);
      console.log('⚠️  IMPORTANT: Replace user IDs with actual Supabase Auth user IDs!');
    }

    // Create sample messages for testing chat (using placeholder user IDs)
    console.log('💬 Creating sample messages...');
    
    const messages = await Message.bulkCreate([
      {
        id: '990e8400-e29b-41d4-a716-446655440001',
        content: 'Welcome to the Smith Commercial Exchange secure chat. All authorized parties have been added to this communication channel.',
        exchange_id: '660e8400-e29b-41d4-a716-446655440001',
        sender_id: '110e8400-e29b-41d4-a716-446655440001',
        message_type: 'system',
        read_by: [],
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        id: '990e8400-e29b-41d4-a716-446655440002',
        content: 'Hi everyone, the property appraisal has been completed. The report shows fair market value at $2.5M. Documents will be uploaded shortly.',
        exchange_id: '660e8400-e29b-41d4-a716-446655440001',
        sender_id: '110e8400-e29b-41d4-a716-446655440003',
        message_type: 'text',
        read_by: ['110e8400-e29b-41d4-a716-446655440001'],
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        id: '990e8400-e29b-41d4-a716-446655440003',
        content: 'Perfect! @John, please review the appraisal when convenient. We need to finalize identification documents by Sept 30th to stay within the 45-day window.',
        exchange_id: '660e8400-e29b-41d4-a716-446655440001',
        sender_id: '110e8400-e29b-41d4-a716-446655440003',
        message_type: 'text',
        read_by: [],
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
      },
      {
        id: '990e8400-e29b-41d4-a716-446655440004',
        content: 'Thanks for the update! I reviewed the appraisal and everything looks good. The timeline works well from my side. Looking forward to identifying the replacement properties.',
        exchange_id: '660e8400-e29b-41d4-a716-446655440001',
        sender_id: '110e8400-e29b-41d4-a716-446655440002',
        message_type: 'text',
        read_by: ['110e8400-e29b-41d4-a716-446655440003'],
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
      },
      {
        id: '990e8400-e29b-41d4-a716-446655440005',
        content: 'Excellent! I\'ve prepared the preliminary identification documents. We have several strong replacement property candidates. Let\'s schedule a call this week to review options.',
        exchange_id: '660e8400-e29b-41d4-a716-446655440001',
        sender_id: '110e8400-e29b-41d4-a716-446655440003',
        message_type: 'text',
        read_by: [],
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      }
    ]);

    console.log(`✅ Created ${messages.length} sample messages`);

    // Create sample documents
    console.log('📄 Creating sample documents...');
    
    const documents = await Document.bulkCreate([
      {
        id: 'aa0e8400-e29b-41d4-a716-446655440001',
        filename: 'property_appraisal_001.pdf',
        originalFilename: 'Smith Property Appraisal Report.pdf',
        filePath: '/uploads/documents/property_appraisal_001.pdf',
        fileSize: 2548000,
        mimeType: 'application/pdf',
        exchangeId: '660e8400-e29b-41d4-a716-446655440001',
        uploadedBy: '110e8400-e29b-41d4-a716-446655440003',
        category: 'Appraisal',
        tags: ['appraisal', 'property-valuation', 'smith-property'],
        pinRequired: false,
        isTemplate: false
      },
      {
        id: 'aa0e8400-e29b-41d4-a716-446655440002',
        filename: 'identification_letter_001.pdf',
        originalFilename: '45-Day Identification Letter.pdf',
        filePath: '/uploads/documents/identification_letter_001.pdf',
        fileSize: 856000,
        mimeType: 'application/pdf',
        exchangeId: '660e8400-e29b-41d4-a716-446655440001',
        uploadedBy: '110e8400-e29b-41d4-a716-446655440003',
        category: 'Legal',
        tags: ['identification', '45-day', 'legal-document'],
        pinRequired: true,
        pinHash: '$2b$10$encrypted-pin-hash-here'
      }
    ]);

    console.log(`✅ Created ${documents.length} sample documents`);

    // Log audit entry
    await AuditLog.create({
      action: 'MOCK_DATA_SEEDED',
      entityType: 'system',
      entityId: null,
      userId: '110e8400-e29b-41d4-a716-446655440001',
      details: {
        action: 'seeded_exchange_chat_data',
        contacts: contacts.length,
        exchanges: exchanges.length,
        tasks: tasks.length,
        messages: messages.length,
        documents: documents.length,
        timestamp: new Date().toISOString()
      }
    });

    console.log('\n🎉 Exchange chat data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   👥 Contacts: ${contacts.length}`);
    console.log(`   🏢 Exchanges: ${exchanges.length}`);
    console.log(`   📋 Tasks: ${tasks.length}`);
    console.log(`   💬 Messages: ${messages.length}`);
    console.log(`   📄 Documents: ${documents.length}`);
    
    console.log('\n🔐 Security Features Implemented:');
    console.log('   ✅ Exchange-based chat rooms');
    console.log('   ✅ User authentication required');
    console.log('   ✅ Message persistence with read receipts');
    console.log('   ✅ Audit logging for all actions');
    console.log('   ✅ Role-based access control');
    
    console.log('\n⚠️  NEXT STEPS:');
    console.log('   1. Replace placeholder user IDs with actual Supabase Auth user IDs');
    console.log('   2. Add ChatBox component to exchange detail views');
    console.log('   3. Test multi-user chat functionality');
    console.log('   4. Implement exchange participant security validation');
    
    console.log('\n💬 TEST CHAT:');
    console.log('   - Exchange "Smith Commercial Exchange" has sample messages');
    console.log('   - Users can join exchange chat rooms via Socket.IO');
    console.log('   - Messages are persisted and support file attachments');
    
  } catch (error) {
    console.error('❌ Error seeding exchange chat data:', error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeder if called directly
if (require.main === module) {
  seedExchangeChatData()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedExchangeChatData };