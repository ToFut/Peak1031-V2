#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Exchanges using schema-matching field names
const exchanges = [
  {
    exchange_number: 'EX-2025-001',
    name: 'ABC Corp Dallas Office Building Exchange',
    exchange_type: 'delayed',
    relinquished_property_value: 2500000,
    replacement_property_value: 2800000,
    sale_date: '2025-01-30',
    identification_deadline: '2025-03-15',
    exchange_deadline: '2025-08-15',
    status: 'active'
  },
  {
    exchange_number: 'EX-2025-002', 
    name: 'Smith Holdings Retail Property Exchange',
    exchange_type: 'delayed',
    relinquished_property_value: 3500000,
    replacement_property_value: 3800000,
    sale_date: '2025-01-10',
    identification_deadline: '2025-02-28',
    exchange_deadline: '2025-07-28',
    status: 'active'
  },
  {
    exchange_number: 'EX-2025-003',
    name: 'Johnson Trust Apartment Complex Exchange',
    exchange_type: 'delayed',
    relinquished_property_value: 5200000,
    replacement_property_value: 5500000,
    sale_date: '2025-02-25',
    identification_deadline: '2025-04-10',
    exchange_deadline: '2025-09-10',
    status: 'active'
  },
  {
    exchange_number: 'EX-2024-001',
    name: 'ABC Corp Industrial Warehouse Exchange',
    exchange_type: 'delayed',
    relinquished_property_value: 1800000,
    replacement_property_value: 2100000,
    sale_date: '2024-08-01',
    identification_deadline: '2024-09-15',
    exchange_deadline: '2025-02-15',
    status: 'completed'
  },
  {
    exchange_number: 'EX-2024-002',
    name: 'Smith Holdings Office to Retail Exchange',
    exchange_type: 'delayed',
    relinquished_property_value: 2200000,
    replacement_property_value: 2400000,
    sale_date: '2024-07-05',
    identification_deadline: '2024-08-20',
    exchange_deadline: '2025-01-20',
    status: 'completed'
  }
];

async function seedExchanges() {
  console.log('🌱 Seeding exchanges with correct schema...');
  
  try {
    const { data, error } = await supabase
      .from('exchanges')
      .insert(exchanges);

    if (error) {
      console.error('❌ Error seeding exchanges:', error);
      return;
    }

    console.log(`✅ Successfully seeded ${exchanges.length} exchanges`);
    
    // Verify
    const { data: verifyData, error: verifyError } = await supabase
      .from('exchanges')
      .select('*');
      
    if (verifyError) {
      console.error('❌ Error verifying:', verifyError);
      return;
    }
    
    console.log(`📊 Total exchanges in database: ${verifyData?.length || 0}`);
    
    if (verifyData && verifyData.length > 0) {
      console.log('\n🎯 Sample seeded exchange:');
      console.log('=' .repeat(40));
      const sample = verifyData[0];
      console.log(`Name: ${sample.name}`);
      console.log(`Number: ${sample.exchange_number}`);
      console.log(`Status: ${sample.status}`);
      console.log(`Value: $${sample.exchange_value?.toLocaleString()}`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

seedExchanges().then(() => {
  console.log('🌟 Seeding complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});