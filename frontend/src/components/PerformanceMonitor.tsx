import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface PerformanceStats {
  current: {
    totalRequests: number;
    averageResponseTime: number;
    slowRequests: number;
    criticalRequests: number;
    topSlowEndpoints: Array<{
      endpoint: string;
      count: number;
      totalDuration: number;
      avgDuration: number;
    }>;
  };
  trends: {
    hourly: {
      totalIssues: number;
      criticalIssues: number;
      warningIssues: number;
      slowIssues: number;
    };
    daily: {
      totalIssues: number;
      criticalIssues: number;
      warningIssues: number;
      slowIssues: number;
    };
  };
  recentIssues: Array<{
    id: string;
    timestamp: string;
    method: string;
    path: string;
    duration: number;
    severity: string;
    recommendations: string[];
  }>;
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    lastUpdated: string;
  };
}

interface PerformanceIssue {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  duration: number;
  durationHr: number;
  statusCode: number;
  responseSize: number;
  severity: string;
  performanceLevel: string;
  dbQueries: number;
  dbDuration: number;
  recommendations: string[];
  userAgent: string;
  ipAddress: string;
  userId: string;
}

interface EndpointStats {
  endpoint: string;
  method: string;
  path: string;
  totalRequests: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  slowRequests: number;
  criticalRequests: number;
  errorRequests: number;
  totalResponseSize: number;
  avgResponseSize: number;
}

const PerformanceMonitor: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [issues, setIssues] = useState<PerformanceIssue[]>([]);
  const [endpoints, setEndpoints] = useState<EndpointStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'endpoints'>('overview');

  useEffect(() => {
    loadPerformanceData();
    const interval = setInterval(loadPerformanceData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      const [statsData, issuesData, endpointsData] = await Promise.all([
        apiService.get('/performance/stats'),
        apiService.get('/performance/issues?limit=50'),
        apiService.get('/performance/endpoints')
      ]);

      setStats(statsData.data);
      setIssues(issuesData.data.issues);
      setEndpoints(endpointsData.data.endpoints);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'slow': return 'text-orange-600 bg-orange-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'healthy': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const formatDuration = (duration: number) => {
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading performance data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading performance data</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Monitor</h1>
            <p className="text-gray-600 mt-1">Real-time performance monitoring and debugging</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadPerformanceData}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* System Health */}
      {stats && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className={`flex-shrink-0 h-3 w-3 rounded-full ${
                  stats.systemHealth.status === 'healthy' ? 'bg-green-400' :
                  stats.systemHealth.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                }`}></div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Status</p>
                  <p className={`text-sm ${getHealthStatusColor(stats.systemHealth.status)}`}>
                    {stats.systemHealth.status.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.current.totalRequests}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.current.averageResponseTime)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900">Slow Requests</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.current.slowRequests}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'issues', name: 'Performance Issues' },
              { id: 'endpoints', name: 'Endpoint Analysis' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* Trends */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Trends</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Last Hour</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Issues:</span>
                        <span className="text-sm font-medium">{stats.trends.hourly.totalIssues}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Critical:</span>
                        <span className="text-sm font-medium text-red-600">{stats.trends.hourly.criticalIssues}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Warnings:</span>
                        <span className="text-sm font-medium text-yellow-600">{stats.trends.hourly.warningIssues}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Last 24 Hours</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Issues:</span>
                        <span className="text-sm font-medium">{stats.trends.daily.totalIssues}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Critical:</span>
                        <span className="text-sm font-medium text-red-600">{stats.trends.daily.criticalIssues}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Warnings:</span>
                        <span className="text-sm font-medium text-yellow-600">{stats.trends.daily.warningIssues}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Issues */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Performance Issues</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stats.recentIssues.map((issue) => (
                        <tr key={issue.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTimestamp(issue.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {issue.method}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {issue.path}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDuration(issue.duration)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(issue.severity)}`}>
                              {issue.severity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'issues' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Issues</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {issues.map((issue) => (
                      <tr key={issue.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTimestamp(issue.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {issue.method}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {issue.path}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDuration(issue.duration)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {issue.statusCode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(issue.severity)}`}>
                            {issue.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'endpoints' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Endpoint Performance Analysis</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requests</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slow Requests</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Critical Requests</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {endpoints.map((endpoint) => (
                      <tr key={endpoint.endpoint}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {endpoint.method} {endpoint.path}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {endpoint.totalRequests}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDuration(endpoint.avgDuration)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {endpoint.slowRequests}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {endpoint.criticalRequests}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;




