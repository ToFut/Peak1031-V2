#!/usr/bin/env node

/**
 * Direct Reports Test
 * Tests the report logic directly by calling the route handlers
 */

const express = require('express');
const mobileReportsRouter = require('./routes/mobile-reports');
const supabaseService = require('./services/supabase');

async function createMockRequest(userId, userRole, endpoint, query = {}) {
  // Get user details from database
  const { data: user } = await supabaseService.client
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  return {
    user: user,
    query: query,
    params: { category: endpoint },
    headers: {},
    url: `/mobile-reports/${endpoint}`,
    method: 'GET'
  };
}

function createMockResponse() {
  const response = {
    data: null,
    status: 200,
    headers: {},
    json: function(data) {
      this.data = data;
      console.log('📤 Response:', JSON.stringify(data, null, 2));
      return this;
    },
    status: function(code) {
      this.status = code;
      return this;
    }
  };
  return response;
}

async function testReportEndpoint(userId, endpoint) {
  console.log(`\n📊 Testing ${endpoint} for user ${userId}`);
  console.log('-'.repeat(40));
  
  try {
    const req = await createMockRequest(userId, null, endpoint, {
      startDate: '2024-01-01',
      endDate: '2025-12-31'
    });
    
    console.log(`👤 User: ${req.user.email} (${req.user.role})`);
    
    const res = createMockResponse();
    
    // Import and test the specific route handler
    const routeHandlers = {
      'overview': async (req, res) => {
        try {
          const { startDate, endDate } = req.query;
          const cacheKey = `overview_${req.user.id}_${startDate}_${endDate}`;
          
          const dashboardService = require('./services/dashboardService');
          const dashboardData = await dashboardService.getDashboardData(req.user.id, req.user.role);
          
          // Get recent activity
          const { data: activities } = await supabaseService.client
            .from('audit_logs')
            .select('action, created_at, details')
            .order('created_at', { ascending: false })
            .limit(5);
          
          const recentActivity = activities?.map(a => ({
            description: a.action,
            time: new Date(a.created_at).toLocaleString(),
            type: 'info'
          })) || [];
          
          const data = {
            totalExchanges: dashboardData.exchanges?.total || 0,
            activeExchanges: dashboardData.exchanges?.active || 0,
            completedExchanges: dashboardData.exchanges?.completed || 0,
            totalTasks: dashboardData.tasks?.total || 0,
            completedTasks: dashboardData.tasks?.completed || 0,
            pendingTasks: dashboardData.tasks?.pending || 0,
            recentActivity: recentActivity
          };
          
          res.json({ success: true, data });
        } catch (error) {
          console.error('Overview error:', error);
          res.status(500).json({ success: false, error: error.message });
        }
      },
      
      'exchanges': async (req, res) => {
        try {
          const rbacService = require('./services/rbacService');
          const rbacResult = await rbacService.getExchangesForUser(req.user);
          
          const exchanges = rbacResult.data || [];
          const count = rbacResult.count || 0;
          
          const statusCounts = exchanges.reduce((acc, e) => {
            acc[e.status?.toLowerCase() || 'unknown'] = (acc[e.status?.toLowerCase() || 'unknown'] || 0) + 1;
            return acc;
          }, {});
          
          const data = {
            statusCounts,
            totalExchanges: count,
            filteredCount: exchanges.length,
            userRole: req.user.role,
            sampleExchanges: exchanges.slice(0, 3).map(e => ({
              id: e.id,
              name: e.name,
              status: e.status,
              value: e.exchange_value
            }))
          };
          
          res.json({ success: true, data });
        } catch (error) {
          console.error('Exchanges error:', error);
          res.status(500).json({ success: false, error: error.message });
        }
      },
      
      'tasks': async (req, res) => {
        try {
          const rbacService = require('./services/rbacService');
          const rbacResult = await rbacService.getTasksForUser(req.user);
          
          const tasks = rbacResult.data || [];
          
          const taskStats = {
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'COMPLETED').length,
            inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
            pending: tasks.filter(t => t.status === 'PENDING').length,
            sampleTasks: tasks.slice(0, 3).map(t => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority
            }))
          };
          
          res.json({ success: true, data: taskStats });
        } catch (error) {
          console.error('Tasks error:', error);
          res.status(500).json({ success: false, error: error.message });
        }
      }
    };
    
    const handler = routeHandlers[endpoint];
    if (handler) {
      await handler(req, res);
    } else {
      res.status(400).json({ success: false, error: 'Invalid endpoint' });
    }
    
  } catch (error) {
    console.error(`❌ Test failed for ${endpoint}:`, error);
  }
}

async function runDirectTests() {
  console.log('🔍 DIRECT REPORTS TESTING');
  console.log('=' .repeat(50));
  
  try {
    // Get some test users
    const { data: users } = await supabaseService.client
      .from('users')
      .select('id, email, role')
      .limit(3);
    
    if (!users || users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    const endpoints = ['overview', 'exchanges', 'tasks'];
    
    for (const user of users) {
      console.log(`\n🧪 TESTING USER: ${user.email} (${user.role})`);
      console.log('=' .repeat(60));
      
      for (const endpoint of endpoints) {
        await testReportEndpoint(user.id, endpoint);
      }
    }
    
  } catch (error) {
    console.error('❌ Direct test failed:', error);
  }
  
  console.log('\n✨ DIRECT TESTS COMPLETED');
}

runDirectTests().catch(console.error);