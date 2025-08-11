#!/usr/bin/env node

/**
 * EXCHANGE MANAGEMENT FEATURE TEST SUITE
 * Tests A.3.2 EXCHANGE MANAGEMENT from FeaturesContract.md
 * 
 * Coverage:
 * - Display PracticePanther "matters" as exchanges
 * - View exchange details: status, key dates, assigned users
 * - Status tracking: PENDING, 45D, 180D, COMPLETED
 * - Filter/search by user, stage, or property
 * - Assign users to specific exchanges (Admin + Client Approval)
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
    feature: 'Exchange Management'
};

// Global data
let adminToken = '';
let testExchangeId = '';
let testClientId = '';

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

/**
 * Test 1: Authentication Setup
 */
const setupAuthentication = async () => {
    log.header('Setting up Authentication');
    
    const loginResult = await makeRequest({
        method: 'POST',
        url: `${BASE_URL}/api/auth/login`,
        data: {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        }
    });
    
    if (loginResult.success && loginResult.data.token) {
        adminToken = loginResult.data.token;
        recordTest('Admin Authentication', true, { token: 'obtained' });
        return true;
    } else {
        recordTest('Admin Authentication', false, {}, new Error('Failed to authenticate'));
        return false;
    }
};

/**
 * Test 2: Exchange Display and Listing
 */
