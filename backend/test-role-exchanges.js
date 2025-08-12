#!/usr/bin/env node
/**
 * Test script to verify exchanges API responses for different user roles
 * Focus on coordinator and agency users seeing 0 exchanges issue
 */

const axios = require('axios');
const chalk = require('chalk');

const BASE_URL = 'http://localhost:5001';

// Test users for different roles
const TEST_USERS = [
    {
        email: 'admin@peak1031.com',
        password: 'admin123',
        role: 'admin',
        name: 'Admin User'
    },
    {
        email: 'test-coordinator@peak1031.com', 
        password: 'admin123',
        role: 'coordinator',
        name: 'Test Coordinator'
    },
    {
        email: 'test-agency@peak1031.com',
        password: 'admin123', 
        role: 'agency',
        name: 'Test Agency'
    },
    {
        email: 'client@peak1031.com',
        password: 'admin123',
        role: 'client',
        name: 'Client User'
    }
];

async function loginUser(email, password) {
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email,
            password
        });

        if (response.data.success && response.data.token) {
            return {
                token: response.data.token,
                user: response.data.user
            };
        }
        throw new Error('Login failed - no token received');
    } catch (error) {
        throw new Error(`Login failed: ${error.response?.data?.error || error.message}`);
    }
}

async function getExchanges(token) {
    try {
        const response = await axios.get(`${BASE_URL}/api/exchanges`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        throw new Error(`Get exchanges failed: ${error.response?.data?.error || error.message}`);
    }
}

async function getDashboard(token) {
    try {
        const response = await axios.get(`${BASE_URL}/api/dashboard`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        throw new Error(`Get dashboard failed: ${error.response?.data?.error || error.message}`);
    }
}

async function testUserExchanges(userInfo) {
    console.log(chalk.cyan(`\n============================================================`));
    console.log(chalk.cyan(`Testing ${userInfo.name} (${userInfo.role})`));
    console.log(chalk.cyan(`Email: ${userInfo.email}`));
    console.log(chalk.cyan(`============================================================`));

    try {
        // Step 1: Login
        console.log(chalk.blue('🔐 Authenticating...'));
        const auth = await loginUser(userInfo.email, userInfo.password);
        console.log(chalk.green(`✅ Login successful`));
        console.log(chalk.gray(`   User ID: ${auth.user.id}`));
        console.log(chalk.gray(`   Contact ID: ${auth.user.contact_id || 'N/A'}`));
        console.log(chalk.gray(`   Role: ${auth.user.role}`));

        // Step 2: Get exchanges
        console.log(chalk.blue('📊 Fetching exchanges...'));
        const exchanges = await getExchanges(auth.token);
        console.log(chalk.green(`✅ Exchanges fetched successfully`));
        console.log(chalk.yellow(`   Total exchanges: ${exchanges.data?.length || 0}`));
        
        if (exchanges.data && exchanges.data.length > 0) {
            console.log(chalk.gray('   Exchange details:'));
            exchanges.data.forEach((exchange, index) => {
                console.log(chalk.gray(`     ${index + 1}. ${exchange.property_name || exchange.id} (${exchange.status || 'unknown'})`));
            });
        } else {
            console.log(chalk.red('   ❌ No exchanges found for this user'));
        }

        // Step 3: Get dashboard data
        console.log(chalk.blue('📈 Fetching dashboard data...'));
        try {
            const dashboard = await getDashboard(auth.token);
            console.log(chalk.green(`✅ Dashboard data fetched successfully`));
            
            if (dashboard.data && dashboard.data.summary) {
                console.log(chalk.yellow(`   Dashboard exchanges count: ${dashboard.data.summary.exchanges || 0}`));
                console.log(chalk.yellow(`   Dashboard tasks count: ${dashboard.data.summary.tasks || 0}`));
                console.log(chalk.yellow(`   Dashboard messages count: ${dashboard.data.summary.messages || 0}`));
            }
        } catch (error) {
            console.log(chalk.red(`❌ Dashboard failed: ${error.message}`));
        }

        return {
            success: true,
            role: userInfo.role,
            exchangeCount: exchanges.data?.length || 0,
            userId: auth.user.id,
            contactId: auth.user.contact_id
        };

    } catch (error) {
        console.log(chalk.red(`❌ Test failed: ${error.message}`));
        return {
            success: false,
            role: userInfo.role,
            error: error.message
        };
    }
}

async function runTests() {
    console.log(chalk.cyan.bold(`
============================================================
Role-Based Exchanges API Test
============================================================`));
    console.log(chalk.gray(`🚀 Testing exchanges visibility for different user roles...`));
    console.log(chalk.gray(`📍 Base URL: ${BASE_URL}`));
    console.log(chalk.gray(`⏰ Started at: ${new Date().toISOString()}`));

    const results = [];

    for (const userInfo of TEST_USERS) {
        const result = await testUserExchanges(userInfo);
        results.push(result);
    }

    // Summary
    console.log(chalk.cyan.bold(`\n============================================================`));
    console.log(chalk.cyan.bold(`Test Results Summary`));
    console.log(chalk.cyan.bold(`============================================================`));
    
    results.forEach(result => {
        if (result.success) {
            const statusColor = result.exchangeCount > 0 ? chalk.green : chalk.red;
            console.log(statusColor(`${result.role.toUpperCase()}: ${result.exchangeCount} exchanges`));
            console.log(chalk.gray(`   User ID: ${result.userId}`));
            console.log(chalk.gray(`   Contact ID: ${result.contactId || 'N/A'}`));
        } else {
            console.log(chalk.red(`${result.role.toUpperCase()}: ERROR - ${result.error}`));
        }
    });

    // Check for issues
    const zeroExchangeRoles = results.filter(r => r.success && r.exchangeCount === 0).map(r => r.role);
    
    if (zeroExchangeRoles.length > 0) {
        console.log(chalk.red.bold(`\n⚠️  ISSUE DETECTED:`));
        console.log(chalk.red(`The following roles have 0 exchanges: ${zeroExchangeRoles.join(', ')}`));
        console.log(chalk.yellow(`This indicates a potential issue with role-based exchange filtering.`));
    } else {
        console.log(chalk.green.bold(`\n✅ All roles can see exchanges successfully!`));
    }

    console.log(chalk.cyan(`\n🏁 Test completed at: ${new Date().toISOString()}`));
}

// Run the tests
runTests().catch(error => {
    console.error(chalk.red.bold(`💥 Test runner failed: ${error.message}`));
    process.exit(1);
});