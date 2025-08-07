#!/usr/bin/env node

/**
 * Seed Exchanges Data to Supabase
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

// Sample exchange data with all available fields
const sampleExchanges = [
  {
    id: 'exch-001',
    name: 'Dallas Office Building Exchange',
    exchange_name: 'ABC Corp Dallas Office Building Exchange',
    status: 'In Progress',
    client_id: 'cont-001',
    coordinator_id: 'user-001',
    
    // Timeline fields
    day_45_deadline: '2025-03-15',
    day_180_deadline: '2025-08-15',
    start_date: '2025-01-15',
    completion_date: null,
    
    // Property information
    relinquished_property_address: '1234 Main Street, Dallas, TX 75201',
    relinquished_sale_price: 2500000,
    relinquished_closing_date: '2025-01-30',
    
    // Exchange details
    exchange_coordinator_name: 'Jane Smith',
    attorney_or_cpa: 'ABC Law Firm',
    bank_account_escrow: 'First National Bank - Escrow #123456',
    
    // PracticePanther fields
    pp_matter_id: 'PP-2025-001',
    type_of_exchange: 'Delayed',
    rel_property_city: 'Dallas',
    rel_property_state: 'TX',
    rel_property_zip: '75201',
    rel_property_address: '1234 Main Street',
    rel_apn: 'APN-123-456-789',
    rel_escrow_number: 'ESC-2025-001',
    rel_value: 2500000,
    rel_contract_date: '2024-12-15',
    close_of_escrow_date: '2025-01-30',
    day_45: '2025-03-15',
    day_180: '2025-08-15',
    proceeds: 2200000,
    client_vesting: 'ABC Corp, a Texas Corporation',
    
    // Replacement property
    buyer_1_name: 'ABC Corp',
    rep_1_city: 'Plano',
    rep_1_state: 'TX',
    rep_1_zip: '75024',
    rep_1_property_address: '5678 Commerce Street',
    rep_1_apn: 'APN-987-654-321',
    rep_1_escrow_number: 'ESC-2025-002',
    rep_1_value: 2800000,
    rep_1_contract_date: '2025-03-01',
    rep_1_seller_name: 'XYZ Properties LLC',
    
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
    
    // Other fields
    tags: ['high-value', 'commercial', 'office'],
    assigned_to_users: ['user-001', 'user-002'],
    rate: '4.5%',
    bank: 'First Nat',
    
    // Timestamps
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    pp_created_at: '2025-01-15T10:00:00Z',
    pp_updated_at: '2025-01-15T10:00:00Z',
    last_sync_at: '2025-01-15T10:00:00Z'
  },
  {
    id: 'exch-002',
    name: 'Retail Property Exchange',
    exchange_name: 'Smith Holdings Retail Property Exchange',
    status: '45D',
    client_id: 'cont-002',
    coordinator_id: 'user-002',
    
    // Timeline fields
    day_45_deadline: '2025-02-28',
    day_180_deadline: '2025-07-28',
    start_date: '2025-01-05',
    completion_date: null,
    
    // Property information
    relinquished_property_address: '789 Oak Avenue, Fort Worth, TX 76102',
    relinquished_sale_price: 3500000,
    relinquished_closing_date: '2025-01-10',
    
    // Exchange details
    exchange_coordinator_name: 'Bob Johnson',
    attorney_or_cpa: 'Legal Associates',
    bank_account_escrow: 'State Bank - Escrow #789012',
    
    // PracticePanther fields
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
    
    // JSONB fields
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
    
    // Other fields
    tags: ['retail', 'urgent', '45-day-critical'],
    rate: '3.8%',
    
    // Timestamps
    created_at: '2025-01-05T11:00:00Z',
    updated_at: '2025-01-10T15:00:00Z'
  },
  {
    id: 'exch-003',
    name: 'Apartment Complex Exchange',
    exchange_name: 'Johnson Trust Apartment Complex Exchange',
    status: '180D',
    client_id: 'cont-003',
    coordinator_id: 'user-003',
    
    // Timeline fields
    day_45_deadline: '2025-04-10',
    day_180_deadline: '2025-09-10',
    start_date: '2025-02-01',
    
    // Property information
    relinquished_property_address: '321 Elm Street, Arlington, TX 76010',
    relinquished_sale_price: 5200000,
    relinquished_closing_date: '2025-02-25',
    
    // JSONB fields
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
    
    // Other fields
    tags: ['multifamily', 'high-value'],
    type_of_exchange: 'Delayed',
    rel_value: 5200000,
    
    // Timestamps
    created_at: '2025-02-01T09:00:00Z',
    updated_at: '2025-02-20T14:00:00Z'
  }
];

async function seedExchanges() {
  console.log('🌱 Seeding exchange data...\n');
  
  try {
    // Insert sample exchanges
    const { data, error } = await supabase
      .from('exchanges')
      .upsert(sampleExchanges, { 
        onConflict: 'id',
        returning: 'minimal'
      });

    if (error) {
      console.error('❌ Error seeding exchanges:', error);
      return;
    }

    console.log(`✅ Successfully seeded ${sampleExchanges.length} exchanges`);
    
    // Now verify the data
    const { data: verifyData, error: verifyError } = await supabase
      .from('exchanges')
      .select('*');
      
    if (verifyError) {
      console.error('❌ Error verifying seeded data:', verifyError);
      return;
    }
    
    console.log(`📊 Total exchanges in database: ${verifyData?.length || 0}`);
    
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