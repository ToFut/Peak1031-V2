/**
 * Test Enhanced Query Service
 * 
 * Comprehensive test script to validate the enhanced database indexing 
 * and OSS LLM query generation functionality.
 */

const enhancedSchemaService = require('../services/enhanced-database-schema');
const ossLLMService = require('../services/oss-llm-query');

// Test queries representing different user intentions and complexity levels
const TEST_QUERIES = [
  // Basic count queries
  {
    query: "How many exchanges are in the system?",
    expectedType: "count",
    complexity: "simple",
    category: "basic"
  },
  {
    query: "How many active exchanges do we have?",
    expectedType: "count_filtered",
    complexity: "simple",
    category: "status"
  },
  
  // Status-based queries
  {
    query: "Show me all active exchanges",
    expectedType: "list_filtered",
    complexity: "simple",
    category: "status"
  },
  {
    query: "List completed exchanges",
    expectedType: "list_filtered",
    complexity: "simple",
    category: "status"
  },
  
  // Time-based queries
  {
    query: "Show me recent exchanges",
    expectedType: "list_time_filtered",
    complexity: "moderate",
    category: "time"
  },
  {
    query: "What exchanges were created this month?",
    expectedType: "list_time_filtered",
    complexity: "moderate",
    category: "time"
  },
  
  // User/role-based queries
  {
    query: "Show my assigned exchanges",
    expectedType: "user_specific",
    complexity: "moderate",
    category: "personal"
  },
  {
    query: "What tasks are assigned to me?",
    expectedType: "user_specific",
    complexity: "moderate",
    category: "personal"
  },
  
  // 1031-specific business logic queries
  {
    query: "Which exchanges have approaching 45-day deadlines?",
    expectedType: "business_logic",
    complexity: "complex",
    category: "1031"
  },
  {
    query: "Show exchanges past their 180-day deadline",
    expectedType: "business_logic",
    complexity: "complex",
    category: "1031"
  },
  
  // Relationship queries
  {
    query: "Show exchanges with their coordinators",
    expectedType: "join",
    complexity: "complex",
    category: "relationship"
  },
  {
    query: "List exchanges and their clients",
    expectedType: "join",
    complexity: "complex",
    category: "relationship"
  },
  
  // Analytics queries
  {
    query: "What's the total value of all exchange proceeds?",
    expectedType: "aggregate",
    complexity: "moderate",
    category: "analytics"
  },
  {
    query: "Show me system statistics",
    expectedType: "analytics",
    complexity: "complex",
    category: "analytics"
  },
  
  // Geographic queries
  {
    query: "How many exchanges by state?",
    expectedType: "group_by",
    complexity: "moderate",
    category: "geographic"
  },
  {
    query: "Show property locations in California",
    expectedType: "location_filtered",
    complexity: "moderate",
    category: "geographic"
  },
  
  // Complex business queries
  {
    query: "Find exchanges with overdue tasks",
    expectedType: "complex_join",
    complexity: "very_complex",
    category: "business"
  },
  {
    query: "Show me exchange performance trends",
    expectedType: "analytics_complex",
    complexity: "very_complex",
    category: "analytics"
  }
];

class EnhancedQueryTester {
  constructor() {
    this.testResults = [];
    this.initialized = false;
  }

  async initialize() {
    console.log('🚀 Initializing Enhanced Query Tester...\n');
    
    try {
      // Initialize the OSS LLM service
      await ossLLMService.initialize();
      
      // Load enhanced schema
      await enhancedSchemaService.getFullSchema();
      
      this.initialized = true;
      console.log('✅ Enhanced Query Tester initialized successfully\n');
      
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Query Tester:', error);
      throw error;
    }
  }

  async runAllTests() {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log('📊 Running Enhanced Query Tests...\n');
    console.log(`Testing ${TEST_QUERIES.length} queries across different categories:\n`);

    for (let i = 0; i < TEST_QUERIES.length; i++) {
      const testQuery = TEST_QUERIES[i];
      await this.runSingleTest(testQuery, i + 1);
    }

    this.generateTestReport();
  }

  async runSingleTest(testQuery, testNumber) {
    console.log(`🔍 Test ${testNumber}: "${testQuery.query}"`);
    console.log(`   Expected: ${testQuery.expectedType} (${testQuery.complexity} complexity)`);

    const startTime = Date.now();
    let result;

    try {
      // Test without user context first
      result = await ossLLMService.processQuery(testQuery.query);
      
      const executionTime = Date.now() - startTime;
      
      const testResult = {
        testNumber,
        query: testQuery.query,
        expected: testQuery,
        result,
        executionTime,
        success: result.generatedSQL !== null,
        error: result.error || null
      };

      this.testResults.push(testResult);

      if (testResult.success) {
        console.log(`   ✅ SUCCESS - Generated SQL in ${executionTime}ms`);
        console.log(`   📝 SQL: ${this.truncateSQL(result.generatedSQL)}`);
        console.log(`   📊 Results: ${result.rowCount} rows`);
        if (result.fromCache) {
          console.log(`   🎯 Cache HIT`);
        }
      } else {
        console.log(`   ❌ FAILED - ${result.error}`);
        console.log(`   💡 Suggestions: ${result.suggestedActions.slice(0, 2).join(', ')}`);
      }

    } catch (error) {
      console.log(`   💥 ERROR - ${error.message}`);
      this.testResults.push({
        testNumber,
        query: testQuery.query,
        expected: testQuery,
        result: null,
        executionTime: Date.now() - startTime,
        success: false,
        error: error.message
      });
    }

    console.log(''); // Empty line for readability
  }

  truncateSQL(sql) {
    if (!sql) return 'null';
    return sql.length > 100 ? sql.substring(0, 100) + '...' : sql;
  }

