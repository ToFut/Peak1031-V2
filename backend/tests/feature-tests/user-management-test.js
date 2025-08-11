#!/usr/bin/env node

/**
 * USER MANAGEMENT FEATURE TEST SUITE
 * Tests A.3.1 USER MANAGEMENT from FeaturesContract.md
 * 
 * Coverage:
 * - JWT-based login authentication
 * - Role-based views (Admin, Client, Third Party, Agency, Coordinator)
 * - User status management (Active/Inactive)
 * - Profile view and edit
 * - Exchange participant assignment
 */

const axios = require('axios');
const colors = require('colors');

// Configuration
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5002';
const ADMIN_EMAIL = process.env.TEST_EMAIL || 'admin@peak1031.com';
const ADMIN_PASSWORD = process.env.TEST_PASSWORD || 'admin123';

// Test tracking
let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: [],
    feature: 'User Management'
};

// Test users for different roles
const TEST_USERS = {
    admin: { email: 'test-admin@peak1031.com', password: 'TestAdmin123!', role: 'admin' },
    client: { email: 'test-client@peak1031.com', password: 'TestClient123!', role: 'client' },
    coordinator: { email: 'test-coordinator@peak1031.com', password: 'TestCoord123!', role: 'coordinator' },
    third_party: { email: 'test-thirdparty@peak1031.com', password: 'TestThird123!', role: 'third_party' },
    agency: { email: 'test-agency@peak1031.com', password: 'TestAgency123!', role: 'agency' }
};

// Global auth tokens
let tokens = {};

// Utility functions
const log = {
    info: (msg) => console.log(`ℹ️  ${msg}`.blue),
    success: (msg) => console.log(`✅ ${msg}`.green),
    error: (msg) => console.log(`❌ ${msg}`.red),
    warning: (msg) => console.log(`⚠️  ${msg}`.yellow),
    header: (msg) => console.log(`\n${'='.repeat(70)}\n${msg.toUpperCase()}\n${'='.repeat(70)}`.cyan)
};

const recordTest = (testName, success, details = {}, error = null) => {
    const result = {
        test: testName,
        success,
        details,
        error: error?.message || null,
        timestamp: new Date().toISOString()
    };
    
    testResults.details.push(result);
    testResults.total++;
    
    if (success) {
        testResults.passed++;
        log.success(`✅ ${testName}`);
    } else {
        testResults.failed++;
        log.error(`❌ ${testName} - ${error?.message || JSON.stringify(details)}`);
    }
    
    return result;
};

const makeRequest = async (config) => {
    try {
        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return { 
            success: false, 
            error: error.response?.data || error.message, 
            status: error.response?.status || 500 
        };
    }
};

// Test Functions

/**
 * Test 1: JWT-based Authentication System
 */
const testAuthentication = async () => {
    log.header('Testing JWT-based Authentication');
    
    // Test 1.1: Admin Login
    const loginResult = await makeRequest({
        method: 'POST',
        url: `${BASE_URL}/api/auth/login`,
        data: {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        }
    });
    
    if (loginResult.success && loginResult.data.token) {
        tokens.admin = loginResult.data.token;
        recordTest('Admin JWT Login', true, { 
            token: 'generated', 
            user: loginResult.data.user?.email,
            role: loginResult.data.user?.role 
        });
    } else {
        recordTest('Admin JWT Login', false, {}, new Error('Failed to authenticate admin user'));
        return false;
    }
    
    // Test 1.2: Invalid Login
    const invalidLoginResult = await makeRequest({
        method: 'POST',
        url: `${BASE_URL}/api/auth/login`,
        data: {
            email: 'invalid@email.com',
            password: 'wrongpassword'
        }
    });
    
    recordTest('Invalid Login Rejection', 
        !invalidLoginResult.success && invalidLoginResult.status === 401,
        { status: invalidLoginResult.status },
        invalidLoginResult.success ? new Error('Invalid login should fail') : null
    );
    
    // Test 1.3: Token Refresh
    const refreshResult = await makeRequest({
        method: 'POST',
        url: `${BASE_URL}/api/auth/refresh`,
        headers: {
            'Authorization': `Bearer ${tokens.admin}`
        }
    });
    
    recordTest('JWT Token Refresh', 
        refreshResult.success,
        { newToken: refreshResult.success ? 'generated' : 'failed' },
        refreshResult.success ? null : new Error(refreshResult.error)
    );
    
    return true;
};

