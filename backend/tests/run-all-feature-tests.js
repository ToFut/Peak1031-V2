#!/usr/bin/env node

/**
 * COMPREHENSIVE FEATURE TEST RUNNER
 * Runs all feature tests for Peak 1031 V1 Platform
 * 
 * This script orchestrates testing of all 7 major features from FeaturesContract.md:
 * 1. User Management (A.3.1)
 * 2. Exchange Management (A.3.2) 
 * 3. Messaging System (A.3.3)
 * 4. Document Management (A.3.4)
 * 5. Task Management (A.3.5)
 * 6. PracticePanther Integration (A.3.6)
 * 7. Audit Logging (A.3.7)
 */

const colors = require('colors');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5002';
const ADMIN_EMAIL = process.env.TEST_EMAIL || 'admin@peak1031.com';
const ADMIN_PASSWORD = process.env.TEST_PASSWORD || 'admin123';
const TEST_MODE = process.env.TEST_MODE || 'full'; // 'full' | 'quick' | 'specific'
const SPECIFIC_TESTS = process.env.SPECIFIC_TESTS?.split(',') || [];

// Test suite imports
let testSuites = {};

// Try to import available test suites
try {
    testSuites.userManagement = require('./feature-tests/user-management-test');
} catch (e) { console.log('User Management test not available'.yellow); }

try {
    testSuites.exchangeManagement = require('./feature-tests/exchange-management-test');
} catch (e) { console.log('Exchange Management test not available'.yellow); }

try {
    testSuites.messagingSystem = require('./feature-tests/messaging-system-test');
} catch (e) { console.log('Messaging System test not available'.yellow); }

try {
    testSuites.documentManagement = require('./feature-tests/document-management-test');
} catch (e) { console.log('Document Management test not available'.yellow); }

// Overall test results tracking
let overallResults = {
    startTime: new Date().toISOString(),
    endTime: null,
    totalFeatures: 0,
    passedFeatures: 0,
    failedFeatures: 0,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    features: {},
    environment: {
        baseUrl: BASE_URL,
        adminEmail: ADMIN_EMAIL,
        testMode: TEST_MODE,
        nodeVersion: process.version,
        platform: process.platform
    }
};

// Utility functions
const log = {
    info: (msg) => console.log(`ℹ️  ${msg}`.blue),
    success: (msg) => console.log(`✅ ${msg}`.green),
    error: (msg) => console.log(`❌ ${msg}`.red),
    warning: (msg) => console.log(`⚠️  ${msg}`.yellow),
    header: (msg) => console.log(`\n${'='.repeat(80)}\n${msg.toUpperCase()}\n${'='.repeat(80)}`.cyan),
    section: (msg) => console.log(`\n${'─'.repeat(60)}\n${msg}\n${'─'.repeat(60)}`.magenta)
};

/**
 * Quick Test Implementations for Missing Features
 */
