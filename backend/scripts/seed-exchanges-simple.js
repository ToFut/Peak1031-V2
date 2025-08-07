#!/usr/bin/env node

/**
 * Seed Exchanges Data to Supabase - Simplified version based on actual table structure
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample exchange data matching actual table structure
const sampleExchanges = [
  {
    // Core required fields
    name: 'Dallas Office Building Exchange',
    exchange_name: 'ABC Corp Dallas Office Building Exchange',
    status: 'active',
    
    // Timeline fields
    day_45_deadline: '2025-03-15',
    day_180_deadline: '2025-08-15',
    start_date: '2025-01-15',
    
    // Property information (using individual fields)
    relinquished_property_address: '1234 Main Street, Dallas, TX 75201',
    relinquished_sale_price: 2500000,
    relinquished_closing_date: '2025-01-30',
    
    // Exchange details
    exchange_coordinator_name: 'Jane Smith',
    attorney_or_cpa: 'ABC Law Firm',
    bank_account_escrow: 'First National Bank - Escrow #123456',
    
    // PracticePanther individual fields
    pp_matter_id: 'PP-2025-001',
    type_of_exchange: 'Delayed',
    rel_property_city: 'Dallas',
    rel_property_state: 'TX',
    rel_property_zip: '75201',
    rel_property_address: '1234 Main Street',
    rel_value: 2500000,
    rel_contract_date: '2024-12-15',
    close_of_escrow_date: '2025-01-30',
    day_45: '2025-03-15',
    day_180: '2025-08-15',
    proceeds: 2200000,
    client_vesting: 'ABC Corp, a Texas Corporation',
    rate: '4.5%',
    bank: 'First Nat',
    
    // Replacement property fields
    buyer_1_name: 'ABC Corp',
    rep_1_city: 'Plano',
    rep_1_state: 'TX',
    rep_1_zip: '75024',
    rep_1_property_address: '5678 Commerce Street',
    rep_1_value: 2800000,
    rep_1_contract_date: '2025-03-01',
    
    // JSONB fields
    sale_property: {
      address: '1234 Main Street, Dallas, TX 75201',
      type: 'Office Building',
      sale_price: 2500000,
      closing_date: '2025-01-30',
      square_feet: 15000,
      year_built: 1985
    },
    purchase_property: {
      address: '5678 Commerce Street, Plano, TX 75024',
      type: 'Office Building',
      target_price: 2800000,
      target_closing_date: '2025-06-15',
      identified: true,
      under_contract: false
    },
    pp_data: {
      matter_id: 'PP-2025-001',
      status: 'Active',
      last_sync: '2025-01-15T10:00:00Z'
    },
    metadata: {
      priority: 'HIGH',
      risk_level: 'LOW',
      exchange_type: 'DELAYED',
      progress: 35
    },
    
    // Array fields
    tags: ['high-value', 'commercial', 'office'],
    assigned_to_users: [],
    
    // Timestamps
    pp_created_at: '2025-01-15T10:00:00Z',
    pp_updated_at: '2025-01-15T10:00:00Z',
    last_sync_at: '2025-01-15T10:00:00Z'
  },
  {
    name: 'Retail Property Exchange',
    exchange_name: 'Smith Holdings Retail Property Exchange',
    status: 'pending_45_day',
    
    day_45_deadline: '2025-02-28',
    day_180_deadline: '2025-07-28',
    start_date: '2025-01-05',
    
    relinquished_property_address: '789 Oak Avenue, Fort Worth, TX 76102',
    relinquished_sale_price: 3500000,
    relinquished_closing_date: '2025-01-10',
    
    exchange_coordinator_name: 'Bob Johnson',
    attorney_or_cpa: 'Legal Associates',
    bank_account_escrow: 'State Bank - Escrow #789012',
    
    pp_matter_id: 'PP-2025-002',
    type_of_exchange: 'Delayed',
    rel_property_city: 'Fort Worth',
    rel_property_state: 'TX',
    rel_property_zip: '76102',
    rel_property_address: '789 Oak Avenue',
    rel_value: 3500000,
    rel_contract_date: '2024-12-01',
    close_of_escrow_date: '2025-01-10',
    day_45: '2025-02-28',
    day_180: '2025-07-28',
    proceeds: 3200000,
    client_vesting: 'Smith Holdings LLC',
    rate: '3.8%',
    
    sale_property: {
      address: '789 Oak Avenue, Fort Worth, TX 76102',
      type: 'Retail Strip Center',
      sale_price: 3500000,
      closing_date: '2025-01-10',
      square_feet: 22000,
      year_built: 1995,
      tenants: 8
    },
    purchase_property: {
      status: 'identifying',
      target_price: 3800000,
      property_types: ['Retail', 'Mixed Use'],
      target_markets: ['Dallas', 'Austin', 'Houston']
    },
    metadata: {
      priority: 'URGENT',
      risk_level: 'MEDIUM',
      exchange_type: 'DELAYED',
      progress: 15
    },
    
    tags: ['retail', 'urgent', '45-day-critical']
  },
  {
    name: 'Apartment Complex Exchange',
    exchange_name: 'Johnson Trust Apartment Complex Exchange',
    status: 'identifying',
    
    day_45_deadline: '2025-04-10',
    day_180_deadline: '2025-09-10',
    start_date: '2025-02-01',
    
    relinquished_property_address: '321 Elm Street, Arlington, TX 76010',
    relinquished_sale_price: 5200000,
    relinquished_closing_date: '2025-02-25',
    
    type_of_exchange: 'Delayed',
    rel_value: 5200000,
    
    sale_property: {
      address: '321 Elm Street, Arlington, TX 76010',
      type: 'Multifamily',
      sale_price: 5200000,
      closing_date: '2025-02-25',
      units: 48,
      year_built: 2001,
      occupancy_rate: 0.92
    },
    purchase_property: {
      status: 'identifying',
      target_price: 5500000,
      property_types: ['Multifamily', 'Senior Living'],
      minimum_units: 40
    },
    metadata: {
      priority: 'MEDIUM',
      risk_level: 'LOW',
      exchange_type: 'DELAYED',
      progress: 25
    },
    
    tags: ['multifamily', 'high-value']
  }
];

async function seedExchanges() {
  console.log('🌱 Seeding exchange data...\n');
  
  try {
    // Insert sample exchanges one by one to handle any field mismatches gracefully
    for (let i = 0; i < sampleExchanges.length; i++) {
      const exchange = sampleExchanges[i];
      console.log(`📝 Inserting exchange ${i + 1}: ${exchange.exchange_name}`);
      
      const { data, error } = await supabase
        .from('exchanges')
        .insert([exchange])
        .select();

      if (error) {
        console.error(`❌ Error inserting exchange ${i + 1}:`, error.message);
        console.error('   Details:', error.details);
        console.error('   Hint:', error.hint);
        continue;
      }

      console.log(`✅ Successfully inserted exchange ${i + 1}`);
    }
    
    // Verify the seeded data
    const { data: verifyData, error: verifyError } = await supabase
      .from('exchanges')
      .select('*');
      
    if (verifyError) {
      console.error('❌ Error verifying seeded data:', verifyError);
      return;
    }
    
    console.log(`\n📊 Total exchanges in database: ${verifyData?.length || 0}`);
    
    if (verifyData && verifyData.length > 0) {
      console.log('\n🎯 Sample seeded exchange:');
      console.log('=' .repeat(40));
      const sample = verifyData[0];
      console.log(`Name: ${sample.exchange_name}`);
      console.log(`Status: ${sample.status}`);
      console.log(`45-Day Deadline: ${sample.day_45_deadline}`);
      console.log(`180-Day Deadline: ${sample.day_180_deadline}`);
      console.log(`Relinquished Value: $${sample.relinquished_sale_price?.toLocaleString()}`);
      console.log(`Property Address: ${sample.relinquished_property_address}`);
      
      // Show available fields
      const allFields = Object.keys(sample);
      console.log(`\n📋 Available fields (${allFields.length} total):`);
      console.log(allFields.join(', '));
    }
    
  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
  }
}

// Run the seeding
seedExchanges().then(() => {
  console.log('\n🌟 Seeding complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});