/**
 * Test 2: User Role Management
 */
const testRoleManagement = async () => {
    log.header('Testing Role-Based Access Control');
    
    const createdUsers = [];
    
    // Test 2.1: Create users for each role
    for (const [roleName, userData] of Object.entries(TEST_USERS)) {
        if (roleName === 'admin') continue; // Skip admin, already exists
        
        const createResult = await makeRequest({
            method: 'POST',
            url: `${BASE_URL}/api/users`,
            headers: {
                'Authorization': `Bearer ${tokens.admin}`
            },
            data: {
                email: userData.email,
                password: userData.password,
                firstName: `Test`,
                lastName: roleName.replace('_', ' '),
                role: userData.role
            }
        });
        
        if (createResult.success) {
            createdUsers.push({ role: roleName, ...userData, id: createResult.data.user?.id });
            recordTest(`Create ${roleName} User`, true, { 
                email: userData.email, 
                role: userData.role,
                id: createResult.data.user?.id 
            });
        } else {
            recordTest(`Create ${roleName} User`, false, {}, new Error(createResult.error));
        }
    }
    
    // Test 2.2: Login with each role and verify dashboard access
    for (const user of createdUsers) {
        const loginResult = await makeRequest({
            method: 'POST',
            url: `${BASE_URL}/api/auth/login`,
            data: {
                email: user.email,
                password: user.password
            }
        });
        
        if (loginResult.success) {
            tokens[user.role] = loginResult.data.token;
            
            // Test role-specific dashboard access
            const dashboardResult = await makeRequest({
                method: 'GET',
                url: `${BASE_URL}/api/dashboard`,
                headers: {
                    'Authorization': `Bearer ${tokens[user.role]}`
                }
            });
            
            recordTest(`${user.role} Dashboard Access`, 
                dashboardResult.success,
                { role: user.role, hasAccess: dashboardResult.success },
                dashboardResult.success ? null : new Error(dashboardResult.error)
            );
        } else {
            recordTest(`${user.role} Role Login`, false, {}, new Error(loginResult.error));
        }
    }
    
    return createdUsers;
};

/**
 * Test 3: User Status Management
 */
const testUserStatusManagement = async (testUsers) => {
    log.header('Testing User Status Management');
    
    if (!testUsers.length) {
        recordTest('User Status Management', false, {}, new Error('No test users available'));
        return;
    }
    
    const testUser = testUsers[0];
    
    // Test 3.1: Deactivate user
    const deactivateResult = await makeRequest({
        method: 'PUT',
        url: `${BASE_URL}/api/users/${testUser.id}/activate`,
        headers: {
            'Authorization': `Bearer ${tokens.admin}`
        },
        data: {
            is_active: false
        }
    });
    
    recordTest('Deactivate User', 
        deactivateResult.success,
        { userId: testUser.id, action: 'deactivate' },
        deactivateResult.success ? null : new Error(deactivateResult.error)
    );
    
    // Test 3.2: Try login with deactivated user
    const inactiveLoginResult = await makeRequest({
        method: 'POST',
        url: `${BASE_URL}/api/auth/login`,
        data: {
            email: testUser.email,
            password: testUser.password
        }
    });
    
    recordTest('Inactive User Login Blocked', 
        !inactiveLoginResult.success,
        { blocked: !inactiveLoginResult.success },
        inactiveLoginResult.success ? new Error('Inactive user should not be able to login') : null
    );
    
    // Test 3.3: Reactivate user
    const reactivateResult = await makeRequest({
        method: 'PUT',
        url: `${BASE_URL}/api/users/${testUser.id}/activate`,
        headers: {
            'Authorization': `Bearer ${tokens.admin}`
        },
        data: {
            is_active: true
        }
    });
    
    recordTest('Reactivate User', 
        reactivateResult.success,
        { userId: testUser.id, action: 'reactivate' },
        reactivateResult.success ? null : new Error(reactivateResult.error)
    );
};

