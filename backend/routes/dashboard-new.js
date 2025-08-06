const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const databaseService = require('../services/database');

const router = express.Router();

// Main dashboard overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const [exchanges, users, tasks] = await Promise.all([
      databaseService.getExchanges(),
      databaseService.getUsers(),
      databaseService.getTasks()
    ]);

    const overview = {
      exchanges: {
        total: exchanges.length,
        active: exchanges.filter(e => e.status === 'active' || e.is_active !== false).length,
        completed: exchanges.filter(e => e.status === 'completed').length
      },
      users: {
        total: users.length,
        active: users.filter(u => u.is_active !== false).length
      },
      tasks: {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        completed: tasks.filter(t => t.status === 'completed').length
      }
    };

    res.json(overview);
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: error.message });
  }
});

// Exchange metrics
router.get('/exchange-metrics', authenticateToken, async (req, res) => {
  try {
    const exchanges = await databaseService.getExchanges();
    
    const metrics = {
      total: exchanges.length,
      active: exchanges.filter(e => e.status === 'active' || e.is_active !== false).length,
      completed: exchanges.filter(e => e.status === 'completed').length,
      pending: exchanges.filter(e => e.status === 'pending').length
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching exchange metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deadlines
router.get('/deadlines', authenticateToken, async (req, res) => {
  try {
    const exchanges = await databaseService.getExchanges();
    const now = new Date();
    const deadlines = [];
    
    exchanges.forEach(exchange => {
      const createdAt = new Date(exchange.created_at || exchange.createdAt);
      const day45 = new Date(createdAt.getTime() + 45 * 24 * 60 * 60 * 1000);
      const day180 = new Date(createdAt.getTime() + 180 * 24 * 60 * 60 * 1000);
      
      if (day45 > now) {
        deadlines.push({
          id: exchange.id,
          type: '45-day',
          deadline: day45,
          exchangeName: exchange.name || 'Exchange'
        });
      }
      
      if (day180 > now) {
        deadlines.push({
          id: exchange.id,
          type: '180-day',
          deadline: day180,
          exchangeName: exchange.name || 'Exchange'
        });
      }
    });
    
    res.json({ deadlines });
  } catch (error) {
    console.error('Error fetching deadlines:', error);
    res.status(500).json({ error: error.message });
  }
});

// Financial summary
router.get('/financial-summary', authenticateToken, async (req, res) => {
  try {
    const exchanges = await databaseService.getExchanges();
    
    const summary = {
      totalValue: exchanges.reduce((sum, e) => sum + (e.value || 0), 0),
      averageValue: exchanges.length > 0 ? exchanges.reduce((sum, e) => sum + (e.value || 0), 0) / exchanges.length : 0,
      totalExchanges: exchanges.length
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recent activity
router.get('/recent-activity', authenticateToken, async (req, res) => {
  try {
    const exchanges = await databaseService.getExchanges();
    const activities = exchanges.slice(0, 10).map(exchange => ({
      id: exchange.id,
      type: 'exchange',
      title: `Exchange "${exchange.name || 'Unnamed'}"`,
      timestamp: exchange.updated_at || exchange.updatedAt
    }));
    
    res.json({ activities });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// User activity
router.get('/user-activity', authenticateToken, async (req, res) => {
  try {
    const userData = {
      profile: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      },
      exchanges: [],
      tasks: []
    };
    
    res.json(userData);
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// Alerts
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const alerts = [];
    
    res.json({
      alerts,
      summary: {
        total: alerts.length
      }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 