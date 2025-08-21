import React, { useState, useEffect } from 'react';
import { EnhancedDocumentManager } from '../components';
import EnterpriseDocumentTemplateManager from '../components/EnterpriseDocumentTemplateManager';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { apiService } from '../../../services/api';
import {
  DocumentIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  FolderIcon,
  CalendarIcon,
  TagIcon,
  BuildingOfficeIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface Exchange {
  id: string;
  name: string;
  exchangeNumber?: string;
  status: string;
}

const Documents: React.FC = () => {
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [selectedExchangeId, setSelectedExchangeId] = useState<string>('');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [isLoadingExchanges, setIsLoadingExchanges] = useState(true);
  const [documentStats, setDocumentStats] = useState({
    totalDocuments: 0,
    totalFolders: 0,
    totalCategories: 0,
    recentDocuments: 0
  });
  
  const { user } = useAuth();
  const { isAdmin, isCoordinator } = usePermissions();
  const canManage = isAdmin() || isCoordinator();

  // Load exchanges for the user
  useEffect(() => {
    loadExchanges();
  }, []);

  // Load document statistics
  useEffect(() => {
    loadDocumentStats();
  }, [selectedExchangeId]);

  const loadExchanges = async () => {
    try {
      setIsLoadingExchanges(true);
      const response: any = await apiService.getExchanges();
      
      // Handle different response formats
      let exchangeData: Exchange[] = [];
      if (Array.isArray(response)) {
        exchangeData = response;
      } else if (response && typeof response === 'object' && 'data' in response) {
        exchangeData = response.data || [];
      } else if (response && typeof response === 'object') {
        // If response is an object but doesn't have data property, try to use it directly
        const flattened = (Object.values(response).filter((item: unknown) =>
          Array.isArray(item) && (item as any[]).length > 0 && (item as any[])[0]?.id
        ).flat() as unknown[]) || [];
        exchangeData = flattened as Exchange[];
      }
      
      setExchanges(exchangeData);
      
      // Auto-select first exchange if available
      if (exchangeData.length > 0 && !selectedExchangeId) {
        setSelectedExchangeId(exchangeData[0].id);
      }
    } catch (error) {
      console.error('Error loading exchanges:', error);
      setExchanges([]);
    } finally {
      setIsLoadingExchanges(false);
    }
  };

  const loadDocumentStats = async () => {
    try {
      let response: any;
      if (selectedExchangeId) {
        // Get stats for specific exchange
        response = await apiService.get(`/documents/exchange/${selectedExchangeId}/stats`);
      } else {
        // Get global stats
        response = await apiService.get('/documents/stats');
      }
      
      // Handle different response formats
      const stats = response?.data || response || {};
      
      setDocumentStats({
        totalDocuments: stats.totalDocuments || 0,
        totalFolders: stats.totalFolders || 0,
        totalCategories: stats.totalCategories || 0,
        recentDocuments: stats.recentDocuments || 0
      });
    } catch (error) {
      console.error('Error loading document stats:', error);
      // Set default values on error
      setDocumentStats({
        totalDocuments: 0,
        totalFolders: 0,
        totalCategories: 0,
        recentDocuments: 0
      });
    }
  };

  const getExchangeDisplayName = (exchange: Exchange) => {
    return exchange.name || exchange.exchangeNumber || `Exchange ${exchange.id.slice(0, 8)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      {/* Professional Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Document Management
              </h1>
              <p className="text-gray-600 text-lg">
                Secure document storage and management for your 1031 exchanges
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {canManage && (
                <button
                  onClick={() => setShowTemplateManager(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ClipboardDocumentListIcon className="w-5 h-5" />
                  <span>Templates</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Exchange Selection */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Select Exchange</h2>
            {isLoadingExchanges && (
              <div className="text-sm text-gray-500">Loading exchanges...</div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <select
                value={selectedExchangeId}
                onChange={(e) => setSelectedExchangeId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoadingExchanges}
              >
                <option value="">All Exchanges</option>
                {exchanges.map((exchange) => (
                  <option key={exchange.id} value={exchange.id}>
                    {getExchangeDisplayName(exchange)} ({exchange.status})
                  </option>
                ))}
              </select>
            </div>
            
            {selectedExchangeId && (
              <div className="text-sm text-gray-600">
                Managing documents for: {exchanges.find(e => e.id === selectedExchangeId)?.name || 'Selected Exchange'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">{documentStats.totalDocuments}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <DocumentIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Folders</p>
                <p className="text-2xl font-bold text-blue-600">{documentStats.totalFolders}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <FolderIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-purple-600">{documentStats.totalCategories}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <TagIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent (7d)</p>
                <p className="text-2xl font-bold text-orange-600">{documentStats.recentDocuments}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <CalendarIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Document Manager */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <EnhancedDocumentManager 
          exchangeId={selectedExchangeId}
          key={selectedExchangeId} // Force re-render when exchange changes
        />
      </div>

      {/* Template Manager Modal */}
      <EnterpriseDocumentTemplateManager
        isOpen={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
        onTemplateChange={() => {
          // Refresh will be handled by EnhancedDocumentManager
        }}
      />
    </div>
  );
};

export default Documents;