/**
 * Test 4: Profile Management
 */
const testProfileManagement = async () => {
    log.header('Testing Profile Management');
    
    // Test 4.1: Get user profile
    const profileResult = await makeRequest({
        method: 'GET',
        url: `${BASE_URL}/api/auth/profile`,
        headers: {
            'Authorization': `Bearer ${tokens.admin}`
        }
    });
    
    recordTest('Get User Profile', 
        profileResult.success,
        { hasProfile: profileResult.success, email: profileResult.data?.email },
        profileResult.success ? null : new Error(profileResult.error)
    );
    
    // Test 4.2: Update profile
    const updateProfileResult = await makeRequest({
        method: 'PUT',
        url: `${BASE_URL}/api/auth/profile`,
        headers: {
            'Authorization': `Bearer ${tokens.admin}`
        },
        data: {
            firstName: 'Updated',
            lastName: 'Admin',
            phone: '555-1234-5678'
        }
    });
    
    recordTest('Update User Profile', 
        updateProfileResult.success,
        { updated: updateProfileResult.success },
        updateProfileResult.success ? null : new Error(updateProfileResult.error)
    );
};

/**
 * Test 5: Exchange Participant Assignment
 */
const testExchangeParticipantAssignment = async (testUsers) => {
    log.header('Testing Exchange Participant Assignment');
    
    // Test 5.1: Get available exchanges
    const exchangesResult = await makeRequest({
        method: 'GET',
        url: `${BASE_URL}/api/exchanges`,
        headers: {
            'Authorization': `Bearer ${tokens.admin}`
        }
    });
    
    if (!exchangesResult.success || !exchangesResult.data?.length) {
        recordTest('Exchange Participant Assignment', false, {}, 
            new Error('No exchanges available for assignment testing'));
        return;
    }
    
    const exchange = exchangesResult.data[0];
    const testUser = testUsers.find(u => u.role === 'client');
    
    if (!testUser) {
        recordTest('Exchange Participant Assignment', false, {}, 
            new Error('No client user available for assignment'));
        return;
    }
    
    // Test 5.2: Assign user to exchange
    const assignResult = await makeRequest({
        method: 'POST',
        url: `${BASE_URL}/api/exchanges/${exchange.id}/participants`,
        headers: {
            'Authorization': `Bearer ${tokens.admin}`
        },
        data: {
            user_id: testUser.id,
            role: 'client',
            permissions: ['view_exchange', 'view_documents', 'send_messages']
        }
    });
    
    recordTest('Assign User to Exchange', 
        assignResult.success,
        { 
            exchangeId: exchange.id, 
            userId: testUser.id, 
            role: 'client' 
        },
        assignResult.success ? null : new Error(assignResult.error)
    );
    
    // Test 5.3: Verify assignment by getting participants
    const participantsResult = await makeRequest({
        method: 'GET',
        url: `${BASE_URL}/api/exchanges/${exchange.id}/participants`,
        headers: {
            'Authorization': `Bearer ${tokens.admin}`
        }
    });
    
    const isUserAssigned = participantsResult.success && 
        participantsResult.data?.participants?.some(p => p.user_id === testUser.id);
    
    recordTest('Verify Exchange Assignment', 
        isUserAssigned,
        { 
            exchangeId: exchange.id,
            userAssigned: isUserAssigned,
            participantCount: participantsResult.data?.participants?.length || 0
        },
        isUserAssigned ? null : new Error('User not found in exchange participants')
    );
};

/**
 * Test 6: Role-Based Data Access
 */
