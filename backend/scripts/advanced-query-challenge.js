/**
 * Advanced Query Challenge Test
 * 
 * 20 difficult natural language questions to test and score the enhanced query system
 * Includes complex patterns, edge cases, and real-world scenarios
 */

const ossLLMService = require('../services/oss-llm-query');

// 20 Difficult Natural Language Questions with Expected Outcomes
const CHALLENGE_QUERIES = [
  {
    id: 1,
    query: "How many exchanges names are with - Katzovitz, Yechiel?",
    difficulty: "Hard",
    category: "Name Search",
    expectedPattern: "name_search_count",
    description: "Complex name format with punctuation and multiple names",
    points: 10
  },
  {
    id: 2,
    query: "Show me all exchanges where the client's last name contains 'smith' but the exchange was created before January 2024",
    difficulty: "Very Hard",
    category: "Complex Filter",
    expectedPattern: "name_date_filter",
    description: "Combination of name search and date filtering",
    points: 15
  },
  {
    id: 3,
    query: "Find properties in NYC, LA, or Chicago with proceeds over $2.5 million",
    difficulty: "Hard",
    category: "Geographic + Financial",
    expectedPattern: "location_financial_filter",
    description: "Multiple locations with financial threshold",
    points: 12
  },
  {
    id: 4,
    query: "What's the average exchange value for properties sold this quarter in California?",
    difficulty: "Very Hard",
    category: "Analytics + Geographic + Time",
    expectedPattern: "aggregate_time_location",
    description: "Complex aggregation with time and location filters",
    points: 18
  },
  {
    id: 5,
    query: "Show exchanges approaching their 45-day deadline in the next 2 weeks where the coordinator is named Johnson",
    difficulty: "Extreme",
    category: "Business Logic + Name + Time",
    expectedPattern: "deadline_coordinator_filter",
    description: "1031-specific deadlines with coordinator name and time window",
    points: 20
  },
  {
    id: 6,
    query: "List all clients from Texas whose exchanges have a replacement property value between 800k and 1.2M",
    difficulty: "Hard",
    category: "Geographic + Financial Range",
    expectedPattern: "location_value_range",
    description: "State filter with financial range on replacement property",
    points: 14
  },
  {
    id: 7,
    query: "How many overdue tasks are there for exchanges managed by coordinators hired in 2023?",
    difficulty: "Very Hard",
    category: "Task + User + Time",
    expectedPattern: "task_user_date_filter",
    description: "Cross-entity query with date filtering on user creation",
    points: 16
  },
  {
    id: 8,
    query: "Find exchanges with 'LLC' in the client name that have both relinquished and replacement properties in different states",
    difficulty: "Extreme",
    category: "Name Pattern + Geographic Logic",
    expectedPattern: "entity_interstate_filter",
    description: "Business entity pattern with complex geographic logic",
    points: 22
  },
  {
    id: 9,
    query: "What percentage of exchanges completed this year had proceeds above the median value?",
    difficulty: "Extreme",
    category: "Statistical Analysis",
    expectedPattern: "statistical_analysis",
    description: "Complex statistical calculation with percentiles",
    points: 25
  },
  {
    id: 10,
    query: "Show me exchanges where the client's email domain is gmail.com and the exchange type is simultaneous",
    difficulty: "Medium",
    category: "Pattern Matching + Business Logic",
    expectedPattern: "email_pattern_type_filter",
    description: "Email domain extraction with business type filtering",
    points: 8
  },
  {
    id: 11,
    query: "Find all contacts whose phone number starts with 212 or 646 and are involved in active exchanges",
    difficulty: "Hard",
    category: "Pattern Matching + Status",
    expectedPattern: "phone_pattern_status_filter",
    description: "Phone number pattern matching with relationship filtering",
    points: 13
  },
  {
    id: 12,
    query: "List exchanges that missed their 180-day deadline, ordered by how many days past due",
    difficulty: "Hard",
    category: "1031 Business Logic + Calculation",
    expectedPattern: "deadline_calculation_sort",
    description: "1031 deadline logic with calculated sorting",
    points: 15
  },
  {
    id: 13,
    query: "How many documents were uploaded last month by clients vs coordinators vs third parties?",
    difficulty: "Very Hard",
    category: "Document Analytics + Role Comparison",
    expectedPattern: "document_role_comparison",
    description: "Document analytics with role-based grouping and time filter",
    points: 17
  },
  {
    id: 14,
    query: "Show exchanges where the relinquished property is in a different zip code than the replacement property",
    difficulty: "Hard",
    category: "Geographic Comparison",
    expectedPattern: "property_location_comparison",
    description: "Comparison between relinquished and replacement property locations",
    points: 14
  },
  {
    id: 15,
    query: "Find the top 5 coordinators by total exchange value managed, but only for exchanges closed in 2024",
    difficulty: "Very Hard",
    category: "Ranking + Aggregation + Time",
    expectedPattern: "coordinator_ranking_value",
    description: "Complex ranking with aggregation and date filtering",
    points: 19
  },
  {
    id: 16,
    query: "What's the most common property type being relinquished in Florida-based exchanges?",
    difficulty: "Medium",
    category: "Analytics + Geographic",
    expectedPattern: "property_type_analysis",
    description: "Categorical analysis with geographic filtering",
    points: 9
  },
  {
    id: 17,
    query: "Show exchanges that have messages containing the word 'urgent' or 'emergency' in the last 48 hours",
    difficulty: "Very Hard",
    category: "Text Search + Time",
    expectedPattern: "message_keyword_time_filter",
    description: "Full-text search in messages with recent time filtering",
    points: 16
  },
  {
    id: 18,
    query: "List all exchanges where the client and coordinator have the same area code",
    difficulty: "Extreme",
    category: "Pattern Extraction + Comparison",
    expectedPattern: "area_code_comparison",
    description: "Phone number pattern extraction and cross-entity comparison",
    points: 23
  },
  {
    id: 19,
    query: "Find exchanges that have been reassigned (changed coordinators) more than once in the past 6 months",
    difficulty: "Extreme",
    category: "Change Tracking + History",
    expectedPattern: "reassignment_history",
    description: "Historical change tracking with frequency analysis",
    points: 24
  },
  {
    id: 20,
    query: "What's the correlation between exchange value and time to completion for California properties?",
    difficulty: "Extreme",
    category: "Statistical Correlation",
    expectedPattern: "correlation_analysis",
    description: "Advanced statistical analysis with geographic filtering",
    points: 25
  }
];