  generateTestReport() {
    console.log('📋 ENHANCED QUERY SERVICE TEST REPORT');
    console.log('='.repeat(60));

    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    const successRate = ((successfulTests / totalTests) * 100).toFixed(1);

    console.log(`\n📊 OVERALL STATISTICS:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Successful: ${successfulTests} (${successRate}%)`);
    console.log(`   Failed: ${failedTests}`);

    // Performance statistics
    const executionTimes = this.testResults.map(r => r.executionTime);
    const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
    const minTime = Math.min(...executionTimes);
    const maxTime = Math.max(...executionTimes);

    console.log(`\n⚡ PERFORMANCE METRICS:`);
    console.log(`   Average Response Time: ${avgTime.toFixed(1)}ms`);
    console.log(`   Fastest Query: ${minTime}ms`);
    console.log(`   Slowest Query: ${maxTime}ms`);

    // Category breakdown
    const categoryStats = {};
    TEST_QUERIES.forEach(q => {
      if (!categoryStats[q.category]) {
        categoryStats[q.category] = { total: 0, successful: 0 };
      }
      categoryStats[q.category].total++;
    });

    this.testResults.forEach(r => {
      const category = TEST_QUERIES.find(q => q.query === r.query)?.category;
      if (category && r.success) {
        categoryStats[category].successful++;
      }
    });

    console.log(`\n📂 SUCCESS RATE BY CATEGORY:`);
    Object.entries(categoryStats).forEach(([category, stats]) => {
      const rate = ((stats.successful / stats.total) * 100).toFixed(1);
      console.log(`   ${category}: ${stats.successful}/${stats.total} (${rate}%)`);
    });

    // Complexity breakdown
    const complexityStats = {};
    TEST_QUERIES.forEach(q => {
      if (!complexityStats[q.complexity]) {
        complexityStats[q.complexity] = { total: 0, successful: 0 };
      }
      complexityStats[q.complexity].total++;
    });

    this.testResults.forEach(r => {
      const complexity = TEST_QUERIES.find(q => q.query === r.query)?.complexity;
      if (complexity && r.success) {
        complexityStats[complexity].successful++;
      }
    });

    console.log(`\n🎯 SUCCESS RATE BY COMPLEXITY:`);
    Object.entries(complexityStats).forEach(([complexity, stats]) => {
      const rate = ((stats.successful / stats.total) * 100).toFixed(1);
      console.log(`   ${complexity}: ${stats.successful}/${stats.total} (${rate}%)`);
    });

    // Failed queries analysis
    const failedQueries = this.testResults.filter(r => !r.success);
    if (failedQueries.length > 0) {
      console.log(`\n❌ FAILED QUERIES ANALYSIS:`);
      failedQueries.forEach(r => {
        console.log(`   "${r.query}" - ${r.error}`);
      });
    }

    // Service statistics
    const serviceStats = ossLLMService.getQueryStatistics();
    console.log(`\n🔧 SERVICE METRICS:`);
    console.log(`   Total Queries Processed: ${serviceStats.totalQueries}`);
    console.log(`   Cache Hit Rate: ${serviceStats.performance?.cacheHitRate || 0}%`);
    console.log(`   Model Status: ${serviceStats.modelLoaded ? 'Loaded' : 'Not Loaded'}`);

    console.log(`\n✨ Test completed successfully!`);
  }

  async testSchemaService() {
    console.log('🔍 Testing Enhanced Schema Service...\n');

    try {
      // Test schema loading
      const schema = await enhancedSchemaService.getFullSchema();
      console.log(`✅ Schema loaded: ${Object.keys(schema.tables).length} tables`);

      // Test schema context generation
      const context = await enhancedSchemaService.getSchemaContextForLLM();
      console.log(`✅ Schema context generated: ${context.length} characters`);

      // Test schema statistics
      const stats = await enhancedSchemaService.getSchemaStatistics();
      console.log(`✅ Schema statistics: ${JSON.stringify(stats, null, 2)}`);

      console.log('\n🎉 Enhanced Schema Service tests passed!\n');

    } catch (error) {
      console.error('❌ Schema service test failed:', error);
      throw error;
    }
  }

  async demonstrateFeatures() {
    console.log('🎪 Demonstrating Enhanced Query Features...\n');

    // Test caching
    console.log('🎯 Testing Query Caching:');
    const testQuery = "How many exchanges are active?";
    
    console.log('   First query (should cache):');
    const result1 = await ossLLMService.processQuery(testQuery);
    console.log(`   ⏱️  Time: ${result1.totalExecutionTime}ms, Cache: ${result1.fromCache ? 'HIT' : 'MISS'}`);
    
    console.log('   Second query (should hit cache):');
    const result2 = await ossLLMService.processQuery(testQuery);
    console.log(`   ⏱️  Time: ${result2.totalExecutionTime}ms, Cache: ${result2.fromCache ? 'HIT' : 'MISS'}`);

    // Test suggestions
    console.log('\n💡 Testing Query Suggestions:');
    const suggestions = await ossLLMService.getQuerySuggestions(5);
    suggestions.forEach((suggestion, index) => {
      console.log(`   ${index + 1}. "${suggestion.query}" (${suggestion.type}, ${suggestion.category})`);
    });

    console.log('\n🎉 Feature demonstration completed!\n');
  }
}

// Main execution function
async function runTests() {
  const tester = new EnhancedQueryTester();

  try {
    // Test the enhanced schema service
    await tester.testSchemaService();

    // Run all query tests
    await tester.runAllTests();

    // Demonstrate advanced features
    await tester.demonstrateFeatures();

    console.log('🎊 All tests completed successfully!');
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Export for use as module or run directly
if (require.main === module) {
  runTests();
}

module.exports = { EnhancedQueryTester, runTests, TEST_QUERIES };