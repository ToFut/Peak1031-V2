const supabaseService = require('./services/supabase');
const { v4: uuidv4 } = require('uuid');

async function createMinimalMockData() {
  console.log('🎭 Creating minimal exchange mock data...');
  
  try {
    // Get an exchange to populate
    const exchanges = await supabaseService.getExchanges({ limit: 1 });
    if (!exchanges || exchanges.length === 0) {
      console.log('❌ No exchanges found. Please create an exchange first.');
      return;
    }
    
    const exchange = exchanges[0];
    console.log(`📋 Populating exchange: ${exchange.name || exchange.exchange_number || exchange.id}`);
    
    // Get users for assignments
    const users = await supabaseService.getUsers({ limit: 5 });
    const adminUser = users.find(u => u.role === 'admin') || users[0];
    const coordinatorUser = users.find(u => u.role === 'coordinator') || users[1];
    const clientUser = users.find(u => u.role === 'client') || users[2];
    
    // 1. CREATE MOCK DOCUMENTS (minimal schema)
    console.log('📄 Creating mock documents...');
    const mockDocuments = [
      {
        id: uuidv4(),
        filename: 'exchange_agreement_signed.pdf',
        original_filename: 'Exchange Agreement - Signed.pdf',
        file_path: '/documents/exchanges/' + exchange.id + '/exchange_agreement_signed.pdf',
        exchange_id: exchange.id,
        uploaded_by: coordinatorUser?.id || adminUser?.id,
        file_size: 2847392,
        mime_type: 'application/pdf',
        category: 'legal',
        tags: JSON.stringify(['agreement', 'signed', 'legal']),
        pin_required: false,
        is_template: false,
        template_data: JSON.stringify({}),
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        filename: 'property_deed_relinquished.pdf',
        original_filename: 'Property Deed - 123 Main Street.pdf',
        file_path: '/documents/exchanges/' + exchange.id + '/property_deed_relinquished.pdf',
        exchange_id: exchange.id,
        uploaded_by: clientUser?.id || adminUser?.id,
        file_size: 1847392,
        mime_type: 'application/pdf',
        category: 'property',
        tags: JSON.stringify(['deed', 'relinquished', 'property']),
        pin_required: true,
        pin_hash: '$2b$10$hashedpin123',
        is_template: false,
        template_data: JSON.stringify({}),
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        filename: 'identification_notice.pdf',
        original_filename: '45-Day Identification Notice.pdf',
        file_path: '/documents/exchanges/' + exchange.id + '/identification_notice.pdf',
        exchange_id: exchange.id,
        uploaded_by: coordinatorUser?.id || adminUser?.id,
        file_size: 947392,
        mime_type: 'application/pdf',
        category: 'compliance',
        tags: JSON.stringify(['identification', '45-day', 'notice']),
        pin_required: false,
        is_template: false,
        template_data: JSON.stringify({}),
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        filename: 'financial_analysis.xlsx',
        original_filename: 'Exchange Financial Analysis.xlsx',
        file_path: '/documents/exchanges/' + exchange.id + '/financial_analysis.xlsx',
        exchange_id: exchange.id,
        uploaded_by: coordinatorUser?.id || adminUser?.id,
        file_size: 1247392,
        mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        category: 'financial',
        tags: JSON.stringify(['financial', 'analysis', 'cash-flow']),
        pin_required: false,
        is_template: false,
        template_data: JSON.stringify({}),
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        filename: 'property_photos.zip',
        original_filename: 'Replacement Property Photos.zip',
        file_path: '/documents/exchanges/' + exchange.id + '/property_photos.zip',
        exchange_id: exchange.id,
        uploaded_by: clientUser?.id || adminUser?.id,
        file_size: 15847392,
        mime_type: 'application/zip',
        category: 'property',
        tags: JSON.stringify(['photos', 'replacement', 'property']),
        pin_required: false,
        is_template: false,
        template_data: JSON.stringify({}),
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    for (const doc of mockDocuments) {
      await supabaseService.createDocument(doc);
    }
    console.log(`✅ Created ${mockDocuments.length} mock documents`);
    
    // 2. CREATE MOCK TASKS (minimal schema)
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
        due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'legal',
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
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
        due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'compliance',
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
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
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'property',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
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
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'decision',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
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
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'legal',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
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
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'financial',
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
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
        content: 'Welcome to your 1031 exchange! I will be coordinating this process with you. Please let me know if you have any questions as we move forward.',
        sender_id: coordinatorUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: 'Thank you! I am excited to get started. I have reviewed the initial documentation and everything looks good so far.',
        sender_id: clientUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: 'Great! I have uploaded the signed exchange agreement. Please review and let me know if you need any changes before we proceed to the next phase.',
        sender_id: coordinatorUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: 'Perfect! The agreement looks good. I have also uploaded the property deed for the relinquished property. It is PIN protected as discussed.',
        sender_id: clientUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: 'Excellent news on the identification notice! I have scheduled inspections for next week. I will upload the inspection reports as soon as they are available.',
        sender_id: coordinatorUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: 'I have attached some photos of the replacement properties we are considering. The financial analysis has also been updated with the latest market values.',
        sender_id: clientUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: 'Thanks for the photos! They look promising. I have a few questions about the financing options for Property B. Could we schedule a call this week to discuss?',
        sender_id: clientUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: 'Absolutely! I have availability Thursday at 2 PM or Friday at 10 AM. Which works better for you? We can discuss all the financing options in detail.',
        sender_id: coordinatorUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: 'Thursday at 2 PM works perfectly! Looking forward to our discussion.',
        sender_id: clientUser?.id || adminUser?.id,
        exchange_id: exchange.id,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    for (const message of mockMessages) {
      await supabaseService.createMessage(message);
    }
    console.log(`✅ Created ${mockMessages.length} mock messages`);
    
    // 4. UPDATE EXCHANGE WITH BETTER DATA
    console.log('🏢 Updating exchange with additional details...');
    const exchangeUpdates = {
      name: exchange.name || `Premium Commercial Exchange ${new Date().getFullYear()}`,
      relinquished_property_value: 1250000.00,
      replacement_property_value: 1450000.00,
      cash_boot: 25000.00,
      financing_amount: 950000.00,
      sale_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      identification_deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
      exchange_deadline: new Date(Date.now() + 170 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      priority: 'high',
      completion_percentage: 35,
      notes: 'High-value commercial exchange with multiple replacement property options. Client is experienced investor.',
      updated_at: new Date().toISOString()
    };
    
    await supabaseService.updateExchange(exchange.id, exchangeUpdates);
    console.log('✅ Updated exchange with comprehensive details');
    
    console.log('\n🎉 MINIMAL MOCK DATA CREATION COMPLETE!');
    console.log('\n📊 Summary:');
    console.log(`   🏢 Exchange: ${exchange.name || exchange.exchange_number || exchange.id}`);
    console.log(`   📄 Documents: ${mockDocuments.length} created`);
    console.log(`   📋 Tasks: ${mockTasks.length} created`);
    console.log(`   💬 Messages: ${mockMessages.length} created`);
    console.log('\n✨ Your exchange should now show data in all tabs!');
    console.log('\n🔄 Please refresh the exchange page to see the new data.');
    
  } catch (error) {
    console.error('❌ Error creating minimal mock data:', error);
    throw error;
  }
}

// Run the minimal mock data creation
if (require.main === module) {
  createMinimalMockData().catch(console.error);
}

module.exports = createMinimalMockData;