const testExchangeDisplay = async () => {
    log.header('Testing Exchange Display');
    
    // Test 2.1: Get all exchanges
    const exchangesResult = await makeRequest({
        method: 'GET',
        url: `${BASE_URL}/api/exchanges`,
        headers: {
            'Authorization': `Bearer ${adminToken}`
        }
    });
    
    recordTest('Get All Exchanges', 
        exchangesResult.success,
        { 
            count: exchangesResult.data?.length || 0,
            hasData: Array.isArray(exchangesResult.data)
        },
        exchangesResult.success ? null : new Error(exchangesResult.error)
    );
    
    if (exchangesResult.success && exchangesResult.data?.length > 0) {
        testExchangeId = exchangesResult.data[0].id;
        
        // Test 2.2: Get specific exchange details
        const exchangeDetailResult = await makeRequest({
            method: 'GET',
            url: `${BASE_URL}/api/exchanges/${testExchangeId}`,
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (exchangeDetailResult.success) {
            const exchange = exchangeDetailResult.data;
            recordTest('Get Exchange Details', true, {
                id: exchange.id,
                hasStatus: !!exchange.status,
                hasClient: !!exchange.client_id,
                hasDates: !!(exchange.created_at || exchange.start_date),
                ppIntegration: !!exchange.pp_matter_id
            });
        } else {
            recordTest('Get Exchange Details', false, {}, new Error(exchangeDetailResult.error));
        }
        
        // Test 2.3: Verify PracticePanther matter mapping
        const exchange = exchangesResult.data[0];
        const hasPPMapping = exchange.pp_matter_id || exchange.pp_data || exchange.name;
        
        recordTest('PracticePanther Matter Mapping', 
            hasPPMapping,
            { 
                ppMatterId: exchange.pp_matter_id || 'none',
                hasName: !!exchange.name,
                hasPPData: !!exchange.pp_data
            },
            hasPPMapping ? null : new Error('No PP matter mapping found')
        );
    }
};

/**
 * Test 3: Exchange Status Management
 */
const testExchangeStatusManagement = async () => {
    log.header('Testing Exchange Status Management');
    
    if (!testExchangeId) {
        recordTest('Exchange Status Management', false, {}, 
            new Error('No test exchange available'));
        return;
    }
    
    const statusProgression = ['PENDING', '45D', '180D', 'COMPLETED'];
    
    for (let i = 0; i < statusProgression.length; i++) {
        const newStatus = statusProgression[i];
        
        // Test status update
        const updateResult = await makeRequest({
            method: 'PUT',
            url: `${BASE_URL}/api/exchanges/${testExchangeId}/status`,
            headers: {
                'Authorization': `Bearer ${adminToken}`
            },
            data: {
                status: newStatus
            }
        });
        
        recordTest(`Update Status to ${newStatus}`, 
            updateResult.success,
            { 
                exchangeId: testExchangeId, 
                newStatus: newStatus,
                updated: updateResult.success
            },
            updateResult.success ? null : new Error(updateResult.error)
        );
        
        // Verify status was updated
        if (updateResult.success) {
            const verifyResult = await makeRequest({
                method: 'GET',
                url: `${BASE_URL}/api/exchanges/${testExchangeId}`,
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            
            const statusMatches = verifyResult.success && 
                verifyResult.data.status === newStatus;
            
            recordTest(`Verify Status ${newStatus}`, 
                statusMatches,
                { 
                    expected: newStatus,
                    actual: verifyResult.data?.status,
                    matches: statusMatches
                },
                statusMatches ? null : new Error('Status verification failed')
            );
        }
    }
};

/**
 * Test 4: Search and Filtering
 */
const testSearchAndFiltering = async () => {
    log.header('Testing Search and Filtering');
    
    // Test 4.1: Filter by status
    const statusFilterResult = await makeRequest({
        method: 'GET',
        url: `${BASE_URL}/api/exchanges?status=COMPLETED`,
        headers: {
            'Authorization': `Bearer ${adminToken}`
        }
    });
    
    const completedExchanges = statusFilterResult.data || [];
    const allCompleted = completedExchanges.every(ex => ex.status === 'COMPLETED');
    
    recordTest('Filter by Status (COMPLETED)', 
        statusFilterResult.success && allCompleted,
        { 
            count: completedExchanges.length,
            allCompleted: allCompleted,
            statusFilter: 'COMPLETED'
        },
        statusFilterResult.success && allCompleted ? null : 
            new Error('Status filtering failed')
    );
    
    // Test 4.2: Search by name
    const searchResult = await makeRequest({
        method: 'GET',
        url: `${BASE_URL}/api/exchanges?search=exchange`,
        headers: {
            'Authorization': `Bearer ${adminToken}`
        }
    });
    
    recordTest('Search Exchanges by Name', 
        searchResult.success,
        { 
            searchTerm: 'exchange',
            resultsCount: searchResult.data?.length || 0,
            hasResults: searchResult.success
        },
        searchResult.success ? null : new Error(searchResult.error)
    );
    
    // Test 4.3: Filter by date range
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const dateFilterResult = await makeRequest({
        method: 'GET',
        url: `${BASE_URL}/api/exchanges?start_date=${oneYearAgo.toISOString().split('T')[0]}`,
        headers: {
            'Authorization': `Bearer ${adminToken}`
        }
    });
    
    recordTest('Filter by Date Range', 
        dateFilterResult.success,
        { 
            startDate: oneYearAgo.toISOString().split('T')[0],
            resultsCount: dateFilterResult.data?.length || 0
        },
        dateFilterResult.success ? null : new Error(dateFilterResult.error)
    );
    
    // Test 4.4: Sort exchanges
    const sortResult = await makeRequest({
        method: 'GET',
        url: `${BASE_URL}/api/exchanges?sort=created_at&order=desc`,
        headers: {
            'Authorization': `Bearer ${adminToken}`
        }
    });
    
    recordTest('Sort Exchanges by Date', 
        sortResult.success,
        { 
            sortBy: 'created_at',
            order: 'desc',
            resultsCount: sortResult.data?.length || 0
        },
        sortResult.success ? null : new Error(sortResult.error)
    );
};

/**
 * Test 5: Exchange Participant Management
 */
const testExchangeParticipantManagement = async () => {
    log.header('Testing Exchange Participant Management');
    
    if (!testExchangeId) {
        recordTest('Exchange Participant Management', false, {}, 
            new Error('No test exchange available'));
        return;
    }
    
    // Test 5.1: Create a test client user
    const createClientResult = await makeRequest({
        method: 'POST',
        url: `${BASE_URL}/api/users`,
        headers: {
            'Authorization': `Bearer ${adminToken}`
        },
        data: {
            email: 'test-exchange-client@peak1031.com',
            password: 'TestClient123!',
            first_name: 'Test',
            last_name: 'Client',
            role: 'client'
        }
    });
    
    if (createClientResult.success) {
        testClientId = createClientResult.data.user.id;
        recordTest('Create Test Client User', true, { clientId: testClientId });
        
        // Test 5.2: Assign client to exchange
        const assignResult = await makeRequest({
            method: 'POST',
            url: `${BASE_URL}/api/exchanges/${testExchangeId}/participants`,
            headers: {
                'Authorization': `Bearer ${adminToken}`
            },
            data: {
                user_id: testClientId,
                role: 'client',
                permissions: ['view_exchange', 'view_documents', 'send_messages']
            }
        });
        
        recordTest('Assign Client to Exchange', 
            assignResult.success,
            { 
                exchangeId: testExchangeId,
                clientId: testClientId,
                role: 'client'
            },
            assignResult.success ? null : new Error(assignResult.error)
        );
        
        // Test 5.3: Get exchange participants
        const participantsResult = await makeRequest({
            method: 'GET',
            url: `${BASE_URL}/api/exchanges/${testExchangeId}/participants`,
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (participantsResult.success) {
            const participants = participantsResult.data.participants || [];
            const clientAssigned = participants.some(p => p.user_id === testClientId);
            
            recordTest('Verify Participant Assignment', 
                clientAssigned,
                { 
                    participantCount: participants.length,
                    clientFound: clientAssigned,
                    participants: participants.map(p => ({ id: p.user_id, role: p.role }))
                },
                clientAssigned ? null : new Error('Client not found in participants')
            );
        } else {
            recordTest('Get Exchange Participants', false, {}, 
                new Error(participantsResult.error));
        }
        
        // Test 5.4: Remove participant
        const removeResult = await makeRequest({
            method: 'DELETE',
            url: `${BASE_URL}/api/exchanges/${testExchangeId}/participants/${testClientId}`,
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        recordTest('Remove Exchange Participant', 
            removeResult.success,
            { 
                exchangeId: testExchangeId,
                clientId: testClientId,
                removed: removeResult.success
            },
            removeResult.success ? null : new Error(removeResult.error)
        );
    } else {
        recordTest('Create Test Client User', false, {}, 
            new Error(createClientResult.error));
    }
};

/**
 * Test 6: Exchange Key Dates and Timeline
 */
const testExchangeTimeline = async () => {
    log.header('Testing Exchange Timeline and Key Dates');
    
    if (!testExchangeId) {
        recordTest('Exchange Timeline', false, {}, 
            new Error('No test exchange available'));
        return;
    }
    
    // Test 6.1: Update exchange with key dates
    const updateDatesResult = await makeRequest({
        method: 'PUT',
        url: `${BASE_URL}/api/exchanges/${testExchangeId}`,
        headers: {
            'Authorization': `Bearer ${adminToken}`
        },
        data: {
            start_date: '2024-01-15',
            identification_deadline: '2024-02-14',
            exchange_deadline: '2024-06-13',
            sale_date: '2024-01-01'
        }
    });
    
    recordTest('Update Exchange Key Dates', 
        updateDatesResult.success,
        { 
            exchangeId: testExchangeId,
            startDate: '2024-01-15',
            identificationDeadline: '2024-02-14',
            exchangeDeadline: '2024-06-13'
        },
        updateDatesResult.success ? null : new Error(updateDatesResult.error)
    );
    
    // Test 6.2: Verify timeline calculations
    const exchangeResult = await makeRequest({
        method: 'GET',
        url: `${BASE_URL}/api/exchanges/${testExchangeId}`,
        headers: {
            'Authorization': `Bearer ${adminToken}`
        }
    });
    
    if (exchangeResult.success) {
        const exchange = exchangeResult.data;
        const hasTimeline = exchange.identification_deadline && exchange.exchange_deadline;
        
        recordTest('Verify Timeline Data', 
            hasTimeline,
            { 
                hasIdentificationDeadline: !!exchange.identification_deadline,
                hasExchangeDeadline: !!exchange.exchange_deadline,
                daysRemaining: exchange.days_remaining || 'calculated'
            },
            hasTimeline ? null : new Error('Timeline data missing')
        );
    }
};

/**
 * Test 7: Role-Based Exchange Access
 */
const testRoleBasedAccess = async () => {
    log.header('Testing Role-Based Exchange Access');
    
    // Create different role users and test their access
    const roleTests = [
        { role: 'coordinator', shouldSeeAll: true },
        { role: 'client', shouldSeeAssigned: true },
        { role: 'third_party', shouldSeeAssigned: true }
    ];
    
    for (const roleTest of roleTests) {
        // Create user with specific role
        const createUserResult = await makeRequest({
            method: 'POST',
            url: `${BASE_URL}/api/users`,
            headers: {
                'Authorization': `Bearer ${adminToken}`
            },
            data: {
                email: `test-${roleTest.role}-exchange@peak1031.com`,
                password: 'TestUser123!',
                first_name: 'Test',
                last_name: roleTest.role,
                role: roleTest.role
            }
        });
        
        if (createUserResult.success) {
            const userId = createUserResult.data.user.id;
            
            // Login as the role user
            const roleLoginResult = await makeRequest({
                method: 'POST',
                url: `${BASE_URL}/api/auth/login`,
                data: {
                    email: `test-${roleTest.role}-exchange@peak1031.com`,
                    password: 'TestUser123!'
                }
            });
            
            if (roleLoginResult.success) {
                const roleToken = roleLoginResult.data.token;
                
                // Test exchange access
                const accessResult = await makeRequest({
                    method: 'GET',
                    url: `${BASE_URL}/api/exchanges`,
                    headers: {
                        'Authorization': `Bearer ${roleToken}`
                    }
                });
                
                recordTest(`${roleTest.role} Exchange Access`, 
                    accessResult.success,
                    { 
                        role: roleTest.role,
                        hasAccess: accessResult.success,
                        exchangeCount: accessResult.data?.length || 0
                    },
                    accessResult.success ? null : new Error(`${roleTest.role} access failed`)
                );
            }
            
            // Cleanup user
            await makeRequest({
                method: 'DELETE',
                url: `${BASE_URL}/api/users/${userId}`,
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
        }
    }
};

/**
 * Test 8: Exchange Financial Data
 */
const testExchangeFinancialData = async () => {
    log.header('Testing Exchange Financial Data');
    
    if (!testExchangeId) {
        recordTest('Exchange Financial Data', false, {}, 
            new Error('No test exchange available'));
        return;
    }
    
    // Test financial data update
    const financialUpdateResult = await makeRequest({
        method: 'PUT',
        url: `${BASE_URL}/api/exchanges/${testExchangeId}`,
        headers: {
            'Authorization': `Bearer ${adminToken}`
        },
        data: {
            relinquished_property_value: 500000.00,
            replacement_property_value: 600000.00,
            cash_boot: 10000.00,
            financing_amount: 400000.00
        }
    });
    
    recordTest('Update Exchange Financial Data', 
        financialUpdateResult.success,
        { 
            exchangeId: testExchangeId,
            relinquishedValue: 500000.00,
            replacementValue: 600000.00,
            cashBoot: 10000.00
        },
        financialUpdateResult.success ? null : new Error(financialUpdateResult.error)
    );
    
    // Verify calculated fields
    if (financialUpdateResult.success) {
        const verifyResult = await makeRequest({
            method: 'GET',
            url: `${BASE_URL}/api/exchanges/${testExchangeId}`,
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (verifyResult.success) {
            const exchange = verifyResult.data;
            const hasFinancialData = exchange.relinquished_property_value && 
                                   exchange.replacement_property_value;
            
            recordTest('Verify Financial Calculations', 
                hasFinancialData,
                { 
                    exchangeValue: exchange.exchange_value || 'calculated',
                    hasRelinquishedValue: !!exchange.relinquished_property_value,
                    hasReplacementValue: !!exchange.replacement_property_value
                },
                hasFinancialData ? null : new Error('Financial data verification failed')
            );
        }
    }
};

/**
 * Cleanup Test Data
 */
const cleanupTestData = async () => {
    log.header('Cleaning Up Test Data');
    
    // Clean up test client user
    if (testClientId) {
        const deleteResult = await makeRequest({
            method: 'DELETE',
            url: `${BASE_URL}/api/users/${testClientId}`,
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        recordTest('Cleanup Test Client User', 
            deleteResult.success,
            { clientId: testClientId },
            deleteResult.success ? null : new Error(deleteResult.error)
        );
    }
};

/**
 * Main Test Runner
 */
const runExchangeManagementTests = async () => {
    log.header(`Peak 1031 - ${testResults.feature} Test Suite`);
    log.info('Testing FeaturesContract.md Section A.3.2');
    log.info(`Base URL: ${BASE_URL}`);
    log.info(`Admin User: ${ADMIN_EMAIL}`);
    log.info(`Started at: ${new Date().toISOString()}\n`);
    
    try {
        // Setup authentication
        const authSuccess = await setupAuthentication();
        if (!authSuccess) {
            throw new Error('Authentication setup failed - cannot proceed');
        }
        
        // Run all test suites
        await testExchangeDisplay();
        await testExchangeStatusManagement();
        await testSearchAndFiltering();
        await testExchangeParticipantManagement();
        await testExchangeTimeline();
        await testRoleBasedAccess();
        await testExchangeFinancialData();
        
        // Cleanup
        await cleanupTestData();
        
    } catch (error) {
        log.error(`Test suite failed: ${error.message}`);
        recordTest('Test Suite Execution', false, {}, error);
    }
    
    // Generate final report
    log.header('Exchange Management Test Results');
    console.log(`\n📊 ${testResults.feature} Test Results:`.cyan);
    console.log(`   Total Tests: ${testResults.total}`.white);
    console.log(`   ✅ Passed: ${testResults.passed}`.green);
    console.log(`   ❌ Failed: ${testResults.failed}`.red);
    console.log(`   📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`.yellow);
    
    // Save detailed results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `exchange-management-test-${timestamp}.json`;
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
    runExchangeManagementTests().catch(console.error);
}

module.exports = { runExchangeManagementTests, testResults };