const testRoleBasedDataAccess = async () => {
    log.header('Testing Role-Based Data Access');
    
    const accessTests = [
        {
            role: 'admin',
            endpoint: '/api/users',
            shouldHaveAccess: true,
            description: 'Admin access to all users'
        },
        {
            role: 'client',
            endpoint: '/api/users',
            shouldHaveAccess: false,
            description: 'Client blocked from user management'
        },
        {
            role: 'coordinator',
            endpoint: '/api/exchanges',
            shouldHaveAccess: true,
            description: 'Coordinator access to exchanges'
        },
        {
            role: 'third_party',
            endpoint: '/api/admin/audit-logs',
            shouldHaveAccess: false,
            description: 'Third party blocked from audit logs'
        }
    ];
    
    for (const test of accessTests) {
        if (!tokens[test.role]) {
            recordTest(test.description, false, {}, new Error(`No token for ${test.role}`));
            continue;
        }
        
        const accessResult = await makeRequest({
            method: 'GET',
            url: `${BASE_URL}${test.endpoint}`,
            headers: {
                'Authorization': `Bearer ${tokens[test.role]}`
            }
        });
        
        const hasCorrectAccess = test.shouldHaveAccess ? 
            accessResult.success : 
            (!accessResult.success && accessResult.status === 403);
        
        recordTest(test.description, 
            hasCorrectAccess,
            { 
                role: test.role, 
                endpoint: test.endpoint,
                expectedAccess: test.shouldHaveAccess,
                actualAccess: accessResult.success,
                status: accessResult.status
            },
            hasCorrectAccess ? null : new Error(`Access test failed for ${test.role}`)
        );
    }
};

/**
 * Cleanup Test Data
 */
const cleanupTestData = async (testUsers) => {
    log.header('Cleaning Up Test Data');
    
    for (const user of testUsers) {
        if (user.id) {
            const deleteResult = await makeRequest({
                method: 'DELETE',
                url: `${BASE_URL}/api/users/${user.id}`,
                headers: {
                    'Authorization': `Bearer ${tokens.admin}`
                }
            });
            
            recordTest(`Cleanup ${user.role} User`, 
                deleteResult.success,
                { userId: user.id, role: user.role },
                deleteResult.success ? null : new Error(deleteResult.error)
            );
        }
    }
};

/**
 * Main Test Runner
 */
const runUserManagementTests = async () => {
    log.header(`Peak 1031 - ${testResults.feature} Test Suite`);
    log.info('Testing FeaturesContract.md Section A.3.1');
    log.info(`Base URL: ${BASE_URL}`);
    log.info(`Admin User: ${ADMIN_EMAIL}`);
    log.info(`Started at: ${new Date().toISOString()}\n`);
    
    try {
        // Run authentication tests first
        const authSuccess = await testAuthentication();
        if (!authSuccess) {
            throw new Error('Authentication tests failed - cannot proceed');
        }
        
        // Run role management tests
        const testUsers = await testRoleManagement();
        
        // Run user status tests
        await testUserStatusManagement(testUsers);
        
        // Run profile management tests
        await testProfileManagement();
        
        // Run exchange assignment tests
        await testExchangeParticipantAssignment(testUsers);
        
        // Run role-based access tests
        await testRoleBasedDataAccess();
        
        // Cleanup test data
        await cleanupTestData(testUsers);
        
    } catch (error) {
        log.error(`Test suite failed: ${error.message}`);
        recordTest('Test Suite Execution', false, {}, error);
    }
    
    // Generate final report
    log.header('User Management Test Results');
    console.log(`\n📊 ${testResults.feature} Test Results:`.cyan);
    console.log(`   Total Tests: ${testResults.total}`.white);
    console.log(`   ✅ Passed: ${testResults.passed}`.green);
    console.log(`   ❌ Failed: ${testResults.failed}`.red);
    console.log(`   📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`.yellow);
    
    // Save detailed results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `user-management-test-${timestamp}.json`;
    const fs = require('fs');
    
    try {
        fs.writeFileSync(filename, JSON.stringify({
            summary: {
                feature: testResults.feature,
                total: testResults.total,
                passed: testResults.passed,
                failed: testResults.failed,
                successRate: ((testResults.passed / testResults.total) * 100).toFixed(2) + '%',
                timestamp: new Date().toISOString()
            },
            tests: testResults.details
        }, null, 2));
        
        console.log(`\n📄 Detailed results saved to: ${filename}`.blue);
    } catch (error) {
        log.error(`Failed to save results: ${error.message}`);
    }
    
    return testResults;
};

// Run tests if called directly
if (require.main === module) {
    runUserManagementTests().catch(console.error);
}

module.exports = { runUserManagementTests, testResults };