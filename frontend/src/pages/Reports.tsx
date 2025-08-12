import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { apiService } from '../services/api';
import {
  DocumentChartBarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface ReportData {
  id: string;
  name: string;
  type: string;
  description: string;
  lastGenerated?: string;
  status: 'available' | 'generating' | 'error';
  downloadUrl?: string;
}

const Reports: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, isCoordinator, isAgency } = usePermissions();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  // Available reports based on user role
  const availableReports: ReportData[] = [
    {
      id: 'user-activity',
      name: 'User Activity Report',
      type: 'audit',
      description: 'Detailed report of user activities and system interactions',
      status: 'available'
    },
    {
      id: 'exchange-summary',
      name: 'Exchange Summary Report',
      type: 'exchange',
      description: 'Overview of all exchanges with status and progress',
      status: 'available'
    },
    {
      id: 'document-activity',
      name: 'Document Activity Report',
      type: 'document',
      description: 'Document uploads, downloads, and access patterns',
      status: 'available'
    },
    {
      id: 'task-completion',
      name: 'Task Completion Report',
      type: 'task',
      description: 'Task assignments, completions, and performance metrics',
      status: 'available'
    }
  ];

  // Admin-only reports
  const adminReports: ReportData[] = [
    {
      id: 'system-audit',
      name: 'System Audit Report',
      type: 'audit',
      description: 'Comprehensive system audit with security events',
      status: 'available'
    },
    {
      id: 'user-management',
      name: 'User Management Report',
      type: 'user',
      description: 'User accounts, roles, and access patterns',
      status: 'available'
    },
    {
      id: 'sync-status',
      name: 'Sync Status Report',
      type: 'sync',
      description: 'PracticePanther sync status and error logs',
      status: 'available'
    }
  ];

  // Coordinator reports
  const coordinatorReports: ReportData[] = [
    {
      id: 'managed-exchanges',
      name: 'Managed Exchanges Report',
      type: 'exchange',
      description: 'Detailed report of exchanges you manage',
      status: 'available'
    },
    {
      id: 'team-performance',
      name: 'Team Performance Report',
      type: 'performance',
      description: 'Performance metrics for your team members',
      status: 'available'
    }
  ];

  // Agency reports
  const agencyReports: ReportData[] = [
    {
      id: 'client-exchanges',
      name: 'Client Exchanges Report',
      type: 'exchange',
      description: 'Overview of all client exchanges',
      status: 'available'
    },
    {
      id: 'client-activity',
      name: 'Client Activity Report',
      type: 'client',
      description: 'Client engagement and activity patterns',
      status: 'available'
    }
  ];

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    setError(null);

    try {
      // Combine reports based on user role
      let allReports = [...availableReports];

      if (isAdmin()) {
        allReports = [...allReports, ...adminReports];
      }

      if (isCoordinator()) {
        allReports = [...allReports, ...coordinatorReports];
      }

      if (isAgency()) {
        allReports = [...allReports, ...agencyReports];
      }

      setReports(allReports);
    } catch (err: any) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (reportId: string) => {
    try {
      setSelectedReport(reportId);
      
      // Update report status to generating
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, status: 'generating' as const }
          : report
      ));

      // Simulate report generation (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update report status to available with download URL
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { 
              ...report, 
              status: 'available' as const,
              lastGenerated: new Date().toISOString(),
              downloadUrl: `/api/reports/${reportId}/download`
            }
          : report
      ));

      setSelectedReport(null);
    } catch (err: any) {
      console.error('Failed to generate report:', err);
      
      // Update report status to error
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, status: 'error' as const }
          : report
      ));

      setSelectedReport(null);
    }
  };

  const downloadReport = async (reportId: string, downloadUrl: string) => {
    try {
      // Simulate download (replace with actual download logic)
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${reportId}-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Failed to download report:', err);
      setError('Failed to download report');
    }
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'audit':
        return <DocumentChartBarIcon className="h-6 w-6" />;
      case 'exchange':
        return <ChartBarIcon className="h-6 w-6" />;
      case 'document':
        return <DocumentTextIcon className="h-6 w-6" />;
      case 'task':
        return <CalendarIcon className="h-6 w-6" />;
      case 'user':
        return <UserIcon className="h-6 w-6" />;
      default:
        return <DocumentChartBarIcon className="h-6 w-6" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-green-600 bg-green-100';
      case 'generating':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'generating':
        return 'Generating...';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  // Check if user has access
  if (!isAdmin() && !isCoordinator() && !isAgency()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to access reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">
            Generate and download system reports
            {user?.role && ` (${user.role} view)`}
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading reports...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-lg ${getStatusColor(report.status)}`}>
                  {getReportIcon(report.type)}
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                  {getStatusText(report.status)}
                </span>
              </div>

              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {report.name}
              </h3>
              
              <p className="text-sm text-gray-600 mb-4">
                {report.description}
              </p>

              {report.lastGenerated && (
                <p className="text-xs text-gray-500 mb-4">
                  Last generated: {new Date(report.lastGenerated).toLocaleDateString()}
                </p>
              )}

              <div className="flex space-x-2">
                {report.status === 'available' && report.downloadUrl ? (
                  <button
                    onClick={() => downloadReport(report.id, report.downloadUrl!)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Download
                  </button>
                ) : (
                  <button
                    onClick={() => generateReport(report.id)}
                    disabled={selectedReport === report.id}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedReport === report.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <EyeIcon className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Reports Message */}
      {!loading && !error && reports.length === 0 && (
        <div className="text-center py-12">
          <DocumentChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Available</h3>
          <p className="text-gray-600">No reports are available for your role and permissions.</p>
        </div>
      )}
    </div>
  );
};

export default Reports;
