/**
 * Enhanced Document Manager
 * Includes versioning, sharing, bulk operations, and advanced search
 */

import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  ShareIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  CheckIcon,
  XMarkIcon,
  CloudArrowDownIcon,
  UsersIcon,
  LockClosedIcon,
  LinkIcon,
  ArrowPathIcon,
  BuildingOfficeIcon,
  UserIcon,
  CloudArrowUpIcon,
  FolderIcon,
  FolderOpenIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { DocumentUploader } from '../../../components/shared';

interface DocumentVersion {
  id: string;
  version: number;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  size: number;
  changes?: string;
}

interface ShareSettings {
  email?: string;
  permissions: 'view' | 'download' | 'edit';
  expiresAt?: string;
  password?: string;
}

interface Document {
  id: string;
  fileName: string;
  category: string;
  exchangeId: string;
  uploadedBy: string;
  uploadedAt: string;
  size: number;
  status: string;
  versions?: number;
}

const EnhancedDocumentManager: React.FC<{ exchangeId?: string }> = ({ exchangeId }) => {
  const { user } = useAuth();
  const { isAdmin, isCoordinator, isClient } = usePermissions();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showVersions, setShowVersions] = useState<string | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    permissions: 'view'
  });
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [activeTab, setActiveTab] = useState<'documents' | 'versions' | 'shared'>('documents');
  const [filterBy, setFilterBy] = useState<'all' | 'user' | 'exchange' | 'thirdparty'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedExchangeId, setSelectedExchangeId] = useState<string>(exchangeId || '');
  const [users, setUsers] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [showFolderView, setShowFolderView] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  
  const categories = ['all', 'contract', 'financial', 'legal', 'identification', 'deed', 'other'];

  useEffect(() => {
    loadDocuments();
    loadFolders();
    if (isAdmin()) {
      loadUsers();
      loadExchanges();
    } else if (isClient() || isCoordinator()) {
      // Non-admin users also need to load their exchanges
      loadExchanges();
    }
  }, [exchangeId, filterBy, selectedUserId, selectedExchangeId]);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, selectedCategory, selectedFolderId]);

  const loadDocuments = async () => {
    setIsLoading(true);
    let response: any;
    
    try {
      if (exchangeId || selectedExchangeId) {
        // Load all documents for the specific exchange
        const targetExchangeId = exchangeId || selectedExchangeId;
        response = await apiService.get(`/documents/exchange/${targetExchangeId}`);
      } else {
        // Load all documents if no exchange is specified
        response = await apiService.getDocuments();
      }
      
      // Handle different response formats and map to expected structure
      let rawDocs = [];
      if (Array.isArray(response)) {
        rawDocs = response;
      } else if (response && typeof response === 'object') {
        rawDocs = response.documents || response.data || [];
      }
      
      // Map backend response to frontend expected format
      const mappedDocs = rawDocs.map((doc: any) => ({
        id: doc.id,
        fileName: doc.original_filename || doc.originalFilename || doc.fileName || 'Unnamed Document',
        category: doc.category || 'general',
        uploadedBy: doc.uploaded_by || doc.uploadedBy,
        uploadedAt: doc.created_at || doc.createdAt || doc.uploadedAt,
        size: doc.file_size || doc.fileSize || 0,
        status: doc.status || 'active',
        pinRequired: doc.pin_required || doc.pinRequired || false,
        exchangeId: doc.exchange_id || doc.exchangeId,
        filePath: doc.file_path || doc.filePath,
        mimeType: doc.mime_type || doc.mimeType,
        // Additional properties for compatibility
        originalFilename: doc.original_filename || doc.originalFilename,
        fileSize: doc.file_size || doc.fileSize,
        // Keep all original properties
        ...doc
      }));
      
      console.log('📄 Loaded documents:', mappedDocs.length);
      setDocuments(mappedDocs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiService.getUsers();
      // getUsers returns User[] directly
      setUsers(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    }
  };

  const loadExchanges = async () => {
    try {
      const response = await apiService.getExchanges();
      // getExchanges returns Exchange[] directly
      setExchanges(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load exchanges:', error);
      setExchanges([]);
    }
  };

  const loadFolders = async () => {
    try {
      const targetExchangeId = exchangeId || selectedExchangeId;
      if (targetExchangeId) {
        const response = await apiService.get(`/folders?exchange_id=${targetExchangeId}`);
        const foldersData = Array.isArray(response) ? response : (response.data || response.folders || []);
        console.log('📁 Loaded folders:', foldersData.length);
        setFolders(foldersData);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
      setFolders([]);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category?.toLowerCase() === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by selected folder
    if (selectedFolderId) {
      filtered = filtered.filter(doc => {
        const docAny = doc as any;
        return docAny.folderId === selectedFolderId || docAny.folder_id === selectedFolderId;
      });
    }

    setFilteredDocuments(filtered);
  };

  const loadDocumentVersions = async (documentId: string) => {
    try {
      const response = await apiService.getDocumentVersions(documentId);
      setVersions(response.versions || []);
      setShowVersions(documentId);
    } catch (error: any) {
      console.error('Failed to load document versions:', error);
      // For now, versions feature is not implemented in the backend
      // Show empty versions to prevent errors
      setVersions([]);
      setShowVersions(documentId);
    }
  };

  const handleShare = async (documentId: string) => {
    try {
      const response = await apiService.shareDocument(documentId, shareSettings);
      
      // Copy share link to clipboard
      if (response.shareLink) {
        navigator.clipboard.writeText(response.shareLink);
        alert('Share link copied to clipboard!');
      }
      
      setShowShareModal(null);
      setShareSettings({ permissions: 'view' });
    } catch (error) {
      console.error('Failed to share document:', error);
      alert('Failed to share document. Please try again.');
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const blob = await apiService.downloadDocument(document.id);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = document.fileName;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download document:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await apiService.delete(`/documents/${documentId}`);
      alert('Document deleted successfully');
      loadDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const handlePreview = (document: Document) => {
    // Create a preview modal or open in new tab
    const previewUrl = `${process.env.REACT_APP_API_URL || window.location.origin + '/api'}/documents/${document.id}/preview`;
    window.open(previewUrl, '_blank');
  };

  const handleVersionDownload = async (version: DocumentVersion) => {
    try {
      const blob = await apiService.downloadDocument(version.id);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = version.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert(`Downloaded ${version.fileName} successfully`);
    } catch (error) {
      console.error('Error downloading version:', error);
      alert('Failed to download version. Please try again.');
    }
  };

  const handleVersionPreview = (version: DocumentVersion) => {
    // Create a preview modal or open in new tab for version
    const previewUrl = `${process.env.REACT_APP_API_URL || window.location.origin + '/api'}/documents/${version.id}/preview`;
    window.open(previewUrl, '_blank');
  };

  const handleBulkOperation = async (operation: 'delete' | 'move' | 'tag') => {
    if (selectedDocuments.length === 0) {
      alert('Please select documents first');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${operation} ${selectedDocuments.length} document(s)?`
    );
    
    if (!confirmed) return;

    try {
      let data: any = { documentIds: selectedDocuments };
      
      if (operation === 'move') {
        const targetExchange = prompt('Enter target exchange ID:');
        if (!targetExchange) return;
        data.targetExchangeId = targetExchange;
      } else if (operation === 'tag') {
        const tags = prompt('Enter tags (comma-separated):');
        if (!tags) return;
        data.tags = tags.split(',').map(t => t.trim());
      }

      const response = await apiService.bulkDocumentOperation(operation, data);
      
      if (response.success > 0) {
        alert(`Successfully processed ${response.success} documents`);
        loadDocuments();
        setSelectedDocuments([]);
      }
      
      if (response.failed > 0) {
        alert(`Failed to process ${response.failed} documents`);
      }
    } catch (error) {
      console.error('Bulk operation failed:', error);
      alert('Bulk operation failed. Please try again.');
    }
  };

  const handleAdvancedSearch = async () => {
    const searchParams = prompt('Enter search filters (JSON format):');
    if (!searchParams) return;

    try {
      const filters = JSON.parse(searchParams);
      const response = await apiService.searchDocuments(searchTerm, filters);
      setDocuments(response.documents || []);
    } catch (error) {
      console.error('Advanced search failed:', error);
      alert('Advanced search failed. Please check your search parameters.');
    }
  };

  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const selectAllDocuments = () => {
    setSelectedDocuments(
      selectedDocuments.length === filteredDocuments.length
        ? []
        : filteredDocuments.map(doc => doc.id)
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Document Manager
            </h1>
            {/* Show current filter context */}
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              {isAdmin() && filterBy !== 'all' && (
                <span>
                  Filtering by: <span className="font-medium capitalize">{filterBy}</span>
                  {filterBy === 'user' && selectedUserId && ` (User ID: ${selectedUserId})`}
                  {filterBy === 'exchange' && selectedExchangeId && ` (Exchange ID: ${selectedExchangeId})`}
                  {filterBy === 'thirdparty' && selectedUserId && ` (Third Party ID: ${selectedUserId})`}
                </span>
              )}
              {!isAdmin() && selectedExchangeId && (
                <span>Exchange: <span className="font-medium">{exchanges.find(e => e.id === selectedExchangeId)?.name || selectedExchangeId}</span></span>
              )}
              <span>{filteredDocuments.length} documents</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {selectedDocuments.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedDocuments.length} selected
                </span>
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200"
                >
                  Bulk Actions
                </button>
              </div>
            )}
            <button
              onClick={() => setShowFolderView(!showFolderView)}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                showFolderView 
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={showFolderView ? 'Hide folders' : 'Show folders'}
            >
              {showFolderView ? (
                <FolderOpenIcon className="h-4 w-4 mr-2" />
              ) : (
                <FolderIcon className="h-4 w-4 mr-2" />
              )}
              Folders
            </button>
            <DocumentUploader
              exchangeId={selectedExchangeId || exchangeId}
              onUploadSuccess={() => {
                loadDocuments(); // Refresh the document list
              }}
              compact={true}
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'documents', label: 'Documents', icon: DocumentTextIcon },
              { key: 'versions', label: 'Version History', icon: ClockIcon },
              { key: 'shared', label: 'Shared Links', icon: ShareIcon }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
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

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Admin Filtering Options */}
        {isAdmin() && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Filter by:</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilterBy('all')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    filterBy === 'all' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  All Documents
                </button>
                <button
                  onClick={() => setFilterBy('user')}
                  className={`px-3 py-1 rounded-md text-sm flex items-center ${
                    filterBy === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <UserIcon className="h-4 w-4 mr-1" />
                  By User
                </button>
                <button
                  onClick={() => setFilterBy('exchange')}
                  className={`px-3 py-1 rounded-md text-sm flex items-center ${
                    filterBy === 'exchange' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                  By Exchange
                </button>
                <button
                  onClick={() => setFilterBy('thirdparty')}
                  className={`px-3 py-1 rounded-md text-sm flex items-center ${
                    filterBy === 'thirdparty' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <UsersIcon className="h-4 w-4 mr-1" />
                  By Third Party
                </button>
              </div>
              
              {/* Conditional Selectors */}
              {filterBy === 'user' && (
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select User</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email} ({user.role})
                    </option>
                  ))}
                </select>
              )}
              
              {filterBy === 'exchange' && (
                <select
                  value={selectedExchangeId}
                  onChange={(e) => setSelectedExchangeId(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Exchange</option>
                  {exchanges.map(exchange => (
                    <option key={exchange.id} value={exchange.id}>
                      {exchange.name || exchange.exchangeName}
                    </option>
                  ))}
                </select>
              )}
              
              {filterBy === 'thirdparty' && (
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Third Party</option>
                  {users.filter(u => u.role === 'third_party').map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* User Exchange Filter */}
        {!isAdmin() && (isClient() || isCoordinator()) && exchanges && exchanges.length > 0 && (
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Select Exchange:</label>
            <select
              value={selectedExchangeId || exchangeId || ''}
              onChange={(e) => setSelectedExchangeId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All My Exchanges</option>
              {exchanges.map(exchange => (
                <option key={exchange.id} value={exchange.id}>
                  {exchange.name || exchange.exchangeName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-lg relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>

          <button
            onClick={handleAdvancedSearch}
            className="flex items-center px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Advanced Search
          </button>
        </div>

        {/* Bulk Actions Panel */}
        {showBulkActions && selectedDocuments.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-blue-900">
                Bulk Actions ({selectedDocuments.length} documents)
              </h3>
              <button
                onClick={() => setShowBulkActions(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => handleBulkOperation('delete')}
                className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => handleBulkOperation('move')}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                Move
              </button>
              <button
                onClick={() => handleBulkOperation('tag')}
                className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
              >
                Tag
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          {/* Folder View */}
          {showFolderView && folders.length > 0 && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Folders</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {folders.map((folder: any) => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id === selectedFolderId ? null : folder.id)}
                    className={`flex items-center p-3 rounded-lg border transition-colors ${
                      selectedFolderId === folder.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <FolderIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span className="text-sm truncate">{folder.name || 'Unnamed Folder'}</span>
                    <span className="ml-auto text-xs text-gray-500">
                      ({folder.document_count || 0})
                    </span>
                  </button>
                ))}
              </div>
              {selectedFolderId && (
                <button
                  onClick={() => setSelectedFolderId(null)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear folder filter
                </button>
              )}
            </div>
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredDocuments.length > 0 ? (
            <>
              {/* Select All Checkbox */}
              <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedDocuments.length === filteredDocuments.length}
                    onChange={selectAllDocuments}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Select All ({filteredDocuments.length})
                  </span>
                </label>
              </div>

              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map(document => (
                    <tr key={document.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedDocuments.includes(document.id)}
                          onChange={() => toggleDocumentSelection(document.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-6 w-6 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {document.fileName}
                            </div>
                            {document.uploadedBy && (
                              <div className="text-xs text-gray-500">
                                By: {document.uploadedBy}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(document.category)}`}>
                          {document.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatFileSize(document.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(document.uploadedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => loadDocumentVersions(document.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Versions"
                          >
                            <ClockIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setShowShareModal(document.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Share Document"
                          >
                            <ShareIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(document)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Download"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(document.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No documents found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      )}

      {/* Version History Modal */}
      {showVersions && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-3/4 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Document Version History</h3>
              <button
                onClick={() => setShowVersions(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {versions.map(version => (
                    <tr key={version.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        v{version.version}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {version.fileName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {version.uploadedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(version.uploadedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(version.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          onClick={() => handleVersionDownload(version)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Download Version"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleVersionPreview(version)}
                          className="text-green-600 hover:text-green-900"
                          title="Preview Version"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Share Document</h3>
              <button
                onClick={() => setShowShareModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (optional)
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={shareSettings.email || ''}
                  onChange={(e) => setShareSettings({...shareSettings, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permissions
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={shareSettings.permissions}
                  onChange={(e) => setShareSettings({...shareSettings, permissions: e.target.value as any})}
                >
                  <option value="view">View Only</option>
                  <option value="download">View & Download</option>
                  <option value="edit">View, Download & Edit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expires At (optional)
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={shareSettings.expiresAt || ''}
                  onChange={(e) => setShareSettings({...shareSettings, expiresAt: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password Protection (optional)
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={shareSettings.password || ''}
                  onChange={(e) => setShareSettings({...shareSettings, password: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowShareModal(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleShare(showShareModal)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Create Share Link
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EnhancedDocumentManager;