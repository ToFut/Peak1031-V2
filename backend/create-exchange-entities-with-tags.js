require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function createExchangeEntitiesWithTags(exchangeId) {
  console.log(`🏢 Creating entities with tags for exchange: ${exchangeId}`);

  // Define all possible entity types and their roles in a 1031 exchange
  const entityDefinitions = [
    // Primary Parties
    {
      role: 'buyer',
      contact_type: ['client'],
      tags: ['buyer', 'primary-party', 'replacement-property'],
      description: 'Entity purchasing replacement property'
    },
    {
      role: 'seller', 
      contact_type: ['client'],
      tags: ['seller', 'primary-party', 'relinquished-property'],
      description: 'Entity selling relinquished property'
    },
    {
      role: 'client',
      contact_type: ['client'], 
      tags: ['client', 'exchanger', 'primary'],
      description: 'Main client conducting 1031 exchange'
    },
    
    // Professional Services
    {
      role: 'qualified_intermediary',
      contact_type: ['intermediary'],
      tags: ['qi', 'facilitator', 'exchange-professional', 'required'],
      description: 'Qualified Intermediary facilitating exchange'
    },
    {
      role: 'settlement_agent',
      contact_type: ['attorney'],
      tags: ['settlement', 'closing', 'legal', 'required'],
      description: 'Attorney or agent handling settlement'
    },
    {
      role: 'title_company',
      contact_type: ['title_company'],
      tags: ['title', 'closing', 'insurance', 'required'],
      description: 'Title company providing title insurance'
    },
    {
      role: 'escrow_officer',
      contact_type: ['escrow_officer'],
      tags: ['escrow', 'closing', 'funds-handling', 'required'],
      description: 'Escrow officer managing transaction funds'
    },
    
    // Real Estate Professionals  
    {
      role: 'buyers_agent',
      contact_type: ['realtor', 'agent'],
      tags: ['realtor', 'buyer-side', 'replacement-property', 'representation'],
      description: 'Real estate agent representing buyer'
    },
    {
      role: 'sellers_agent', 
      contact_type: ['realtor', 'agent'],
      tags: ['realtor', 'seller-side', 'relinquished-property', 'representation'],
      description: 'Real estate agent representing seller'
    },
    {
      role: 'listing_agent',
      contact_type: ['realtor', 'agent'], 
      tags: ['realtor', 'listing', 'marketing', 'seller-side'],
      description: 'Agent listing the property for sale'
    },
    
    // Financial & Lending
    {
      role: 'lender',
      contact_type: ['lender'],
      tags: ['lender', 'financing', 'loan-officer', 'debt'],
      description: 'Lender providing financing for replacement property'
    },
    {
      role: 'loan_officer',
      contact_type: ['lender'],
      tags: ['loan-officer', 'financing', 'processing', 'underwriting'],
      description: 'Loan officer processing financing'
    },
    
    // Professional Advisory
    {
      role: 'attorney',
      contact_type: ['attorney'],
      tags: ['attorney', 'legal-counsel', 'advisory', 'representation'],
      description: 'Attorney providing legal counsel'
    },
    {
      role: 'cpa',
      contact_type: ['accountant'],
      tags: ['cpa', 'tax-advisor', 'advisory', '1031-expert'],
      description: 'CPA advising on tax implications'
    },
    {
      role: 'tax_advisor',
      contact_type: ['accountant'],
      tags: ['tax-advisor', 'advisory', '1031-specialist', 'compliance'],
      description: 'Tax professional specializing in 1031 exchanges'
    },
    
    // Property Services
    {
      role: 'appraiser',
      contact_type: ['appraiser'],
      tags: ['appraiser', 'valuation', 'property-assessment', 'required'],
      description: 'Licensed appraiser valuing properties'
    },
    {
      role: 'inspector',
      contact_type: ['inspector'],
      tags: ['inspector', 'due-diligence', 'property-condition', 'contingency'],
      description: 'Inspector examining property condition'
    },
    {
      role: 'surveyor',
      contact_type: ['vendor'],
      tags: ['surveyor', 'boundary', 'property-lines', 'due-diligence'],
      description: 'Surveyor mapping property boundaries'
    },
    {
      role: 'property_manager',
      contact_type: ['agent'],
      tags: ['property-manager', 'operations', 'maintenance', 'rental'],
      description: 'Property manager for rental properties'
    },
    
    // Support Services
    {
      role: 'coordinator',
      contact_type: ['agent'],
      tags: ['coordinator', 'project-management', 'internal', 'facilitation'],
      description: 'Exchange coordinator managing process'
    },
    {
      role: 'paralegal',
      contact_type: ['attorney'],
      tags: ['paralegal', 'support', 'documentation', 'legal-assistant'],
      description: 'Paralegal supporting legal processes'
    },
    {
      role: 'transaction_coordinator',
      contact_type: ['agent'],
      tags: ['transaction-coordinator', 'logistics', 'timeline', 'coordination'],
      description: 'Coordinator managing transaction logistics'
    },
    
    // Third Party Services
    {
      role: 'insurance_agent',
      contact_type: ['agent'],
      tags: ['insurance', 'coverage', 'risk-management', 'protection'],
      description: 'Insurance agent providing property coverage'
    },
    {
      role: 'environmental_consultant',
      contact_type: ['vendor'],
      tags: ['environmental', 'compliance', 'assessment', 'due-diligence'],
      description: 'Environmental consultant for assessments'
    },
    {
      role: 'zoning_attorney',
      contact_type: ['attorney'],
      tags: ['zoning', 'land-use', 'compliance', 'municipal'],
      description: 'Attorney specializing in zoning issues'
    }
  ];

  // Sample contact creation function
  async function createEntityContact(entityDef, contactInfo) {
    const contactData = {
      exchange_id: exchangeId,
      first_name: contactInfo.firstName,
      last_name: contactInfo.lastName,
      display_name: `${contactInfo.firstName} ${contactInfo.lastName}`,
      email: contactInfo.email,
      phone_primary: contactInfo.phone,
      company: contactInfo.company,
      title: contactInfo.title || entityDef.role.replace('_', ' '),
      contact_type: entityDef.contact_type,
      tags: entityDef.tags,
      notes: `Role: ${entityDef.description}`,
      is_active: true
    };

    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert(contactData)
        .select()
        .single();
        
      if (error) throw error;
      
      console.log(`✅ Created ${entityDef.role}: ${contactData.display_name}`);
      return data;
    } catch (error) {
      console.error(`❌ Error creating ${entityDef.role}:`, error.message);
      return null;
    }
  }

  // Create exchange participants relationship
  async function createExchangeParticipant(contactId, role, permissions = 'view_only') {
    try {
      const { data, error } = await supabase
        .from('exchange_participants')
        .insert({
          exchange_id: exchangeId,
          contact_id: contactId,
          role: role,
          permissions: permissions,
          is_active: true
        })
        .select()
        .single();
        
      if (error) throw error;
      console.log(`✅ Added participant with role: ${role}`);
      return data;
    } catch (error) {
      console.error(`❌ Error creating participant:`, error.message);
      return null;
    }
  }

  return {
    entityDefinitions,
    createEntityContact,
    createExchangeParticipant
  };
}

