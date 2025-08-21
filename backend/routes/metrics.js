const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const supabaseService = require('../services/supabase');
const supabase = supabaseService.client;

// Get Kevin's Friday Metrics - comprehensive business intelligence
router.get('/friday-metrics', authenticateToken, requireRole(['admin', 'coordinator']), async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1. Number of Exchanges Created Month to Date
    const { data: mtdExchanges, error: mtdError } = await supabase
      .from('exchanges')
      .select('id')
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', now.toISOString());

    if (mtdError) {
      console.warn('⚠️ Error fetching MTD exchanges:', mtdError);
      // Return demo data when database has issues
      return res.json({
        success: true,
        metrics: generateDemoFridayMetrics(),
        generated: now.toISOString(),
        demo: true
      });
    }

    // 2. Number of Exchanges Created Last Month
    const { data: lastMonthExchanges, error: lmError } = await supabase
      .from('exchanges')
      .select('id')
      .gte('created_at', startOfLastMonth.toISOString())
      .lte('created_at', endOfLastMonth.toISOString());

    if (lmError) throw lmError;

    // 3. Amount Funded Month to Date
    const { data: mtdFunding, error: fundingError } = await supabase
      .from('exchanges')
      .select('exchange_value')
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', now.toISOString())
      .not('exchange_value', 'is', null);

    if (fundingError) throw fundingError;

    const amountFundedMTD = mtdFunding.reduce((sum, ex) => sum + (parseFloat(ex.exchange_value) || 0), 0);

    // 4. Incoming Funds Next 7 Days - Gross Sales Price
    const { data: incoming7Days, error: incoming7Error } = await supabase
      .from('exchanges')
      .select('id, exchange_number, gross_sales_price, closing_date, property_address, client_name')
      .gte('closing_date', now.toISOString())
      .lte('closing_date', next7Days.toISOString())
      .not('gross_sales_price', 'is', null)
      .order('gross_sales_price', { ascending: false });

    if (incoming7Error) throw incoming7Error;

    const incomingGross = incoming7Days.reduce((sum, ex) => sum + (parseFloat(ex.gross_sales_price) || 0), 0);
    const incomingNet = incomingGross * 0.6; // 60% of gross as specified

    // 5. Outgoing Funds - Scheduled Closeouts, Closings, and EMDs - Next 7 Days
    const { data: outgoing7Days, error: outgoing7Error } = await supabase
      .from('exchanges')
      .select('id, exchange_number, purchase_price, closing_date, emd_amount, status')
      .gte('closing_date', now.toISOString())
      .lte('closing_date', next7Days.toISOString())
      .in('status', ['closing', 'closeout_scheduled', 'pending_emd'])
      .not('purchase_price', 'is', null);

    if (outgoing7Error) throw outgoing7Error;

    const outgoingFunds = outgoing7Days.reduce((sum, ex) => {
      const purchase = parseFloat(ex.purchase_price) || 0;
      const emd = parseFloat(ex.emd_amount) || 0;
      return sum + purchase + emd;
    }, 0);

    // 6. Three Largest Files Incoming in Next 30 Days
    const { data: largest30Days, error: largest30Error } = await supabase
      .from('exchanges')
      .select('id, exchange_number, gross_sales_price, closing_date, property_address, client_name, coordinator_name')
      .gte('closing_date', now.toISOString())
      .lte('closing_date', next30Days.toISOString())
      .not('gross_sales_price', 'is', null)
      .order('gross_sales_price', { ascending: false })
      .limit(3);

    if (largest30Error) throw largest30Error;

    // Format the three largest files with proper exchange number format
    const largestFiles = largest30Days.map(ex => ({
      exchangeNumber: `E-${ex.exchange_number || ex.id}`,
      grossSalesPrice: parseFloat(ex.gross_sales_price),
      closingDate: ex.closing_date,
      propertyAddress: ex.property_address,
      clientName: ex.client_name,
      coordinator: ex.coordinator_name,
      daysUntilClosing: Math.ceil((new Date(ex.closing_date) - now) / (1000 * 60 * 60 * 24))
    }));

    // Calculate additional useful metrics
    const averageDealSize = mtdFunding.length > 0 ? amountFundedMTD / mtdFunding.length : 0;
    const monthOverMonthGrowth = lastMonthExchanges.length > 0 
      ? ((mtdExchanges.length - lastMonthExchanges.length) / lastMonthExchanges.length * 100).toFixed(1)
      : 0;

    // Compile the Friday metrics report
    const fridayMetrics = {
      reportDate: now.toISOString(),
      monthToDate: {
        exchangesCreated: mtdExchanges.length,
        amountFunded: amountFundedMTD,
        averageDealSize: averageDealSize
      },
      lastMonth: {
        exchangesCreated: lastMonthExchanges.length,
        monthOverMonthGrowth: `${monthOverMonthGrowth}%`
      },
      next7Days: {
        incomingFunds: {
          grossSalesPrice: incomingGross,
          projectedNet: incomingNet,
          numberOfDeals: incoming7Days.length,
          deals: incoming7Days.map(ex => ({
            exchangeNumber: `E-${ex.exchange_number || ex.id}`,
            amount: parseFloat(ex.gross_sales_price),
            closingDate: ex.closing_date,
            propertyAddress: ex.property_address,
            clientName: ex.client_name
          }))
        },
        outgoingFunds: {
          total: outgoingFunds,
          numberOfTransactions: outgoing7Days.length,
          breakdown: {
            closings: outgoing7Days.filter(ex => ex.status === 'closing').length,
            closeouts: outgoing7Days.filter(ex => ex.status === 'closeout_scheduled').length,
            emds: outgoing7Days.filter(ex => ex.status === 'pending_emd').length
          }
        }
      },
      largestUpcomingFiles: largestFiles,
      summary: {
        netCashFlow7Days: incomingNet - outgoingFunds,
        totalActiveExchanges: mtdExchanges.length + (lastMonthExchanges?.length || 0),
        requiresAttention: incoming7Days.filter(ex => !ex.gross_sales_price || ex.gross_sales_price === 0).length
      }
    };

    res.json({
      success: true,
      metrics: fridayMetrics,
      generated: now.toISOString()
    });

  } catch (error) {
    console.error('Error generating Friday metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Friday metrics',
      details: error.message
    });
  }
});

