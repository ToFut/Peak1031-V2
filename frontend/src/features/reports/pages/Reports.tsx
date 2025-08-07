import React, { useState, useEffect } from 'react';

import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { 
  ChartBarIcon, 
  DocumentArrowDownIcon, 
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ArrowTrendingUpIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

interface ReportData {
  totalExchanges: number;
  activeExchanges: number;
  completedExchanges: number;
  totalUsers: number;
  activeUsers: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalContacts: number;
  trends?: {
    exchangesThisMonth: number;
    tasksCompletedToday: number;
  };
}

interface AIReport {
  reportType: string;
  generatedAt: string;
  data: any;
  insights: Array<{
    category: string;
    severity: 'low' | 'medium' | 'high';
    finding: string;
    impact: string;
  }>;
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high';
    action: string;
    description: string;
  }>;
  summary: string;
  metadata: {
    dataPoints: number;
    insightCount: number;
    recommendationCount: number;
  };
}

const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [aiReport, setAiReport] = useState<AIReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState('overview');
  const [activeTab, setActiveTab] = useState<'standard' | 'ai'>('standard');
  const { user } = useAuth();

  useEffect(() => {
    loadReportData();
  }, [selectedReport]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get(`/reports/${selectedReport}`);
      if (response.success) {
        setReportData(response.data);
      } else {
        throw new Error(response.error || 'Failed to load report data');
      }
    } catch (err: any) {
      console.error('Error loading report data:', err);
      setError(err.message || 'Failed to load report data');
      // Set fallback data
      setReportData({
        totalExchanges: 0,
        activeExchanges: 0,
        completedExchanges: 0,
        totalUsers: 0,
        activeUsers: 0,
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        totalContacts: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAIReport = async (reportType: string) => {
    try {
      setAiLoading(true);
      setError(null);
      
      const response = await apiService.post('/reports/generate', {
        reportType,
        parameters: { includeRecommendations: true }
      });
      
      if (response.success) {
        setAiReport(response.report);
        setActiveTab('ai');
      } else {
        throw new Error(response.error || 'Failed to generate AI report');
      }
    } catch (err: any) {
      console.error('Error generating AI report:', err);
      setError(err.message || 'Failed to generate AI report');
    } finally {
      setAiLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const response = await apiService.post('/reports/export', {
        reportType: selectedReport,
        format: 'json'
      });
      
      // Create download link
      const blob = new Blob([JSON.stringify(response, null, 2)], {
        type: 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedReport}_report_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error exporting report:', err);
      setError(err.message || 'Failed to export report');
    }
  };

  const reportTypes = [
    { key: 'overview', name: 'Overview', description: 'General system overview and statistics' },
    { key: 'exchanges', name: 'Exchanges', description: 'Exchange status and performance metrics' },
    { key: 'tasks', name: 'Tasks', description: 'Task completion and productivity metrics' },
    { key: 'users', name: 'Users', description: 'User activity and engagement reports' },
    { key: 'audit', name: 'Audit Logs', description: 'Security and compliance audit reports' }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-700 bg-red-100';
      case 'medium': return 'text-yellow-700 bg-yellow-100';
      case 'low': return 'text-green-700 bg-green-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-48"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-600 mr-3" />
              Reports & Analytics
            </h1>
            <p className="text-gray-600 mt-1">Comprehensive insights powered by AI</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {reportTypes.map((report) => (
                <option key={report.key} value={report.key}>
                  {report.name}
                </option>
              ))}
            </select>
            <button
              onClick={exportReport}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('standard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'standard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ChartBarIcon className="h-4 w-4 inline mr-2" />
              Standard Reports
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'ai'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <SparklesIcon className="h-4 w-4 inline mr-2" />
              AI-Powered Analysis
            </button>
          </nav>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-600 font-medium">{error}</p>
                <button
                  onClick={loadReportData}
                  className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Standard Reports Tab */}
        {activeTab === 'standard' && (
          <div className="space-y-6">
            {/* Report Description */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center">
                <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                {reportTypes.find(r => r.key === selectedReport)?.name} Report
              </h3>
              <p className="text-blue-700">
                {reportTypes.find(r => r.key === selectedReport)?.description}
              </p>
            </div>

            {/* Overview Statistics */}
            {selectedReport === 'overview' && reportData && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <BuildingOfficeIcon className="h-8 w-8 text-blue-500" />
                      </div>
                      <div className="ml-4 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Exchanges</dt>
                          <dd className="text-2xl font-bold text-gray-900">
                            {reportData.totalExchanges}
                          </dd>
                          {reportData.trends?.exchangesThisMonth && (
                            <dd className="text-sm text-green-600 flex items-center">
                              <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                              +{reportData.trends.exchangesThisMonth} this month
                            </dd>
                          )}
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CheckCircleIcon className="h-8 w-8 text-green-500" />
                      </div>
                      <div className="ml-4 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Active Exchanges</dt>
                          <dd className="text-2xl font-bold text-gray-900">
                            {reportData.activeExchanges}
                          </dd>
                          <dd className="text-sm text-gray-600">
                            {reportData.completedExchanges} completed
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ClockIcon className="h-8 w-8 text-orange-500" />
                      </div>
                      <div className="ml-4 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Tasks</dt>
                          <dd className="text-2xl font-bold text-gray-900">
                            {reportData.totalTasks}
                          </dd>
                          {reportData.trends?.tasksCompletedToday && (
                            <dd className="text-sm text-green-600 flex items-center">
                              <BoltIcon className="h-3 w-3 mr-1" />
                              {reportData.trends.tasksCompletedToday} completed today
                            </dd>
                          )}
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserGroupIcon className="h-8 w-8 text-purple-500" />
                      </div>
                      <div className="ml-4 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                          <dd className="text-2xl font-bold text-gray-900">
                            {reportData.activeUsers}
                          </dd>
                          <dd className="text-sm text-gray-600">
                            of {reportData.totalUsers} total
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Report Generation */}
            <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <SparklesIcon className="h-5 w-5 text-purple-500 mr-2" />
                  AI-Powered Analysis
                </h3>
                <button
                  onClick={() => generateAIReport('system_health')}
                  disabled={aiLoading}
                  className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                >
                  {aiLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : (
                    <SparklesIcon className="h-4 w-4 mr-2" />
                  )}
                  {aiLoading ? 'Generating...' : 'Generate AI Report'}
                </button>
              </div>
              <p className="text-gray-600">
                Generate comprehensive insights and recommendations using our advanced AI analysis engine.
                Get actionable recommendations based on your data patterns and performance metrics.
              </p>
            </div>
          </div>
        )}

        {/* AI Reports Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            {aiReport ? (
              <>
                {/* Report Summary */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-purple-900 mb-2 flex items-center">
                    <SparklesIcon className="h-6 w-6 mr-2" />
                    {aiReport.reportType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Analysis
                  </h3>
                  <p className="text-purple-700 mb-4">{aiReport.summary}</p>
                  <div className="flex items-center space-x-6 text-sm">
                    <span className="text-purple-600">
                      <strong>{aiReport.metadata.dataPoints}</strong> data points analyzed
                    </span>
                    <span className="text-purple-600">
                      <strong>{aiReport.metadata.insightCount}</strong> insights generated
                    </span>
                    <span className="text-purple-600">
                      <strong>{aiReport.metadata.recommendationCount}</strong> recommendations
                    </span>
                  </div>
                </div>

                {/* Insights */}
                {aiReport.insights.length > 0 && (
                  <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 mr-2" />
                      Key Insights
                    </h4>
                    <div className="space-y-4">
                      {aiReport.insights.map((insight, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${getSeverityColor(insight.severity)}`}>
                          <div className="flex items-start">
                            <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(insight.severity)} mr-3 mt-0.5`}>
                              {insight.severity.toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{insight.category}</h5>
                              <p className="text-gray-700 mt-1">{insight.finding}</p>
                              <p className="text-sm text-gray-600 mt-2 italic">{insight.impact}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {aiReport.recommendations.length > 0 && (
                  <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                      Recommendations
                    </h4>
                    <div className="space-y-4">
                      {aiReport.recommendations.map((rec, index) => (
                        <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-start">
                            <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)} mr-3 mt-0.5`}>
                              {rec.priority.toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{rec.action}</h5>
                              <p className="text-gray-700 mt-1">{rec.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl shadow-lg border border-gray-100">
                <SparklesIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No AI Report Generated Yet</h3>
                <p className="text-gray-600 mb-6">Generate an AI-powered analysis to see comprehensive insights and recommendations.</p>
                <button
                  onClick={() => generateAIReport('system_health')}
                  disabled={aiLoading}
                  className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-8 py-3 rounded-lg hover:from-purple-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center mx-auto"
                >
                  {aiLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : (
                    <SparklesIcon className="h-5 w-5 mr-2" />
                  )}
                  {aiLoading ? 'Generating Report...' : 'Generate AI Report'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
  );
};

export default Reports;