// Example usage for the specific exchange
async function createEntitiesForExchange() {
  const exchangeId = 'e00bfb0f-df96-438e-98f0-87ef91b708a7';
  
  const { createEntityContact, createExchangeParticipant, entityDefinitions } = 
    await createExchangeEntitiesWithTags(exchangeId);

  console.log('\n📋 Available Entity Types:');
  console.log('=' .repeat(50));
  
  entityDefinitions.forEach((entity, index) => {
    console.log(`${index + 1}. ${entity.role.toUpperCase()}`);
    console.log(`   Contact Type: ${entity.contact_type.join(', ')}`);
    console.log(`   Tags: ${entity.tags.join(', ')}`);
    console.log(`   Description: ${entity.description}`);
    console.log('');
  });

  // Example: Create some missing entities for this exchange
  const missingEntities = [
    {
      entityType: 'qualified_intermediary',
      contactInfo: {
        firstName: 'Sarah',
        lastName: 'Mitchell',
        email: 'sarah.mitchell@1031qi.com',
        phone: '(555) 123-4567',
        company: '1031 Exchange Solutions',
        title: 'Qualified Intermediary'
      }
    },
    {
      entityType: 'title_company',
      contactInfo: {
        firstName: 'Michael',
        lastName: 'Rodriguez',
        email: 'mrodriguez@fidelitytitle.com',
        phone: '(555) 234-5678',
        company: 'Fidelity National Title',
        title: 'Title Officer'
      }
    },
    {
      entityType: 'buyers_agent',
      contactInfo: {
        firstName: 'Jennifer',
        lastName: 'Thompson',
        email: 'jennifer@premierealty.com',
        phone: '(555) 345-6789',
        company: 'Premier Realty Group',
        title: 'Senior Real Estate Agent'
      }
    }
  ];

  console.log('\n🚀 Creating sample entities...');
  console.log('=' .repeat(50));

  for (const missing of missingEntities) {
    const entityDef = entityDefinitions.find(e => e.role === missing.entityType);
    if (entityDef) {
      const contact = await createEntityContact(entityDef, missing.contactInfo);
      if (contact) {
        await createExchangeParticipant(contact.id, entityDef.role);
      }
    }
  }

  console.log('\n✅ Entity creation completed!');
}

// Export for use in other scripts
module.exports = {
  createExchangeEntitiesWithTags
};

// Run if called directly
if (require.main === module) {
  createEntitiesForExchange().catch(console.error);
}