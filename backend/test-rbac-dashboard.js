#!/usr/bin/env node
/**
 * Test RBAC service and dashboard service for agency/coordinator users
 */

const rbacService = require('./services/rbacService');
const dashboardService = require('./services/dashboardService');
const databaseService = require('./services/database');

async function testUserDashboard(email) {
    console.log(`\n🔍 Testing dashboard for ${email}...`);
    
    try {
        // Get user
        const user = await databaseService.getUserByEmail(email);
        if (!user) {
            console.log(`❌ User ${email} not found`);
            return;
        }
        
        console.log(`✅ Found user: ${user.first_name} ${user.last_name} (${user.role})`);
        console.log(`   User ID: ${user.id}`);
        console.log(`   Contact ID: ${user.contact_id}`);
        
        // Test RBAC service directly
        console.log(`📊 Testing RBAC service...`);
        const exchangesResult = await rbacService.getExchangesForUser(user);
        console.log(`   RBAC exchanges result:`, {
            count: exchangesResult.count,
            dataLength: exchangesResult.data?.length,
            sampleExchanges: exchangesResult.data?.slice(0, 2).map(e => ({
                id: e.id,
                property_name: e.property_name,
                status: e.status
            }))
        });
        
        // Test dashboard service
        console.log(`📈 Testing dashboard service...`);
        const dashboardData = await dashboardService.getDashboardData(user.id, user.role);
        console.log(`   Dashboard exchanges:`, {
            total: dashboardData.exchanges.total,
            active: dashboardData.exchanges.active,
            completed: dashboardData.exchanges.completed,
            pending: dashboardData.exchanges.pending
        });
        
        console.log(`   Dashboard tasks:`, {
            total: dashboardData.tasks.total,
            pending: dashboardData.tasks.pending,
            completed: dashboardData.tasks.completed
        });
        
    } catch (error) {
        console.error(`❌ Error testing ${email}:`, error.message);
    }
}

async function runTests() {
    console.log('🚀 Testing RBAC and Dashboard services for agency/coordinator users...\n');
    
    const testUsers = [
        'test-agency@peak1031.com',
        'test-coordinator@peak1031.com',
        'client@peak1031.com',  // For comparison
        'admin@peak1031.com'    // For comparison
    ];
    
    for (const email of testUsers) {
        await testUserDashboard(email);
    }
    
    console.log('\n🏁 Test completed');
}

// Run the test
runTests().catch(error => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
});