// Get real-time dashboard metrics
router.get('/dashboard-live', authenticateToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let baseQuery = supabase.from('exchanges').select('*');
    
    // Apply role-based filtering
    if (role === 'coordinator') {
      baseQuery = baseQuery.eq('coordinator_id', userId);
    } else if (role === 'client') {
      baseQuery = baseQuery.eq('client_id', userId);
    } else if (role === 'third_party') {
      baseQuery = baseQuery.contains('third_party_ids', [userId]);
    }

    const { data: exchanges, error } = await baseQuery;
    if (error) throw error;

    // Calculate live metrics
    const metrics = {
      totalExchanges: exchanges.length,
      activeExchanges: exchanges.filter(ex => ['active', 'pending'].includes(ex.status)).length,
      completedToday: exchanges.filter(ex => 
        ex.status === 'completed' && 
        new Date(ex.updated_at).toDateString() === today.toDateString()
      ).length,
      atRisk: exchanges.filter(ex => {
        if (!ex.closing_date) return false;
        const daysUntilClosing = Math.ceil((new Date(ex.closing_date) - now) / (1000 * 60 * 60 * 24));
        return daysUntilClosing <= 7 && daysUntilClosing > 0 && ex.status !== 'completed';
      }).length,
      totalValue: exchanges.reduce((sum, ex) => sum + (parseFloat(ex.exchange_value) || 0), 0),
      averageTimeToClose: calculateAverageTimeToClose(exchanges),
      upcomingClosings: {
        today: exchanges.filter(ex => new Date(ex.closing_date).toDateString() === today.toDateString()).length,
        thisWeek: exchanges.filter(ex => {
          const closingDate = new Date(ex.closing_date);
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          return closingDate >= now && closingDate <= weekFromNow;
        }).length,
        thisMonth: exchanges.filter(ex => {
          const closingDate = new Date(ex.closing_date);
          return closingDate.getMonth() === now.getMonth() && closingDate.getFullYear() === now.getFullYear();
        }).length
      }
    };

    res.json({
      success: true,
      metrics,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics',
      details: error.message
    });
  }
});

// Get detailed analytics for a specific time period
router.get('/analytics/:period', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { period } = req.params;
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = now;
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = now;
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      default:
        return res.status(400).json({ error: 'Invalid period specified' });
    }

    const { data: exchanges, error } = await supabase
      .from('exchanges')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    // Group exchanges by status
    const statusBreakdown = exchanges.reduce((acc, ex) => {
      acc[ex.status] = (acc[ex.status] || 0) + 1;
      return acc;
    }, {});

    // Calculate revenue metrics
    const revenueMetrics = {
      totalRevenue: exchanges.reduce((sum, ex) => sum + (parseFloat(ex.exchange_value) || 0), 0),
      averageDealSize: exchanges.length > 0 ? 
        exchanges.reduce((sum, ex) => sum + (parseFloat(ex.exchange_value) || 0), 0) / exchanges.length : 0,
      largestDeal: Math.max(...exchanges.map(ex => parseFloat(ex.exchange_value) || 0)),
      smallestDeal: Math.min(...exchanges.filter(ex => ex.exchange_value > 0).map(ex => parseFloat(ex.exchange_value) || 0))
    };

    // Time-based analytics
    const timeAnalytics = {
      averageTimeToClose: calculateAverageTimeToClose(exchanges),
      fastestClose: Math.min(...exchanges.filter(ex => ex.closing_date && ex.created_at)
        .map(ex => Math.ceil((new Date(ex.closing_date) - new Date(ex.created_at)) / (1000 * 60 * 60 * 24)))),
      slowestClose: Math.max(...exchanges.filter(ex => ex.closing_date && ex.created_at)
        .map(ex => Math.ceil((new Date(ex.closing_date) - new Date(ex.created_at)) / (1000 * 60 * 60 * 24))))
    };

    res.json({
      success: true,
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        totalExchanges: exchanges.length,
        statusBreakdown,
        revenueMetrics,
        timeAnalytics
      },
      generated: now.toISOString()
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      details: error.message
    });
  }
});

// Helper function to calculate average time to close
function calculateAverageTimeToClose(exchanges) {
  const completedExchanges = exchanges.filter(ex => 
    ex.status === 'completed' && ex.closing_date && ex.created_at
  );
  
  if (completedExchanges.length === 0) return 0;
  
  const totalDays = completedExchanges.reduce((sum, ex) => {
    const days = Math.ceil((new Date(ex.closing_date) - new Date(ex.created_at)) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);
  
  return Math.round(totalDays / completedExchanges.length);
}

module.exports = router;