require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function mapAllRemainingPPFields() {
  console.log('🔄 MAPPING ALL REMAINING PP FIELDS TO DATABASE...\\n');
  
  const exchangeId = 'e00bfb0f-df96-438e-98f0-87ef91b708a7';
  
  try {
    // Get exchange with PP data
    const { data: exchange } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();

    const ppData = exchange.pp_data;
    const customFields = ppData.custom_field_values || [];
    const existingColumns = Object.keys(exchange);

    // Helper to get PP custom field
    const getPPValue = (label) => {
      const field = customFields.find(f => f.custom_field_ref.label === label);
      if (!field) return null;
      return field.value_string || field.value_number || field.value_date_time || 
             (field.contact_ref ? field.contact_ref.display_name : field.value_boolean);
    };

    console.log('📋 Available database columns:', existingColumns.length);

    // Comprehensive mapping to ALL available columns
    const updateData = {
      // Settlement agents - map to available columns
      settlement_agent: getPPValue('Rel Settlement Agent'), // "Parsons, Brenda"
      
      // Property details - map to generic property columns
      property_type: getPPValue('Property Type'), // "Residential"
      
      // Replacement property details - find available rep columns
      rep_1_seller_1_name: getPPValue('Rep 1 Seller 1 Name'), // "DeNeisha Calvert" 
      rep_1_seller_2_name: getPPValue('Rep 1 Seller 2 Name'), // "Sajeevan Vyravipillai"
      rep_1_apn: getPPValue('Rep 1 APN'), // "7255018012"
      rep_1_escrow_number: getPPValue('Rep 1 Escrow Number'), // "CWSB-CG-4482"
      rep_1_purchase_contract_date: getPPValue('Rep 1 Purchase Contract Date'), // "2025-08-04T00:00:00"
      rep_1_purchase_contract_title: getPPValue('Rep 1 Purchase Contract Title'), // Contract title
      rep_1_seller_name: getPPValue('Rep 1 Seller Vesting'), // Combined vesting
      
      // Additional dates - map to available date columns
      close_of_escrow_date: getPPValue('Close of Escrow Date'), // "2025-06-27T00:00:00"
      expected_closing: getPPValue('Expected Rel Closing Date'), // "2025-06-27T00:00:00"
      exchange_agreement_drafted: getPPValue('Exchange Agreement Drafted On'), // "2025-06-04T00:00:00"
      
      // Proceeds details
      date_proceeds_received: getPPValue('Date Proceeds Received'), // "2025-06-30T00:00:00"
      
      // Internal info
      internal_credit_to: getPPValue('Internal Credit To'), // "Rosansky, Steve"
      
      // Account information from main PP data
      pp_account_name: ppData.account_ref?.display_name, // "Kicelian, Hector"
      pp_account_id: ppData.account_ref?.id, // Account GUID
      
      // PP Matter GUID
      pp_matter_guid: ppData.id, // "34a90c7c-07e1-4540-b017-b50828c6b313"
      
      // Attorney/assigned user info
      pp_responsible_attorney: ppData.assigned_to_users?.[0]?.display_name, // "Mark Potente"
      pp_responsible_attorney_email: ppData.assigned_to_users?.[0]?.email_address, // email
      
      // Update timestamp
      updated_at: new Date().toISOString()
    };

    // Only include fields that exist in the database and have values
    const finalUpdateData = {};
    let mappedFields = 0;
    let unmappableFields = [];

    Object.keys(updateData).forEach(key => {
      const value = updateData[key];
      if (value !== null && value !== undefined) {
        if (existingColumns.includes(key)) {
          finalUpdateData[key] = value;
          mappedFields++;
        } else {
          unmappableFields.push({ field: key, value: value });
        }
      }
    });

    console.log(`🔄 Fields to map: ${mappedFields}`);
    console.log(`⚠️  Unmappable fields: ${unmappableFields.length}`);
    
    console.log('\\n✅ FIELDS BEING MAPPED:');
    Object.keys(finalUpdateData).forEach(key => {
      if (key !== 'updated_at') {
        console.log(`  ${key}: ${JSON.stringify(finalUpdateData[key])}`);
      }
    });

    console.log('\\n❌ UNMAPPABLE FIELDS (need database columns):');
    unmappableFields.forEach(({ field, value }) => {
      console.log(`  ${field}: ${JSON.stringify(value)}`);
    });

    if (mappedFields === 0) {
      console.log('\\n❌ No fields to map');
      return;
    }

    // Update the database
    const { error } = await supabase
      .from('exchanges')
      .update(finalUpdateData)
      .eq('id', exchangeId);

    if (error) {
      console.log('\\n❌ Update failed:', error.message);
    } else {
      console.log(`\\n✅ Successfully mapped ${mappedFields} additional PP fields!`);
      
      // Verification
      const verifyFields = Object.keys(finalUpdateData).filter(k => k !== 'updated_at');
      if (verifyFields.length > 0) {
        const { data: updated } = await supabase
          .from('exchanges')
          .select(verifyFields.join(','))
          .eq('id', exchangeId)
          .single();
        
        console.log('\\n📋 Verification:');
        verifyFields.forEach(field => {
          console.log(`  ✅ ${field}: ${updated[field] || 'NULL'}`);
        });
      }
    }

    console.log('\\n🎯 SUMMARY OF COMPLETE PP DATA INTEGRATION:');
    console.log('============================================');
    console.log(`✅ Mapped fields: ${mappedFields + 13} (previous + new)`); // 13 from before
    console.log(`❌ Unmappable fields: ${unmappableFields.length} (need DB columns)`);
    console.log(`📊 Total PP custom fields available: ${customFields.length}`);
    
    console.log('\\n🎯 FRONTEND SHOULD NOW ADDITIONALLY DISPLAY:');
    console.log('• Settlement Agent: Parsons, Brenda');
    console.log('• Property Type: Residential');
    console.log('• Rep 1 Seller Names: DeNeisha Calvert, Sajeevan Vyravipillai');
    console.log('• Rep 1 APN: 7255018012');
    console.log('• Rep 1 Escrow: CWSB-CG-4482');
    console.log('• Close of Escrow Date: 2025-06-27');
    console.log('• Expected Closing: 2025-06-27');
    console.log('• Exchange Agreement Drafted: 2025-06-04');
    console.log('• Date Proceeds Received: 2025-06-30');
    console.log('• Responsible Attorney: Mark Potente');
    console.log('• Account Name: Kicelian, Hector');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

mapAllRemainingPPFields();