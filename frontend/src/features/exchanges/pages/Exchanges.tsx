import React, { useState } from 'react';
import { ExchangeList } from '../components/ExchangeList';
import { useAuth } from '../../../hooks/useAuth';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { Sparkles, BarChart3, Table, TrendingUp, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

interface FullResultsModal {
  show: boolean;
  result: {
    data: Record<string, any>[];
    queryName?: string;
    originalQuery?: string;
    executedAt?: string | Date;
    generatedSQL?: string;
    description?: string;
  } | null;
}

const Exchanges: React.FC = () => {
  const { user } = useAuth();
  const [showAnalysis, setShowAnalysis] = useState(false); // Start collapsed for cleaner UI
  const [aiQuery, setAiQuery] = useState('');
  const [expandedResults, setExpandedResults] = useState<{[key: number]: boolean}>({});
  const [fullResultsModal, setFullResultsModal] = useState<FullResultsModal>({show: false, result: null});
  
  // Get analytics data when AI analysis is enabled
  const analytics = useAnalytics({
    enableAutoRefresh: showAnalysis,
    refreshInterval: 300000
  });

  const handleAIQuery = async () => {
    if (!aiQuery.trim()) return;
    
    try {
      const result = await analytics.executeAIQuery(aiQuery);
      console.log('AI Query Result:', result);
    } catch (error) {
      console.error('AI Query failed:', error);
    }
  };

  const handleClassicQuery = async (queryKey: string) => {
    try {
      const result = await analytics.executeClassicQuery(queryKey);
      console.log('Classic Query Result:', result);
    } catch (error) {
      console.error('Classic Query failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Clean Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Exchanges</h1>
              <p className="text-gray-600 mt-1">Manage your 1031 exchanges</p>
            </div>
            
            {/* AI Analytics Toggle */}
            {(user?.role === 'admin' || user?.role === 'coordinator') && (
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  showAnalysis
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                AI Analytics
              </button>
            )}
          </div>

          {/* Collapsible AI Analytics Panel */}
          {showAnalysis && (user?.role === 'admin' || user?.role === 'coordinator') && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Analytics Dashboard</h3>
                </div>
                <button
                  onClick={() => setShowAnalysis(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Compact Financial Overview */}
              {analytics.financialOverview && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total Value</p>
                        <p className="text-xl font-bold text-blue-900">
                          {analytics.formatValue(analytics.financialOverview.totalValue.exchange || analytics.financialOverview.totalValue.relinquished)}
                        </p>
                      </div>
                      <DollarSign className="w-6 h-6 text-blue-600 opacity-70" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Completion</p>
                        <p className="text-xl font-bold text-green-900">
                          {analytics.financialOverview.performanceMetrics.completionRate}%
                        </p>
                      </div>
                      <CheckCircle className="w-6 h-6 text-green-600 opacity-70" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-red-600 uppercase tracking-wide">High Risk</p>
                        <p className="text-xl font-bold text-red-900">
                          {analytics.financialOverview.riskAnalysis.high}
                        </p>
                      </div>
                      <AlertTriangle className="w-6 h-6 text-red-600 opacity-70" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Total</p>
                        <p className="text-xl font-bold text-purple-900">
                          {analytics.financialOverview.performanceMetrics.totalExchanges.toLocaleString()}
                        </p>
                      </div>
                      <TrendingUp className="w-6 h-6 text-purple-600 opacity-70" />
                    </div>
                  </div>
                </div>
              )}

              {/* Streamlined AI Query Interface */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      placeholder="Ask about your exchanges... e.g., 'Show high-value exchanges approaching deadlines'"
                      className="w-full px-4 py-3 border-0 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && handleAIQuery()}
                    />
                  </div>
                  <button
                    onClick={handleAIQuery}
                    disabled={analytics.queryLoading || !aiQuery.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    <Sparkles className="h-4 w-4" />
                    {analytics.queryLoading ? 'Analyzing...' : 'Ask AI'}
                  </button>
                </div>

                {/* Compact Quick Queries */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'total_exchange_value', label: 'Total Value' },
                    { key: 'active_exchanges_by_coordinator', label: 'By Coordinator' },
                    { key: 'upcoming_deadlines', label: 'Deadlines' },
                    { key: 'high_value_exchanges', label: 'High Value' }
                  ].map(query => (
                    <button
                      key={query.key}
                      onClick={() => handleClassicQuery(query.key)}
                      className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 text-sm transition-colors"
                    >
                      {query.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enhanced Query Results */}
              {analytics.queryResults && analytics.queryResults.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      Query Results ({analytics.queryResults.length})
                    </h4>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {analytics.queryResults.map((result, index) => {
                      const isExpanded = expandedResults[index];
                      const hasMoreData = result.data && result.data.length > 5;
                      
                      return (
                        <div key={index} className="p-4 border-b border-gray-100 last:border-b-0">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-gray-900 text-sm mb-1 truncate">
                                {result.queryName || result.originalQuery || 'Query Result'}
                              </h5>
                              {result.description && (
                                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{result.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                result.queryType === 'ai_generated' 
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {result.queryType === 'ai_generated' ? '🤖 AI' : '⚡ Quick'}
                              </span>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {result.data?.length || 0} results
                              </span>
                            </div>
                          </div>

                          {/* Smart Results Display */}
                          {result.data && result.data.length > 0 ? (
                            <div className="bg-gray-50 rounded-lg p-3">
                              {/* Single Value Result (Count, Sum, etc.) */}
                              {result.data.length === 1 && typeof result.data[0] === 'object' && Object.keys(result.data[0]).length === 1 ? (
                                <div className="text-center">
                                  <div className="text-3xl font-bold text-blue-600 mb-2">
                                    {(() => {
                                      const value = Object.values(result.data[0])[0];
                                      const key = Object.keys(result.data[0])[0];
                                      
                                      // Format numbers appropriately
                                      if (typeof value === 'number') {
                                        if (key.toLowerCase().includes('value') || key.toLowerCase().includes('total')) {
                                          return new Intl.NumberFormat('en-US', { 
                                            style: 'currency', 
                                            currency: 'USD',
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0
                                          }).format(value);
                                        }
                                        return value.toLocaleString();
                                      }
                                      return String(value);
                                    })()} 
                                  </div>
                                  <div className="text-sm font-medium text-gray-700 bg-gray-200 px-3 py-1 rounded-full inline-block">
                                    {Object.keys(result.data[0])[0].replace(/_/g, ' ').toUpperCase()}
                                  </div>
                                </div>
                              ) : (
                                /* Multiple Results - Show Table/Cards */
                                <div>
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-xs">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          {Object.keys(result.data[0]).map(key => (
                                            <th key={key} className="px-3 py-2 text-left font-semibold text-gray-700 capitalize">
                                              {key.replace(/_/g, ' ')}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {(isExpanded ? result.data : result.data.slice(0, 5)).map((row: any, rowIndex: number) => (
                                          <tr key={rowIndex} className="hover:bg-gray-50">
                                            {Object.entries(row).map(([key, value], colIndex) => (
                                              <td key={colIndex} className="px-3 py-2 text-gray-900">
                                                {(() => {
                                                  if (typeof value === 'number') {
                                                    if (key.toLowerCase().includes('value') || key.toLowerCase().includes('price')) {
                                                      return new Intl.NumberFormat('en-US', { 
                                                        style: 'currency', 
                                                        currency: 'USD' 
                                                      }).format(value);
                                                    }
                                                    if (key.toLowerCase().includes('progress') || key.toLowerCase().includes('rate')) {
                                                      return value + '%';
                                                    }
                                                    return value.toLocaleString();
                                                  }
                                                  if (typeof value === 'string' && value.length > 30) {
                                                    return value.substring(0, 30) + '...';
                                                  }
                                                  return String(value || 'N/A');
                                                })()} 
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  
                                  {/* Show More/Less Toggle */}
                                  {hasMoreData && (
                                    <div className="text-center mt-3 pt-3 border-t border-gray-200">
                                      <button
                                        onClick={() => setExpandedResults(prev => ({ ...prev, [index]: !prev[index] }))}
                                        className="text-sm text-blue-600 hover:text-blue-800 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                                      >
                                        {isExpanded ? (
                                          <>↑ Show Less (Showing all {result.data.length} results)</>  
                                        ) : (
                                          <>↓ Show All {result.data.length} Results (Currently showing 5)</>
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                              <p className="text-yellow-800 text-sm font-medium">No data returned</p>
                              <p className="text-yellow-600 text-xs mt-1">The query executed successfully but returned no results.</p>
                            </div>
                          )}

                          {/* Query Metadata */}
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                🕒 {new Date(result.executedAt).toLocaleTimeString()}
                              </span>
                              {result.generatedSQL && (
                                <button
                                  onClick={() => setFullResultsModal({ show: true, result })}
                                  className="bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-mono text-gray-700 transition-colors"
                                  title="View Generated SQL"
                                >
                                  SQL
                                </button>
                              )}
                              <span className="text-green-600 font-medium">✓ Success</span>
                            </div>
                            
                            {result.data && result.data.length > 0 && (
                              <button
                                onClick={() => setFullResultsModal({ show: true, result })}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                View Full Details →
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {analytics.queryError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{analytics.queryError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Clean Exchange List */}
        <ExchangeList 
          title=""
          showCreateButton={true}
          showFilters={true}
          showSearch={true}
          showStats={true}
          enableSmartMode={true} // Always use smart mode
          showAIAnalysis={showAnalysis}
        />
      </div>
        
        {/* Full Results Modal */}
        {fullResultsModal.show && fullResultsModal.result && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {fullResultsModal.result.queryName || fullResultsModal.result.originalQuery || 'Query Results'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {fullResultsModal.result.data?.length || 0} results • 
                      Executed at {fullResultsModal.result.executedAt ? new Date(fullResultsModal.result.executedAt).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                  <button
                    onClick={() => setFullResultsModal({ show: false, result: null })}
                    className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="flex-1 overflow-auto p-6">
                {/* Generated SQL */}
                {fullResultsModal.result.generatedSQL && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">SQL</span>
                      Generated Query
                    </h4>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{fullResultsModal.result.generatedSQL}</pre>
                    </div>
                  </div>
                )}
                
                {/* Description */}
                {fullResultsModal.result.description && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{fullResultsModal.result.description}</p>
                  </div>
                )}
                
                {/* Full Results Table */}
                {fullResultsModal.result.data && fullResultsModal.result.data.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Complete Results</h4>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto max-h-96">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-r border-gray-200">
                                #
                              </th>
                              {Object.keys(fullResultsModal.result.data[0]).map(key => (
                                <th key={key} className="px-4 py-3 text-left font-semibold text-gray-700 capitalize border-r border-gray-200 last:border-r-0">
                                  {key.replace(/_/g, ' ')}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {fullResultsModal.result.data.map((row: Record<string, any>, rowIndex: number) => (
                              <tr key={rowIndex} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-500 font-medium border-r border-gray-200">
                                  {rowIndex + 1}
                                </td>
                                {Object.entries(row).map(([key, value], colIndex) => (
                                  <td key={colIndex} className="px-4 py-3 text-gray-900 border-r border-gray-200 last:border-r-0">
                                    {(() => {
                                      if (value === null || value === undefined) return 'N/A';
                                      if (typeof value === 'number') {
                                        if (key.toLowerCase().includes('value') || key.toLowerCase().includes('price')) {
                                          return new Intl.NumberFormat('en-US', { 
                                            style: 'currency', 
                                            currency: 'USD' 
                                          }).format(value);
                                        }
                                        if (key.toLowerCase().includes('progress') || key.toLowerCase().includes('rate')) {
                                          return value + '%';
                                        }
                                        return value.toLocaleString();
                                      }
                                      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
                                        return new Date(value).toLocaleDateString();
                                      }
                                      return String(value);
                                    })()}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Export Options */}
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (!fullResultsModal.result?.data || fullResultsModal.result.data.length === 0) return;
                          const csv = [Object.keys(fullResultsModal.result.data[0]).join(',')];
                          fullResultsModal.result.data.forEach((row: Record<string, any>) => {
                            csv.push(Object.values(row).join(','));
                          });
                          const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'query-results.csv';
                          a.click();
                        }}
                        className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        📄 Export CSV
                      </button>
                      <button
                        onClick={() => {
                          if (!fullResultsModal.result?.data) return;
                          navigator.clipboard.writeText(JSON.stringify(fullResultsModal.result.data, null, 2));
                          alert('Results copied to clipboard!');
                        }}
                        className="text-sm bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        📋 Copy JSON
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No data to display</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Exchanges;