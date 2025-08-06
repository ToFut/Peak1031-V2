#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { faker } = require('@faker-js/faker');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Arrays for realistic 1031 exchange data
const companies = [
  'Properties LLC', 'Investments Inc', 'Real Estate Group', 'Holdings Corp',
  'Development Partners', 'Capital Management', 'Asset Management', 'Property Group',
  'Realty Trust', 'Investment Properties', 'Commercial Real Estate', 'Land Development'
];

const roles = ['client', 'third_party', 'agency', null]; // null for contacts without login
const contactTypes = ['Individual', 'Corporation', 'LLC', 'Partnership', 'Trust', 'Estate'];

function generateContact(index) {
  const isUser = Math.random() > 0.3; // 70% chance of being a user
  const hasCompany = Math.random() > 0.4; // 60% chance of having a company
  const isPPContact = Math.random() > 0.5; // 50% from PracticePanther
  
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const companyType = faker.helpers.arrayElement(companies);
  const company = hasCompany ? `${lastName} ${companyType}` : null;
  
  return {
    // Basic Info
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    password_hash: isUser ? '$2b$10$YourHashedPasswordHere' : null, // In real app, properly hash
    first_name: firstName,
    last_name: lastName,
    phone: faker.phone.number('+1-###-###-####'),
    company: company,
    
    // Address
    address_street: faker.location.streetAddress(),
    address_city: faker.location.city(),
    address_state: faker.location.state({ abbreviated: true }),
    address_zip_code: faker.location.zipCode('#####'),
    address_country: 'US',
    
    // Authentication & Roles
    role: isUser ? faker.helpers.arrayElement(roles) : null,
    is_user: isUser,
    is_active: true,
    email_verified: isUser && Math.random() > 0.2, // 80% verified
    two_fa_enabled: false,
    last_login: isUser && Math.random() > 0.5 ? faker.date.recent({ days: 30 }) : null,
    
    // PracticePanther Integration
    pp_contact_id: isPPContact ? `PP_${Date.now()}_${index}` : null,
    pp_data: isPPContact ? {
      original_id: `PP_${Date.now()}_${index}`,
      contact_type: faker.helpers.arrayElement(contactTypes),
      tax_id: `${faker.number.int({ min: 10, max: 99 })}-${faker.number.int({ min: 1000000, max: 9999999 })}`,
      client_since: faker.date.past({ years: 5 }),
      total_exchanges: faker.number.int({ min: 0, max: 10 }),
      net_worth_category: faker.helpers.arrayElement(['< $1M', '$1M-$5M', '$5M-$10M', '$10M+']),
      preferred_contact_method: faker.helpers.arrayElement(['email', 'phone', 'text']),
      notes: faker.lorem.sentence()
    } : {},
    source: isPPContact ? 'practice_partner' : 'manual',
    last_sync_at: isPPContact ? faker.date.recent({ days: 7 }) : null,
    
    // Timestamps
    created_at: faker.date.past({ years: 2 }),
    updated_at: faker.date.recent({ days: 30 })
  };
}

async function importContacts() {
  console.log('🚀 Starting import of 1000 sample contacts...\n');
  
  const batchSize = 50; // Insert in batches for better performance
  const totalContacts = 1000;
  let successCount = 0;
  let errorCount = 0;
  
  try {
    // Process in batches
    for (let i = 0; i < totalContacts; i += batchSize) {
      const batch = [];
      const currentBatchSize = Math.min(batchSize, totalContacts - i);
      
      // Generate batch of contacts
      for (let j = 0; j < currentBatchSize; j++) {
        batch.push(generateContact(i + j));
      }
      
      // Insert batch
      console.log(`📤 Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(totalContacts / batchSize)} (${batch.length} contacts)...`);
      
      const { data, error } = await supabase
        .from('people')
        .insert(batch)
        .select('id');
      
      if (error) {
        console.error(`❌ Error in batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        errorCount += currentBatchSize;
      } else {
        successCount += data.length;
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} inserted successfully (${data.length} contacts)`);
      }
      
      // Progress update every 100 contacts
      if ((i + currentBatchSize) % 100 === 0) {
        console.log(`\n📊 Progress: ${i + currentBatchSize}/${totalContacts} contacts processed`);
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}\n`);
      }
    }
    
    // Final summary
    console.log('\n🎉 IMPORT COMPLETE!');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Successfully imported: ${successCount} contacts`);
    console.log(`❌ Failed imports: ${errorCount} contacts`);
    console.log('═══════════════════════════════════════');
    
    // Get some statistics
    const { data: stats } = await supabase
      .from('people')
      .select('role, is_user, source')
      .limit(1000);
    
    if (stats) {
      const userCount = stats.filter(s => s.is_user).length;
      const ppCount = stats.filter(s => s.source === 'practice_partner').length;
      const roleBreakdown = stats.reduce((acc, s) => {
        if (s.role) acc[s.role] = (acc[s.role] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📈 Contact Statistics:');
      console.log(`   Total people: ${stats.length}`);
      console.log(`   Users (can login): ${userCount}`);
      console.log(`   Contacts only: ${stats.length - userCount}`);
      console.log(`   From PracticePanther: ${ppCount}`);
      console.log(`   Manual entries: ${stats.length - ppCount}`);
      console.log('\n   Role breakdown:');
      Object.entries(roleBreakdown).forEach(([role, count]) => {
        console.log(`   - ${role}: ${count}`);
      });
    }
    
    // Show sample contacts
    const { data: samples } = await supabase
      .from('people')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (samples && samples.length > 0) {
      console.log('\n📋 Sample contacts (newest first):');
      samples.forEach((contact, i) => {
        console.log(`\n${i + 1}. ${contact.first_name} ${contact.last_name}`);
        console.log(`   Email: ${contact.email}`);
        console.log(`   Company: ${contact.company || 'N/A'}`);
        console.log(`   Role: ${contact.role || 'Contact only'}`);
        console.log(`   Source: ${contact.source}`);
        if (contact.pp_contact_id) {
          console.log(`   PP ID: ${contact.pp_contact_id}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Fatal error during import:', error.message);
  }
}

// Install faker if not present
async function checkDependencies() {
  try {
    require('@faker-js/faker');
  } catch (error) {
    console.log('📦 Installing @faker-js/faker...');
    const { execSync } = require('child_process');
    execSync('npm install @faker-js/faker', { stdio: 'inherit' });
    console.log('✅ Dependencies installed\n');
  }
}

// Run the import
checkDependencies().then(() => {
  importContacts().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
});