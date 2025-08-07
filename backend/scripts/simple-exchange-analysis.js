#!/usr/bin/env node

/**
 * Simple Exchange Data Analysis - Just get raw exchange data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeExchanges() {
  console.log('🔍 Fetching raw exchange data...\n');
  
  try {
    // Get all exchanges with just the base table data
    const { data: exchanges, error } = await supabase
      .from('exchanges')
      .select('*');

    if (error) {
      console.error('❌ Error fetching exchanges:', error);
      return;
    }

    console.log(`✅ Found ${exchanges?.length || 0} exchanges\n`);

    if (exchanges && exchanges.length > 0) {
      // Show available fields
      const sampleExchange = exchanges[0];
      const allFields = Object.keys(sampleExchange);
      
      console.log('📋 Available Fields in Exchange Table:');
      console.log('=' .repeat(60));
      allFields.forEach((field, index) => {
        console.log(`${(index + 1).toString().padStart(2)}: ${field}`);
      });
      
      console.log('\n📊 Field Usage Analysis:');
      console.log('=' .repeat(80));
      console.log('Field Name                     | Fill Rate | Sample Value');
      console.log('-'.repeat(80));
      
      // Analyze each field
      allFields.forEach(field => {
        const filledCount = exchanges.filter(ex => {
          const value = ex[field];
          return value !== null && value !== undefined && value !== '' && 
                 !(Array.isArray(value) && value.length === 0) &&
                 !(typeof value === 'object' && Object.keys(value || {}).length === 0);
        }).length;
        
        const fillRate = ((filledCount / exchanges.length) * 100).toFixed(1);
        
        const fieldName = field.padEnd(30);
        const fillRateStr = `${fillRate}%`.padStart(8);
        let sampleValue = sampleExchange[field];
        
        // Format sample value
        if (sampleValue === null || sampleValue === undefined) {
          sampleValue = 'null';
        } else if (typeof sampleValue === 'object') {
          sampleValue = JSON.stringify(sampleValue).substring(0, 25) + '...';
        } else if (typeof sampleValue === 'string' && sampleValue.length > 25) {
          sampleValue = sampleValue.substring(0, 25) + '...';
        } else {
          sampleValue = String(sampleValue);
        }
        
        console.log(`${fieldName} | ${fillRateStr} | ${sampleValue}`);
      });
      
      // Show complete first exchange as example
      console.log('\n🎯 Sample Exchange (Full Data):');
      console.log('=' .repeat(60));
      console.log(JSON.stringify(sampleExchange, null, 2));
      
      // Try to get related data separately
      console.log('\n🔗 Checking Related Tables:');
      console.log('=' .repeat(40));
      
      // Check contacts table
      try {
        const { data: contacts, error: contactError } = await supabase
          .from('contacts')
          .select('*')
          .limit(1);
        console.log(`📞 Contacts table: ${contactError ? 'Error' : 'Available'} - ${contacts?.length || 0} sample records`);
      } catch (e) {
        console.log('📞 Contacts table: Not accessible');
      }
      
      // Check users table
      try {
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('*')
          .limit(1);
        console.log(`👤 Users table: ${userError ? 'Error' : 'Available'} - ${users?.length || 0} sample records`);
      } catch (e) {
        console.log('👤 Users table: Not accessible');
      }
      
      // Check tasks table
      try {
        const { data: tasks, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('exchange_id', sampleExchange.id)
          .limit(5);
        console.log(`📋 Tasks for sample exchange: ${taskError ? 'Error' : tasks?.length || 0} tasks`);
      } catch (e) {
        console.log('📋 Tasks table: Not accessible');
      }
      
      // Check documents table
      try {
        const { data: documents, error: docError } = await supabase
          .from('documents')
          .select('*')
          .eq('exchange_id', sampleExchange.id)
          .limit(5);
        console.log(`📄 Documents for sample exchange: ${docError ? 'Error' : documents?.length || 0} documents`);
      } catch (e) {
        console.log('📄 Documents table: Not accessible');
      }
      
      // Check messages table
      try {
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .eq('exchange_id', sampleExchange.id)
          .limit(5);
        console.log(`💬 Messages for sample exchange: ${msgError ? 'Error' : messages?.length || 0} messages`);
      } catch (e) {
        console.log('💬 Messages table: Not accessible');
      }
      
      // Export raw data
      const fs = require('fs');
      const outputPath = './raw-exchanges-data.json';
      fs.writeFileSync(outputPath, JSON.stringify(exchanges, null, 2));
      console.log(`\n💾 Raw exchange data exported to: ${outputPath}`);
      
    } else {
      console.log('⚠️  No exchanges found in database');
    }
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  }
}

// Run the analysis
analyzeExchanges().then(() => {
  console.log('\n🏁 Analysis complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});