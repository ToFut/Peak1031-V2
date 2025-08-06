import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

interface DeepDiveMetrics {
  exchangeTimeline: {
    avgCompletionDays: number;
    stageBreakdown: Record<string, number>;
    bottleneckStage: string;
  };
  financialMetrics: {
    totalExchangeValue: number;
    avgExchangeValue: number;
    revenueGrowth: number;
    valueDistribution: Record<string, number>;
  };
  performance: {
    completionRate: number;
    onTimeDelivery: number;
    clientSatisfaction: number;
    coordinatorEfficiency: number;
  };
  trends: {
    monthlyGrowth: number;
    seasonalPatterns: Record<string, number>;
    predictedVolume: number;
  };
}

const DeepDivePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DeepDiveMetrics>({
    exchangeTimeline: {
      avgCompletionDays: 0,
      stageBreakdown: {},
      bottleneckStage: ''
    },
    financialMetrics: {
      totalExchangeValue: 0,
      avgExchangeValue: 0,
      revenueGrowth: 0,
      valueDistribution: {}
    },
    performance: {
      completionRate: 0,
      onTimeDelivery: 0,
      clientSatisfaction: 0,
      coordinatorEfficiency: 0
    },
    trends: {
      monthlyGrowth: 0,
      seasonalPatterns: {},
      predictedVolume: 0
    }
  });

  useEffect(() => {
    loadDeepDiveMetrics();
  }, []);

  const loadDeepDiveMetrics = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch actual analytics data
      const mockMetrics: DeepDiveMetrics = {
        exchangeTimeline: {
          avgCompletionDays: 127,
          stageBreakdown: {
            'INITIATION': 15,
            'QUALIFICATION': 22,
            'DOCUMENTATION': 35,
            'RELINQUISHED_SALE': 18,
            'IDENTIFICATION_PERIOD': 25,
            'REPLACEMENT_ACQUISITION': 30,
            'COMPLETION': 12
          },
          bottleneckStage: 'DOCUMENTATION'
        },
        financialMetrics: {
          totalExchangeValue: 45000000,
          avgExchangeValue: 750000,
          revenueGrowth: 23.5,
          valueDistribution: {
            '<$500K': 35,
            '$500K-$1M': 40,
            '$1M-$5M': 20,
            '>$5M': 5
          }
        },
        performance: {
          completionRate: 89.2,
          onTimeDelivery: 82.7,
          clientSatisfaction: 4.6,
          coordinatorEfficiency: 91.3
        },
        trends: {
          monthlyGrowth: 8.2,
          seasonalPatterns: {
            'Q1': 18,
            'Q2': 28,
            'Q3': 22,
            'Q4': 32
          },
          predictedVolume: 156
        }
      };
      
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to load deep dive metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Deep Dive Analytics</h1>
        <p className="text-gray-600 mt-2">Advanced insights, trends, and detailed analytics</p>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <ChartBarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
              {metrics.performance.completionRate > 85 ? 'Excellent' : 'Good'}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.performance.completionRate}%</p>
          <p className="text-sm text-gray-600 mt-1">Completion Rate</p>
          <p className="text-xs text-gray-500 mt-2">Above industry benchmark</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-green-100">
              <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
              +{metrics.financialMetrics.revenueGrowth}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${(metrics.financialMetrics.totalExchangeValue / 1000000).toFixed(1)}M
          </p>
          <p className="text-sm text-gray-600 mt-1">Total Exchange Value</p>
          <p className="text-xs text-gray-500 mt-2">Avg: ${(metrics.financialMetrics.avgExchangeValue / 1000).toFixed(0)}K</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-yellow-100">
              <ClockIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
              Avg Time
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.exchangeTimeline.avgCompletionDays}</p>
          <p className="text-sm text-gray-600 mt-1">Days to Complete</p>
          <p className="text-xs text-gray-500 mt-2">Bottleneck: {metrics.exchangeTimeline.bottleneckStage}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <ArrowTrendingUpIcon className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
              Growing
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">+{metrics.trends.monthlyGrowth}%</p>
          <p className="text-sm text-gray-600 mt-1">Monthly Growth</p>
          <p className="text-xs text-gray-500 mt-2">Predicted: {metrics.trends.predictedVolume} next month</p>
        </div>
      </div>

      {/* Exchange Stage Analysis */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FunnelIcon className="w-5 h-5 mr-2" />
          Exchange Stage Breakdown (Avg Days)
        </h3>
        <div className="space-y-3">
          {Object.entries(metrics.exchangeTimeline.stageBreakdown).map(([stage, days]) => (
            <div key={stage} className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 w-48">{stage.replace('_', ' ')}</span>
                <div className="w-64 bg-gray-200 rounded-full h-2 ml-4">
                  <div 
                    className={`h-2 rounded-full ${stage === metrics.exchangeTimeline.bottleneckStage ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${(days / Math.max(...Object.values(metrics.exchangeTimeline.stageBreakdown))) * 100}%` }}
                  ></div>
                </div>
              </div>
              <span className="text-sm text-gray-600 font-medium">{days} days</span>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">On-Time Delivery</span>
                <span className="text-sm text-gray-600">{metrics.performance.onTimeDelivery}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{width: `${metrics.performance.onTimeDelivery}%`}}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Client Satisfaction</span>
                <span className="text-sm text-gray-600">{metrics.performance.clientSatisfaction}/5.0</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{width: `${(metrics.performance.clientSatisfaction / 5) * 100}%`}}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Coordinator Efficiency</span>
                <span className="text-sm text-gray-600">{metrics.performance.coordinatorEfficiency}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{width: `${metrics.performance.coordinatorEfficiency}%`}}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Seasonal Patterns</h3>
          <div className="space-y-4">
            {Object.entries(metrics.trends.seasonalPatterns).map(([quarter, percentage]) => (
              <div key={quarter} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{quarter}</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full" 
                      style={{width: `${(percentage / Math.max(...Object.values(metrics.trends.seasonalPatterns))) * 100}%`}}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12">{percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Exchange Value Distribution */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Exchange Value Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(metrics.financialMetrics.valueDistribution).map(([range, percentage]) => (
            <div key={range} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{percentage}%</div>
              <div className="text-sm text-gray-600 mt-1">{range}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeepDivePage;