# 🧪 PEAK1031 Contract Compliance Test Suite

This directory contains comprehensive test suites that validate the implementation of all contract requirements from `CONTRACT/SPECS.md`.

## 📋 Test Coverage

The test suite covers all major contract requirements:

| Test Suite | Contract Section | Features Tested |
|------------|------------------|-----------------|
| `01-authentication-test.js` | A.3.1 & A.4 | JWT authentication, role-based access, 2FA, security features |
| `02-exchange-management-test.js` | A.3.2 | PracticePanther matters as exchanges, status tracking, user assignment |
| `03-messaging-system-test.js` | A.3.3 | Real-time messaging, file attachments, notifications |
| `04-document-management-test.js` | A.3.4 | Document upload/download, PIN protection, templates |
| `05-task-management-test.js` | A.3.5 | PracticePanther task sync, status tracking, assignment |
| `06-practice-panther-integration-test.js` | A.3.6 | One-way sync, data transformation, error handling |
| `07-audit-logging-test.js` | A.3.7 | Comprehensive logging, filtering, export capabilities |
| `08-admin-dashboard-test.js` | A.3.8 | Admin dashboard, analytics, system management |

## 🚀 Quick Start

### Prerequisites

1. **Backend Server Running**: Ensure your backend server is running on `http://localhost:5001`
2. **Test Users**: The following test users should exist in your system:
   - `admin@peak1031.com` / `admin123`
   - `coordinator@peak1031.com` / `coordinator123`
   - `client@peak1031.com` / `client123`
   - `agency@peak1031.com` / `agency123`
   - `thirdparty@peak1031.com` / `thirdparty123`

### Running All Tests

```bash
# From the backend directory
cd backend/tests/contract-tests
node run-all-contract-tests.js
```

### Running Individual Test Suites

```bash
# Run specific test suite
node 01-authentication-test.js
node 02-exchange-management-test.js
# ... etc
```

### Environment Variables

You can customize the test environment:

```bash
export TEST_API_URL=http://localhost:5001
export TEST_TIMEOUT=10000
```

## 📊 Test Results

The test suite provides detailed results including:

- **Individual Test Results**: Pass/fail status for each test
- **Success Rates**: Percentage of tests passed per feature
- **Contract Compliance**: Overall compliance with contract requirements
- **Recommendations**: Priority fixes needed for non-compliant features

### Sample Output

```
🚀 PEAK1031 CONTRACT COMPLIANCE TEST SUITE
================================================================================
Testing all contract requirements from CONTRACT/SPECS.md
================================================================================

📋 Running Test Suite 1/8: Authentication & Security (A.3.1 & A.4)
------------------------------------------------------------
🔐 CONTRACT A.3.1 & A.4: AUTHENTICATION & SECURITY TEST SUITE
======================================================================
📋 Testing JWT-based login authentication...
✅ admin login successful
✅ coordinator login successful
✅ client login successful
...

📊 AUTHENTICATION & SECURITY TEST RESULTS
======================================================================
✅ Passed: 15
❌ Failed: 2
📈 Success Rate: 88.2%
======================================================================

📊 FINAL CONTRACT COMPLIANCE TEST RESULTS
================================================================================

🎯 OVERALL SUMMARY:
   Total Tests: 127
   ✅ Passed: 115
   ❌ Failed: 12
   📈 Success Rate: 90.6%
   ⏱️  Duration: 45.2 seconds

📋 CONTRACT COMPLIANCE STATUS:

✅ COMPLIANT FEATURES (≥80% success):
   • Authentication & Security (A.3.1 & A.4): 88.2%
   • Exchange Management (A.3.2): 92.3%
   • Messaging System (A.3.3): 85.7%
   ...

❌ NON-COMPLIANT FEATURES (<80% success):
   • PracticePanther Integration (A.3.6): 65.4%
```

## 🔧 Test Structure

Each test suite follows this structure:

```javascript
class FeatureTestSuite {
  constructor() {
    this.baseURL = process.env.TEST_API_URL || 'http://localhost:5001';
    this.testResults = { passed: 0, failed: 0, errors: [] };
    this.adminToken = null;
  }

  async run() {
    await this.authenticate();
    await this.testFeature1();
    await this.testFeature2();
    // ... more tests
    this.printResults();
  }

  // Individual test methods
  async testFeature1() {
    // Test implementation
  }

  printResults() {
    // Results output
  }
}
```

## 🛠️ Customization

### Adding New Tests

1. Create a new test file following the naming convention: `XX-feature-name-test.js`
2. Extend the test suite structure
3. Add your test methods
4. Update `run-all-contract-tests.js` to include your new test suite

### Modifying Test Data

Each test suite uses realistic test data. You can modify:
- Test user credentials
- Sample exchange data
- Document content
- API endpoints

### Test Configuration

Configure test behavior by modifying:
- Timeout values
- Retry logic
- Error handling
- Result thresholds

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Ensure test users exist in the database
   - Check user credentials in test files
   - Verify JWT token generation

2. **API Endpoint Errors**
   - Confirm backend server is running
   - Check API route definitions
   - Verify request/response formats

3. **Database Issues**
   - Ensure database is accessible
   - Check table schemas
   - Verify data relationships

### Debug Mode

Enable debug logging:

```javascript
// Add to test suite constructor
this.debug = process.env.TEST_DEBUG === 'true';
```

### Running Tests in Isolation

```bash
# Run single test with verbose output
TEST_DEBUG=true node 01-authentication-test.js
```

## 📈 Performance

- **Total Test Duration**: ~45-60 seconds
- **Individual Suite Duration**: 5-10 seconds each
- **API Calls**: ~200-300 requests total
- **Memory Usage**: ~50-100MB

## 🔄 Continuous Integration

The test suite is designed for CI/CD integration:

```yaml
# Example GitHub Actions workflow
- name: Run Contract Tests
  run: |
    cd backend/tests/contract-tests
    node run-all-contract-tests.js
```

## 📝 Contributing

When adding new tests:

1. Follow the existing naming conventions
2. Include comprehensive error handling
3. Add detailed logging for debugging
4. Update this README with new features
5. Ensure tests are idempotent (can run multiple times)

## 📞 Support

For issues with the test suite:

1. Check the troubleshooting section
2. Review test logs for specific error messages
3. Verify backend server configuration
4. Ensure all dependencies are installed

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Contract Version**: CONTRACT/SPECS.md
