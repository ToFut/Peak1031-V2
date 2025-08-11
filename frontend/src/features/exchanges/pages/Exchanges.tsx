import React, { useState } from 'react';
import { ExchangeList } from '../components/ExchangeList';
import { useAuth } from '../../../hooks/useAuth';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { Sparkles, BarChart3, Table, TrendingUp, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

const Exchanges: React.FC = () => {
  const { user } = useAuth();
  const [smartMode, setSmartMode] = useState(true); // Enable smart mode by default
  const [showAnalysis, setShowAnalysis] = useState(user?.role === 'admin');
  const [aiQuery, setAiQuery] = useState('');
  
  // Get analytics data when in smart mode
  const analytics = useAnalytics({
    enableAutoRefresh: smartMode && showAnalysis,
    refreshInterval: 300000 // 5 minutes
  });

  const handleAIQuery = async () => {
    if (!aiQuery.trim()) return;
    
    try {
      const result = await analytics.executeAIQuery(aiQuery);
      console.log('AI Query Result:', result);
      // Result will be displayed in the analytics hook state
    } catch (error) {
      console.error('AI Query failed:', error);
    }
  };

  const handleClassicQuery = async (queryKey: string) => {
    try {
      const result = await analytics.executeClassicQuery(queryKey);
      console.log('Classic Query Result:', result);
      // Result will be displayed in the analytics hook state
    } catch (error) {
      console.error('Classic Query failed:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Mode Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exchange Management</h1>
          <p className="text-gray-600 mt-1">
            {smartMode ? 'Smart mode with enhanced analytics and AI insights' : 'Classic view with basic functionality'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {(user?.role === 'admin' || user?.role === 'coordinator') && (
            <>
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  showAnalysis
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                AI Analysis
              </button>

              <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                <button
                  onClick={() => setSmartMode(false)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    !smartMode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Table className="h-4 w-4" />
                  Classic
                </button>
                <button
                  onClick={() => setSmartMode(true)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    smartMode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  Smart
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI Analytics Panel */}
      {showAnalysis && smartMode && (user?.role === 'admin' || user?.role === 'coordinator') && (
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              AI Analytics & Query Interface
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                AI Mode Active
              </div>
            </div>
          </div>

          {/* Financial Overview Cards */}
          {analytics.financialOverview && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Value</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {analytics.formatValue(analytics.financialOverview.totalValue.exchange || analytics.financialOverview.totalValue.relinquished)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-green-900">
                      {analytics.financialOverview.performanceMetrics.completionRate}%
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">High Risk</p>
                    <p className="text-2xl font-bold text-red-900">
                      {analytics.financialOverview.riskAnalysis.high}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Total Exchanges</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {analytics.financialOverview.performanceMetrics.totalExchanges.toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>
          )}

          {/* AI Query Interface */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-3">Natural Language Query</h4>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Ask about your exchanges... e.g., 'How many high-value exchanges are approaching their 45-day deadline?'"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAIQuery()}
                />
              </div>
              <button
                onClick={handleAIQuery}
                disabled={analytics.queryLoading || !aiQuery.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {analytics.queryLoading ? 'Analyzing...' : 'Ask AI'}
              </button>
            </div>
          </div>

          {/* Classic Query Buttons */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-3">Quick Analytics</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleClassicQuery('total_exchange_value')}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              >
                Total Exchange Value
              </button>
              <button
                onClick={() => handleClassicQuery('active_exchanges_by_coordinator')}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              >
                Active by Coordinator
              </button>
              <button
                onClick={() => handleClassicQuery('upcoming_deadlines')}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              >
                Upcoming Deadlines
              </button>
              <button
                onClick={() => handleClassicQuery('high_value_exchanges')}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              >
                High Value Exchanges
              </button>
            </div>
          </div>

          {/* Query Results */}
          {analytics.queryResults && analytics.queryResults.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">Recent Query Results</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {analytics.queryResults.slice(0, 3).map((result, index) => (
                  <div key={index} className="bg-gray-50 border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-gray-900">
                        {result.queryName || result.originalQuery || 'Query Result'}
                      </h5>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        {result.queryType === 'ai_generated' ? 'AI Query' : 'Query Result'}
                      </span>
                    </div>
                    {result.description && (
                      <p className="text-sm text-gray-600 mb-2">{result.description}</p>
                    )}
                    <div className="text-sm">
                      {result.data && result.data.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead className="bg-gray-100">
                              <tr>
                                {Object.keys(result.data[0]).map(key => (
                                  <th key={key} className="px-2 py-1 text-left font-medium text-gray-700 capitalize">
                                    {key.replace(/_/g, ' ')}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {result.data.slice(0, 3).map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-t border-gray-200">
                                  {Object.values(row).map((value, colIndex) => (
                                    <td key={colIndex} className="px-2 py-1 text-gray-900">
                                      {String(value).length > 30 ? `${String(value).substring(0, 30)}...` : String(value)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {result.data.length > 3 && (
                            <p className="text-xs text-gray-500 mt-2">
                              Showing 3 of {result.data.length} results...
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No data returned</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analytics.queryError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{analytics.queryError}</p>
            </div>
          )}
        </div>
      )}

      {/* Exchange List with Smart Features */}
      <ExchangeList 
        title={smartMode ? "Smart Exchange Management" : "All Exchanges"}
        showCreateButton={true}
        showFilters={true}
        showSearch={true}
        showStats={true}
        enableSmartMode={smartMode}
        showAIAnalysis={showAnalysis}
      />
    </div>
  );
};

export default Exchanges;