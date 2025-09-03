require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testComponentDisplay() {
  console.log('🧪 TESTING UPDATED COMPONENT PP DATA ACCESS...\n');
  
  const exchangeId = 'e00bfb0f-df96-438e-98f0-87ef91b708a7';
  
  try {
    // Get exchange data as frontend would receive it
    const { data: exchange } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();

    if (!exchange || !exchange.pp_data) {
      console.log('❌ No PP data found');
      return;
    }

    // Simulate the getPPValue function from component
    const getPPValue = (label) => {
      if (!exchange.pp_data?.custom_field_values) return null;
      const field = exchange.pp_data.custom_field_values.find(f => f.custom_field_ref.label === label);
      if (!field) return null;
      return field.value_string || field.value_number || field.value_date_time || 
             (field.contact_ref ? field.contact_ref.display_name : field.value_boolean) || null;
    };

    // Test all the PP fields that the updated component should now display
    const componentPPTests = [
      // Fields that should now be accessible via getPPValue
      { label: 'Property Type', dbField: exchange.property_type, componentSection: 'Relinquished Property' },
      { label: 'Referral Source', dbField: exchange.referral_source, componentSection: 'Exchange Information' },
      { label: 'Referral Source Email', dbField: exchange.referral_source_email, componentSection: 'Exchange Information' },
      { label: 'Internal Credit To', dbField: exchange.internal_credit_to, componentSection: 'Exchange Information' },
      { label: 'Client 1 Signatory Title', dbField: exchange.client_1_signatory_title, componentSection: 'Relinquished Property' },
      { label: 'Rel Settlement Agent', dbField: exchange.settlement_agent, componentSection: 'Relinquished Property' },
      { label: 'Rel Purchase Contract Title', dbField: exchange.rel_purchase_contract_title, componentSection: 'Relinquished Property' },
      { label: 'Date Proceeds Received', dbField: exchange.date_proceeds_received, componentSection: 'Relinquished Property' },
      { label: 'Receipt Drafted On', dbField: exchange.receipt_drafted_on, componentSection: 'Relinquished Property' },
      { label: 'Rep 1 Settlement Agent', dbField: exchange.rep_1_settlement_agent, componentSection: 'Replacement Property' },
      { label: 'Rep 1 Purchase Contract Title', dbField: exchange.rep_1_purchase_contract_title, componentSection: 'Replacement Property' },
      { label: 'Rep 1 Seller Vesting', dbField: exchange.rep_1_seller_vesting, componentSection: 'Replacement Property' },
      { label: 'Rep 1 Docs Drafted on', dbField: exchange.rep_1_docs_drafted_on, componentSection: 'Replacement Property' },
    ];

    console.log('🎯 TESTING COMPONENT PP DATA ACCESS:');
    console.log('====================================\n');

    let accessibleCount = 0;
    let totalTests = componentPPTests.length;

    componentPPTests.forEach(({ label, dbField, componentSection }) => {
      const ppValue = getPPValue(label);
      const willDisplay = dbField || ppValue;
      
      if (willDisplay) {
        accessibleCount++;
        console.log(`✅ ${label}`);
        console.log(`   DB: ${dbField || 'NULL'}`);
        console.log(`   PP: ${ppValue || 'NULL'}`);
        console.log(`   → Will display: "${willDisplay}"`);
        console.log(`   → Section: ${componentSection}`);
      } else {
        console.log(`❌ ${label}`);
        console.log(`   DB: NULL`);
        console.log(`   PP: NULL`);
        console.log(`   → Section: ${componentSection}`);
      }
      console.log('');
    });

    // Additional PP fields from enhanced structure
    console.log('🔍 ADDITIONAL PP FIELDS AVAILABLE:');
    console.log('==================================');
    
    const additionalFields = [
      'Exchange Agreement Drafted On',
      'Expected Rel Closing Date',
      'PP Matter GUID (id)', 
      'Account Name',
      'Responsible Attorney Email'
    ];

    additionalFields.forEach(label => {
      let value = null;
      if (label === 'PP Matter GUID (id)') {
        value = exchange.pp_data?.id;
      } else if (label === 'Account Name') {
        value = exchange.pp_data?.account_ref?.display_name;
      } else if (label === 'Responsible Attorney Email') {
        value = exchange.pp_data?.assigned_to_users?.[0]?.email_address;
      } else {
        value = getPPValue(label);
      }
      
      if (value) {
        console.log(`💎 ${label}: ${value}`);
      }
    });

    console.log(`\n📊 COMPONENT PP DATA SUMMARY:`);
    console.log(`============================`);
    console.log(`✅ Accessible via component: ${accessibleCount}/${totalTests} fields`);
    
    const percentage = Math.round((accessibleCount / totalTests) * 100);
    console.log(`🎯 Component accessibility: ${percentage}%`);

    if (accessibleCount === totalTests) {
      console.log('\n🎉 PERFECT! All PP fields are now accessible to the component!');
      console.log('The updated ExchangeOverview should display significantly more PP data.');
    } else {
      console.log(`\n⚠️  ${totalTests - accessibleCount} fields still need database columns or PP data structure updates.`);
    }

    // Test the specific PP data structure the component uses
    console.log('\n🔧 PP DATA STRUCTURE TEST:');
    console.log('=========================');
    
    const ppStructureTest = {
      'pp_data exists': !!exchange.pp_data,
      'custom_field_values exists': !!exchange.pp_data?.custom_field_values,
      'custom_field_values length': exchange.pp_data?.custom_field_values?.length || 0,
      'account_ref exists': !!exchange.pp_data?.account_ref,
      'assigned_to_users exists': !!exchange.pp_data?.assigned_to_users?.length
    };

    Object.entries(ppStructureTest).forEach(([key, value]) => {
      console.log(`${value ? '✅' : '❌'} ${key}: ${value}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testComponentDisplay();