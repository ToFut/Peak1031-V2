/**
 * Add extra logging to dashboard route
 */

const fs = require('fs').promises;
const path = require('path');

async function addLogging() {
  const routePath = path.join(__dirname, 'routes/dashboard.js');
  const content = await fs.readFile(routePath, 'utf8');
  
  // Add logging after line 74 where dashboardData is created
  const newContent = content.replace(
    `        res.json({
            success: true,
            data: dashboardData,
            timestamp: new Date()
        });`,
    `        // Extra logging to debug 1000 issue
        console.log('📤 Sending dashboard response:', {
            userEmail: req.user.email,
            userRole: req.user.role,
            'exchanges.total': dashboardData.exchanges.total,
            'stats.totalExchanges': dashboardData.stats?.totalExchanges,
            timestamp: new Date().toISOString()
        });
        
        res.json({
            success: true,
            data: dashboardData,
            timestamp: new Date()
        });`
  );
  
  await fs.writeFile(routePath, newContent);
  console.log('✅ Added logging to dashboard route');
}

addLogging().catch(console.error);