/**
 * AdminGPT - Natural Language Database Query Interface
 * Allows administrators to query the database using natural language via GPT
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ChatBubbleLeftEllipsisIcon, 
  DocumentArrowDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  SparklesIcon,
  ChartBarIcon,
  TableCellsIcon,
  ArrowPathIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';

interface QueryResult {
  id: string;
  query: string;
  results: any[];
  explanation: string;
  suggestedActions?: string[];
  timestamp: string;
  executionTime: number;
}

interface GPTInsight {
  category: string;
  insight: string;
  severity: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedAction?: string;
}

const AdminGPT: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [currentQuery, setCurrentQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [insights, setInsights] = useState<GPTInsight[]>([]);
  const [activeTab, setActiveTab] = useState<'query' | 'insights' | 'history'>('query');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Only load data if user is authenticated and is an admin
    if (!authLoading && user && user.role === 'admin') {
      loadInitialData();
    } else if (!authLoading && user && user.role !== 'admin') {
      setError('Admin access required. Please log in with an administrator account.');
    } else if (!authLoading && !user) {
      setError('Authentication required. Please log in to access AdminGPT.');
    }
  }, [user, authLoading]);

  const loadInitialData = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Load usage stats and suggested queries
      const [stats, suggestedQueries] = await Promise.all([
        apiService.getGPTUsageStats(),
        apiService.get('/admin-gpt/suggestions')
      ]);
      
      setUsageStats(stats);
      setSuggestions(suggestedQueries.suggestions || []);
      setIsInitialized(true);
    } catch (error: any) {
      console.error('Failed to load initial data:', error);
      
      // More specific error messages based on error type
      if (error.message?.includes('401') || error.message?.includes('Authentication')) {
        setError('Authentication failed. Please log in again.');
      } else if (error.message?.includes('403') || error.message?.includes('Admin access')) {
        setError('Admin access required. You do not have permission to use AdminGPT.');
      } else if (error.message?.includes('Network Error') || error.message?.includes('fetch')) {
        setError('Failed to connect to AI service. Please ensure the backend is running.');
      } else {
        setError(`AI service error: ${error.message || 'Unknown error occurred'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const executeQuery = async () => {
    if (!currentQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await apiService.queryWithGPT(currentQuery);
      
      const queryResult: QueryResult = {
        id: Date.now().toString(),
        query: currentQuery,
        results: result.results,
        explanation: result.explanation,
        suggestedActions: result.suggestedActions,
        timestamp: new Date().toISOString(),
        executionTime: 0 // This would come from the backend
      };

      setQueryResults(prev => [queryResult, ...prev]);
      setCurrentQuery('');
      
      // Update usage stats
      loadInitialData();
    } catch (error: any) {
      console.error('Query execution failed:', error);
      setError(`Query failed: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInsights = async () => {
    try {
      setIsLoading(true);
      const result = await apiService.getExchangeInsights();
      setInsights(result.insights);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportResults = async (queryResult: QueryResult) => {
    try {
      const exportData = {
        query: queryResult.query,
        results: queryResult.results,
        timestamp: queryResult.timestamp
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gpt-query-results-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatResultsTable = (results: any[]) => {
    if (!results || results.length === 0) {
      return <p className="text-gray-500 italic">No results found</p>;
    }

    const headers = Object.keys(results[0]);
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map(header => (
                <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.slice(0, 100).map((row, index) => (
              <tr key={index}>
                {headers.map(header => (
                  <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {JSON.stringify(row[header])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {results.length > 100 && (
          <p className="text-sm text-gray-500 mt-2">
            Showing first 100 of {results.length} results
          </p>
        )}
      </div>
    );
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <ArrowPathIcon className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading AdminGPT...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if user is not admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <ShieldExclamationIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-800 mb-2">Access Restricted</h2>
          <p className="text-red-600 mb-4">
            AdminGPT is only available to administrator users.
          </p>
          {!user && (
            <p className="text-sm text-red-500">
              Please log in with an administrator account to access this feature.
            </p>
          )}
          {user && user.role !== 'admin' && (
            <p className="text-sm text-red-500">
              Current role: {user.role}. Administrator role required.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center mr-4">
                <SparklesIcon className="h-8 w-8 text-purple-600 mr-3" />
                AdminGPT
              </h1>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                Local OSS 20B Model
              </span>
            </div>
            <p className="text-gray-600">Query your database using natural language powered by open-source AI</p>
          </div>
          
          {usageStats && (
            <div className="bg-white rounded-lg shadow p-4 border">
              <div className="flex items-center text-sm text-gray-600">
                <ChartBarIcon className="h-4 w-4 mr-2" />
                {usageStats.usage.thisMonth} queries this month
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Avg response: {usageStats.usage.avgResponseTime}ms
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'query', label: 'Query Database', icon: ChatBubbleLeftEllipsisIcon },
              { key: 'insights', label: 'AI Insights', icon: SparklesIcon },
              { key: 'history', label: 'Query History', icon: ClockIcon }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Query Tab */}
      {activeTab === 'query' && (
        <div className="space-y-6">
          {/* Query Input */}
          <div className="bg-white rounded-lg shadow border p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ask a question about your data
            </label>
            <textarea
              ref={queryInputRef}
              value={currentQuery}
              onChange={(e) => setCurrentQuery(e.target.value)}
              placeholder="e.g., Show me all exchanges created this month with their status and assigned coordinators"
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={4}
              disabled={isLoading}
            />
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuery(suggestion)}
                    className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              
              <button
                onClick={executeQuery}
                disabled={!currentQuery.trim() || isLoading}
                className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <SparklesIcon className="h-4 w-4 mr-2" />
                )}
                {isLoading ? 'Processing...' : 'Execute Query'}
              </button>
            </div>
          </div>

          {/* Recent Results */}
          {queryResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Results</h3>
              {queryResults.slice(0, 3).map(result => (
                <div key={result.id} className="bg-white rounded-lg shadow border p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">{result.query}</h4>
                      <p className="text-sm text-gray-600">{result.explanation}</p>
                    </div>
                    <button
                      onClick={() => exportResults(result)}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-600"
                    >
                      <DocumentArrowDownIcon className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {result.results && (
                    <div className="border-t pt-4">
                      {formatResultsTable(result.results)}
                    </div>
                  )}

                  {result.suggestedActions && result.suggestedActions.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <h5 className="text-sm font-medium text-blue-900 mb-2">Suggested Actions:</h5>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {result.suggestedActions.map((action, index) => (
                          <li key={index}>• {action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">AI-Generated Insights</h3>
            <button
              onClick={loadInsights}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isLoading ? (
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <SparklesIcon className="h-4 w-4 mr-2" />
              )}
              Generate Insights
            </button>
          </div>

          {insights.length > 0 ? (
            <div className="grid gap-4">
              {insights.map((insight, index) => (
                <div key={index} className="bg-white rounded-lg shadow border p-6">
                  <div className="flex items-start">
                    <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(insight.severity)}`}>
                      {insight.severity.toUpperCase()}
                    </div>
                    <div className="ml-4 flex-1">
                      <h4 className="font-medium text-gray-900">{insight.category}</h4>
                      <p className="text-gray-600 mt-1">{insight.insight}</p>
                      {insight.suggestedAction && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Suggested Action:</strong> {insight.suggestedAction}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow border">
              <SparklesIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No insights generated yet</h3>
              <p className="text-gray-600">Click "Generate Insights" to analyze your data</p>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Query History</h3>
          {queryResults.length > 0 ? (
            <div className="bg-white rounded-lg shadow border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Query
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Results
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {queryResults.map(result => (
                    <tr key={result.id}>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                        {result.query}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {result.results ? result.results.length : 0} rows
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(result.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <button
                          onClick={() => exportResults(result)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Export
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow border">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No queries yet</h3>
              <p className="text-gray-600">Start by asking a question in the Query tab</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminGPT;