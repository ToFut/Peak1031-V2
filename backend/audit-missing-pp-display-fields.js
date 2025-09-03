require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditMissingPPFields() {
  console.log('🔍 AUDITING ALL MISSING PP FIELDS FROM FRONTEND...\\n');
  
  const exchangeId = 'e00bfb0f-df96-438e-98f0-87ef91b708a7';
  
  try {
    // Get the complete current data
    const { data: exchange } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();

    if (!exchange) {
      console.log('❌ Exchange not found');
      return;
    }

    const ppData = exchange.pp_data;
    const customFields = ppData.custom_field_values || [];

    // Helper to get PP custom field
    const getPPValue = (label) => {
      const field = customFields.find(f => f.custom_field_ref.label === label);
      if (!field) return null;
      return field.value_string || field.value_number || field.value_date_time || 
             (field.contact_ref ? field.contact_ref.display_name : field.value_boolean);
    };

    // Get table columns
    const tableColumns = Object.keys(exchange);

    console.log('📋 COMPLETE PP DATA AUDIT:');
    console.log('=========================\\n');
    
    // Check each piece of PP data mentioned in your list
    const ppFieldAudit = [
      // Basic Matter Information
      ['Matter ID (PP GUID)', ppData.id, null], // Should display somewhere
      ['Matter Number', ppData.number, exchange.pp_matter_number],
      ['Display Name', ppData.display_name, exchange.pp_display_name],
      ['Status (PP)', ppData.status, exchange.pp_matter_status],
      
      // Property Details
      ['Escrow Number', getPPValue('Rel Escrow Number'), exchange.rel_escrow_number],
      ['Property Type', getPPValue('Property Type'), exchange.rel_property_type || exchange.property_type],
      ['Purchase Contract Title', getPPValue('Rel Purchase Contract Title'), exchange.rel_purchase_contract_title],
      
      // People Information  
      ['Client Signatory Title', getPPValue('Client 1 Signatory Title'), exchange.client_1_signatory_title],
      ['Referral Source', getPPValue('Referral Source'), exchange.referral_source],
      ['Referral Email', getPPValue('Referral Source Email'), exchange.referral_source_email],
      
      // Assigned Users
      ['Assigned Attorney', ppData.assigned_to_users?.[0]?.display_name, exchange.pp_responsible_attorney || exchange.assigned_attorney],
      ['Attorney Email', ppData.assigned_to_users?.[0]?.email_address, exchange.assigned_attorney_email],
      
      // Account Reference
      ['Account Name', ppData.account_ref?.display_name, exchange.account_name],
      ['Account ID', ppData.account_ref?.id, exchange.account_id]
    ];

    console.log('🎯 FIELD-BY-FIELD AUDIT:');
    ppFieldAudit.forEach(([fieldName, ppValue, dbValue]) => {
      const hasData = ppValue !== null && ppValue !== undefined;
      const isStored = dbValue !== null && dbValue !== undefined;
      
      let status;
      if (!hasData) {
        status = '⚪ No PP Data';
      } else if (isStored) {
        status = '✅ DISPLAYING';
      } else {
        status = '❌ MISSING';
      }
      
      console.log(`${status} ${fieldName}`);
      if (hasData) {
        console.log(`    PP Value: ${ppValue}`);
        console.log(`    DB Value: ${dbValue || 'NULL'}`);
      }
      console.log('');
    });

    // Check what columns we need to map to
    console.log('\\n🔍 AVAILABLE DATABASE COLUMNS FOR MISSING FIELDS:');
    const potentialColumns = [
      'property_type', 'rel_property_type', 'settlement_agent', 'assigned_attorney',
      'assigned_attorney_email', 'referral_source', 'referral_source_email',
      'account_name', 'account_id', 'client_1_signatory_title', 'pp_assigned_attorney'
    ];
    
    potentialColumns.forEach(col => {
      const exists = tableColumns.includes(col);
      const hasValue = exchange[col] !== null && exchange[col] !== undefined;
      const status = exists ? (hasValue ? '✅ EXISTS & FILLED' : '⚪ EXISTS & EMPTY') : '❌ MISSING COLUMN';
      console.log(`${status} ${col}`);
    });

    // Now check what's still missing from our complete PP custom fields
    console.log('\\n📋 ALL PP CUSTOM FIELDS (showing ones not yet mapped):');
    customFields.forEach((field, index) => {
      const value = field.value_string || field.value_number || field.value_date_time || 
                   (field.contact_ref ? field.contact_ref.display_name : field.value_boolean);
      if (value) {
        // Check if this field has been mapped to any database column
        const mapped = Object.values(exchange).includes(value);
        const status = mapped ? '✅' : '❌';
        console.log(`${status} ${index + 1}. "${field.custom_field_ref.label}": ${JSON.stringify(value)}`);
      }
    });

    console.log('\\n🎯 NEXT STEPS:');
    console.log('1. Map missing PP fields to available database columns');
    console.log('2. Update ExchangeOverview component to display additional PP fields');
    console.log('3. Create new database columns if needed for unmappable fields');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

auditMissingPPFields();