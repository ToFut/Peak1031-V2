require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFrontendDisplay() {
  console.log('🔍 VERIFYING ALL PP DETAILS ARE ACTUALLY DISPLAYING ON FRONTEND...\\n');
  
  const exchangeId = 'e00bfb0f-df96-438e-98f0-87ef91b708a7';
  
  try {
    // Get what the API actually returns to the frontend
    const { data: exchange } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();

    // Check each piece of detailed data you mentioned
    const detailedAudit = [
      // Basic Matter Information
      { field: 'Matter ID (PP GUID)', expected: '34a90c7c-07e1-4540-b017-b50828c6b313', actual: exchange.pp_matter_guid, component: 'Should show in matter info' },
      { field: 'Matter Number', expected: '7869', actual: exchange.pp_matter_number, component: 'ExchangeOverview matter number' },
      { field: 'Display Name', expected: '7869 - Kicelian, Hector - (TRUST)...', actual: exchange.pp_display_name, component: 'ExchangeOverview display name' },
      { field: 'Status (Open)', expected: 'Open', actual: exchange.pp_matter_status, component: 'ExchangeOverview status' },
      
      // Financial Information  
      { field: 'Proceeds', expected: '$195,816.28', actual: exchange.proceeds, component: 'Financial summary proceeds' },
      { field: 'Relinquished Value', expected: '$212,000', actual: exchange.rel_value, component: 'Property value display' },
      { field: 'Replacement Value', expected: '$1,210,000', actual: exchange.rep_1_value, component: 'Replacement property value' },
      { field: 'Exchange Type', expected: 'Delayed', actual: exchange.type_of_exchange, component: 'Exchange info section' },
      
      // Critical Dates
      { field: 'Day 45', expected: 'August 11, 2025', actual: exchange.day_45, component: 'Exchange timeline dates' },
      { field: 'Day 180', expected: 'December 24, 2025', actual: exchange.day_180, component: 'Exchange timeline dates' },
      
      // Relinquished Property Details
      { field: 'Rel Address', expected: '860 London Green Way...', actual: exchange.rel_property_address, component: 'Relinquished property section' },
      { field: 'Rel APN', expected: '65061-09-175', actual: exchange.rel_apn, component: 'Property details APN field' },
      { field: 'Rel Escrow Number', expected: 'CO-2025-30332', actual: exchange.rel_escrow_number, component: 'Property escrow details' },
      { field: 'Property Type', expected: 'Residential', actual: exchange.property_type, component: 'Property type display' },
      { field: 'Purchase Contract', expected: 'CONTRACT TO BUY...', actual: exchange.rel_purchase_contract_title, component: 'Contract details' },
      
      // Replacement Property Details
      { field: 'Rep Address', expected: '535 Roswell Avenue...', actual: exchange.rep_1_property_address, component: 'Replacement property section' },
      { field: 'Rep APN', expected: '7255018012', actual: exchange.rep_1_apn, component: 'Replacement property APN' },
      { field: 'Rep Escrow', expected: 'CWSB-CG-4482', actual: exchange.rep_1_escrow_number, component: 'Replacement escrow details' },
      { field: 'Rep Seller 1', expected: 'DeNeisha Calvert', actual: exchange.rep_1_seller_1_name, component: 'Seller information' },
      { field: 'Rep Seller 2', expected: 'Sajeevan Vyravipillai', actual: exchange.rep_1_seller_2_name, component: 'Seller information' },
      
      // Client & People Information
      { field: 'Client Vesting', expected: 'Hector Kicelian as Trustee...', actual: exchange.client_vesting, component: 'Client information section' },
      { field: 'Client Signatory Title', expected: 'Trustee', actual: exchange.client_1_signatory_title, component: 'Client details' },
      { field: 'Buyer Vesting', expected: 'Louise Claire Pallan', actual: exchange.buyer_1_name, component: 'Buyer information' },
      { field: 'Banking Institution', expected: 'Israel Discount Bank', actual: exchange.bank, component: 'Financial/banking section' },
      { field: 'Referral Source', expected: 'Tom Gans', actual: exchange.referral_source, component: 'Referral information' },
      
      // Professional Details
      { field: 'Responsible Attorney', expected: 'Mark Potente', actual: exchange.pp_responsible_attorney, component: 'Professional assignments' },
      { field: 'Settlement Agent', expected: 'Parsons, Brenda', actual: exchange.settlement_agent, component: 'Settlement details' },
    ];

    console.log('📋 DETAILED FRONTEND DISPLAY VERIFICATION:');
    console.log('==========================================\\n');
    
    let displayingCount = 0;
    let missingCount = 0;
    let nullCount = 0;
    
    detailedAudit.forEach(({ field, expected, actual, component }) => {
      let status = '';
      if (actual === null || actual === undefined) {
        status = '❌ NULL';
        nullCount++;
      } else if (actual.toString().includes(expected.substring(0, 10))) {
        status = '✅ DISPLAYING';
        displayingCount++;
      } else {
        status = '⚠️  DATA MISMATCH';
        missingCount++;
      }
      
      console.log(`${status} ${field}`);
      console.log(`    Expected: ${expected}`);
      console.log(`    Actual: ${actual || 'NULL'}`);
      console.log(`    Component: ${component}`);
      console.log('');
    });
    
    console.log('📊 FRONTEND DISPLAY SUMMARY:');
    console.log('============================');
    console.log(`✅ Displaying: ${displayingCount} fields`);
    console.log(`❌ NULL/Missing: ${nullCount} fields`);  
    console.log(`⚠️  Mismatched: ${missingCount} fields`);
    console.log(`📊 Total: ${detailedAudit.length} detailed fields checked`);
    
    const displayPercentage = Math.round((displayingCount / detailedAudit.length) * 100);
    console.log(`\\n🎯 DISPLAY PERCENTAGE: ${displayPercentage}%`);
    
    if (displayPercentage < 100) {
      console.log('\\n⚠️  MISSING FIELDS THAT SHOULD BE DISPLAYING:');
      detailedAudit.forEach(({ field, actual, component }) => {
        if (actual === null || actual === undefined) {
          console.log(`❌ ${field} - needs database column or component update`);
        }
      });
      
      console.log('\\n🔧 TO COMPLETE THE DISPLAY:');
      console.log('1. Add missing database columns for NULL fields');
      console.log('2. Update ExchangeOverview component to show additional fields');
      console.log('3. Map remaining PP data to new columns');
    } else {
      console.log('\\n🎉 ALL DETAILED PP DATA IS DISPLAYING ON FRONTEND!');
    }

    // Check what's available in PP data but not displayed
    if (exchange.pp_data) {
      const customFields = exchange.pp_data.custom_field_values || [];
      console.log(`\\n📦 ADDITIONAL PP DATA AVAILABLE: ${customFields.length} custom fields`);
      
      console.log('\\n🔍 RICH PP DATA NOT YET DISPLAYED:');
      const richFieldsNotDisplayed = [
        'Internal Credit To',
        'Rel Settlement Agent', 
        'Exchange Agreement Drafted On',
        'Expected Rel Closing Date',
        'Date Proceeds Received',
        'Rep 1 Settlement Agent',
        'Rep 1 Purchase Contract Title'
      ];
      
      richFieldsNotDisplayed.forEach(fieldName => {
        const field = customFields.find(f => f.custom_field_ref.label === fieldName);
        if (field) {
          const value = field.value_string || field.value_number || field.value_date_time;
          if (value) {
            console.log(`💎 ${fieldName}: ${value}`);
          }
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyFrontendDisplay();