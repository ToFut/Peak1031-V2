# Peak 1031 Backend API Testing Suite

This comprehensive testing script tests all available endpoints in the Peak 1031 backend API.

## Features

- **Complete Coverage**: Tests all available API endpoints including:
  - Health checks and debug endpoints
  - Authentication (working auth, Supabase auth, legacy auth)
  - CRUD operations (contacts, exchanges, tasks, documents, messages, notifications)
  - Admin endpoints
  - Enterprise features
  - Sync operations
  - Export functionality
  - OAuth integration
  - Template management
  - File handling
  - Practice Partner integration

- **Smart Authentication**: Automatically authenticates and uses tokens for protected endpoints
- **Detailed Reporting**: Provides comprehensive test results with success/failure rates
- **Error Handling**: Gracefully handles errors and provides detailed error information
- **JSON Reports**: Saves detailed test results to JSON files for analysis

## Prerequisites

1. Backend server must be running on port 5002 (or set BACKEND_URL environment variable)
2. Test user credentials must be available (or set TEST_EMAIL and TEST_PASSWORD environment variables)
3. Required dependencies: `axios`, `colors`

## Usage

### Quick Start

```bash
# Make sure you're in the backend directory
cd backend

# Run the comprehensive test suite
npm run test:api
```

### Environment Variables

You can customize the testing by setting these environment variables:

```bash
export BACKEND_URL="http://localhost:5002"  # Backend server URL
export TEST_EMAIL="admin@peak1031.com"      # Test user email
export TEST_PASSWORD="admin123"             # Test user password
```

### Direct Execution

```bash
# Run directly with node
node test-all-endpoints.js

# Or with custom environment variables
BACKEND_URL="http://localhost:5002" TEST_EMAIL="your@email.com" TEST_PASSWORD="yourpassword" node test-all-endpoints.js
```

## Test Categories

The test suite covers the following categories:

### 1. Health & Debug Endpoints
- `/api/health` - Server health check
- `/api` - API information
- `/api/debug/users` - Debug user information
- `/api/debug/token` - Token debugging

### 2. Authentication Endpoints
- `/api/auth/login` - User login
- `/api/auth/logout` - User logout
- `/api/auth/refresh` - Token refresh
- `/api/auth/profile` - User profile
- `/api/auth/supabase/*` - Supabase authentication
- `/api/auth/legacy/*` - Legacy authentication

### 3. Core CRUD Operations
- **Contacts**: Full CRUD operations
- **Exchanges**: Exchange management with participants, tasks, documents
- **Tasks**: Task management with status updates and statistics
- **Documents**: Document management with templates
- **Messages**: Message system with enhanced features
- **Notifications**: Notification system

### 4. Admin & Enterprise Features
- **Admin**: User management, statistics, audit logs, system health
- **Enterprise**: Enterprise exchanges, account management
- **Account**: Profile updates, password changes

### 5. Integration & Sync
- **Sync**: Status, start/stop, logs, contact/exchange sync
- **OAuth**: Provider management, authorization, callbacks
- **Practice Partner**: Integration status and sync operations

### 6. Export & Templates
- **Export**: Data export in various formats
- **Templates**: Document template management
- **Template Documents**: Template-based document generation

### 7. File Management
- **Files**: File serving and access control

## Output

The test suite provides:

1. **Real-time Progress**: Color-coded output showing test progress
2. **Summary Report**: Final summary with pass/fail statistics
3. **Detailed JSON Report**: Complete test results saved to timestamped JSON file

### Sample Output

```
============================================================
Peak 1031 Backend API Testing Suite
============================================================

🚀 Starting comprehensive API testing...
📍 Base URL: http://localhost:5002
👤 Test User: admin@peak1031.com
⏰ Started at: 2024-01-15T10:30:00.000Z

============================================================
Testing Health Check Endpoints
============================================================
✅ GET /api/health - 200
✅ GET /api - 200

============================================================
Testing Authentication Endpoints
============================================================
✅ POST /api/auth/login - 200
✅ POST /api/auth/logout - 200
...

============================================================
Test Results Summary
============================================================

📊 Test Results:
   Total Tests: 150
   ✅ Passed: 142
   ❌ Failed: 8
   📈 Success Rate: 94.67%

📄 Detailed results saved to: test-results-2024-01-15T10-30-00-000Z.json
```

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Ensure test user credentials are correct
   - Check if backend server is running
   - Verify database connection

2. **Connection Errors**
   - Check if backend is running on the correct port
   - Verify BACKEND_URL environment variable
   - Check firewall/network settings

3. **Missing Dependencies**
   ```bash
   npm install axios colors --save-dev
   ```

4. **Permission Errors**
   - Ensure you have write permissions for JSON report files
   - Check file system permissions

### Debug Mode

For detailed debugging, you can modify the script to include more verbose logging:

```javascript
// Add this to the script for more detailed output
const DEBUG = process.env.DEBUG === 'true';
if (DEBUG) {
  console.log('Request config:', config);
  console.log('Response:', response.data);
}
```

## Customization

### Adding New Endpoints

To test additional endpoints, add new test functions following the pattern:

```javascript
const testNewEndpoints = async () => {
  log.header('Testing New Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/new-endpoint' },
    { method: 'POST', path: '/api/new-endpoint', data: { key: 'value' } }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};
```

### Modifying Test Data

Update the test data in each test function to match your specific requirements:

```javascript
// Example: Update contact test data
{ method: 'POST', path: '/api/contacts', data: {
  first_name: 'Your Test',
  last_name: 'Contact',
  email: 'your-test@example.com',
  phone: '555-1234'
}}
```

## Integration with CI/CD

You can integrate this test suite into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Test API Endpoints
  run: |
    cd backend
    npm run test:api
  env:
    BACKEND_URL: ${{ secrets.BACKEND_URL }}
    TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
    TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

## Support

For issues or questions about the testing suite:

1. Check the troubleshooting section above
2. Review the generated JSON report for detailed error information
3. Ensure all dependencies are properly installed
4. Verify backend server is running and accessible 