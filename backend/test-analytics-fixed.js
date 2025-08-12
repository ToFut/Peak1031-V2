/**
 * Test analytics after fixing the data
 */
require('dotenv').config();
const analyticsService = require('./services/analyticsService');

const testAnalytics = async () => {
  try {
    console.log('🧪 Testing analytics after data fix...');
    
    // Create mock user context for RBAC
    const mockUser = {
      id: '278304de-568f-4138-b35b-6fdcfbd2f1ce',
      role: 'admin',
      email: 'admin@peak1031.com'
    };
    
    // Test dashboard stats
    const dashboardStats = await analyticsService.getQuickOverview({ user: mockUser });
    
    console.log('📊 Dashboard Stats Results:');
    console.log(`- Total Exchanges: ${dashboardStats.totalExchanges || 0}`);
    console.log(`- Active Exchanges: ${dashboardStats.activeExchanges || 0}`);
    console.log(`- Completed Exchanges: ${dashboardStats.completedExchanges || 0}`);
    console.log(`- Total Value: $${(dashboardStats.totalValue || 0).toLocaleString()}`);
    console.log(`- Average Value: $${(dashboardStats.averageValue || 0).toLocaleString()}`);
    console.log(`- Completion Rate: ${dashboardStats.completionRate || 0}%`);
    
    // Test financial overview
    console.log('\n💰 Testing financial overview...');
    const financialOverview = await analyticsService.getFinancialOverview({ user: mockUser });
    
    console.log(`- Exchange Value Total: $${(financialOverview.totalValue?.exchange || 0).toLocaleString()}`);
    console.log(`- Relinquished Value Total: $${(financialOverview.totalValue?.relinquished || 0).toLocaleString()}`);
    console.log(`- Average Exchange Value: $${(financialOverview.averageValues?.exchange || 0).toLocaleString()}`);
    console.log(`- Total Exchanges: ${financialOverview.performanceMetrics?.totalExchanges || 0}`);
    console.log(`- High Risk: ${financialOverview.riskAnalysis?.high || 0}`);
    console.log(`- Medium Risk: ${financialOverview.riskAnalysis?.medium || 0}`);
    console.log(`- Low Risk: ${financialOverview.riskAnalysis?.low || 0}`);
    
    console.log('\n✅ Analytics test completed successfully!');
    
  } catch (error) {
    console.error('❌ Analytics test failed:', error);
  }
};

testAnalytics();