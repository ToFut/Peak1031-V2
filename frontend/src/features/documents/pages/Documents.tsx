import React, { useState, useMemo } from 'react';
import EnterpriseDocumentManager from '../components/EnterpriseDocumentManager';
import EnterpriseDocumentTemplateManager from '../components/EnterpriseDocumentTemplateManager';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { useDocuments, useExchanges } from '../../../hooks/useCachedData';
import { LazyGrid, LazyTable } from '../../../components/ui/LazyLoader';
import {
  FolderIcon,
  DocumentIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [showEnterpriseManager, setShowEnterpriseManager] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { user } = useAuth();
  const { isAdmin, isCoordinator } = usePermissions();

  const canManage = isAdmin() || isCoordinator();

  const loadDocuments = useCallback(async () => {
    try {
    setLoading(true);
    setError(null);
    
    const endpoint = filter !== 'all' ? `/documents?category=${filter}` : '/documents';
    const response = await apiService.get(endpoint);
    setDocuments(response.data || response.documents || response || []);
    } catch (err: any) {
    console.error('Error loading documents:', err);
    setError(err.message || 'Failed to load documents');
    } finally {
    setLoading(false);
    }
  }, [filter]);

  const loadExchanges = useCallback(async () => {
    try {
    const response = await apiService.get('/exchanges');
    setExchanges(response.exchanges || []);
    } catch (err: any) {
    console.error('Error loading exchanges:', err);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    loadExchanges();
  }, [loadDocuments, loadExchanges]);

  // Professional document stats
  const documentStats = {
    total: documents.length,
    byCategory: documents.reduce((acc: any, doc) => {
    acc[doc.category || 'general'] = (acc[doc.category || 'general'] || 0) + 1;
    return acc;
    }, {}),
    totalSize: documents.reduce((acc, doc) => acc + (doc.fileSize || doc.file_size || 0), 0),
    recentUploads: documents.filter(doc => {
    const uploadDate = new Date(doc.createdAt || doc.created_at);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return uploadDate > sevenDaysAgo;
    }).length
  };

  const getDocumentIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
    case 'pdf':
      return (
        <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    case 'doc':
    case 'docx':
      return (
        <svg className="h-8 w-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    case 'xls':
    case 'xlsx':
      return (
        <svg className="h-8 w-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    default:
      return (
        <svg className="h-8 w-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
    case 'contract': return 'bg-blue-100 text-blue-800';
    case 'financial': return 'bg-green-100 text-green-800';
    case 'legal': return 'bg-purple-100 text-purple-800';
    case 'identification': return 'bg-yellow-100 text-yellow-800';
    case 'deed': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchTerm === '' || 
    (doc.fileName || doc.filename || doc.original_filename || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || doc.category === filter;
    
    return matchesSearch && matchesFilter;
  });


  if (loading) {
    return (
    
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
          ))}
        </div>
      </div>
    
    );
  }

  // Header content with contextual information
  const headerContent = (
    <div className="flex items-center space-x-6">
    <div className="flex items-center space-x-2">
      <FolderIcon className="w-5 h-5 text-gray-400" />
      <span className="text-sm text-gray-600">
        <span className="font-semibold text-gray-900">{documentStats.total}</span> documents
      </span>
    </div>
    <div className="h-4 w-px bg-gray-300" />
    <div className="flex items-center space-x-2">
      <ChartBarIcon className="w-5 h-5 text-gray-400" />
      <span className="text-sm text-gray-600">
        <span className="font-semibold text-gray-900">{formatFileSize(documentStats.totalSize)}</span> total
      </span>
    </div>
    <div className="h-4 w-px bg-gray-300" />
    <div className="flex items-center space-x-2">
      <CalendarIcon className="w-5 h-5 text-gray-400" />
      <span className="text-sm text-gray-600">
        <span className="font-semibold text-emerald-600">{documentStats.recentUploads}</span> new this week
      </span>
    </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Professional Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl px-8 py-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl">
              <FolderIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Document Management</h1>
              <p className="text-emerald-100 mt-1">Centralized storage and collaboration platform</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90">Total Documents</div>
            <div className="text-3xl font-bold">{documentStats.total}</div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Storage</p>
              <p className="text-2xl font-bold text-emerald-600">{formatFileSize(documentStats.totalSize)}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <ChartBarIcon className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent (7d)</p>
              <p className="text-2xl font-bold text-blue-600">{documentStats.recentUploads}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-purple-600">{Object.keys(documentStats.byCategory).length}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <TagIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Exchanges</p>
              <p className="text-2xl font-bold text-orange-600">{exchanges.length}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <BuildingOfficeIcon className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Professional Controls */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-80"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Categories</option>
              <option value="contract">Contracts</option>
              <option value="financial">Financial</option>
              <option value="legal">Legal</option>
              <option value="identification">Identification</option>
              <option value="deed">Deeds</option>
              <option value="appraisal">Appraisals</option>
              <option value="inspection">Inspections</option>
            </select>
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {viewMode === 'grid' ? 'List View' : 'Grid View'}
            </button>
          </div>
          <div className="flex items-center space-x-3">
            {canManage && (
              <>
                <button
                  onClick={() => setShowTemplateManager(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ClipboardDocumentListIcon className="w-5 h-5" />
                  <span>Templates</span>
                </button>
                <button
                  onClick={() => setShowEnterpriseManager(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <CloudArrowUpIcon className="w-5 h-5" />
                  <span>Upload & Manage</span>
                </button>
              </>
            )}
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="ml-3 text-sm text-red-700 font-medium">{error}</p>
          </div>
          <button
            onClick={loadDocuments}
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Professional Document Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDocuments.map((document) => (
            <div key={document.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-all group">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-shrink-0">
                    {getDocumentIcon(document.fileName || document.filename || document.original_filename)}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium text-gray-900 truncate" title={document.fileName || document.filename || document.original_filename}>
                      {document.fileName || document.filename || document.original_filename}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(document.fileSize || document.file_size || 0)}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(document.category)}`}>
                      {document.category || 'General'}
                    </span>
                    <div className="text-xs text-gray-500">
                      {new Date(document.createdAt || document.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {document.exchange && (
                    <div className="flex items-center text-sm text-gray-600">
                      <BuildingOfficeIcon className="w-4 h-4 mr-2" />
                      <span className="truncate">{document.exchange.name || document.exchange.exchangeName}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border-t border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button className="flex items-center space-x-1 text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                    <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium">
                      <EyeIcon className="w-4 h-4" />
                      <span>View</span>
                    </button>
                  </div>
                  {canManage && (
                    <button className="text-red-600 hover:text-red-700 p-1">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exchange</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {getDocumentIcon(document.fileName || document.filename || document.original_filename)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                            {document.fileName || document.filename || document.original_filename}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(document.category)}`}>
                        {document.category || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {document.exchange ? (document.exchange.name || document.exchange.exchangeName) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(document.fileSize || document.file_size || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(document.createdAt || document.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button className="text-emerald-600 hover:text-emerald-900 p-1">
                          <ArrowDownTrayIcon className="w-4 h-4" />
                        </button>
                        <button className="text-blue-600 hover:text-blue-900 p-1">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        {canManage && (
                          <button className="text-red-600 hover:text-red-900 p-1">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredDocuments.length === 0 && !loading && (
        <div className="text-center py-16 bg-white rounded-xl border">
          <FolderIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filter !== 'all' 
              ? 'Try adjusting your search or filter criteria' 
              : 'Get started by uploading your first document'}
          </p>
          {canManage && (
            <button
              onClick={() => setShowEnterpriseManager(true)}
              className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
            >
              <CloudArrowUpIcon className="w-5 h-5 mr-2" />
              Upload Documents
            </button>
          )}
        </div>
      )}
    </div>

    {/* Enterprise Document Manager */}
    <EnterpriseDocumentManager
      isOpen={showEnterpriseManager}
      onClose={() => setShowEnterpriseManager(false)}
      onDocumentChange={() => {
        loadDocuments();
      }}
    />

    {/* Enterprise Document Template Manager */}
    <EnterpriseDocumentTemplateManager
      isOpen={showTemplateManager}
      onClose={() => setShowTemplateManager(false)}
      onTemplateChange={() => {
        loadDocuments();
      }}
    />
      </div>
  );
};

export default Documents;