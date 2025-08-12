# Natural Language Query Testing Suite

This comprehensive testing suite validates that your AI can correctly convert natural language queries into accurate SQL and return correct results.

## 🚀 Quick Start

### Prerequisites

1. **Environment Setup**: Ensure your `.env` file has:
   ```bash
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   API_URL=http://localhost:5001  # Your backend API URL
   TEST_JWT_TOKEN=your_test_jwt_token  # Valid JWT for API calls
   ```

2. **Backend Running**: Make sure your backend server is running on the specified API_URL

### Running Tests

```bash
# Run the complete test suite
cd backend
node run-nl-query-tests.js

# Or run just the core tests
node test-natural-language-queries.js
```

## 📋 Test Coverage

The suite includes **30 comprehensive test cases** covering:

### 1. **Basic Counting Queries** (3 tests)
- Total exchange counts
- Active exchange counts  
- Completed exchange counts

### 2. **Financial Queries** (4 tests)
- Total exchange value calculations
- Average exchange values
- High-value exchange filtering
- Value-based comparisons

### 3. **Status-Based Queries** (3 tests)
- Pending exchanges
- 45-day period exchanges
- 180-day period exchanges

### 4. **Time-Based Queries** (4 tests)
- Deadline approaching within timeframes
- Overdue exchange identification
- Year-based filtering
- Recent exchange queries

### 5. **Client-Based Queries** (2 tests)
- Exchange counts per client
- Email domain filtering

### 6. **Coordinator-Based Queries** (2 tests)
- Exchanges per coordinator
- Coordinator-specific active exchanges

### 7. **Progress-Based Queries** (2 tests)
- High progress filtering
- Low progress identification

### 8. **Complex Aggregation Queries** (2 tests)
- Value by status aggregation
- Time-series aggregations

### 9. **Property-Based Queries** (2 tests)
- Geographic filtering
- Property value filtering

### 10. **Advanced Analytics** (6 tests)
- Risk analysis
- Performance metrics
- Geographic analysis
- Time-series trends
- Business logic validation
- Coordinator success rates

## 🎯 Test Validation

Each test validates:

1. **SQL Pattern Match**: Does the AI generate the expected SQL pattern?
2. **Result Accuracy**: Do the results match the classic query results?
3. **Data Integrity**: Are the returned data structures correct?
4. **Performance**: How quickly does the AI respond?

## 📊 Reporting

The test suite generates:

### 1. **Console Output**
Real-time test execution with pass/fail status

### 2. **JSON Report** 
Detailed machine-readable results in `reports/nl-query-test-[timestamp].json`

### 3. **HTML Dashboard**
Interactive visual report in `reports/nl-query-test-[timestamp].html` with:
- Pass/fail metrics
- Category breakdown charts
- Failed test details
- Improvement recommendations

## 🔧 Example Test Cases

### Simple Count Query
```javascript
{
  naturalLanguage: "How many exchanges do we have in total?",
  expectedSQL: "SELECT COUNT(*) FROM exchanges",
  validation: "Should return single number matching database count"
}
```

### Complex Business Logic
```javascript
{
  naturalLanguage: "Find exchanges that might fail to meet their 45-day deadline",
  expectedSQL: "SELECT * FROM exchanges WHERE identification_deadline <= CURRENT_DATE + INTERVAL '60 days' AND progress < 50",
  validation: "Should return exchanges with approaching deadlines and low progress"
}
```

### Financial Analysis
```javascript
{
  naturalLanguage: "What's the total value by exchange status?", 
  expectedSQL: "SELECT status, SUM(exchange_value) FROM exchanges GROUP BY status",
  validation: "Should return aggregated values per status"
}
```

## ✅ Success Criteria

- **90%+ Pass Rate**: Excellent AI performance
- **80-89% Pass Rate**: Good performance, some improvement needed
- **<80% Pass Rate**: Requires AI model improvement

## 🐛 Troubleshooting

### Common Issues:

1. **Connection Errors**
   ```bash
   Error: connect ECONNREFUSED 127.0.0.1:5001
   ```
   **Solution**: Ensure backend server is running

2. **Authentication Errors**
   ```bash
   Error: 401 Unauthorized
   ```
   **Solution**: Check TEST_JWT_TOKEN in .env file

3. **Database Errors**
   ```bash
   Error: relation "exchanges" does not exist  
   ```
   **Solution**: Run database migrations first

4. **AI API Errors**
   ```bash
   Error: AI query endpoint not found
   ```
   **Solution**: Ensure `/api/analytics/ai-query` endpoint is implemented

### Debugging Tips:

1. **Enable Verbose Logging**:
   ```javascript
   // Add to test file
   console.log('SQL Generated:', aiResult.generatedSQL);
   console.log('Classic Result:', classicResult);
   ```

2. **Test Individual Queries**:
   ```bash
   # Test just one category
   node -e "
   const { naturalLanguageTests } = require('./test-natural-language-queries');
   const basicTests = naturalLanguageTests.filter(t => t.category === 'Basic Counts');
   console.log(basicTests);
   "
   ```

3. **Check Database Schema**:
   ```sql
   -- Verify expected tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

## 🚀 Integration with CI/CD

Add to your deployment pipeline:

```yaml
# .github/workflows/test-ai-queries.yml
name: AI Query Tests
on: [push, pull_request]
jobs:
  test-ai-queries:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: node backend/run-nl-query-tests.js
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## 📈 Continuous Improvement

1. **Add New Test Cases**: Regularly add tests for new query patterns
2. **Monitor Pass Rates**: Track AI performance over time
3. **Update Expected Patterns**: Refine SQL pattern expectations
4. **Performance Benchmarking**: Track response times
5. **User Feedback Integration**: Add real user queries to test suite

## 🤝 Contributing

To add new test cases:

1. Add to `naturalLanguageTests` array in `test-natural-language-queries.js`
2. Include:
   - `naturalLanguage`: User's natural language query
   - `expectedSQLPattern`: Regex pattern for expected SQL
   - `classicQuery`: Reference SQL query for validation
   - `category`: Logical grouping

3. Test locally:
   ```bash
   node run-nl-query-tests.js
   ```

4. Update documentation with new test cases

---

**🎯 Goal**: Ensure your AI can handle 100% of common business queries with high accuracy and reliability.