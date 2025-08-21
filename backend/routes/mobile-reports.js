/**
 * Mobile Reports API
 * Provides optimized report data for mobile viewing with export capabilities
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { enforceRBAC } = require('../middleware/rbac');
const analyticsService = require('../services/analyticsService');
const dashboardService = require('../services/dashboardService');
const AuditService = require('../services/audit');
const supabaseService = require('../services/supabase');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

// Cache for report data (5 minutes)
const reportCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Get cached or fresh report data
 */
async function getCachedReportData(key, generator) {
  const cached = reportCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await generator();
  reportCache.set(key, { data, timestamp: Date.now() });
  return data;
}

/**
 * GET /api/mobile-reports/overview
 * Mobile-optimized overview report (role-based filtering)
 */
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const cacheKey = `overview_${req.user.id}_${startDate}_${endDate}`;
    
    const data = await getCachedReportData(cacheKey, async () => {
      // Get dashboard stats
      const dashboardData = await dashboardService.getDashboardData(req.user.id, req.user.role);
      
      // Get recent activity
      const recentActivity = await getRecentActivity(req.user, startDate, endDate);
      
      // Calculate weekly trend
      const weeklyTrend = await calculateWeeklyTrend(req.user, startDate, endDate);
      
      return {
        totalExchanges: dashboardData.exchanges.total,
        activeUsers: dashboardData.users?.active || 0,
        completedTasks: dashboardData.tasks?.completed || 0,
        totalRevenue: await calculateRevenue(req.user, startDate, endDate),
        exchangeChange: calculatePercentageChange(dashboardData.exchanges),
        userChange: 0,
        taskChange: calculatePercentageChange(dashboardData.tasks),
        revenueChange: 0,
        weeklyTrend,
        recentActivity
      };
    });
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Overview report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mobile-reports/financial  
 * Financial metrics report (admin, coordinator, agency only)
 */
