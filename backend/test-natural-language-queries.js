/**
 * Natural Language Query Testing Suite
 * Tests 30 different natural language queries against the database
 * Compares AI-generated SQL results with classic query results
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test data structure
const naturalLanguageTests = [
  // Basic Counting Queries
  {
    id: 1,
    category: 'Basic Counts',
    naturalLanguage: "How many exchanges do we have in total?",
    expectedSQLPattern: /SELECT COUNT\(\*\) FROM exchanges/i,
    classicQuery: "SELECT COUNT(*) as total_exchanges FROM exchanges WHERE deleted_at IS NULL"
  },
  {
    id: 2,
    category: 'Basic Counts',
    naturalLanguage: "How many active exchanges are there?",
    expectedSQLPattern: /SELECT COUNT\(\*\).*WHERE.*status.*IN.*\('45D', '180D', 'In Progress'\)/i,
    classicQuery: "SELECT COUNT(*) as active_exchanges FROM exchanges WHERE status IN ('45D', '180D', 'In Progress') AND deleted_at IS NULL"
  },
  {
    id: 3,
    category: 'Basic Counts',
    naturalLanguage: "Count completed exchanges",
    expectedSQLPattern: /SELECT COUNT\(\*\).*WHERE.*status.*=.*'COMPLETED'/i,
    classicQuery: "SELECT COUNT(*) as completed_exchanges FROM exchanges WHERE status = 'COMPLETED' AND deleted_at IS NULL"
  },

  // Financial Queries
  {
    id: 4,
    category: 'Financial',
    naturalLanguage: "What's the total value of all exchanges?",
    expectedSQLPattern: /SELECT SUM\(exchange_value\)/i,
    classicQuery: "SELECT SUM(exchange_value) as total_value FROM exchanges WHERE exchange_value IS NOT NULL AND deleted_at IS NULL"
  },
  {
    id: 5,
    category: 'Financial',
    naturalLanguage: "Show me the average exchange value",
    expectedSQLPattern: /SELECT AVG\(exchange_value\)/i,
    classicQuery: "SELECT AVG(exchange_value) as average_value FROM exchanges WHERE exchange_value IS NOT NULL AND deleted_at IS NULL"
  },
  {
    id: 6,
    category: 'Financial',
    naturalLanguage: "List exchanges worth more than 5 million dollars",
    expectedSQLPattern: /WHERE.*exchange_value.*>.*5000000/i,
    classicQuery: "SELECT exchange_number, name, exchange_value, status FROM exchanges WHERE exchange_value > 5000000 AND deleted_at IS NULL ORDER BY exchange_value DESC"
  },
  {
    id: 7,
    category: 'Financial',
    naturalLanguage: "Find high-value exchanges above 10 million",
    expectedSQLPattern: /WHERE.*exchange_value.*>.*10000000/i,
    classicQuery: "SELECT exchange_number, name, exchange_value, status FROM exchanges WHERE exchange_value > 10000000 AND deleted_at IS NULL ORDER BY exchange_value DESC"
  },

  // Status-based Queries
  {
    id: 8,
    category: 'Status',
    naturalLanguage: "Show me all pending exchanges",
    expectedSQLPattern: /WHERE.*status.*=.*'PENDING'/i,
    classicQuery: "SELECT exchange_number, name, status, created_at FROM exchanges WHERE status = 'PENDING' AND deleted_at IS NULL ORDER BY created_at DESC"
  },
  {
    id: 9,
    category: 'Status',
    naturalLanguage: "List exchanges in 45-day period",
    expectedSQLPattern: /WHERE.*status.*=.*'45D'/i,
    classicQuery: "SELECT exchange_number, name, status, identification_deadline FROM exchanges WHERE status = '45D' AND deleted_at IS NULL ORDER BY identification_deadline ASC"
  },
  {
    id: 10,
    category: 'Status',
    naturalLanguage: "Which exchanges are in their 180-day period?",
    expectedSQLPattern: /WHERE.*status.*=.*'180D'/i,
    classicQuery: "SELECT exchange_number, name, status, completion_deadline FROM exchanges WHERE status = '180D' AND deleted_at IS NULL ORDER BY completion_deadline ASC"
  },

  // Time-based Queries
  {
    id: 11,
    category: 'Deadlines',
    naturalLanguage: "Show exchanges with 45-day deadlines approaching within 30 days",
    expectedSQLPattern: /identification_deadline.*INTERVAL.*30.*day/i,
    classicQuery: `SELECT exchange_number, name, identification_deadline, 
      (identification_deadline - CURRENT_DATE) as days_remaining 
      FROM exchanges 
      WHERE identification_deadline IS NOT NULL 
      AND identification_deadline > CURRENT_DATE 
      AND identification_deadline <= CURRENT_DATE + INTERVAL '30 days' 
      AND deleted_at IS NULL 
      ORDER BY identification_deadline ASC`
  },
  {
    id: 12,
    category: 'Deadlines',
    naturalLanguage: "Find overdue exchanges past their 180-day deadline",
    expectedSQLPattern: /completion_deadline.*<.*CURRENT_DATE/i,
    classicQuery: `SELECT exchange_number, name, completion_deadline,
      (CURRENT_DATE - completion_deadline) as days_overdue
      FROM exchanges 
      WHERE completion_deadline IS NOT NULL 
      AND completion_deadline < CURRENT_DATE 
      AND status != 'COMPLETED'
      AND deleted_at IS NULL 
      ORDER BY completion_deadline ASC`
  },
  {
    id: 13,
    category: 'Time-based',
    naturalLanguage: "What exchanges were created this year?",
    expectedSQLPattern: /created_at.*>=.*EXTRACT\(YEAR/i,
    classicQuery: "SELECT exchange_number, name, created_at, status FROM exchanges WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE) AND deleted_at IS NULL ORDER BY created_at DESC"
  },
  {
    id: 14,
    category: 'Time-based',
    naturalLanguage: "Show me exchanges created in the last 30 days",
    expectedSQLPattern: /created_at.*>=.*CURRENT_DATE.*INTERVAL.*30.*day/i,
    classicQuery: "SELECT exchange_number, name, created_at, status FROM exchanges WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' AND deleted_at IS NULL ORDER BY created_at DESC"
  },

  // Client-based Queries
  {
    id: 15,
    category: 'Clients',
    naturalLanguage: "How many exchanges does each client have?",
    expectedSQLPattern: /GROUP BY.*client_id/i,
    classicQuery: `SELECT c.first_name, c.last_name, c.email, COUNT(e.id) as exchange_count
      FROM exchanges e 
      JOIN contacts c ON e.client_id = c.id 
      WHERE e.deleted_at IS NULL 
      GROUP BY c.id, c.first_name, c.last_name, c.email 
      ORDER BY exchange_count DESC`
  },
  {
    id: 16,
    category: 'Clients',
    naturalLanguage: "List exchanges for clients with Gmail addresses",
    expectedSQLPattern: /email.*LIKE.*'%gmail.com'/i,
    classicQuery: `SELECT e.exchange_number, e.name, c.first_name, c.last_name, c.email
      FROM exchanges e 
      JOIN contacts c ON e.client_id = c.id 
      WHERE c.email LIKE '%gmail.com' AND e.deleted_at IS NULL 
      ORDER BY e.created_at DESC`
  },

  // Coordinator-based Queries
  {
    id: 17,
    category: 'Coordinators',
    naturalLanguage: "How many exchanges is each coordinator managing?",
    expectedSQLPattern: /GROUP BY.*coordinator_id/i,
    classicQuery: `SELECT u.first_name, u.last_name, u.email, COUNT(e.id) as managed_exchanges
      FROM exchanges e 
      JOIN users u ON e.coordinator_id = u.id 
      WHERE e.deleted_at IS NULL 
      GROUP BY u.id, u.first_name, u.last_name, u.email 
      ORDER BY managed_exchanges DESC`
  },
  {
    id: 18,
    category: 'Coordinators',
    naturalLanguage: "Show active exchanges managed by Sarah Johnson",
    expectedSQLPattern: /JOIN.*users.*WHERE.*first_name.*Sarah.*last_name.*Johnson/i,
    classicQuery: `SELECT e.exchange_number, e.name, e.status, e.exchange_value
      FROM exchanges e 
      JOIN users u ON e.coordinator_id = u.id 
      WHERE u.first_name = 'Sarah' AND u.last_name = 'Johnson' 
      AND e.status IN ('45D', '180D', 'In Progress') 
      AND e.deleted_at IS NULL 
      ORDER BY e.created_at DESC`
  },

  // Progress-based Queries
  {
    id: 19,
    category: 'Progress',
    naturalLanguage: "Which exchanges are more than 75% complete?",
    expectedSQLPattern: /WHERE.*progress.*>.*75/i,
    classicQuery: "SELECT exchange_number, name, progress, status FROM exchanges WHERE progress > 75 AND deleted_at IS NULL ORDER BY progress DESC"
  },
  {
    id: 20,
    category: 'Progress',
    naturalLanguage: "Find exchanges with low progress under 25%",
    expectedSQLPattern: /WHERE.*progress.*<.*25/i,
    classicQuery: "SELECT exchange_number, name, progress, status, created_at FROM exchanges WHERE progress < 25 AND deleted_at IS NULL ORDER BY created_at ASC"
  },

  // Complex Aggregation Queries
  {
    id: 21,
    category: 'Aggregations',
    naturalLanguage: "What's the total value by exchange status?",
    expectedSQLPattern: /GROUP BY.*status.*SUM\(exchange_value\)/i,
    classicQuery: "SELECT status, COUNT(*) as count, SUM(exchange_value) as total_value FROM exchanges WHERE exchange_value IS NOT NULL AND deleted_at IS NULL GROUP BY status ORDER BY total_value DESC"
  },
  {
    id: 22,
    category: 'Aggregations',
    naturalLanguage: "Show average exchange value by month this year",
    expectedSQLPattern: /GROUP BY.*EXTRACT\(MONTH.*AVG\(exchange_value\)/i,
    classicQuery: `SELECT EXTRACT(MONTH FROM created_at) as month,
      TO_CHAR(created_at, 'Month') as month_name,
      COUNT(*) as exchanges_count,
      AVG(exchange_value) as average_value
      FROM exchanges 
      WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND exchange_value IS NOT NULL 
      AND deleted_at IS NULL
      GROUP BY EXTRACT(MONTH FROM created_at), TO_CHAR(created_at, 'Month')
      ORDER BY month`
  },

  // Property-based Queries
  {
    id: 23,
    category: 'Properties',
    naturalLanguage: "Show exchanges with properties in California",
    expectedSQLPattern: /relinquished_property_address.*ILIKE.*'%California%'/i,
    classicQuery: "SELECT exchange_number, name, relinquished_property_address FROM exchanges WHERE relinquished_property_address ILIKE '%California%' AND deleted_at IS NULL"
  },
  {
    id: 24,
    category: 'Properties',
    naturalLanguage: "Find exchanges with sale prices over 2 million",
    expectedSQLPattern: /relinquished_sale_price.*>.*2000000/i,
    classicQuery: "SELECT exchange_number, name, relinquished_sale_price, relinquished_property_address FROM exchanges WHERE relinquished_sale_price > 2000000 AND deleted_at IS NULL ORDER BY relinquished_sale_price DESC"
  },

  // Risk Analysis Queries
  {
    id: 25,
    category: 'Risk Analysis',
    naturalLanguage: "Show high-risk exchanges approaching deadlines",
    expectedSQLPattern: /identification_deadline.*INTERVAL.*45.*day/i,
    classicQuery: `SELECT exchange_number, name, status, identification_deadline,
      (identification_deadline - CURRENT_DATE) as days_remaining
      FROM exchanges 
      WHERE identification_deadline IS NOT NULL 
      AND identification_deadline <= CURRENT_DATE + INTERVAL '45 days'
      AND status != 'COMPLETED'
      AND deleted_at IS NULL
      ORDER BY identification_deadline ASC`
  },

  // Performance Queries
  {
    id: 26,
    category: 'Performance',
    naturalLanguage: "What's our completion rate percentage?",
    expectedSQLPattern: /COUNT.*CASE.*WHEN.*status.*COMPLETED/i,
    classicQuery: `SELECT 
      ROUND(
        (COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(*)), 2
      ) as completion_rate_percentage
      FROM exchanges WHERE deleted_at IS NULL`
  },

  // Geographic Queries
  {
    id: 27,
    category: 'Geographic',
    naturalLanguage: "List exchanges by state from property addresses",
    expectedSQLPattern: /GROUP BY.*state/i,
    classicQuery: `SELECT 
      CASE 
        WHEN relinquished_property_address ILIKE '%California%' OR relinquished_property_address ILIKE '%CA%' THEN 'California'
        WHEN relinquished_property_address ILIKE '%Texas%' OR relinquished_property_address ILIKE '%TX%' THEN 'Texas'
        WHEN relinquished_property_address ILIKE '%New York%' OR relinquished_property_address ILIKE '%NY%' THEN 'New York'
        WHEN relinquished_property_address ILIKE '%Florida%' OR relinquished_property_address ILIKE '%FL%' THEN 'Florida'
        ELSE 'Other'
      END as state,
      COUNT(*) as exchange_count,
      AVG(exchange_value) as avg_value
      FROM exchanges 
      WHERE relinquished_property_address IS NOT NULL 
      AND deleted_at IS NULL
      GROUP BY 1
      ORDER BY exchange_count DESC`
  },

  // Time-series Queries
  {
    id: 28,
    category: 'Time Series',
    naturalLanguage: "Show exchange creation trend by quarter",
    expectedSQLPattern: /GROUP BY.*EXTRACT\(QUARTER/i,
    classicQuery: `SELECT 
      EXTRACT(YEAR FROM created_at) as year,
      EXTRACT(QUARTER FROM created_at) as quarter,
      COUNT(*) as exchanges_created,
      SUM(exchange_value) as total_value
      FROM exchanges 
      WHERE created_at >= CURRENT_DATE - INTERVAL '2 years'
      AND deleted_at IS NULL
      GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(QUARTER FROM created_at)
      ORDER BY year, quarter`
  },

  // Complex Business Logic
  {
    id: 29,
    category: 'Business Logic',
    naturalLanguage: "Find exchanges that might fail to meet their 45-day deadline",
    expectedSQLPattern: /identification_deadline.*progress.*<.*50/i,
    classicQuery: `SELECT exchange_number, name, identification_deadline, progress, status,
      (identification_deadline - CURRENT_DATE) as days_remaining
      FROM exchanges 
      WHERE identification_deadline IS NOT NULL 
      AND identification_deadline > CURRENT_DATE 
      AND identification_deadline <= CURRENT_DATE + INTERVAL '60 days'
      AND (progress < 50 OR progress IS NULL)
      AND status != 'COMPLETED'
      AND deleted_at IS NULL
      ORDER BY identification_deadline ASC`
  },

  // Advanced Analytics
  {
    id: 30,
    category: 'Advanced Analytics',
    naturalLanguage: "Calculate the success rate and average time to completion for each coordinator",
    expectedSQLPattern: /GROUP BY.*coordinator_id.*AVG.*completion_time/i,
    classicQuery: `SELECT 
      u.first_name, u.last_name, u.email,
      COUNT(*) as total_exchanges,
      COUNT(CASE WHEN e.status = 'COMPLETED' THEN 1 END) as completed_exchanges,
      ROUND(
        (COUNT(CASE WHEN e.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(*)), 2
      ) as success_rate_percentage,
      AVG(CASE 
        WHEN e.status = 'COMPLETED' AND e.completion_deadline IS NOT NULL 
        THEN EXTRACT(DAYS FROM (e.updated_at - e.created_at))
      END) as avg_completion_days
      FROM exchanges e 
      JOIN users u ON e.coordinator_id = u.id 
      WHERE e.deleted_at IS NULL 
      GROUP BY u.id, u.first_name, u.last_name, u.email 
      HAVING COUNT(*) > 0
      ORDER BY success_rate_percentage DESC, total_exchanges DESC`
  }
];

// Test execution functions
async function executeClassicQuery(query) {
  try {
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: query });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Classic query error:', error);
    return null;
  }
}

async function executeAIQuery(naturalLanguage) {
  try {
    // This would call your AI query endpoint
    const response = await fetch(`${process.env.API_URL || 'http://localhost:5001'}/api/analytics/ai-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TEST_JWT_TOKEN}`
      },
      body: JSON.stringify({ query: naturalLanguage })
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('AI query error:', error);
    return null;
  }
}

function compareResults(classicResult, aiResult, testCase) {
  const comparison = {
    testId: testCase.id,
    category: testCase.category,
    naturalLanguage: testCase.naturalLanguage,
    classicResultCount: classicResult ? classicResult.length : 0,
    aiResultCount: aiResult ? (aiResult.data ? aiResult.data.length : 0) : 0,
    sqlGenerated: aiResult ? aiResult.generatedSQL : null,
    sqlPatternMatch: aiResult && aiResult.generatedSQL ? 
      testCase.expectedSQLPattern.test(aiResult.generatedSQL) : false,
    resultsMatch: false,
    accuracy: 0
  };

  // Compare result counts
  if (comparison.classicResultCount === comparison.aiResultCount && comparison.classicResultCount > 0) {
    comparison.resultsMatch = true;
    comparison.accuracy = 100;
  } else if (comparison.classicResultCount > 0 && comparison.aiResultCount > 0) {
    // Partial match - calculate accuracy based on count similarity
    const smaller = Math.min(comparison.classicResultCount, comparison.aiResultCount);
    const larger = Math.max(comparison.classicResultCount, comparison.aiResultCount);
    comparison.accuracy = Math.round((smaller / larger) * 100);
    comparison.resultsMatch = comparison.accuracy >= 90; // Consider 90%+ as a match
  }

  return comparison;
}

async function runAllTests() {
  console.log('\n🚀 Starting Natural Language Query Testing Suite');
  console.log('=' .repeat(80));

  const results = [];
  let passedTests = 0;
  let failedTests = 0;

  for (const testCase of naturalLanguageTests) {
    console.log(`\n📝 Test ${testCase.id}: ${testCase.category}`);
    console.log(`💬 Natural Language: "${testCase.naturalLanguage}"`);
    
    // Execute both queries
    const classicResult = await executeClassicQuery(testCase.classicQuery);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    const aiResult = await executeAIQuery(testCase.naturalLanguage);
    
    // Compare results
    const comparison = compareResults(classicResult, aiResult, testCase);
    results.push(comparison);

    // Display results
    console.log(`🔍 Generated SQL Pattern Match: ${comparison.sqlPatternMatch ? '✅' : '❌'}`);
    if (comparison.sqlGenerated) {
      console.log(`🤖 AI Generated SQL: ${comparison.sqlGenerated}`);
    }
    console.log(`📊 Classic Results: ${comparison.classicResultCount} rows`);
    console.log(`🧠 AI Results: ${comparison.aiResultCount} rows`);
    console.log(`🎯 Accuracy: ${comparison.accuracy}%`);
    console.log(`✅ Results Match: ${comparison.resultsMatch ? 'PASS' : 'FAIL'}`);

    if (comparison.resultsMatch && comparison.sqlPatternMatch) {
      passedTests++;
      console.log('🟢 Overall: PASSED');
    } else {
      failedTests++;
      console.log('🔴 Overall: FAILED');
    }
  }

  // Summary
  console.log('\n' + '=' .repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(80));
  console.log(`Total Tests: ${naturalLanguageTests.length}`);
  console.log(`✅ Passed: ${passedTests} (${Math.round((passedTests / naturalLanguageTests.length) * 100)}%)`);
  console.log(`❌ Failed: ${failedTests} (${Math.round((failedTests / naturalLanguageTests.length) * 100)}%)`);

  // Category breakdown
  const categoryStats = {};
  results.forEach(result => {
    if (!categoryStats[result.category]) {
      categoryStats[result.category] = { total: 0, passed: 0 };
    }
    categoryStats[result.category].total++;
    if (result.resultsMatch && result.sqlPatternMatch) {
      categoryStats[result.category].passed++;
    }
  });

  console.log('\n📋 Results by Category:');
  Object.entries(categoryStats).forEach(([category, stats]) => {
    const percentage = Math.round((stats.passed / stats.total) * 100);
    console.log(`  ${category}: ${stats.passed}/${stats.total} (${percentage}%)`);
  });

  // Failed tests details
  const failedTestsDetails = results.filter(r => !r.resultsMatch || !r.sqlPatternMatch);
  if (failedTestsDetails.length > 0) {
    console.log('\n❌ Failed Tests Details:');
    failedTestsDetails.forEach(test => {
      console.log(`  Test ${test.testId} (${test.category}): "${test.naturalLanguage}"`);
      console.log(`    SQL Pattern Match: ${test.sqlPatternMatch ? '✅' : '❌'}`);
      console.log(`    Results Match: ${test.resultsMatch ? '✅' : '❌'} (${test.accuracy}%)`);
    });
  }

  return {
    total: naturalLanguageTests.length,
    passed: passedTests,
    failed: failedTests,
    passRate: Math.round((passedTests / naturalLanguageTests.length) * 100),
    categoryStats,
    failedTests: failedTestsDetails,
    allResults: results
  };
}

// Export for use in other modules or run directly
if (require.main === module) {
  runAllTests()
    .then(summary => {
      console.log('\n🎉 Testing completed!');
      process.exit(summary.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Testing failed with error:', error);
      process.exit(1);
    });
}

module.exports = {
  naturalLanguageTests,
  runAllTests,
  executeClassicQuery,
  executeAIQuery,
  compareResults
};