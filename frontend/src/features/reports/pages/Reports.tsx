import React, { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { 
  ChartBarIcon, 
  DocumentArrowDownIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  CalendarIcon,
  SparklesIcon,
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

interface ReportItem {
  id: string;
  name: string;
  description: string;
  type: 'overview' | 'exchanges' | 'tasks' | 'users' | 'audit';
  lastGenerated?: string;
  status: 'available' | 'generating' | 'error';
  data?: ReportData;
}

interface AIReport {
  reportType: string;
  summary: string;
  metadata: {
    dataPoints: number;
    insightCount: number;
    recommendationCount: number;
  };
  insights: Array<{
    severity: string;
    message: string;
    category: string;
  }>;
  recommendations: Array<{
    priority: string;
    action: string;
    impact: string;
  }>;
}

const Reports: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<string>('overview');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState<'standard' | 'ai'>('standard');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<AIReport | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    initializeReports();
  }, []);

  const initializeReports = () => {
    const availableReports: ReportItem[] = [
      {
        id: 'overview',
        name: 'System Overview',
        description: 'General system overview and key performance metrics',
        type: 'overview',
        status: 'available',
        lastGenerated: new Date().toISOString()
      },
      {
        id: 'exchanges',
        name: 'Exchange Report',
        description: 'Exchange status, performance metrics, and completion rates',
        type: 'exchanges',
        status: 'available'
      },
      {
        id: 'tasks',
        name: 'Task Management Report',
        description: 'Task completion rates, overdue items, and productivity metrics',
        type: 'tasks',
        status: 'available'
      },
      {
        id: 'users',
        name: 'User Activity Report',
        description: 'User engagement, login patterns, and role distribution',
        type: 'users',
        status: user?.role === 'admin' ? 'available' : 'error'
      },
      {
        id: 'audit',
        name: 'Audit Log Report',
        description: 'Security events, user actions, and system access logs',
        type: 'audit',
        status: user?.role === 'admin' ? 'available' : 'error'
      }
    ];
    
    setReports(availableReports);
    setLoading(false);
  };

  const loadReportData = async (report: ReportItem) => {
    try {
      setError(null);
      
      const response = await apiService.get(`/reports/${report.type}`);
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
        totalExchanges: 15,
        activeExchanges: 8,
        completedExchanges: 5,
        totalUsers: 42,
        activeUsers: 38,
        totalTasks: 67,
        completedTasks: 45,
        pendingTasks: 12,
        totalContacts: 156,
        trends: {
          exchangesThisMonth: 3,
          tasksCompletedToday: 5
        }
      });
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
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-48"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
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
          </div>


        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-600 font-medium">{error}</p>
                <button
                  onClick={() => loadReportData(reports.find(r => r.id === selectedReport)!)}
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
                        <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Exchanges</dt>
                          <dd className="text-lg font-medium text-gray-900">{reportData.totalExchanges}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserGroupIcon className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                          <dd className="text-lg font-medium text-gray-900">{reportData.activeUsers}</dd>
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
                        <CheckCircleIcon className="h-8 w-8 text-purple-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Completed Tasks</dt>
                          <dd className="text-lg font-medium text-gray-900">{reportData.completedTasks}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ArrowTrendingUpIcon className="h-8 w-8 text-orange-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">This Month</dt>
                          <dd className="text-lg font-medium text-gray-900">{reportData.trends?.exchangesThisMonth || 0}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Report Generation Section */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
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
                Get AI-powered insights and recommendations based on your current system data and performance metrics.
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
                    {aiReport.reportType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Analysis
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
                      {aiReport.insights.map((insight: any, index: number) => (
                        <div key={index} className={`p-4 rounded-lg border ${getSeverityColor(insight.severity)}`}>
                          <div className="flex items-start">
                            <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(insight.severity)} mr-3 mt-0.5`}>
                              {insight.severity.toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{insight.message}</p>
                              <p className="text-sm text-gray-600 mt-1">Category: {insight.category}</p>
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
                      {aiReport.recommendations.map((rec: any, index: number) => (
                        <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-start">
                            <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)} mr-3 mt-0.5`}>
                              {rec.priority.toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{rec.action}</p>
                              <p className="text-sm text-gray-600 mt-1">Impact: {rec.impact}</p>
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
    </Layout>
  );
};

export default Reports;