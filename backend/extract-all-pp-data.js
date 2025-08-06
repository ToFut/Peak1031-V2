#!/usr/bin/env node

/**
 * Extract ALL PP data using a structured approach
 * This creates a comprehensive JSON structure with all PP data mapped out
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function extractAllPPData() {
  console.log('🔍 Extracting ALL PP data for analysis...\n');
  
  // Get all exchanges with PP data
  const { data: exchanges, error } = await supabase
    .from('exchanges')
    .select('id, name, pp_data')
    .not('pp_data', 'is', null);

  if (error) {
    console.error('Error fetching exchanges:', error);
    return;
  }

  console.log(`Processing ${exchanges.length} exchanges...\n`);

  const extractedData = [];
  const fieldMapping = new Map();

  exchanges.forEach((exchange, index) => {
    const pp = exchange.pp_data;
    const extracted = {
      id: exchange.id,
      name: exchange.name,
      mainFields: {},
      customFields: {}
    };

    // Extract main PP fields
    extracted.mainFields = {
      pp_id: pp.id,
      pp_name: pp.name,
      rate: pp.rate,
      tags: pp.tags || [],
      notes: pp.notes,
      number: pp.number,
      status: pp.status,
      open_date: pp.open_date,
      close_date: pp.close_date,
      created_at: pp.created_at,
      updated_at: pp.updated_at,
      display_name: pp.display_name,
      assigned_to_users: pp.assigned_to_users || [],
      statute_of_limitation_date: pp.statute_of_limitation_date,
      account_ref: pp.account_ref
    };

    // Extract custom fields with proper mapping
    if (pp.custom_field_values && Array.isArray(pp.custom_field_values)) {
      pp.custom_field_values.forEach(cf => {
        if (cf.custom_field_ref && cf.custom_field_ref.label) {
          const label = cf.custom_field_ref.label;
          const valueType = cf.custom_field_ref.value_type;
          let value = null;

          // Get the appropriate value based on type
          switch (valueType) {
            case 'TextBox':
              value = cf.value_string;
              break;
            case 'Currency':
              value = cf.value_number;
              break;
            case 'Date':
              value = cf.value_date_time;
              break;
            case 'Checkbox':
              value = cf.value_boolean;
              break;
            default:
              value = cf.value_string || cf.value_number || cf.value_boolean || cf.value_date_time;
          }

          extracted.customFields[label] = {
            value: value,
            type: valueType
          };

          // Track field usage
          if (!fieldMapping.has(label)) {
            fieldMapping.set(label, {
              type: valueType,
              count: 0,
              examples: new Set()
            });
          }
          
          const mapping = fieldMapping.get(label);
          mapping.count++;
          if (value && mapping.examples.size < 5) {
            mapping.examples.add(value);
          }
        }
      });
    }

    extractedData.push(extracted);

    if (index < 5) {
      console.log(`📋 Exchange ${index + 1}: ${exchange.name}`);
      console.log(`   Main fields: ${Object.keys(extracted.mainFields).length}`);
      console.log(`   Custom fields: ${Object.keys(extracted.customFields).length}`);
      
      // Show some custom fields
      Object.entries(extracted.customFields).slice(0, 3).forEach(([key, data]) => {
        console.log(`     ${key}: ${data.value} (${data.type})`);
      });
    }
  });

  // Generate comprehensive field report
  console.log('\n📊 FIELD USAGE ANALYSIS:');
  console.log('='.repeat(60));
  
  const sortedFields = [...fieldMapping.entries()].sort((a, b) => b[1].count - a[1].count);
  
  sortedFields.forEach(([label, info], index) => {
    const percentage = ((info.count / exchanges.length) * 100).toFixed(1);
    console.log(`${index + 1}. ${label}`);
    console.log(`   Type: ${info.type}`);
    console.log(`   Usage: ${info.count}/${exchanges.length} (${percentage}%)`);
    console.log(`   Examples: ${[...info.examples].slice(0, 2).join(', ')}`);
    console.log('');
  });

  // Save detailed data
  fs.writeFileSync(
    '/Users/segevbin/Desktop/Peak1031 V1 /pp-data-extraction.json', 
    JSON.stringify({ extractedData: extractedData.slice(0, 10), fieldMapping: Object.fromEntries(fieldMapping) }, null, 2)
  );

  // Generate suggested table structure
  console.log('\n🏗️  SUGGESTED TABLE ADDITIONS:');
  console.log('='.repeat(60));
  
  const highUsageFields = sortedFields.filter(([_, info]) => info.count >= exchanges.length * 0.1); // 10% or more
  
  highUsageFields.forEach(([label, info]) => {
    const columnName = label.toLowerCase()
      .replace(/\\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 50);
    
    let sqlType = 'TEXT';
    switch (info.type) {
      case 'Currency':
        sqlType = 'DECIMAL(15,2)';
        break;
      case 'Date':
        sqlType = 'DATE';
        break;
      case 'Checkbox':
        sqlType = 'BOOLEAN';
        break;
      case 'TextBox':
        const maxLength = Math.max(...[...info.examples].map(ex => ex?.toString().length || 0));
        sqlType = maxLength > 255 ? 'TEXT' : `VARCHAR(${Math.max(maxLength * 2, 100)})`;
        break;
    }
    
    console.log(`ALTER TABLE exchanges ADD COLUMN ${columnName} ${sqlType}; -- ${label} (${info.count} records)`);
  });

  console.log(`\\n✅ Analysis complete! Found ${sortedFields.length} unique custom fields.`);
  console.log(`📄 Detailed data saved to: pp-data-extraction.json`);
  
  return { extractedData, fieldMapping };
}

extractAllPPData();