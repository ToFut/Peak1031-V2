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
import { EnhancedDocumentUploader } from '../../../components/shared/EnhancedDocumentUploader';
import { SearchableDropdown } from '../../../components/ui/SearchableDropdown';

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
  pinRequired?: boolean;
  pinProtected?: boolean;
}

const EnhancedDocumentManager: React.FC<{ exchangeId?: string }> = ({ exchangeId }) => {
  const { } = useAuth();
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
  const [showPinModal, setShowPinModal] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifiedDocuments, setVerifiedDocuments] = useState<Set<string>>(new Set());
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentActions, setShowDocumentActions] = useState(false);
  const [pendingAction, setPendingAction] = useState<'view' | 'download' | null>(null);
  
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

    // Filter by selected folder (virtual folders based on categories)
    if (selectedFolderId) {
      // Extract category from virtual folder ID
      if (selectedFolderId.startsWith('virtual-')) {
        const parts = selectedFolderId.split('-');
        if (parts.length >= 3) {
          const category = parts.slice(2).join('-'); // Handle categories with hyphens
          
          filtered = filtered.filter(doc => {
            const docCategory = (doc.category || 'general').toLowerCase();
            
            if (category === 'general') {
              // For general folder, include documents with null/empty/general category
              return docCategory === 'general' || docCategory === '' || !doc.category;
            } else {
              // For specific categories, match exactly
              return docCategory === category.toLowerCase();
            }
          });
        }
      } else {
        // Handle real folder IDs (when folders table exists)
        filtered = filtered.filter(doc => {
          const docAny = doc as any;
          return docAny.folderId === selectedFolderId || docAny.folder_id === selectedFolderId;
        });
      }
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
    // Check if document requires PIN and is not verified
    console.log('📄 Document PIN check:', {
      id: document.id,
      fileName: document.fileName,
      pinRequired: document.pinRequired,
      pinProtected: document.pinProtected,
      isVerified: verifiedDocuments.has(document.id)
    });
    
    if ((document.pinRequired || document.pinProtected) && !verifiedDocuments.has(document.id)) {
      console.log('🔒 Opening PIN modal for document:', document.id);
      setPendingAction('download');
      setShowPinModal(document.id);
      return;
    }

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
    // Check if document requires PIN and is not verified
    console.log('👁️ Preview PIN check:', {
      id: document.id,
      fileName: document.fileName,
      pinRequired: document.pinRequired,
      pinProtected: document.pinProtected,
      isVerified: verifiedDocuments.has(document.id)
    });
    
    if ((document.pinRequired || document.pinProtected) && !verifiedDocuments.has(document.id)) {
      console.log('🔒 Opening PIN modal for document:', document.id);
      setPendingAction('view');
      setShowPinModal(document.id);
      return;
    }

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

  const handlePinVerification = async (documentId: string) => {
    if (pin.length !== 4) {
      setPinError('PIN must be 4 digits');
      return;
    }

    console.log('🔐 Verifying PIN for document:', documentId, 'PIN:', pin);

    try {
      // Call API to verify PIN
      const response = await apiService.verifyDocumentPin(documentId, pin);
      console.log('🔐 PIN verification response:', response);
      
      if (response.success) {
        console.log('✅ PIN verified successfully');
        setVerifiedDocuments(prev => new Set(prev.add(documentId)));
        setShowPinModal(null);
        setPin('');
        setPinError('');
        
        // Continue with the pending action
        if (pendingAction === 'view') {
          const document = documents.find(d => d.id === documentId);
          if (document) {
            const previewUrl = `${process.env.REACT_APP_API_URL || window.location.origin + '/api'}/documents/${document.id}/preview`;
            window.open(previewUrl, '_blank');
          }
        } else if (pendingAction === 'download') {
          const document = documents.find(d => d.id === documentId);
          if (document) {
            handleDownload(document);
          }
        }
        setPendingAction(null);
      } else {
        console.log('❌ PIN verification failed');
        setPinError('Invalid PIN. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ PIN verification error:', error);
      // Handle different error types
      if (error.response?.status === 401) {
        setPinError('Invalid PIN. Please try again.');
      } else if (error.response?.status === 404) {
        setPinError('Document not found.');
      } else {
        setPinError('PIN verification failed. Please try again.');
      }
    }
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

  const handleRowClick = (document: Document) => {
    setSelectedDocument(document);
    setShowDocumentActions(true);
  };

  const handleDocumentAction = (action: string, document: Document) => {
    setShowDocumentActions(false);
    
    switch (action) {
      case 'view':
        handlePreview(document);
        break;
      case 'download':
        handleDownload(document);
        break;
      case 'share':
        setShowShareModal(document.id);
        break;
      case 'versions':
        loadDocumentVersions(document.id);
        break;
      case 'delete':
        handleDelete(document.id);
        break;
      default:
        break;
    }
  };

  // Helper function to count documents for a folder
  const getDocumentCountForFolder = (folder: any) => {
    if (!folder.id || !folder.id.startsWith('virtual-')) {
      return folder.document_count || 0;
    }

    // Extract category from virtual folder ID
    const parts = folder.id.split('-');
    if (parts.length >= 3) {
      const category = parts.slice(2).join('-').toLowerCase();
      
      // Count documents that match this category
      const count = documents.filter(doc => {
        const docCategory = (doc.category || 'general').toLowerCase();
        
        if (category === 'general') {
          // For general folder, include documents with null/empty/general category
          return docCategory === 'general' || docCategory === '' || !doc.category;
        } else {
          // For specific categories, match exactly
          return docCategory === category;
        }
      }).length;
      
      return count;
    }
    
    return folder.document_count || 0;
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
            <EnhancedDocumentUploader
              exchangeId={selectedExchangeId || exchangeId}
              onUploadSuccess={() => {
                loadDocuments(); // Refresh the document list
              }}
              compact={true}
              showPinProtection={true}
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
                <SearchableDropdown
                  options={(Array.isArray(users) ? users : []).map(user => ({
                    id: user.id,
                    label: user.name || user.email,
                    subtitle: `Role: ${user.role}`,
                    icon: UserIcon
                  }))}
                  value={selectedUserId}
                  onChange={setSelectedUserId}
                  placeholder="Select User"
                  searchPlaceholder="Search users..."
                  emptyMessage="No users found"
                  className="text-sm"
                />
              )}
              
              {filterBy === 'exchange' && (
                <SearchableDropdown
                  options={exchanges.map(exchange => ({
                    id: exchange.id,
                    label: exchange.name || exchange.exchangeName,
                    subtitle: exchange.client ? `${exchange.client.first_name} ${exchange.client.last_name}` : 'No client assigned',
                    icon: BuildingOfficeIcon
                  }))}
                  value={selectedExchangeId}
                  onChange={setSelectedExchangeId}
                  placeholder="Select Exchange"
                  searchPlaceholder="Search exchanges..."
                  emptyMessage="No exchanges found"
                  className="text-sm"
                />
              )}
              
              {filterBy === 'thirdparty' && (
                <SearchableDropdown
                  options={(Array.isArray(users) ? users : []).filter(u => u.role === 'third_party').map(user => ({
                    id: user.id,
                    label: user.name || user.email,
                    icon: UserIcon
                  }))}
                  value={selectedUserId}
                  onChange={setSelectedUserId}
                  placeholder="Select Third Party"
                  searchPlaceholder="Search third parties..."
                  emptyMessage="No third parties found"
                  className="text-sm"
                />
              )}
            </div>
          </div>
        )}

        {/* User Exchange Filter */}
        {!isAdmin() && (isClient() || isCoordinator()) && exchanges && exchanges.length > 0 && (
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Select Exchange:</label>
            <SearchableDropdown
              options={[
                { id: '', label: 'All My Exchanges', icon: BuildingOfficeIcon },
                ...exchanges.map(exchange => ({
                  id: exchange.id,
                  label: exchange.name || exchange.exchangeName,
                  subtitle: exchange.client ? `${exchange.client.first_name} ${exchange.client.last_name}` : 'No client assigned',
                  icon: BuildingOfficeIcon
                }))
              ]}
              value={selectedExchangeId || exchangeId || ''}
              onChange={setSelectedExchangeId}
              placeholder="Select Exchange"
              searchPlaceholder="Search exchanges..."
              emptyMessage="No exchanges found"
              className="text-sm"
            />
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
          
          <SearchableDropdown
            options={categories.map(category => ({
              id: category,
              label: category.charAt(0).toUpperCase() + category.slice(1),
              icon: DocumentTextIcon
            }))}
            value={selectedCategory}
            onChange={setSelectedCategory}
            placeholder="Select Category"
            searchPlaceholder="Search categories..."
            emptyMessage="No categories found"
            className="text-sm"
          />

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
        <div className="bg-white rounded-lg shadow border">
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
                      ({getDocumentCountForFolder(folder)})
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

              {/* Responsive Card Layout for Mobile and Table for Desktop */}
              <div className="block lg:hidden">
                {/* Mobile Card View */}
                <div className="divide-y divide-gray-200">
                  {filteredDocuments.map(document => (
                    <div 
                      key={document.id} 
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRowClick(document)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                            checked={selectedDocuments.includes(document.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleDocumentSelection(document.id);
                            }}
                          />
                        </div>
                        <div className="relative mr-3 flex-shrink-0">
                          <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                          {(document.pinRequired || document.pinProtected) && (
                            <LockClosedIcon className="h-3 w-3 text-red-600 absolute -top-1 -right-1 bg-white rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {document.fileName}
                            </p>
                            {(document.pinRequired || document.pinProtected) && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <LockClosedIcon className="w-3 h-3 mr-1" />
                                PIN
                              </span>
                            )}
                            {verifiedDocuments.has(document.id) && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckIcon className="w-3 h-3 mr-1" />
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(document.category)}`}>
                              {document.category}
                            </span>
                            <span>{formatFileSize(document.size)}</span>
                            <span>{formatDate(document.uploadedAt)}</span>
                          </div>
                          {document.uploadedBy && (
                            <p className="text-xs text-gray-500 mt-1">
                              By: {document.uploadedBy}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <div className="min-w-full">
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                    <div className="grid grid-cols-12 gap-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="col-span-1">Select</div>
                      <div className="col-span-4">Document</div>
                      <div className="col-span-2">Category</div>
                      <div className="col-span-1">Size</div>
                      <div className="col-span-2">Uploaded</div>
                      <div className="col-span-2">Actions</div>
                    </div>
                  </div>
                  <div className="bg-white divide-y divide-gray-200">
                    {filteredDocuments.map(document => (
                      <div 
                        key={document.id} 
                        className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRowClick(document)}
                      >
                        <div className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-1">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedDocuments.includes(document.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleDocumentSelection(document.id);
                              }}
                            />
                          </div>
                          <div className="col-span-4">
                            <div className="flex items-center space-x-3">
                              <div className="relative flex-shrink-0">
                                <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                                {(document.pinRequired || document.pinProtected) && (
                                  <LockClosedIcon className="h-3 w-3 text-red-600 absolute -top-1 -right-1 bg-white rounded-full" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {document.fileName}
                                  </p>
                                  {(document.pinRequired || document.pinProtected) && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      <LockClosedIcon className="w-3 h-3 mr-1" />
                                      PIN Required
                                    </span>
                                  )}
                                  {verifiedDocuments.has(document.id) && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <CheckIcon className="w-3 h-3 mr-1" />
                                      Verified
                                    </span>
                                  )}
                                </div>
                                {document.uploadedBy && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    By: {document.uploadedBy}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="col-span-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(document.category)}`}>
                              {document.category}
                            </span>
                          </div>
                          <div className="col-span-1">
                            <p className="text-sm text-gray-900">
                              {formatFileSize(document.size)}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-gray-500">
                              {formatDate(document.uploadedAt)}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handlePreview(document); }}
                                className="text-blue-600 hover:text-blue-900"
                                title={(document.pinRequired || document.pinProtected) && !verifiedDocuments.has(document.id) ? 'PIN required to view' : 'View document'}
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDownload(document); }}
                                className="text-gray-400 hover:text-gray-600"
                                title={(document.pinRequired || document.pinProtected) && !verifiedDocuments.has(document.id) ? 'PIN required to download' : 'Download document'}
                              >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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

      {/* Document Actions Modal */}
      {showDocumentActions && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="relative mr-3">
                  <DocumentTextIcon className="w-6 h-6 text-gray-400" />
                  {(selectedDocument.pinRequired || selectedDocument.pinProtected) && (
                    <LockClosedIcon className="h-3 w-3 text-red-600 absolute -top-1 -right-1 bg-white rounded-full" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Document Actions</h3>
              </div>
              <button
                onClick={() => setShowDocumentActions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-gray-900">
                  {selectedDocument.fileName}
                </p>
                {(selectedDocument.pinRequired || selectedDocument.pinProtected) && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <LockClosedIcon className="w-3 h-3 mr-1" />
                    PIN Required
                  </span>
                )}
                {verifiedDocuments.has(selectedDocument.id) && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckIcon className="w-3 h-3 mr-1" />
                    Verified
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                <p>Category: <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(selectedDocument.category)}`}>
                  {selectedDocument.category}
                </span></p>
                <p>Size: {formatFileSize(selectedDocument.size)}</p>
                <p>Uploaded: {formatDate(selectedDocument.uploadedAt)}</p>
                {selectedDocument.uploadedBy && <p>By: {selectedDocument.uploadedBy}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleDocumentAction('view', selectedDocument)}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <EyeIcon className="w-5 h-5 mr-2" />
                {(selectedDocument.pinRequired || selectedDocument.pinProtected) && !verifiedDocuments.has(selectedDocument.id) ? 'View (PIN Required)' : 'View Document'}
              </button>
              
              <button
                onClick={() => handleDocumentAction('download', selectedDocument)}
                className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                {(selectedDocument.pinRequired || selectedDocument.pinProtected) && !verifiedDocuments.has(selectedDocument.id) ? 'Download (PIN Required)' : 'Download'}
              </button>
              
              <button
                onClick={() => handleDocumentAction('share', selectedDocument)}
                className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <ShareIcon className="w-5 h-5 mr-2" />
                Share Document
              </button>
              
              <button
                onClick={() => handleDocumentAction('versions', selectedDocument)}
                className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <ClockIcon className="w-5 h-5 mr-2" />
                View Versions
              </button>
              
              <button
                onClick={() => handleDocumentAction('delete', selectedDocument)}
                className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <TrashIcon className="w-5 h-5 mr-2" />
                Delete Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <LockClosedIcon className="w-6 h-6 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">PIN Protected Document</h3>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                This document requires PIN verification to access:
              </p>
              <p className="text-sm font-medium text-gray-900">
                {documents.find(d => d.id === showPinModal)?.fileName || 'Document'}
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handlePinVerification(showPinModal); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter 4-digit PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setPin(value);
                    setPinError('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                  placeholder="****"
                  autoFocus
                />
                {pinError && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <XMarkIcon className="w-4 h-4 mr-1" />
                    {pinError}
                  </p>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(null);
                    setPin('');
                    setPinError('');
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pin.length !== 4}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Verify PIN
                </button>
              </div>
            </form>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start">
                <LockClosedIcon className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" />
                <div className="text-xs text-yellow-800">
                  <p className="font-medium">Security Notice:</p>
                  <p>All document access is logged for audit purposes. Unauthorized access attempts will be reported.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EnhancedDocumentManager;