class AdvancedQueryChallenge {
  constructor() {
    this.results = [];
    this.totalScore = 0;
    this.maxPossibleScore = CHALLENGE_QUERIES.reduce((sum, q) => sum + q.points, 0);
    this.categoryStats = {};
    this.difficultyStats = {};
  }

  async runChallenge() {
    console.log('🎯 ADVANCED QUERY CHALLENGE - 20 Difficult Questions\n');
    console.log(`Maximum Possible Score: ${this.maxPossibleScore} points\n`);
    console.log('='.repeat(80));

    // Initialize OSS LLM service
    await ossLLMService.initialize();

    for (let i = 0; i < CHALLENGE_QUERIES.length; i++) {
      const testCase = CHALLENGE_QUERIES[i];
      await this.runSingleChallenge(testCase, i + 1);
      
      // Add small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.generateScoreReport();
    this.generateImprovementPlan();
  }

  async runSingleChallenge(testCase, testNumber) {
    console.log(`\n🧪 Test ${testNumber}/20: ${testCase.query}`);
    console.log(`   Difficulty: ${testCase.difficulty} | Category: ${testCase.category} | Points: ${testCase.points}`);
    console.log(`   Expected: ${testCase.description}`);

    const startTime = Date.now();
    let result = {
      id: testCase.id,
      query: testCase.query,
      difficulty: testCase.difficulty,
      category: testCase.category,
      points: testCase.points,
      score: 0,
      success: false,
      sqlGenerated: false,
      executionTime: 0,
      error: null,
      generatedSQL: null,
      feedback: ''
    };

    try {
      const queryResult = await ossLLMService.processQuery(testCase.query);
      const executionTime = Date.now() - startTime;
      
      result.executionTime = executionTime;
      result.generatedSQL = queryResult.generatedSQL;
      result.error = queryResult.error;

      if (queryResult.generatedSQL) {
        result.sqlGenerated = true;
        result.success = true;
        result.score = this.scoreQuery(testCase, queryResult);
        result.feedback = this.generateFeedback(testCase, queryResult, result.score);
        
        console.log(`   ✅ SQL Generated (${executionTime}ms)`);
        console.log(`   📝 SQL: ${this.truncateSQL(queryResult.generatedSQL)}`);
        console.log(`   🎯 Score: ${result.score}/${testCase.points} points`);
        console.log(`   💬 ${result.feedback}`);
        
        this.totalScore += result.score;
      } else {
        console.log(`   ❌ FAILED: ${queryResult.error}`);
        result.feedback = "No SQL generated - pattern not recognized";
      }

    } catch (error) {
      result.error = error.message;
      result.executionTime = Date.now() - startTime;
      console.log(`   💥 ERROR: ${error.message}`);
      result.feedback = `Exception thrown: ${error.message}`;
    }

    this.results.push(result);
    this.updateStats(result);
  }

  scoreQuery(testCase, queryResult) {
    const sql = queryResult.generatedSQL?.toLowerCase() || '';
    let score = 0;
    const maxScore = testCase.points;

    // Basic scoring criteria
    const scoringCriteria = {
      hasSelect: sql.includes('select') ? 2 : 0,
      hasFrom: sql.includes('from') ? 2 : 0,
      hasWhere: sql.includes('where') ? 2 : 0,
      hasAppropriateTable: this.checkAppropriateTable(testCase, sql) ? 3 : 0,
      hasNameSearch: testCase.category.includes('Name') && this.hasNameSearchLogic(sql) ? 3 : 0,
      hasDateFilter: testCase.category.includes('Time') && this.hasDateLogic(sql) ? 3 : 0,
      hasGeographicFilter: testCase.category.includes('Geographic') && this.hasGeographicLogic(sql) ? 3 : 0,
      hasFinancialFilter: testCase.category.includes('Financial') && this.hasFinancialLogic(sql) ? 3 : 0,
      hasJoins: testCase.category.includes('Complex') && sql.includes('join') ? 4 : 0,
      hasAggregation: testCase.category.includes('Analytics') && this.hasAggregationLogic(sql) ? 4 : 0,
      hasBusinessLogic: testCase.category.includes('Business Logic') && this.has1031Logic(sql) ? 4 : 0
    };

    // Calculate base score
    const baseScore = Object.values(scoringCriteria).reduce((sum, points) => sum + points, 0);
    
    // Apply difficulty multiplier
    const difficultyMultipliers = {
      'Easy': 0.8,
      'Medium': 1.0,
      'Hard': 1.2,
      'Very Hard': 1.4,
      'Extreme': 1.6
    };

    score = Math.min(
      maxScore, 
      Math.round(baseScore * (difficultyMultipliers[testCase.difficulty] || 1.0))
    );

    return Math.max(0, score);
  }

  checkAppropriateTable(testCase, sql) {
    const category = testCase.category.toLowerCase();
    if (category.includes('exchange') || category.includes('property')) return sql.includes('exchanges');
    if (category.includes('contact') || category.includes('client')) return sql.includes('contacts');
    if (category.includes('task')) return sql.includes('tasks');
    if (category.includes('document')) return sql.includes('documents');
    if (category.includes('message')) return sql.includes('messages');
    return true; // Default to true for complex queries
  }

  hasNameSearchLogic(sql) {
    return sql.includes('ilike') || sql.includes('like') || sql.includes('concat') || 
           sql.includes('first_name') || sql.includes('last_name');
  }

  hasDateLogic(sql) {
    return sql.includes('date') || sql.includes('created_at') || sql.includes('interval') ||
           sql.includes('current_date') || sql.includes('timestamp');
  }

  hasGeographicLogic(sql) {
    return sql.includes('state') || sql.includes('city') || sql.includes('zip') ||
           sql.includes('address') || sql.includes('property_state');
  }

  hasFinancialLogic(sql) {
    return sql.includes('proceeds') || sql.includes('value') || sql.includes('amount') ||
           sql.includes('>') || sql.includes('<') || sql.includes('between');
  }

  hasAggregationLogic(sql) {
    return sql.includes('count') || sql.includes('sum') || sql.includes('avg') ||
           sql.includes('max') || sql.includes('min') || sql.includes('group by');
  }

  has1031Logic(sql) {
    return sql.includes('day_45') || sql.includes('day_180') || sql.includes('deadline') ||
           sql.includes('rel_property') || sql.includes('rep_property');
  }

  generateFeedback(testCase, queryResult, score) {
    const percentage = (score / testCase.points * 100).toFixed(0);
    
    if (percentage >= 90) return "Excellent! Query fully understood and properly implemented.";
    if (percentage >= 75) return "Good! Most query elements captured correctly.";
    if (percentage >= 50) return "Partial success. Some query elements missing or incorrect.";
    if (percentage >= 25) return "Basic structure present but missing key query elements.";
    return "Query structure recognized but implementation needs improvement.";
  }

  updateStats(result) {
    // Category stats
    if (!this.categoryStats[result.category]) {
      this.categoryStats[result.category] = { total: 0, scored: 0, maxPoints: 0 };
    }
    this.categoryStats[result.category].total++;
    this.categoryStats[result.category].scored += result.score;
    this.categoryStats[result.category].maxPoints += result.points;

    // Difficulty stats
    if (!this.difficultyStats[result.difficulty]) {
      this.difficultyStats[result.difficulty] = { total: 0, scored: 0, maxPoints: 0 };
    }
    this.difficultyStats[result.difficulty].total++;
    this.difficultyStats[result.difficulty].scored += result.score;
    this.difficultyStats[result.difficulty].maxPoints += result.points;
  }

  generateScoreReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🏆 ADVANCED QUERY CHALLENGE RESULTS');
    console.log('='.repeat(80));

    const overallPercentage = (this.totalScore / this.maxPossibleScore * 100).toFixed(1);
    const grade = this.calculateGrade(overallPercentage);

    console.log(`\n📊 OVERALL PERFORMANCE:`);
    console.log(`   Total Score: ${this.totalScore}/${this.maxPossibleScore} points`);
    console.log(`   Percentage: ${overallPercentage}%`);
    console.log(`   Grade: ${grade}`);

    // Success rate
    const successfulQueries = this.results.filter(r => r.success).length;
    const successRate = (successfulQueries / this.results.length * 100).toFixed(1);
    console.log(`   Success Rate: ${successfulQueries}/${this.results.length} (${successRate}%)`);

    // Performance by difficulty
    console.log(`\n📈 PERFORMANCE BY DIFFICULTY:`);
    Object.entries(this.difficultyStats).forEach(([difficulty, stats]) => {
      const percentage = (stats.scored / stats.maxPoints * 100).toFixed(1);
      console.log(`   ${difficulty}: ${stats.scored}/${stats.maxPoints} (${percentage}%)`);
    });

    // Performance by category
    console.log(`\n🎯 PERFORMANCE BY CATEGORY:`);
    Object.entries(this.categoryStats).forEach(([category, stats]) => {
      const percentage = (stats.scored / stats.maxPoints * 100).toFixed(1);
      console.log(`   ${category}: ${stats.scored}/${stats.maxPoints} (${percentage}%)`);
    });

    // Top performing queries
    console.log(`\n⭐ TOP PERFORMING QUERIES:`);
    const topQueries = this.results
      .filter(r => r.success)
      .sort((a, b) => (b.score/b.points) - (a.score/a.points))
      .slice(0, 5);
    
    topQueries.forEach((result, index) => {
      const percentage = (result.score / result.points * 100).toFixed(0);
      console.log(`   ${index + 1}. "${result.query.substring(0, 60)}..." (${percentage}%)`);
    });

    // Failed queries
    const failedQueries = this.results.filter(r => !r.success);
    if (failedQueries.length > 0) {
      console.log(`\n❌ FAILED QUERIES (${failedQueries.length}):`);
      failedQueries.forEach((result, index) => {
        console.log(`   ${index + 1}. "${result.query.substring(0, 60)}..."`);
        console.log(`      Reason: ${result.error || 'No SQL generated'}`);
      });
    }
  }