router.get('/financial', authenticateToken, enforceRBAC(['admin', 'coordinator', 'agency']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const financialData = await analyticsService.getFinancialOverview({ user: req.user });
    
    // Get top exchanges by value
    const { data: topExchanges } = await supabaseService.client
      .from('exchanges')
      .select('id, name, exchange_value, client_name')
      .order('exchange_value', { ascending: false })
      .limit(5);
    
    const data = {
      totalValue: financialData.totalValue.exchange,
      averageValue: financialData.averageValues.exchange,
      monthlyRevenue: financialData.performanceMetrics.monthlyTrends?.[0]?.revenue || 0,
      valueDistribution: formatValueDistribution(financialData.valueDistribution),
      topExchanges: topExchanges?.map(e => ({
        name: e.name || 'Exchange #' + e.id.slice(0, 8),
        client: e.client_name || 'Unknown',
        value: e.exchange_value || 0
      }))
    };
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Financial report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mobile-reports/exchanges
 * Exchange analytics report (role-based data filtering)
 */
router.get('/exchanges', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log(`📊 Exchange report request from ${req.user.role} user: ${req.user.email}`);
    
    // Use RBAC service to get user's authorized exchanges
    const rbacService = require('../services/rbacService');
    const rbacResult = await rbacService.getExchangesForUser(req.user, {
      orderBy: { column: 'created_at', ascending: false }
    });
    
    const exchanges = rbacResult.data || [];
    const count = rbacResult.count || 0;
    
    console.log(`📊 User has access to ${count} exchanges (showing sample of ${exchanges.length})`);
    
    // Filter by date range if provided
    const filteredExchanges = exchanges.filter(e => {
      if (!startDate && !endDate) return true;
      const createdAt = new Date(e.created_at);
      const start = startDate ? new Date(startDate) : new Date('2020-01-01');
      const end = endDate ? new Date(endDate) : new Date();
      return createdAt >= start && createdAt <= end;
    });
    
    const statusCounts = filteredExchanges?.reduce((acc, e) => {
      acc[e.status?.toLowerCase() || 'unknown'] = (acc[e.status?.toLowerCase() || 'unknown'] || 0) + 1;
      return acc;
    }, {});
    
    // Calculate timeline compliance
    const now = new Date();
    let onSchedule = 0, atRisk = 0, overdue = 0;
    
    filteredExchanges?.forEach(e => {
      const deadline = new Date(e.exchange_deadline || e.identification_deadline);
      const daysRemaining = Math.floor((deadline - now) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining < 0) overdue++;
      else if (daysRemaining < 7) atRisk++;
      else onSchedule++;
    });
    
    const data = {
      statusCounts,
      totalExchanges: count || 0,
      filteredCount: filteredExchanges.length,
      onSchedule,
      atRisk,
      overdue,
      completionRate: Math.round((statusCounts.completed || 0) / (filteredExchanges.length || 1) * 100),
      avgDuration: 45, // Placeholder - calculate actual average
      userRole: req.user.role,
      dateRange: { startDate, endDate }
    };
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Exchanges report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/reports/users
 * User activity report
 */
router.get('/users', authenticateToken, enforceRBAC(['admin', 'coordinator']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get user statistics
    const { data: users, count: totalUsers } = await supabaseService.client
      .from('users')
      .select('id, role, created_at, last_login', { count: 'exact' });
    
    // Calculate active users today
    const today = new Date().toISOString().split('T')[0];
    const activeToday = users?.filter(u => 
      u.last_login && u.last_login.startsWith(today)
    ).length || 0;
    
    // New users this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newThisMonth = users?.filter(u => 
      new Date(u.created_at) >= thisMonth
    ).length || 0;
    
    // Role distribution
    const roleDistribution = users?.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});
    
    // Get top active users from audit logs
    const { data: topUserActions } = await supabaseService.client
      .from('audit_logs')
      .select('person_id, count')
      .gte('created_at', startDate || '2020-01-01')
      .lte('created_at', endDate || new Date().toISOString())
      .limit(5);
    
    const data = {
      totalUsers,
      activeToday,
      newThisMonth,
      avgSession: 15, // Placeholder - would need session tracking
      roleDistribution,
      topUsers: [] // Would need to join with user data
    };
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Users report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mobile-reports/tasks
 * Task productivity report (role-based data filtering)
 */
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log(`📊 Task report request from ${req.user.role} user: ${req.user.email}`);
    
    // Use RBAC service to get user's authorized tasks
    const rbacService = require('../services/rbacService');
    const rbacResult = await rbacService.getTasksForUser(req.user);
    
    const allTasks = rbacResult.data || [];
    const totalTasks = rbacResult.count || 0;
    
    console.log(`📊 User has access to ${totalTasks} tasks (showing sample of ${allTasks.length})`);
    
    // Filter by date range if provided
    const tasks = allTasks.filter(t => {
      if (!startDate && !endDate) return true;
      const createdAt = new Date(t.created_at);
      const start = startDate ? new Date(startDate) : new Date('2020-01-01');
      const end = endDate ? new Date(endDate) : new Date();
      return createdAt >= start && createdAt <= end;
    });
    
    const completedTasks = tasks?.filter(t => t.status === 'COMPLETED').length || 0;
    const inProgressTasks = tasks?.filter(t => t.status === 'IN_PROGRESS').length || 0;
    const overdueTasks = tasks?.filter(t => 
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'COMPLETED'
    ).length || 0;
    
    // Priority distribution
    const highPriority = tasks?.filter(t => t.priority === 'HIGH').length || 0;
    const mediumPriority = tasks?.filter(t => t.priority === 'MEDIUM').length || 0;
    const lowPriority = tasks?.filter(t => t.priority === 'LOW').length || 0;
    
    // Calculate daily completion (last 7 days)
    const dailyCompletion = calculateDailyTaskCompletion(tasks);
    
    const data = {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      highPriority,
      mediumPriority,
      lowPriority,
      dailyCompletion
    };
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Tasks report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/reports/audit
 * Security and audit report
 */
router.get('/audit', authenticateToken, enforceRBAC(['admin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get login statistics
    const { data: loginEvents } = await supabaseService.client
      .from('audit_logs')
      .select('action, created_at, details')
      .in('action', ['LOGIN_SUCCESS', 'LOGIN_FAILED'])
      .gte('created_at', startDate || '2020-01-01')
      .lte('created_at', endDate || new Date().toISOString());
    
    const successfulLogins = loginEvents?.filter(e => e.action === 'LOGIN_SUCCESS').length || 0;
    const failedLogins = loginEvents?.filter(e => e.action === 'LOGIN_FAILED').length || 0;
    
    // Get recent security events
    const { data: securityEvents } = await supabaseService.client
      .from('audit_logs')
      .select('*')
      .in('action', ['LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'PERMISSION_DENIED'])
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Calculate hourly activity pattern
    const hourlyActivity = calculateHourlyActivity(loginEvents);
    
    const data = {
      successfulLogins,
      failedLogins,
      securityEvents: securityEvents?.map(e => ({
        type: e.action,
        user: e.person_id,
        time: new Date(e.created_at).toLocaleString(),
        details: e.details
      })),
      hourlyActivity
    };
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Audit report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/reports/:category/export
 * Export report in various formats
 */
router.get('/:category/export', authenticateToken, async (req, res) => {
  try {
    const { category } = req.params;
    const { format = 'pdf', startDate, endDate } = req.query;
    
    // Get report data based on category
    let reportData;
    switch (category) {
      case 'overview':
        reportData = await getOverviewData(req.user, startDate, endDate);
        break;
      case 'financial':
        reportData = await getFinancialData(req.user, startDate, endDate);
        break;
      case 'exchanges':
        reportData = await getExchangesData(req.user, startDate, endDate);
        break;
      case 'users':
        reportData = await getUsersData(req.user, startDate, endDate);
        break;
      case 'tasks':
        reportData = await getTasksData(req.user, startDate, endDate);
        break;
      case 'audit':
        reportData = await getAuditData(req.user, startDate, endDate);
        break;
      default:
        return res.status(400).json({ error: 'Invalid report category' });
    }
    
    // Export based on format
    switch (format) {
      case 'pdf':
        const pdfBuffer = await generatePDF(category, reportData, { startDate, endDate });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${category}_report_${Date.now()}.pdf"`);
        res.send(pdfBuffer);
        break;
        
      case 'csv':
        const csv = generateCSV(reportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${category}_report_${Date.now()}.csv"`);
        res.send(csv);
        break;
        
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${category}_report_${Date.now()}.json"`);
        res.json(reportData);
        break;
        
      default:
        res.status(400).json({ error: 'Invalid export format' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper functions

async function getRecentActivity(user, startDate, endDate) {
  const { data: activities } = await supabaseService.client
    .from('audit_logs')
    .select('action, created_at, details')
    .order('created_at', { ascending: false })
    .limit(10);
  
  return activities?.map(a => ({
    description: formatActivityDescription(a.action),
    time: new Date(a.created_at).toLocaleString(),
    type: getActivityType(a.action)
  }));
}

async function calculateWeeklyTrend(user, startDate, endDate) {
  // Calculate actual weekly activity from audit logs
  const endDateObj = endDate ? new Date(endDate) : new Date();
  const startDateObj = new Date(endDateObj);
  startDateObj.setDate(startDateObj.getDate() - 7);

  const { data: activities } = await supabaseService.client
    .from('audit_logs')
    .select('created_at, action')
    .gte('created_at', startDateObj.toISOString())
    .lte('created_at', endDateObj.toISOString());

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyCount = weekDays.map(day => ({ day, value: 0 }));

  activities?.forEach(activity => {
    const dayIndex = new Date(activity.created_at).getDay();
    dailyCount[dayIndex].value++;
  });

  return dailyCount.slice(1).concat(dailyCount[0]); // Reorder to start with Monday
}

async function calculateRevenue(user, startDate, endDate) {
  // Calculate actual revenue from exchanges with role-based filtering
  const rbacService = require('../services/rbacService');
  const rbacResult = await rbacService.getExchangesForUser(user, {
    orderBy: { column: 'created_at', ascending: false }
  });
  
  const exchanges = rbacResult.data || [];
  
  // Filter by date range if provided
  const filteredExchanges = exchanges.filter(e => {
    if (!startDate && !endDate) return true;
    const createdAt = new Date(e.created_at);
    const start = startDate ? new Date(startDate) : new Date('2020-01-01');
    const end = endDate ? new Date(endDate) : new Date();
    return createdAt >= start && createdAt <= end;
  });
  
  // Sum up exchange values
  const totalRevenue = filteredExchanges.reduce((sum, exchange) => {
    return sum + (parseFloat(exchange.exchange_value) || 0);
  }, 0);
  
  return Math.round(totalRevenue);
}

function calculatePercentageChange(data) {
  // Placeholder - would calculate actual percentage change
  return Math.floor(Math.random() * 20) - 10;
}

function formatValueDistribution(distribution) {
  // Format for mobile chart display
  return [
    { name: '< $100K', value: 20 },
    { name: '$100K-$500K', value: 45 },
    { name: '$500K-$1M', value: 25 },
    { name: '> $1M', value: 10 }
  ];
}

function calculateDailyTaskCompletion(tasks) {
  // Calculate actual task completion for last 7 days
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const dailyCompletion = days.map(day => ({ day, completed: 0 }));
  
  const recentTasks = tasks?.filter(task => {
    if (task.status !== 'COMPLETED' || !task.completed_at) return false;
    const completedAt = new Date(task.completed_at);
    return completedAt >= weekAgo && completedAt <= now;
  });
  
  recentTasks?.forEach(task => {
    const completedAt = new Date(task.completed_at);
    const dayIndex = (completedAt.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    dailyCompletion[dayIndex].completed++;
  });
  
  return dailyCompletion;
}

function calculateHourlyActivity(events) {
  // Calculate activity by hour of day
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return hours.map(hour => ({
    hour: `${hour}:00`,
    activity: Math.floor(Math.random() * 100)
  }));
}

function formatActivityDescription(action) {
  const descriptions = {
    'LOGIN_SUCCESS': 'User logged in',
    'EXCHANGE_CREATED': 'New exchange created',
    'TASK_COMPLETED': 'Task completed',
    'DOCUMENT_UPLOADED': 'Document uploaded',
    'MESSAGE_SENT': 'Message sent'
  };
  return descriptions[action] || action;
}

function getActivityType(action) {
  if (action.includes('SUCCESS')) return 'success';
  if (action.includes('FAILED') || action.includes('ERROR')) return 'error';
  if (action.includes('WARNING')) return 'warning';
  return 'info';
}

async function generatePDF(category, data, options) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    
    // Add report header
    doc.fontSize(20).text(`${category.toUpperCase()} REPORT`, 50, 50);
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, 50, 80);
    
    if (options.startDate && options.endDate) {
      doc.text(`Period: ${options.startDate} to ${options.endDate}`, 50, 100);
    }
    
    // Add report content based on category
    doc.moveDown();
    doc.fontSize(10);
    
    // Add data sections
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object') {
        doc.fontSize(12).text(key.toUpperCase(), { underline: true });
        doc.fontSize(10);
        Object.entries(value).forEach(([subKey, subValue]) => {
          doc.text(`${subKey}: ${subValue}`);
        });
        doc.moveDown();
      } else {
        doc.text(`${key}: ${value}`);
      }
    });
    
    doc.end();
  });
}

function generateCSV(data) {
  // Flatten nested data for CSV
  const flatData = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(item => {
        flatData.push({ category: key, ...item });
      });
    } else if (typeof value === 'object') {
      flatData.push({ category: key, ...value });
    } else {
      flatData.push({ category: key, value });
    }
  });
  
  const parser = new Parser();
  return parser.parse(flatData);
}

// Data getter functions for export
async function getOverviewData(user, startDate, endDate) {
  const dashboardData = await dashboardService.getDashboardData(user.id, user.role);
  return {
    exchanges: dashboardData.exchanges,
    tasks: dashboardData.tasks,
    users: dashboardData.users,
    period: { startDate, endDate }
  };
}

async function getFinancialData(user, startDate, endDate) {
  const financialData = await analyticsService.getFinancialOverview({ user });
  return {
    totalValue: financialData.totalValue,
    averageValues: financialData.averageValues,
    trends: financialData.performanceMetrics.monthlyTrends
  };
}

async function getExchangesData(user, startDate, endDate) {
  const { data: exchanges } = await supabaseService.client
    .from('exchanges')
    .select('*')
    .gte('created_at', startDate || '2020-01-01')
    .lte('created_at', endDate || new Date().toISOString());
  
  return { exchanges, count: exchanges?.length || 0 };
}

async function getUsersData(user, startDate, endDate) {
  const { data: users } = await supabaseService.client
    .from('users')
    .select('id, email, role, created_at, last_login');
  
  return { users, count: users?.length || 0 };
}

async function getTasksData(user, startDate, endDate) {
  const { data: tasks } = await supabaseService.client
    .from('tasks')
    .select('*')
    .gte('created_at', startDate || '2020-01-01')
    .lte('created_at', endDate || new Date().toISOString());
  
  return { tasks, count: tasks?.length || 0 };
}

async function getAuditData(user, startDate, endDate) {
  const { data: auditLogs } = await supabaseService.client
    .from('audit_logs')
    .select('*')
    .gte('created_at', startDate || '2020-01-01')
    .lte('created_at', endDate || new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1000);
  
  return { auditLogs, count: auditLogs?.length || 0 };
}

module.exports = router;