/**
 * Enhanced Analytics Service for Exchange Management
 * Provides financial metrics, smart querying, and performance analytics
 */

const supabaseService = require('./supabase');
const rbacService = require('./rbacService');

class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get comprehensive financial overview with RBAC
   */
  async getFinancialOverview(options = {}) {
    const { user } = options;
    const cacheKey = user ? `financial_overview_${user.role}_${user.id}` : 'financial_overview';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let totalCount;
      let exchanges;

      if (user) {
        // Use RBAC to get user's authorized exchanges
        const rbacResult = await rbacService.getExchangesForUser(user, {
          limit: 1000, // Sample size for analysis
          orderBy: { column: 'created_at', ascending: false }
        });
        
        totalCount = rbacResult.count;
        exchanges = rbacResult.data || [];
        
        console.log(`📊 Analytics: Using RBAC for ${user.role} - ${totalCount} total exchanges`);
      } else {
        // Fallback to direct query (for backward compatibility)
        const { count: directCount, error: countError } = await supabaseService.client
          .from('exchanges')
          .select('id', { count: 'exact', head: true });

        if (countError) throw countError;

        const { data: directExchanges, error } = await supabaseService.client
          .from('exchanges')
          .select(`
            id, 
            relinquished_property_value,
            replacement_property_value,
            exchange_value,
            status,
            exchange_type,
            created_at,
            sale_date,
            identification_deadline,
            exchange_deadline
          `)
          .order('created_at', { ascending: false })
          .limit(1000);
        
        if (error) throw error;
        
        totalCount = directCount;
        exchanges = directExchanges;
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // Calculate comprehensive metrics
      const metrics = {
        totalValue: {
          relinquished: exchanges.reduce((sum, e) => sum + (e.relinquished_property_value || 0), 0),
          replacement: exchanges.reduce((sum, e) => sum + (e.replacement_property_value || 0), 0),
          exchange: exchanges.reduce((sum, e) => sum + (e.exchange_value || 0), 0)
        },
        
        averageValues: {
          relinquished: this.calculateAverage(exchanges, 'relinquished_property_value'),
          replacement: this.calculateAverage(exchanges, 'replacement_property_value'),
          exchange: this.calculateAverage(exchanges, 'exchange_value')
        },

        statusBreakdown: this.calculateStatusBreakdown(exchanges),
        
        typeBreakdown: this.calculateTypeBreakdown(exchanges),
        
        timelineAnalysis: this.calculateTimelineAnalysis(exchanges, now),
        
        performanceMetrics: {
          totalExchanges: totalCount,
          sampleSize: exchanges.length,
          completionRate: this.calculateCompletionRate(exchanges),
          averageCompletionTime: this.calculateAverageCompletionTime(exchanges),
          monthlyTrends: this.calculateMonthlyTrends(exchanges, currentYear)
        },

        riskAnalysis: { ...this.calculateRiskAnalysis(exchanges, now), total: totalCount },
        
        valueDistribution: this.calculateValueDistribution(exchanges),
        
        geographicAnalysis: this.calculateGeographicAnalysis(exchanges),
        
        lastUpdated: now.toISOString()
      };

      this.setCache(cacheKey, metrics);
      return metrics;

    } catch (error) {
      console.error('Analytics Service - Financial Overview Error:', error);
      throw new Error('Failed to calculate financial overview');
    }
  }

  /**
   * Get paginated exchanges with smart filtering
   */
  async getPaginatedExchanges(options = {}) {
    const {
      page = 1,
      limit = 30,
      sortBy = 'created_at',
      sortOrder = 'desc',
      status,
      minValue,
      maxValue,
      exchangeType,
      searchTerm,
      dateRange
    } = options;

    try {
      let query = supabaseService.client
        .from('exchanges')
        .select(`*`, { count: 'exact' });

      // Apply filters
      if (status) query = query.eq('status', status);
      if (exchangeType) query = query.eq('exchange_type', exchangeType);
      if (minValue) query = query.gte('exchange_value', minValue);
      if (maxValue) query = query.lte('exchange_value', maxValue);
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,exchange_number.ilike.%${searchTerm}%`);
      }
      if (dateRange) {
        query = query.gte('created_at', dateRange.start)
                    .lte('created_at', dateRange.end);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      // Enrich with calculated fields
      const enrichedData = data.map(exchange => ({
        ...exchange,
        riskLevel: this.calculateExchangeRisk(exchange),
        progressPercentage: this.calculateProgress(exchange),
        timelineStatus: this.getTimelineStatus(exchange),
        projectedCompletion: this.calculateProjectedCompletion(exchange)
      }));

      return {
        data: enrichedData,
        pagination: {
          currentPage: page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasNext: page < Math.ceil(count / limit),
          hasPrevious: page > 1
        },
        summary: {
          totalValue: enrichedData.reduce((sum, e) => sum + (e.exchange_value || 0), 0),
          averageValue: this.calculateAverage(enrichedData, 'exchange_value'),
          statusCounts: this.calculateStatusBreakdown(enrichedData)
        }
      };

    } catch (error) {
      console.error('Analytics Service - Paginated Exchanges Error:', error);
      throw new Error('Failed to fetch paginated exchanges');
    }
  }

  // Helper Methods
  calculateAverage(array, field) {
    const validValues = array.filter(item => item[field] != null && item[field] > 0);
    if (validValues.length === 0) return 0;
    return validValues.reduce((sum, item) => sum + item[field], 0) / validValues.length;
  }

  calculateStatusBreakdown(exchanges) {
    const breakdown = exchanges.reduce((acc, exchange) => {
      const status = exchange.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      raw: breakdown,
      percentages: Object.keys(breakdown).reduce((acc, status) => {
        acc[status] = ((breakdown[status] / exchanges.length) * 100).toFixed(1);
        return acc;
      }, {})
    };
  }

  calculateTypeBreakdown(exchanges) {
    return exchanges.reduce((acc, exchange) => {
      const type = exchange.exchange_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }

  calculateTimelineAnalysis(exchanges, now) {
    const analysis = {
      approaching45Day: 0,
      approaching180Day: 0,
      overdue45Day: 0,
      overdue180Day: 0,
      completed: 0
    };

    exchanges.forEach(exchange => {
      if (exchange.status === 'completed') {
        analysis.completed++;
        return;
      }

      const id45 = exchange.identification_deadline ? new Date(exchange.identification_deadline) : null;
      const ex180 = exchange.exchange_deadline ? new Date(exchange.exchange_deadline) : null;

      if (id45) {
        const days45 = Math.ceil((id45 - now) / (1000 * 60 * 60 * 24));
        if (days45 < 0) analysis.overdue45Day++;
        else if (days45 <= 7) analysis.approaching45Day++;
      }

      if (ex180) {
        const days180 = Math.ceil((ex180 - now) / (1000 * 60 * 60 * 24));
        if (days180 < 0) analysis.overdue180Day++;
        else if (days180 <= 30) analysis.approaching180Day++;
      }
    });

    return analysis;
  }

  calculateCompletionRate(exchanges) {
    const completed = exchanges.filter(e => e.status === 'completed').length;
    return exchanges.length > 0 ? (completed / exchanges.length * 100).toFixed(1) : 0;
  }

  calculateAverageCompletionTime(exchanges) {
    const completed = exchanges.filter(e => 
      e.status === 'completed' && 
      e.sale_date && 
      e.updated_at
    );

    if (completed.length === 0) return null;

    const totalDays = completed.reduce((sum, e) => {
      const start = new Date(e.sale_date);
      const end = new Date(e.updated_at);
      return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }, 0);

    return Math.round(totalDays / completed.length);
  }

  calculateMonthlyTrends(exchanges, year) {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      name: new Date(year, i, 1).toLocaleDateString('en', { month: 'long' }),
      count: 0,
      value: 0
    }));

    exchanges.forEach(exchange => {
      const created = new Date(exchange.created_at);
      if (created.getFullYear() === year) {
        const monthIndex = created.getMonth();
        months[monthIndex].count++;
        months[monthIndex].value += exchange.exchange_value || 0;
      }
    });

    return months;
  }

  calculateRiskAnalysis(exchanges, now) {
    let high = 0, medium = 0, low = 0;

    exchanges.forEach(exchange => {
      const risk = this.calculateExchangeRisk(exchange, now);
      if (risk === 'HIGH') high++;
      else if (risk === 'MEDIUM') medium++;
      else low++;
    });

    return { high, medium, low, total: exchanges.length };
  }

  calculateExchangeRisk(exchange, now = new Date()) {
    let riskScore = 0;

    // Timeline risk
    if (exchange.identification_deadline) {
      const days45 = Math.ceil((new Date(exchange.identification_deadline) - now) / (1000 * 60 * 60 * 24));
      if (days45 < 0) riskScore += 10; // Overdue
      else if (days45 <= 7) riskScore += 7; // Very close
      else if (days45 <= 14) riskScore += 4; // Close
    }

    if (exchange.exchange_deadline) {
      const days180 = Math.ceil((new Date(exchange.exchange_deadline) - now) / (1000 * 60 * 60 * 24));
      if (days180 < 0) riskScore += 15; // Overdue
      else if (days180 <= 30) riskScore += 8; // Close
      else if (days180 <= 60) riskScore += 4; // Moderate
    }

    // Value risk
    const value = exchange.exchange_value || 0;
    if (value > 10000000) riskScore += 3; // High value
    else if (value > 5000000) riskScore += 2; // Medium value

    // Status risk
    if (exchange.status === 'on_hold') riskScore += 5;
    if (exchange.status === 'pending') riskScore += 2;

    // Return risk level
    if (riskScore >= 10) return 'HIGH';
    if (riskScore >= 5) return 'MEDIUM';
    return 'LOW';
  }

  calculateProgress(exchange) {
    // Simple progress calculation based on timeline
    if (exchange.status === 'completed') return 100;
    if (exchange.status === 'failed' || exchange.status === 'cancelled') return 0;

    const now = new Date();
    const saleDate = exchange.sale_date ? new Date(exchange.sale_date) : now;
    const deadline = exchange.exchange_deadline ? new Date(exchange.exchange_deadline) : null;

    if (!deadline) return 25; // Default progress

    const totalTime = deadline - saleDate;
    const elapsed = now - saleDate;

    if (elapsed <= 0) return 10;
    if (elapsed >= totalTime) return 90; // Almost complete but not marked as completed

    return Math.min(90, Math.max(10, (elapsed / totalTime) * 80 + 10));
  }

  getTimelineStatus(exchange) {
    const now = new Date();
    const id45 = exchange.identification_deadline ? new Date(exchange.identification_deadline) : null;
    const ex180 = exchange.exchange_deadline ? new Date(exchange.exchange_deadline) : null;

    if (exchange.status === 'completed') return 'COMPLETED';

    if (id45) {
      const days45 = Math.ceil((id45 - now) / (1000 * 60 * 60 * 24));
      if (days45 < 0) return 'OVERDUE_45';
      if (days45 <= 7) return 'CRITICAL_45';
      if (days45 <= 14) return 'WARNING_45';
    }

    if (ex180) {
      const days180 = Math.ceil((ex180 - now) / (1000 * 60 * 60 * 24));
      if (days180 < 0) return 'OVERDUE_180';
      if (days180 <= 30) return 'CRITICAL_180';
      if (days180 <= 60) return 'WARNING_180';
    }

    return 'ON_TRACK';
  }

  calculateProjectedCompletion(exchange) {
    if (exchange.exchange_deadline) {
      return exchange.exchange_deadline;
    }

    // Estimate based on sale date + 180 days
    if (exchange.sale_date) {
      const saleDate = new Date(exchange.sale_date);
      const projected = new Date(saleDate);
      projected.setDate(projected.getDate() + 180);
      return projected.toISOString();
    }

    return null;
  }

  calculateValueDistribution(exchanges) {
    const ranges = {
      'under_1M': 0,
      '1M_to_5M': 0,
      '5M_to_10M': 0,
      '10M_to_25M': 0,
      'over_25M': 0
    };

    exchanges.forEach(exchange => {
      const value = exchange.exchange_value || 0;
      if (value < 1000000) ranges.under_1M++;
      else if (value < 5000000) ranges['1M_to_5M']++;
      else if (value < 10000000) ranges['5M_to_10M']++;
      else if (value < 25000000) ranges['10M_to_25M']++;
      else ranges.over_25M++;
    });

    return ranges;
  }

  calculateGeographicAnalysis(exchanges) {
    // This would need geographic data from the exchanges
    // For now, return placeholder structure
    return {
      topStates: [],
      topCities: [],
      concentration: 'distributed' // or 'concentrated'
    };
  }

  // Cache management
  setCache(key, data, customTimeout = null) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      timeout: customTimeout || this.cacheTimeout
    });
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const timeout = cached.timeout || this.cacheTimeout;
    if (Date.now() - cached.timestamp > timeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clearCache() {
    this.cache.clear();
  }

  /**
   * Optimized method for quick overview (dashboard stats)
   * Uses aggregated queries instead of fetching all exchanges
   */
  async getQuickOverview(options = {}) {
    const { user } = options;
    
    try {
      console.log('⚡ Fetching quick overview (optimized)...');
      
      if (user) {
        // Use RBAC for user-specific overview
        const rbacResult = await rbacService.getExchangesForUser(user, {
          limit: 100 // Smaller sample for quick overview
        });
        
        const exchanges = rbacResult.data || [];
        const totalCount = rbacResult.count;
        
        // Calculate metrics from RBAC-filtered data
        const statusCounts = this.calculateStatusBreakdown(exchanges);
        const totalValue = exchanges.reduce((sum, e) => sum + (e.exchange_value || 0), 0);
        const averageValue = exchanges.length > 0 ? totalValue / exchanges.length : 0;
        
        return {
          totalExchanges: totalCount,
          activeExchanges: statusCounts['active'] || 0,
          completedExchanges: statusCounts['completed'] || 0,
          pendingExchanges: statusCounts['pending'] || 0,
          totalValue: totalValue,
          averageValue: averageValue,
          monthlyValue: totalValue / 12, // Simplified calculation
          completionRate: exchanges.length > 0 ? 
            ((statusCounts['completed'] || 0) / exchanges.length * 100) : 0,
          approaching45Day: exchanges.filter(e => this.isApproaching45Day(e)).length,
          approaching180Day: exchanges.filter(e => this.isApproaching180Day(e)).length,
          overdueCount: exchanges.filter(e => this.isOverdue(e)).length,
          highRisk: exchanges.filter(e => this.isHighRisk(e)).length,
          mediumRisk: exchanges.filter(e => this.isMediumRisk(e)).length,
          lowRisk: exchanges.filter(e => this.isLowRisk(e)).length
        };
      }
      
      // Fallback to direct queries for backward compatibility
      const [
        countResult,
        statusResult,
        valueResult
      ] = await Promise.all([
        // 1. Get total count
        supabaseService.client
          .from('exchanges')
          .select('id', { count: 'exact', head: true }),
        
        // 2. Get status counts (limited to 100 for performance)
        supabaseService.client
          .from('exchanges')
          .select('status')
          .limit(100),
        
        // 3. Get value aggregates (limited to 100 for performance)
        supabaseService.client
          .from('exchanges')
          .select('exchange_value')
          .limit(100)
      ]);

      // Process results efficiently
      const totalExchanges = countResult?.count || 0;
      
      const statusCounts = statusResult?.data?.reduce((acc, row) => {
        acc[row.status || 'unknown'] = (acc[row.status || 'unknown'] || 0) + 1;
        return acc;
      }, {}) || {};
      
      const valueData = valueResult?.data || [];
      const totalValue = valueData.reduce((sum, row) => sum + (row.exchange_value || 0), 0);
      const averageValue = valueData.length ? totalValue / valueData.length : 0;
      
      // Estimate other metrics based on sample
      const sampleRatio = totalExchanges > 0 ? Math.min(100 / totalExchanges, 1) : 0;
      const estimatedActive = Math.floor((statusCounts['45D'] + statusCounts['180D']) / sampleRatio);
      const estimatedCompleted = Math.floor((statusCounts['COMPLETED'] || 0) / sampleRatio);

      return {
        totalExchanges,
        activeExchanges: estimatedActive,
        completedExchanges: estimatedCompleted,
        completionRate: totalExchanges > 0 ? 
          (estimatedCompleted / totalExchanges * 100).toFixed(1) : 0,
        totalValue: totalValue * (1 / sampleRatio), // Scale up based on sample
        averageValue: averageValue,
        monthlyValue: totalValue * (1 / sampleRatio) / 12, // Estimate monthly
        approaching45Day: Math.floor(totalExchanges * 0.1), // Estimate
        approaching180Day: Math.floor(totalExchanges * 0.05), // Estimate
        overdueCount: Math.floor(totalExchanges * 0.02), // Estimate
        highRisk: Math.floor(totalExchanges * 0.1),
        mediumRisk: Math.floor(totalExchanges * 0.2),
        lowRisk: Math.floor(totalExchanges * 0.7),
        trends: [] // Skip trends for performance
      };
      
    } catch (error) {
      console.error('Quick overview error:', error);
      // Return minimal data on error
      return {
        totalExchanges: 0,
        activeExchanges: 0,
        completedExchanges: 0,
        completionRate: 0,
        totalValue: 0,
        averageValue: 0,
        monthlyValue: 0,
        approaching45Day: 0,
        approaching180Day: 0,
        overdueCount: 0,
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0,
        trends: []
      };
    }
  }

  /**
   * Get recent exchanges (optimized query)
   */
  async getRecentExchanges(limit = 5) {
    try {
      const { data, error } = await supabaseService.client
        .from('exchanges')
        .select(`
          id,
          name,
          exchange_number,
          status,
          exchange_value,
          created_at,
          client:people!client_id(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Recent exchanges error:', error);
      return [];
    }
  }

  clearCache() {
    this.cache.clear();
    console.log('🗑️ Analytics cache cleared');
  }

  // Helper methods for risk and timeline analysis
  isApproaching45Day(exchange) {
    if (!exchange.identification_deadline) return false;
    const deadline = new Date(exchange.identification_deadline);
    const now = new Date();
    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    return daysUntil > 0 && daysUntil <= 45;
  }

  isApproaching180Day(exchange) {
    if (!exchange.exchange_deadline) return false;
    const deadline = new Date(exchange.exchange_deadline);
    const now = new Date();
    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    return daysUntil > 0 && daysUntil <= 180;
  }

  isOverdue(exchange) {
    const now = new Date();
    if (exchange.identification_deadline) {
      const deadline = new Date(exchange.identification_deadline);
      if (deadline < now) return true;
    }
    if (exchange.exchange_deadline) {
      const deadline = new Date(exchange.exchange_deadline);
      if (deadline < now) return true;
    }
    return false;
  }

  isHighRisk(exchange) {
    // High risk if approaching deadline in less than 7 days
    if (!exchange.identification_deadline) return false;
    const deadline = new Date(exchange.identification_deadline);
    const now = new Date();
    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    return daysUntil > 0 && daysUntil <= 7;
  }

  isMediumRisk(exchange) {
    // Medium risk if approaching deadline in 8-30 days
    if (!exchange.identification_deadline) return false;
    const deadline = new Date(exchange.identification_deadline);
    const now = new Date();
    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    return daysUntil > 7 && daysUntil <= 30;
  }

  isLowRisk(exchange) {
    // Low risk if deadline is more than 30 days away
    if (!exchange.identification_deadline) return false;
    const deadline = new Date(exchange.identification_deadline);
    const now = new Date();
    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    return daysUntil > 30;
  }
}

module.exports = new AnalyticsService();