  generateImprovementPlan() {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 IMPROVEMENT RECOMMENDATIONS');
    console.log('='.repeat(80));

    const improvements = [];

    // Analyze weak areas
    const weakCategories = Object.entries(this.categoryStats)
      .filter(([_, stats]) => (stats.scored / stats.maxPoints) < 0.6)
      .sort((a, b) => (a[1].scored / a[1].maxPoints) - (b[1].scored / b[1].maxPoints));

    if (weakCategories.length > 0) {
      console.log(`\n🎯 PRIORITY IMPROVEMENTS NEEDED:`);
      weakCategories.forEach(([category, stats], index) => {
        const percentage = (stats.scored / stats.maxPoints * 100).toFixed(1);
        console.log(`   ${index + 1}. ${category} (${percentage}% - needs significant improvement)`);
        improvements.push(...this.getImprovementSuggestions(category));
      });
    }

    // Specific improvement suggestions
    console.log(`\n💡 SPECIFIC IMPROVEMENT SUGGESTIONS:`);
    const uniqueImprovements = [...new Set(improvements)];
    uniqueImprovements.forEach((improvement, index) => {
      console.log(`   ${index + 1}. ${improvement}`);
    });

    // Advanced features needed
    console.log(`\n🚀 ADVANCED FEATURES TO IMPLEMENT:`);
    const advancedFeatures = [
      "Statistical analysis functions (correlation, percentiles, median)",
      "Historical change tracking and audit trail queries", 
      "Advanced pattern matching for phone numbers and email domains",
      "Cross-entity comparison logic (area codes, locations)",
      "Full-text search integration with relevance scoring",
      "Time-based analytical functions (quarter, fiscal year)",
      "Advanced aggregation with complex grouping",
      "Fuzzy name matching with similarity scoring"
    ];

    advancedFeatures.forEach((feature, index) => {
      console.log(`   ${index + 1}. ${feature}`);
    });
  }

