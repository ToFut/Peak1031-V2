const supabaseService = require('./services/supabase');
const { v4: uuidv4 } = require('uuid');

async function createExchangeMockData() {
  console.log('🎭 Creating comprehensive exchange mock data...');
  
  try {
    // First, get an exchange to populate
    const exchanges = await supabaseService.getExchanges({ limit: 1 });
    if (!exchanges || exchanges.length === 0) {
      console.log('❌ No exchanges found. Please create an exchange first.');
      return;
    }
    
    const exchange = exchanges[0];
    console.log(`📋 Populating exchange: ${exchange.name || exchange.exchange_number || exchange.id}`);
    
    // Get some users to assign tasks and messages
    const users = await supabaseService.getUsers({ limit: 5 });
    const adminUser = users.find(u => u.role === 'admin') || users[0];
    const coordinatorUser = users.find(u => u.role === 'coordinator') || users[1];
    const clientUser = users.find(u => u.role === 'client') || users[2];
    
    // 1. CREATE MOCK DOCUMENTS
    console.log('📄 Creating mock documents...');
    const mockDocuments = [
      {
        id: uuidv4(),
        filename: 'exchange_agreement_signed.pdf',
        original_filename: 'Exchange Agreement - Signed.pdf',
        title: 'Signed Exchange Agreement',
        description: 'Fully executed 1031 exchange agreement with all parties',
        exchange_id: exchange.id,
        uploaded_by: coordinatorUser?.id || adminUser?.id,
        file_type: 'application/pdf',
        file_size: 2847392, // ~2.7MB
        mime_type: 'application/pdf',
        storage_path: '/documents/exchanges/' + exchange.id + '/exchange_agreement_signed.pdf',
        storage_provider: 'aws_s3',
        access_level: 'standard',
        is_confidential: false,
        pin_protected: false,
        document_type: 'agreement',
        document_category: 'legal',
        version_number: 1,
        processing_status: 'completed',
        tags: ['agreement', 'signed', 'legal'],
        is_active: true,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        filename: 'property_deed_relinquished.pdf',
        original_filename: 'Property Deed - 123 Main Street.pdf',
        title: 'Relinquished Property Deed',
        description: 'Deed for the property being relinquished in the exchange',
        exchange_id: exchange.id,
        uploaded_by: clientUser?.id || adminUser?.id,
        file_type: 'application/pdf',
        file_size: 1847392,
        mime_type: 'application/pdf',
        storage_path: '/documents/exchanges/' + exchange.id + '/property_deed_relinquished.pdf',
        storage_provider: 'aws_s3',
        access_level: 'standard',
        is_confidential: true,
        pin_protected: true,
        pin_hash: '$2b$10$hashedpin123',
        document_type: 'deed',
        document_category: 'property',
        version_number: 1,
        processing_status: 'completed',
        tags: ['deed', 'relinquished', 'property'],
        is_active: true,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        filename: 'identification_notice.pdf',
        original_filename: '45-Day Identification Notice.pdf',
        title: '45-Day Identification Notice',
        description: 'Official identification of replacement properties',
        exchange_id: exchange.id,
        uploaded_by: coordinatorUser?.id || adminUser?.id,
        file_type: 'application/pdf',
        file_size: 947392,
        mime_type: 'application/pdf',
        storage_path: '/documents/exchanges/' + exchange.id + '/identification_notice.pdf',
        storage_provider: 'aws_s3',
        access_level: 'standard',
        is_confidential: false,
        pin_protected: false,
        document_type: 'notice',
        document_category: 'compliance',
        version_number: 1,
        processing_status: 'completed',
        tags: ['identification', '45-day', 'notice'],
        is_active: true,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        filename: 'financial_statements.xlsx',
        original_filename: 'Exchange Financial Analysis.xlsx',
        title: 'Exchange Financial Analysis',
        description: 'Detailed financial breakdown and cash flow analysis',
        exchange_id: exchange.id,
        uploaded_by: coordinatorUser?.id || adminUser?.id,
        file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        file_size: 1247392,
        mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        storage_path: '/documents/exchanges/' + exchange.id + '/financial_statements.xlsx',
        storage_provider: 'aws_s3',
        access_level: 'standard',
        is_confidential: true,
        pin_protected: false,
        document_type: 'financial',
        document_category: 'financial',
        version_number: 2,
        processing_status: 'completed',
        tags: ['financial', 'analysis', 'cash-flow'],
        is_active: true,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago (updated)
      },
      {
        id: uuidv4(),
        filename: 'replacement_property_photos.zip',
        original_filename: 'Replacement Property Photos.zip',
        title: 'Replacement Property Photos',
        description: 'Photo documentation of potential replacement properties',
        exchange_id: exchange.id,
        uploaded_by: clientUser?.id || adminUser?.id,
        file_type: 'application/zip',
        file_size: 15847392, // ~15MB
        mime_type: 'application/zip',
        storage_path: '/documents/exchanges/' + exchange.id + '/replacement_property_photos.zip',
        storage_provider: 'aws_s3',
        access_level: 'standard',
        is_confidential: false,
        pin_protected: false,
        document_type: 'photos',
        document_category: 'property',
        version_number: 1,
        processing_status: 'completed',
        tags: ['photos', 'replacement', 'property', 'documentation'],
        is_active: true,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ];
    
    for (const doc of mockDocuments) {
      await supabaseService.createDocument(doc);
    }
    console.log(`✅ Created ${mockDocuments.length} mock documents`);
    
    // 2. CREATE MOCK TASKS
    console.log('📋 Creating mock tasks...');
    const mockTasks = [
      {
        id: uuidv4(),
        title: 'Review and Execute Exchange Agreement',
        description: 'Client needs to review the exchange agreement and provide signatures from all parties involved.',
        exchange_id: exchange.id,
        assigned_to: clientUser?.id || adminUser?.id,
        created_by: coordinatorUser?.id || adminUser?.id,
        status: 'COMPLETED',
        priority: 'HIGH',
        due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        completed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        category: 'legal',
        task_type: 'document_review',
        estimated_duration: '2 hours',
        completion_percentage: 100,
        tags: ['agreement', 'signature', 'legal'],
        is_active: true,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        title: 'Submit 45-Day Identification Notice',
        description: 'Prepare and submit the official 45-day identification notice with selected replacement properties.',
        exchange_id: exchange.id,
        assigned_to: coordinatorUser?.id || adminUser?.id,
        created_by: coordinatorUser?.id || adminUser?.id,
        status: 'COMPLETED',
        priority: 'URGENT',
        due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        start_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        category: 'compliance',
        task_type: 'filing',
        estimated_duration: '3 hours',
        completion_percentage: 100,
        tags: ['45-day', 'identification', 'notice', 'compliance'],
        is_active: true,
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        title: 'Coordinate Property Inspections',
        description: 'Schedule and coordinate professional inspections for all identified replacement properties.',
        exchange_id: exchange.id,
        assigned_to: coordinatorUser?.id || adminUser?.id,
        created_by: coordinatorUser?.id || adminUser?.id,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        start_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        category: 'property',
        task_type: 'coordination',
        estimated_duration: '5 hours',
        completion_percentage: 65,
        tags: ['inspection', 'coordination', 'property'],
        is_active: true,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        id: uuidv4(),
        title: 'Finalize Replacement Property Selection',
        description: 'Client to make final decision on replacement properties based on inspection reports and financial analysis.',
        exchange_id: exchange.id,
        assigned_to: clientUser?.id || adminUser?.id,
        created_by: coordinatorUser?.id || adminUser?.id,
        status: 'PENDING',
        priority: 'URGENT',
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        category: 'decision',
        task_type: 'client_action',
        estimated_duration: '2 hours',
        completion_percentage: 25,
        tags: ['selection', 'decision', 'replacement'],
        is_active: true,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        title: 'Prepare Purchase Agreements',
        description: 'Draft purchase agreements for the selected replacement properties and coordinate with legal counsel.',
        exchange_id: exchange.id,
        assigned_to: coordinatorUser?.id || adminUser?.id,
        created_by: coordinatorUser?.id || adminUser?.id,
        status: 'PENDING',
        priority: 'HIGH',
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        category: 'legal',
        task_type: 'document_preparation',
        estimated_duration: '4 hours',
        completion_percentage: 0,
        tags: ['purchase-agreement', 'legal', 'drafting'],
        is_active: true,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        title: 'Update Financial Analysis',
        description: 'Update the financial analysis spreadsheet with latest property values and financing options.',
        exchange_id: exchange.id,
        assigned_to: coordinatorUser?.id || adminUser?.id,
        created_by: coordinatorUser?.id || adminUser?.id,
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        start_date: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        category: 'financial',
        task_type: 'analysis',
        estimated_duration: '3 hours',
        completion_percentage: 40,
        tags: ['financial', 'analysis', 'update'],
        is_active: true,
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      }
    ];
    
    for (const task of mockTasks) {
      await supabaseService.createTask(task);
    }
    console.log(`✅ Created ${mockTasks.length} mock tasks`);
    
    // 3. CREATE MOCK MESSAGES
    console.log('💬 Creating mock messages...');
    const mockMessages = [
      {
        id: uuidv4(),
        content: 'Welcome to your 1031 exchange! I\'ll be coordinating this process with you. Please let me know if you have any questions as we move forward.',
        sender_id: coordinatorUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        message_type: 'text',
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        content: 'Thank you! I\'m excited to get started. I\'ve reviewed the initial documentation and everything looks good so far.',
        sender_id: clientUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        message_type: 'text',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 7 days ago + 2 hours
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        content: 'Great! I\'ve uploaded the signed exchange agreement. Please review and let me know if you need any changes before we proceed to the next phase.',
        sender_id: coordinatorUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        message_type: 'text',
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        content: 'Perfect! The agreement looks good. I\'ve also uploaded the property deed for the relinquished property. It\'s PIN protected as discussed.',
        sender_id: clientUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        message_type: 'text',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 5 days ago + 3 hours
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        content: '📄 System notification: 45-Day Identification Notice has been successfully submitted and filed.',
        sender_id: null, // system message
        exchange_id: exchange.id,
        message_type: 'system',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        content: 'Excellent news on the identification notice! I\'ve scheduled inspections for next week. I\'ll upload the inspection reports as soon as they\'re available.',
        sender_id: coordinatorUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        message_type: 'text',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        content: 'I\'ve attached some photos of the replacement properties we\'re considering. The financial analysis has also been updated with the latest market values.',
        sender_id: clientUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        message_type: 'text',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        content: 'Thanks for the photos! They look promising. I have a few questions about the financing options for Property B. Could we schedule a call this week to discuss?',
        sender_id: clientUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        message_type: 'text',
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        updated_at: new Date(Date.now() - 8 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        content: 'Absolutely! I have availability Thursday at 2 PM or Friday at 10 AM. Which works better for you? We can discuss all the financing options in detail.',
        sender_id: coordinatorUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        message_type: 'text',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        content: 'Thursday at 2 PM works perfectly! Looking forward to our discussion.',
        sender_id: clientUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        message_type: 'text',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];
    
    for (const message of mockMessages) {
      await supabaseService.createMessage(message);
    }
    console.log(`✅ Created ${mockMessages.length} mock messages`);
    
    // 4. CREATE EXCHANGE PARTICIPANTS (if not exists)
    console.log('👥 Creating exchange participants...');
    const mockParticipants = [
      {
        id: uuidv4(),
        exchange_id: exchange.id,
        user_id: coordinatorUser?.id,
        role: 'coordinator',
        is_primary: true,
        is_decision_maker: true,
        permission_level: 'full_access',
        can_view_documents: true,
        can_upload_documents: true,
        can_comment: true,
        can_create_tasks: true,
        can_view_financial: true,
        receive_notifications: true,
        can_access_chat: true,
        chat_channels: ['exchange_general', 'exchange_documents', 'exchange_tasks'],
        joined_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        is_active: true,
        last_activity_at: new Date(Date.now() - 4 * 60 * 60 * 1000),
        responsiveness_score: 95,
        engagement_score: 88,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000),
        created_by: adminUser?.id
      },
      {
        id: uuidv4(),
        exchange_id: exchange.id,
        user_id: clientUser?.id,
        role: 'client',
        is_primary: true,
        is_decision_maker: true,
        permission_level: 'edit_documents',
        can_view_documents: true,
        can_upload_documents: true,
        can_comment: true,
        can_create_tasks: false,
        can_view_financial: true,
        receive_notifications: true,
        can_access_chat: true,
        chat_channels: ['exchange_general', 'exchange_documents'],
        joined_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        is_active: true,
        last_activity_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
        responsiveness_score: 78,
        engagement_score: 82,
        created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
        created_by: coordinatorUser?.id || adminUser?.id
      }
    ];
    
    // Check if participants already exist
    const existingParticipants = await supabaseService.getExchangeParticipants({
      where: { exchange_id: exchange.id }
    });
    
    if (!existingParticipants || existingParticipants.length === 0) {
      for (const participant of mockParticipants) {
        if (participant.user_id) { // Only create if we have a valid user_id
          await supabaseService.createExchangeParticipant(participant);
        }
      }
      console.log(`✅ Created ${mockParticipants.length} exchange participants`);
    } else {
      console.log(`ℹ️ Exchange participants already exist (${existingParticipants.length} found)`);
    }
    
    // 5. UPDATE EXCHANGE WITH MORE DETAILS
    console.log('🏢 Updating exchange with additional details...');
    const exchangeUpdates = {
      name: exchange.name || `Premium Commercial Exchange ${new Date().getFullYear()}`,
      relinquished_property_value: 1250000.00,
      replacement_property_value: 1450000.00,
      cash_boot: 25000.00,
      financing_amount: 950000.00,
      sale_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      identification_deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), // 35 days from now
      exchange_deadline: new Date(Date.now() + 170 * 24 * 60 * 60 * 1000), // 170 days from now
      status: 'active',
      priority: 'high',
      completion_percentage: 35,
      relinquished_properties: JSON.stringify([
        {
          address: '123 Main Street, Downtown, CA 90210',
          propertyType: 'Commercial Office Building',
          value: 1250000,
          status: 'sold'
        }
      ]),
      replacement_properties: JSON.stringify([
        {
          address: '456 Business Ave, Tech District, CA 90211',
          propertyType: 'Mixed Use Development',
          value: 850000,
          status: 'identified'
        },
        {
          address: '789 Commerce Blvd, Financial District, CA 90212',
          propertyType: 'Retail Shopping Center',
          value: 600000,
          status: 'under_consideration'
        }
      ]),
      property_types: ['commercial', 'mixed_use', 'retail'],
      tags: ['commercial', 'high-value', 'multi-property', '2024'],
      notes: 'High-value commercial exchange with multiple replacement property options. Client is experienced investor.',
      updated_at: new Date()
    };
    
    await supabaseService.updateExchange(exchange.id, exchangeUpdates);
    console.log('✅ Updated exchange with comprehensive details');
    
    console.log('\n🎉 MOCK DATA CREATION COMPLETE!');
    console.log('\n📊 Summary:');
    console.log(`   🏢 Exchange: ${exchange.name || exchange.exchange_number || exchange.id}`);
    console.log(`   📄 Documents: ${mockDocuments.length} created`);
    console.log(`   📋 Tasks: ${mockTasks.length} created`);
    console.log(`   💬 Messages: ${mockMessages.length} created`);
    console.log(`   👥 Participants: ${mockParticipants.filter(p => p.user_id).length} created`);
    console.log('\n✨ Your exchange should now have rich data in all tabs!');
    
  } catch (error) {
    console.error('❌ Error creating mock data:', error);
    throw error;
  }
}

// Run the mock data creation
if (require.main === module) {
  createExchangeMockData().catch(console.error);
}

module.exports = createExchangeMockData;