const quickTaskManagementTest = async () => {
    log.section('Running Quick Task Management Test');
    
    const axios = require('axios');
    const results = { passed: 0, failed: 0, total: 0, details: [] };
    
    try {
        // Login
        const loginResult = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        
        if (loginResult.data.token) {
            const token = loginResult.data.token;
            
            // Test task endpoints
            const taskTests = [
                { name: 'Get All Tasks', method: 'GET', url: '/api/tasks' },
                { name: 'Get Tasks with Filters', method: 'GET', url: '/api/tasks?status=pending' },
                { name: 'Get Task Statistics', method: 'GET', url: '/api/tasks/stats' }
            ];
            
            for (const test of taskTests) {
                try {
                    const response = await axios({
                        method: test.method,
                        url: `${BASE_URL}${test.url}`,
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    results.passed++;
                    results.total++;
                    results.details.push({ test: test.name, success: true, status: response.status });
                    log.success(`✅ ${test.name}`);
                } catch (error) {
                    results.failed++;
                    results.total++;
                    results.details.push({ test: test.name, success: false, error: error.message });
                    log.error(`❌ ${test.name} - ${error.message}`);
                }
            }
        }
    } catch (error) {
        results.failed++;
        results.total++;
        results.details.push({ test: 'Task Management Authentication', success: false, error: error.message });
    }
    
    return {
        feature: 'Task Management (Quick)',
        passed: results.passed,
        failed: results.failed,
        total: results.total,
        successRate: results.total > 0 ? ((results.passed / results.total) * 100).toFixed(2) + '%' : '0%',
        details: results.details
    };
};

const quickPracticePartnerTest = async () => {
    log.section('Running Quick PracticePanther Integration Test');
    
    const axios = require('axios');
    const results = { passed: 0, failed: 0, total: 0, details: [] };
    
    try {
        // Login
        const loginResult = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        
        if (loginResult.data.token) {
            const token = loginResult.data.token;
            
            // Test PP integration endpoints
            const ppTests = [
                { name: 'Get Sync Status', method: 'GET', url: '/api/sync/status' },
                { name: 'Get Sync Logs', method: 'GET', url: '/api/sync/logs' },
                { name: 'Get PP Configuration', method: 'GET', url: '/api/practice-partner/config' },
                { name: 'Test PP Connection', method: 'GET', url: '/api/practice-partner/test' }
            ];
            
            for (const test of ppTests) {
                try {
                    const response = await axios({
                        method: test.method,
                        url: `${BASE_URL}${test.url}`,
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    results.passed++;
                    results.total++;
                    results.details.push({ test: test.name, success: true, status: response.status });
                    log.success(`✅ ${test.name}`);
                } catch (error) {
                    results.failed++;
                    results.total++;
                    results.details.push({ test: test.name, success: false, error: error.message });
                    log.error(`❌ ${test.name} - ${error.message}`);
                }
            }
        }
    } catch (error) {
        results.failed++;
        results.total++;
        results.details.push({ test: 'PP Integration Authentication', success: false, error: error.message });
    }
    
    return {
        feature: 'PracticePanther Integration (Quick)',
        passed: results.passed,
        failed: results.failed,
        total: results.total,
        successRate: results.total > 0 ? ((results.passed / results.total) * 100).toFixed(2) + '%' : '0%',
        details: results.details
    };
};

const quickAuditLoggingTest = async () => {
    log.section('Running Quick Audit Logging Test');
    
    const axios = require('axios');
    const results = { passed: 0, failed: 0, total: 0, details: [] };
    
    try {
        // Login
        const loginResult = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        
        if (loginResult.data.token) {
            const token = loginResult.data.token;
            
            // Test audit endpoints
            const auditTests = [
                { name: 'Get Audit Logs', method: 'GET', url: '/api/admin/audit-logs' },
                { name: 'Get User Activity', method: 'GET', url: '/api/admin/audit-logs?action=login' },
                { name: 'Get System Health', method: 'GET', url: '/api/admin/system-health' },
                { name: 'Get Admin Statistics', method: 'GET', url: '/api/admin/statistics' }
            ];
            
            for (const test of auditTests) {
                try {
                    const response = await axios({
                        method: test.method,
                        url: `${BASE_URL}${test.url}`,
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    results.passed++;
                    results.total++;
                    results.details.push({ test: test.name, success: true, status: response.status });
                    log.success(`✅ ${test.name}`);
                } catch (error) {
                    results.failed++;
                    results.total++;
                    results.details.push({ test: test.name, success: false, error: error.message });
                    log.error(`❌ ${test.name} - ${error.message}`);
                }
            }
            
            // Test that audit logs are being created
            await axios.get(`${BASE_URL}/api/exchanges`, { 
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Wait a moment for audit log to be written
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if audit log was created
            try {
                const auditResponse = await axios.get(`${BASE_URL}/api/admin/audit-logs?limit=1`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const hasRecentLogs = auditResponse.data && 
                    (auditResponse.data.logs?.length > 0 || auditResponse.data.length > 0);
                
                if (hasRecentLogs) {
                    results.passed++;
                    results.total++;
                    results.details.push({ test: 'Audit Log Creation', success: true });
                    log.success('✅ Audit Log Creation');
                } else {
                    results.failed++;
                    results.total++;
                    results.details.push({ test: 'Audit Log Creation', success: false, note: 'No recent audit logs found' });
                    log.warning('⚠️ Audit Log Creation - No recent logs found');
                }
            } catch (error) {
                results.failed++;
                results.total++;
                results.details.push({ test: 'Audit Log Creation', success: false, error: error.message });
            }
        }
    } catch (error) {
        results.failed++;
        results.total++;
        results.details.push({ test: 'Audit Logging Authentication', success: false, error: error.message });
    }
    
    return {
        feature: 'Audit Logging (Quick)',
        passed: results.passed,
        failed: results.failed,
        total: results.total,
        successRate: results.total > 0 ? ((results.passed / results.total) * 100).toFixed(2) + '%' : '0%',
        details: results.details
    };
};

/**
 * Run Individual Feature Test
 */
const runFeatureTest = async (featureName, testFunction) => {
    log.section(`Running ${featureName} Tests`);
    
    try {
        const startTime = Date.now();
        const result = await testFunction();
        const duration = Date.now() - startTime;
        
        // Normalize result format
        const normalizedResult = {
            feature: result.feature || featureName,
            passed: result.passed || 0,
            failed: result.failed || 0,
            total: result.total || 0,
            successRate: result.successRate || '0%',
            duration: `${(duration / 1000).toFixed(2)}s`,
            details: result.details || [],
            timestamp: new Date().toISOString()
        };
        
        // Update overall results
        overallResults.totalFeatures++;
        overallResults.totalTests += normalizedResult.total;
        overallResults.passedTests += normalizedResult.passed;
        overallResults.failedTests += normalizedResult.failed;
        
        if (normalizedResult.failed === 0 && normalizedResult.total > 0) {
            overallResults.passedFeatures++;
            log.success(`✅ ${featureName} - ALL TESTS PASSED (${normalizedResult.total} tests)`);
        } else {
            overallResults.failedFeatures++;
            log.error(`❌ ${featureName} - ${normalizedResult.failed} FAILED, ${normalizedResult.passed} PASSED`);
        }
        
        // Store feature results
        overallResults.features[featureName] = normalizedResult;
        
        console.log(`   Duration: ${normalizedResult.duration}`.gray);
        console.log(`   Success Rate: ${normalizedResult.successRate}`.gray);
        
        return normalizedResult;
        
    } catch (error) {
        log.error(`💥 ${featureName} test suite crashed: ${error.message}`);
        
        const errorResult = {
            feature: featureName,
            passed: 0,
            failed: 1,
            total: 1,
            successRate: '0%',
            duration: '0s',
            error: error.message,
            crashed: true,
            timestamp: new Date().toISOString()
        };
        
        overallResults.totalFeatures++;
        overallResults.failedFeatures++;
        overallResults.totalTests++;
        overallResults.failedTests++;
        overallResults.features[featureName] = errorResult;
        
        return errorResult;
    }
};

/**
 * Pre-flight System Check
 */
const preflightCheck = async () => {
    log.header('Pre-flight System Check');
    
    const axios = require('axios');
    
    // Check if backend is running
    try {
        const healthResponse = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
        log.success('✅ Backend server is running');
        
        if (healthResponse.data?.database) {
            log.success('✅ Database connection is healthy');
        } else {
            log.warning('⚠️ Database status unknown');
        }
        
    } catch (error) {
        log.error(`❌ Backend server check failed: ${error.message}`);
        log.error('🛑 Please ensure the backend server is running on ' + BASE_URL);
        process.exit(1);
    }
    
    // Check admin credentials
    try {
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        
        if (loginResponse.data?.token) {
            log.success('✅ Admin authentication successful');
        } else {
            throw new Error('No token received');
        }
        
    } catch (error) {
        log.error(`❌ Admin authentication failed: ${error.message}`);
        log.error('🛑 Please check admin credentials');
        process.exit(1);
    }
    
    log.success('🚀 Pre-flight check completed successfully');
};

/**
 * Generate Test Report
 */
const generateReport = () => {
    overallResults.endTime = new Date().toISOString();
    const duration = new Date(overallResults.endTime) - new Date(overallResults.startTime);
    overallResults.totalDuration = `${(duration / 1000).toFixed(2)}s`;
    overallResults.overallSuccessRate = overallResults.totalTests > 0 ? 
        ((overallResults.passedTests / overallResults.totalTests) * 100).toFixed(2) + '%' : '0%';
    
    // Console report
    log.header('PEAK 1031 PLATFORM - COMPREHENSIVE TEST RESULTS');
    
    console.log('📊 OVERALL SUMMARY'.cyan);
    console.log(`   Test Environment: ${overallResults.environment.baseUrl}`.white);
    console.log(`   Total Features Tested: ${overallResults.totalFeatures}`.white);
    console.log(`   ✅ Features Passed: ${overallResults.passedFeatures}`.green);
    console.log(`   ❌ Features Failed: ${overallResults.failedFeatures}`.red);
    console.log(`   📈 Feature Success Rate: ${((overallResults.passedFeatures / overallResults.totalFeatures) * 100).toFixed(2)}%`.yellow);
    console.log(`   🧪 Total Individual Tests: ${overallResults.totalTests}`.white);
    console.log(`   ✅ Tests Passed: ${overallResults.passedTests}`.green);
    console.log(`   ❌ Tests Failed: ${overallResults.failedTests}`.red);
    console.log(`   📊 Overall Success Rate: ${overallResults.overallSuccessRate}`.yellow);
    console.log(`   ⏱️ Total Duration: ${overallResults.totalDuration}`.white);
    
    console.log('\n📋 FEATURE BREAKDOWN'.cyan);
    for (const [featureName, results] of Object.entries(overallResults.features)) {
        const status = results.failed === 0 ? '✅' : '❌';
        const rate = results.successRate;
        console.log(`   ${status} ${featureName}: ${rate} (${results.passed}/${results.total} tests)`.white);
    }
    
    // Save detailed JSON report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFilename = `peak1031-comprehensive-test-report-${timestamp}.json`;
    
    try {
        fs.writeFileSync(reportFilename, JSON.stringify(overallResults, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportFilename}`.blue);
    } catch (error) {
        log.error(`Failed to save report: ${error.message}`);
    }
    
    // Exit with appropriate code
    const exitCode = overallResults.failedFeatures > 0 ? 1 : 0;
    console.log(`\n🏁 Test run completed with exit code: ${exitCode}`.gray);
    
    return overallResults;
};

/**
 * Main Test Runner
 */
const runAllFeatureTests = async () => {
    log.header('Peak 1031 V1 Platform - Comprehensive Feature Testing');
    log.info(`Test Mode: ${TEST_MODE}`);
    log.info(`Base URL: ${BASE_URL}`);
    log.info(`Admin User: ${ADMIN_EMAIL}`);
    log.info(`Started at: ${overallResults.startTime}`);
    
    if (SPECIFIC_TESTS.length > 0) {
        log.info(`Running specific tests: ${SPECIFIC_TESTS.join(', ')}`);
    }
    
    try {
        // Pre-flight system check
        await preflightCheck();
        
        // Define test execution plan
        const testPlan = [];
        
        if (TEST_MODE === 'quick') {
            // Quick mode - run lightweight tests
            testPlan.push(['Task Management', quickTaskManagementTest]);
            testPlan.push(['PracticePanther Integration', quickPracticePartnerTest]);
            testPlan.push(['Audit Logging', quickAuditLoggingTest]);
        } else {
            // Full mode - run comprehensive tests
            if (testSuites.userManagement && (!SPECIFIC_TESTS.length || SPECIFIC_TESTS.includes('user'))) {
                testPlan.push(['User Management', testSuites.userManagement.runUserManagementTests]);
            }
            
            if (testSuites.exchangeManagement && (!SPECIFIC_TESTS.length || SPECIFIC_TESTS.includes('exchange'))) {
                testPlan.push(['Exchange Management', testSuites.exchangeManagement.runExchangeManagementTests]);
            }
            
            if (testSuites.messagingSystem && (!SPECIFIC_TESTS.length || SPECIFIC_TESTS.includes('messaging'))) {
                testPlan.push(['Messaging System', testSuites.messagingSystem.runMessagingSystemTests]);
            }
            
            if (testSuites.documentManagement && (!SPECIFIC_TESTS.length || SPECIFIC_TESTS.includes('document'))) {
                testPlan.push(['Document Management', testSuites.documentManagement.runDocumentManagementTests]);
            }
            
            // Add quick tests for missing comprehensive suites
            if (!SPECIFIC_TESTS.length || SPECIFIC_TESTS.includes('task')) {
                testPlan.push(['Task Management', quickTaskManagementTest]);
            }
            
            if (!SPECIFIC_TESTS.length || SPECIFIC_TESTS.includes('pp')) {
                testPlan.push(['PracticePanther Integration', quickPracticePartnerTest]);
            }
            
            if (!SPECIFIC_TESTS.length || SPECIFIC_TESTS.includes('audit')) {
                testPlan.push(['Audit Logging', quickAuditLoggingTest]);
            }
        }
        
        log.info(`Executing ${testPlan.length} test suites...\n`);
        
        // Execute test plan
        for (const [featureName, testFunction] of testPlan) {
            await runFeatureTest(featureName, testFunction);
            
            // Small delay between test suites to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
    } catch (error) {
        log.error(`Test execution failed: ${error.message}`);
        overallResults.executionError = error.message;
    }
    
    // Generate final report
    const finalReport = generateReport();
    
    return finalReport;
};

// Handle command line arguments
const handleCliArgs = () => {
    const args = process.argv.slice(2);
    
    for (const arg of args) {
        if (arg === '--quick') {
            process.env.TEST_MODE = 'quick';
        } else if (arg.startsWith('--tests=')) {
            process.env.SPECIFIC_TESTS = arg.split('=')[1];
        } else if (arg === '--help') {
            console.log(`
Peak 1031 Feature Test Runner

Usage: node run-all-feature-tests.js [options]

Options:
  --quick              Run quick tests only (lightweight)
  --tests=test1,test2  Run specific tests only
                       Available: user, exchange, messaging, document, task, pp, audit
  --help               Show this help message

Environment Variables:
  BACKEND_URL         Backend server URL (default: http://localhost:5002)
  TEST_EMAIL          Admin email for testing (default: admin@peak1031.com)
  TEST_PASSWORD       Admin password for testing (default: admin123)
  TEST_MODE           Test mode: full|quick (default: full)
  SPECIFIC_TESTS      Comma-separated list of specific tests to run

Examples:
  node run-all-feature-tests.js                    # Run all tests
  node run-all-feature-tests.js --quick           # Run quick tests only
  node run-all-feature-tests.js --tests=user,exchange  # Run specific tests
            `.trim());
            process.exit(0);
        }
    }
};

// Main execution
if (require.main === module) {
    handleCliArgs();
    runAllFeatureTests().catch(console.error);
}

module.exports = { 
    runAllFeatureTests,
    quickTaskManagementTest,
    quickPracticePartnerTest,
    quickAuditLoggingTest
};