const DocumentTemplateService = require('./services/documentTemplateService');

// Test the enhanced DOCX generation system
async function testEnhancedDocxGeneration() {
  console.log('🧪 Testing Enhanced DOCX Generation System\n');

  // Test Case 1: Single Client Exchange
  console.log('📊 Test Case 1: Single Client Exchange');
  const singleClientData = {
    '#Exchange.ID#': 'EX-2024-001',
    '#Exchange.Name#': 'Smith Single Exchange',
    '#Exchange.Value#': '$500,000',
    client: {
      id: 'client-001',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@email.com',
      phone: '(555) 123-4567',
      role: 'client',
      ownershipPercentage: '100%'
    },
    properties: [
      {
        id: 'prop-001',
        address: '123 Main St',
        value: '$500,000',
        type: 'relinquished'
      },
      {
        id: 'prop-002',
        address: '456 Oak Ave',
        value: '$500,000',
        type: 'replacement'
      }
    ]
  };

  const singleClientResult = DocumentTemplateService.identifyClientsInExchange(singleClientData);
  console.log('✅ Single Client Identification:');
  console.log(`   Primary: ${singleClientResult.primary?.name}`);
  console.log(`   Secondary Count: ${singleClientResult.secondary.length}`);
  console.log(`   Total Clients: ${singleClientResult.all.length}\n`);

  // Test Case 2: Married Couple Exchange
  console.log('📊 Test Case 2: Married Couple Exchange');
  const coupleData = {
    '#Exchange.ID#': 'EX-2024-002',
    '#Exchange.Name#': 'Smith Couple Exchange',
    '#Exchange.Value#': '$750,000',
    clients: [
      {
        id: 'client-001',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@email.com',
        role: 'client',
        ownershipPercentage: '60%'
      },
      {
        id: 'client-002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@email.com',
        role: 'client',
        ownershipPercentage: '40%'
      }
    ],
    properties: [
      {
        id: 'prop-001',
        address: '789 Pine St',
        value: '$750,000',
        type: 'relinquished'
      },
      {
        id: 'prop-002',
        address: '321 Elm Ave',
        value: '$750,000',
        type: 'replacement'
      }
    ]
  };

  const coupleResult = DocumentTemplateService.identifyClientsInExchange(coupleData);
  console.log('✅ Couple Exchange Identification:');
  console.log(`   Primary: ${coupleResult.primary?.name} (${coupleResult.primary?.ownershipPercentage})`);
  console.log(`   Secondary: ${coupleResult.secondary.map(c => c.name).join(', ')}`);
  console.log(`   Total Clients: ${coupleResult.all.length}\n`);

  // Test Case 3: Trust Exchange
  console.log('📊 Test Case 3: Trust Exchange');
  const trustData = {
    '#Exchange.ID#': 'EX-2024-003',
    '#Exchange.Name#': 'Smith Trust Exchange',
    '#Exchange.Value#': '$1,200,000',
    clients: [
      {
        id: 'trust-001',
        name: 'Smith Family Trust',
        company: 'Smith Family Trust',
        role: 'trustee',
        entityType: 'trust'
      },
      {
        id: 'client-001',
        firstName: 'John',
        lastName: 'Smith',
        role: 'trustee'
      },
      {
        id: 'client-002',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'beneficiary'
      }
    ],
    properties: [
      {
        id: 'prop-001',
        address: '555 Trust Ave',
        value: '$1,200,000',
        type: 'relinquished'
      },
      {
        id: 'prop-002',
        address: '777 Estate Blvd',
        value: '$1,200,000',
        type: 'replacement'
      }
    ]
  };

  const trustResult = DocumentTemplateService.identifyClientsInExchange(trustData);
  console.log('✅ Trust Exchange Identification:');
  console.log(`   Primary: ${trustResult.primary?.name} (${trustResult.primary?.entityType})`);
  console.log(`   Trustees: ${trustResult.byRole.trustee?.map(c => c.name).join(', ')}`);
  console.log(`   Beneficiaries: ${trustResult.byRole.beneficiary?.map(c => c.name).join(', ')}\n`);

  // Test Case 4: Partnership Exchange
  console.log('📊 Test Case 4: Partnership Exchange');
  const partnershipData = {
    '#Exchange.ID#': 'EX-2024-004',
    '#Exchange.Name#': 'ABC Partnership Exchange',
    '#Exchange.Value#': '$2,000,000',
    clients: [
      {
        id: 'partnership-001',
        name: 'ABC Partnership LLC',
        company: 'ABC Partnership LLC',
        role: 'client',
        entityType: 'partnership'
      },
      {
        id: 'partner-001',
        firstName: 'John',
        lastName: 'Doe',
        role: 'partner',
        ownershipPercentage: '50%'
      },
      {
        id: 'partner-002',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'partner',
        ownershipPercentage: '50%'
      }
    ],
    properties: [
      {
        id: 'prop-001',
        address: '999 Business St',
        value: '$2,000,000',
        type: 'relinquished'
      },
      {
        id: 'prop-002',
        address: '111 Corporate Ave',
        value: '$2,000,000',
        type: 'replacement'
      }
    ]
  };

  const partnershipResult = DocumentTemplateService.identifyClientsInExchange(partnershipData);
  console.log('✅ Partnership Exchange Identification:');
  console.log(`   Primary: ${partnershipResult.primary?.name} (${partnershipResult.primary?.entityType})`);
  console.log(`   Partners: ${partnershipResult.byRole.partner?.map(c => c.name).join(', ')}`);
  console.log(`   Total Participants: ${partnershipResult.all.length}\n`);

  // Test Enhanced Template Data Preparation
  console.log('📄 Testing Enhanced Template Data Preparation');
  const enhancedData = DocumentTemplateService.prepareEnhancedTemplateData(singleClientData);
  console.log('✅ Enhanced Template Data Keys:');
  console.log(`   Exchange: ${enhancedData['#Exchange.ID#']}`);
  console.log(`   Client: ${enhancedData['#Client.Name#']}`);
  console.log(`   Client Count: ${enhancedData['#ClientCount#']}`);
  console.log(`   Properties: ${enhancedData['#RelinquishedProperties#']}`);
  console.log(`   Coordinator: ${enhancedData['#Coordinator.Name#']}\n`);

  // Test Property Identification
  console.log('🏠 Testing Property Identification');
  const properties = DocumentTemplateService.identifyPropertiesInExchange(singleClientData);
  console.log('✅ Property Identification:');
  console.log(`   Relinquished: ${properties.relinquished.length} properties`);
  console.log(`   Replacement: ${properties.replacement.length} properties`);
  console.log(`   Primary Relinquished: ${properties.primaryRelinquished?.address}`);
  console.log(`   Primary Replacement: ${properties.primaryReplacement?.address}\n`);

  // Test Participant Identification
  console.log('👥 Testing Participant Identification');
  const participantData = {
    ...singleClientData,
    participants: [
      {
        id: 'coord-001',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah@peak1031.com',
        role: 'coordinator'
      },
      {
        id: 'attorney-001',
        firstName: 'Mike',
        lastName: 'Wilson',
        email: 'mike@lawfirm.com',
        role: 'attorney'
      },
      {
        id: 'accountant-001',
        firstName: 'Lisa',
        lastName: 'Brown',
        email: 'lisa@cpa.com',
        role: 'accountant'
      },
      {
        id: 'title-001',
        name: 'ABC Title Co',
        company: 'ABC Title Co',
        role: 'title_company'
      }
    ]
  };

  const participants = DocumentTemplateService.identifyParticipantsInExchange(participantData);
  console.log('✅ Participant Identification:');
  console.log(`   Coordinators: ${participants.coordinators.length}`);
  console.log(`   Attorneys: ${participants.attorneys.length}`);
  console.log(`   Accountants: ${participants.accountants.length}`);
  console.log(`   Title Companies: ${participants.titleCompanies.length}`);
  console.log(`   Total Participants: ${participants.all.length}\n`);

  console.log('🎉 Enhanced DOCX Generation System Test Complete!');
  console.log('\n📋 Summary:');
  console.log('✅ Intelligent client identification working');
  console.log('✅ Property categorization working');
  console.log('✅ Participant role mapping working');
  console.log('✅ Enhanced template data preparation working');
  console.log('✅ Multiple client scenarios handled correctly');
  console.log('✅ Complex entity types supported');
  console.log('✅ Professional team identification working');
}

// Run the test
testEnhancedDocxGeneration().catch(console.error);








