#!/usr/bin/env node

/**
 * Run SQL seed file directly through Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple test data that should work with basic table structure
const basicExchanges = [
  {
    exchange_name: 'ABC Corp Dallas Office Building Exchange',
    status: 'active',
    sale_property: {
      address: '1234 Main Street, Dallas, TX 75201',
      type: 'Office Building',
      sale_price: 2500000,
      closing_date: '2025-01-30'
    },
    purchase_property: {
      address: '5678 Commerce Street, Plano, TX 75024',
      type: 'Office Building',
      target_price: 2800000,
      identified: true
    },
    day_45_deadline: '2025-03-15',
    day_180_deadline: '2025-08-15'
  },
  {
    exchange_name: 'Smith Holdings Retail Property Exchange',
    status: 'pending_45_day',
    sale_property: {
      address: '789 Oak Avenue, Fort Worth, TX 76102',
      type: 'Retail Strip Center',
      sale_price: 3500000,
      closing_date: '2025-01-10'
    },
    purchase_property: {
      status: 'identifying',
      target_price: 3800000,
      property_types: ['Retail', 'Mixed Use']
    },
    day_45_deadline: '2025-02-28',
    day_180_deadline: '2025-07-28'
  },
  {
    exchange_name: 'Johnson Trust Apartment Complex Exchange',  
    status: 'identifying',
    sale_property: {
      address: '321 Elm Street, Arlington, TX 76010',
      type: 'Multifamily',
      sale_price: 5200000,
      units: 48
    },
    purchase_property: {
      status: 'identifying',
      target_price: 5500000,
      property_types: ['Multifamily', 'Senior Living']
    },
    day_45_deadline: '2025-04-10',
    day_180_deadline: '2025-09-10'
  }
];

async function seedBasicExchanges() {
  console.log('🌱 Seeding basic exchange data...\n');
  
  try {
    // Try inserting very basic data first
    for (let i = 0; i < basicExchanges.length; i++) {
      const exchange = basicExchanges[i];
      console.log(`📝 Inserting exchange ${i + 1}: ${exchange.exchange_name}`);
      
      const { data, error } = await supabase
        .from('exchanges')
        .insert([exchange])
        .select();

      if (error) {
        console.error(`❌ Error inserting exchange ${i + 1}:`, error.message);
        // Try even simpler version
        const simpleExchange = {
          exchange_name: exchange.exchange_name,
          status: exchange.status,
          sale_property: exchange.sale_property,
          purchase_property: exchange.purchase_property
        };
        
        console.log(`🔄 Trying simplified version...`);
        const { data: simpleData, error: simpleError } = await supabase
          .from('exchanges')
          .insert([simpleExchange])
          .select();
          
        if (simpleError) {
          console.error(`❌ Even simple version failed:`, simpleError.message);
        } else {
          console.log(`✅ Simplified version worked for exchange ${i + 1}`);
        }
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
      console.log('\n📋 Available fields in actual table:');
      const sample = verifyData[0];
      const allFields = Object.keys(sample);
      console.log(allFields.sort().join(', '));
      
      console.log('\n🎯 Sample exchange:');
      console.log('=' .repeat(40));
      console.log(`Name: ${sample.exchange_name}`);
      console.log(`Status: ${sample.status}`);
      console.log(`ID: ${sample.id}`);
      
      // Export structure for analysis
      const structureData = {
        total_records: verifyData.length,
        available_columns: allFields.sort(),
        sample_data: verifyData
      };
      
      fs.writeFileSync('./exchange-table-structure.json', JSON.stringify(structureData, null, 2));
      console.log('\n💾 Table structure and data exported to exchange-table-structure.json');
    }
    
  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
  }
}

// Run the seeding
seedBasicExchanges().then(() => {
  console.log('\n🌟 Basic seeding complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});