  getImprovementSuggestions(category) {
    const suggestions = {
      'Name Search': [
        'Improve name pattern recognition for complex formats',
        'Add fuzzy name matching with similarity scoring',
        'Handle business entity patterns (LLC, Corp, Inc)'
      ],
      'Statistical Analysis': [
        'Implement statistical functions (median, percentiles, correlation)',
        'Add advanced mathematical calculations',
        'Create analytical query templates'
      ],
      'Geographic + Financial': [
        'Combine location and financial filters more intelligently',
        'Handle multiple location specifications',
        'Improve financial range parsing'
      ],
      'Text Search + Time': [
        'Integrate full-text search capabilities',
        'Improve time range parsing for "last 48 hours" type queries',
        'Add keyword highlighting and relevance scoring'
      ],
      'Change Tracking + History': [
        'Implement audit trail query capabilities',
        'Add historical data analysis',
        'Track entity changes over time'
      ]
    };

    return suggestions[category] || ['Add better pattern recognition for this category'];
  }

  calculateGrade(percentage) {
    if (percentage >= 95) return 'A+ (Outstanding)';
    if (percentage >= 90) return 'A (Excellent)';
    if (percentage >= 85) return 'A- (Very Good)';
    if (percentage >= 80) return 'B+ (Good)';
    if (percentage >= 75) return 'B (Above Average)';
    if (percentage >= 70) return 'B- (Average)';
    if (percentage >= 65) return 'C+ (Below Average)';
    if (percentage >= 60) return 'C (Poor)';
    if (percentage >= 50) return 'C- (Very Poor)';
    return 'F (Failing)';
  }

  truncateSQL(sql) {
    if (!sql) return 'null';
    const cleaned = sql.replace(/\s+/g, ' ').trim();
    return cleaned.length > 120 ? cleaned.substring(0, 120) + '...' : cleaned;
  }
}

// Main execution
async function runAdvancedChallenge() {
  const challenge = new AdvancedQueryChallenge();
  await challenge.runChallenge();
  
  console.log('\n🎊 Advanced Query Challenge Complete!');
  console.log('Review the results above to understand system performance and improvement areas.\n');
}

// Export for use as module or run directly
if (require.main === module) {
  runAdvancedChallenge().catch(console.error);
}

module.exports = { AdvancedQueryChallenge, CHALLENGE_QUERIES };