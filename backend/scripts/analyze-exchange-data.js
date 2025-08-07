#!/usr/bin/env node

/**
 * Direct Database Analysis Script for Exchanges Table
 * This script connects directly to the database and analyzes all exchange data
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

async function analyzeExchangeData() {
  console.log('🔍 Analyzing Exchange Data...\n');
  
  try {
    // First, let's get the table structure
    console.log('📋 Getting table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('exchanges')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Error fetching table structure:', tableError);
      return;
    }

    // Get all exchanges with full data
    console.log('📊 Fetching all exchange data...');
    const { data: exchanges, error: exchangesError } = await supabase
      .from('exchanges')
      .select(`
        *,
        client:contacts!exchanges_client_id_fkey(
          id, first_name, last_name, email, company, phone, address_1, city, state, zip
        ),
        coordinator:users!exchanges_coordinator_id_fkey(
          id, first_name, last_name, email, role
        ),
        tasks:tasks(
          id, title, status, priority, due_date, description
        ),
        documents:documents(
          id, filename, file_type, file_size, created_at
        ),
        messages:messages(
          id, content, created_at, sender_id
        ),
        exchange_participants:exchange_participants(
          id, role, permissions,
          user:users(id, first_name, last_name, email, role),
          contact:contacts(id, first_name, last_name, email, company)
        )
      `);

    if (exchangesError) {
      console.error('❌ Error fetching exchanges:', exchangesError);
      return;
    }

    console.log(`✅ Found ${exchanges?.length || 0} exchanges\n`);

    // Analyze field usage
    if (exchanges && exchanges.length > 0) {
      console.log('📈 Field Analysis:');
      console.log('=' .repeat(80));
      
      // Get all possible fields from the first exchange
      const sampleExchange = exchanges[0];
      const allFields = Object.keys(sampleExchange);
      
      // Analyze each field
      const fieldAnalysis = {};
      
      allFields.forEach(field => {
        if (field === 'client' || field === 'coordinator' || field === 'tasks' || 
            field === 'documents' || field === 'messages' || field === 'exchange_participants') {
          return; // Skip relationship fields for now
        }
        
        const filledCount = exchanges.filter(ex => {
          const value = ex[field];
          return value !== null && value !== undefined && value !== '' && 
                 !(Array.isArray(value) && value.length === 0) &&
                 !(typeof value === 'object' && Object.keys(value || {}).length === 0);
        }).length;
        
        const fillRate = ((filledCount / exchanges.length) * 100).toFixed(1);
        
        fieldAnalysis[field] = {
          filled: filledCount,
          total: exchanges.length,
          fillRate: parseFloat(fillRate),
          sampleValue: sampleExchange[field]
        };
      });
      
      // Sort by fill rate
      const sortedFields = Object.entries(fieldAnalysis)
        .sort(([,a], [,b]) => b.fillRate - a.fillRate);
      
      console.log('Field Name                     | Fill Rate | Sample Value');
      console.log('-'.repeat(80));
      
      sortedFields.forEach(([field, analysis]) => {
        const fieldName = field.padEnd(30);
        const fillRate = `${analysis.fillRate}%`.padStart(8);
        let sampleValue = analysis.sampleValue;
        
        // Format sample value
        if (sampleValue === null || sampleValue === undefined) {
          sampleValue = 'null';
        } else if (typeof sampleValue === 'object') {
          sampleValue = JSON.stringify(sampleValue).substring(0, 30) + '...';
        } else {
          sampleValue = String(sampleValue).substring(0, 30);
        }
        
        console.log(`${fieldName} | ${fillRate} | ${sampleValue}`);
      });
      
      console.log('\n📊 Summary Statistics:');
      console.log('=' .repeat(50));
      
      // High usage fields (>80% filled)
      const highUsageFields = sortedFields.filter(([,analysis]) => analysis.fillRate >= 80);
      console.log(`🟢 High Usage Fields (≥80%): ${highUsageFields.length}`);
      highUsageFields.forEach(([field, analysis]) => {
        console.log(`   • ${field}: ${analysis.fillRate}%`);
      });
      
      // Medium usage fields (20-80% filled)
      const mediumUsageFields = sortedFields.filter(([,analysis]) => analysis.fillRate >= 20 && analysis.fillRate < 80);
      console.log(`🟡 Medium Usage Fields (20-80%): ${mediumUsageFields.length}`);
      mediumUsageFields.forEach(([field, analysis]) => {
        console.log(`   • ${field}: ${analysis.fillRate}%`);
      });
      
      // Low usage fields (<20% filled)
      const lowUsageFields = sortedFields.filter(([,analysis]) => analysis.fillRate < 20);
      console.log(`🔴 Low Usage Fields (<20%): ${lowUsageFields.length}`);
      lowUsageFields.forEach(([field, analysis]) => {
        console.log(`   • ${field}: ${analysis.fillRate}%`);
      });
      
      // Analyze relationships
      console.log('\n🔗 Relationship Analysis:');
      console.log('=' .repeat(50));
      
      const withClient = exchanges.filter(ex => ex.client).length;
      const withCoordinator = exchanges.filter(ex => ex.coordinator).length;
      const withTasks = exchanges.filter(ex => ex.tasks && ex.tasks.length > 0).length;
      const withDocuments = exchanges.filter(ex => ex.documents && ex.documents.length > 0).length;
      const withMessages = exchanges.filter(ex => ex.messages && ex.messages.length > 0).length;
      const withParticipants = exchanges.filter(ex => ex.exchange_participants && ex.exchange_participants.length > 0).length;
      
      console.log(`📞 Exchanges with Client: ${withClient}/${exchanges.length} (${((withClient/exchanges.length)*100).toFixed(1)}%)`);
      console.log(`👤 Exchanges with Coordinator: ${withCoordinator}/${exchanges.length} (${((withCoordinator/exchanges.length)*100).toFixed(1)}%)`);
      console.log(`📋 Exchanges with Tasks: ${withTasks}/${exchanges.length} (${((withTasks/exchanges.length)*100).toFixed(1)}%)`);
      console.log(`📄 Exchanges with Documents: ${withDocuments}/${exchanges.length} (${((withDocuments/exchanges.length)*100).toFixed(1)}%)`);
      console.log(`💬 Exchanges with Messages: ${withMessages}/${exchanges.length} (${((withMessages/exchanges.length)*100).toFixed(1)}%)`);
      console.log(`👥 Exchanges with Participants: ${withParticipants}/${exchanges.length} (${((withParticipants/exchanges.length)*100).toFixed(1)}%)`);
      
      // Sample exchange with most complete data
      console.log('\n🎯 Most Complete Exchange:');
      console.log('=' .repeat(50));
      
      const exchangeCompleteness = exchanges.map(exchange => {
        let score = 0;
        let details = {};
        
        Object.keys(fieldAnalysis).forEach(field => {
          const value = exchange[field];
          if (value !== null && value !== undefined && value !== '' && 
              !(Array.isArray(value) && value.length === 0) &&
              !(typeof value === 'object' && Object.keys(value || {}).length === 0)) {
            score++;
            details[field] = value;
          }
        });
        
        return { exchange, score, details, id: exchange.id, name: exchange.exchange_name || exchange.name };
      });
      
      const mostComplete = exchangeCompleteness.sort((a, b) => b.score - a.score)[0];
      
      if (mostComplete) {
        console.log(`Exchange: ${mostComplete.name} (ID: ${mostComplete.id})`);
        console.log(`Completeness Score: ${mostComplete.score}/${Object.keys(fieldAnalysis).length} fields`);
        console.log('\nFilled Fields:');
        Object.entries(mostComplete.details).forEach(([field, value]) => {
          let displayValue = value;
          if (typeof value === 'object') {
            displayValue = JSON.stringify(value).substring(0, 50) + '...';
          } else if (typeof value === 'string' && value.length > 50) {
            displayValue = value.substring(0, 50) + '...';
          }
          console.log(`  • ${field}: ${displayValue}`);
        });
      }
      
      // Export complete data structure
      console.log('\n💾 Exporting complete data structure...');
      const fs = require('fs');
      const outputPath = './exchange-analysis-output.json';
      
      const analysisOutput = {
        timestamp: new Date().toISOString(),
        totalExchanges: exchanges.length,
        fieldAnalysis: fieldAnalysis,
        relationshipStats: {
          withClient,
          withCoordinator, 
          withTasks,
          withDocuments,
          withMessages,
          withParticipants
        },
        sampleExchanges: exchanges.slice(0, 3), // Include first 3 exchanges as samples
        allFields: allFields,
        highUsageFields: highUsageFields.map(([field]) => field),
        mediumUsageFields: mediumUsageFields.map(([field]) => field),
        lowUsageFields: lowUsageFields.map(([field]) => field)
      };
      
      fs.writeFileSync(outputPath, JSON.stringify(analysisOutput, null, 2));
      console.log(`✅ Analysis exported to: ${outputPath}`);
      
    } else {
      console.log('⚠️  No exchanges found in database');
    }
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  }
}

// Run the analysis
analyzeExchangeData().then(() => {
  console.log('\n🏁 Analysis complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});