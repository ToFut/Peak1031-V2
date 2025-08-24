import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { apiService } from '../../../services/api';
import { Document, Exchange } from '../../../types';
import {
  FolderIcon,
  DocumentIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  ArchiveBoxIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  InformationCircleIcon,
  PhotoIcon,
  DocumentArrowUpIcon,
  LockClosedIcon,
  GlobeAltIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlusIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface Folder {
  id: string;
  name: string;
  parent_id?: string;
  exchange_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  children?: Folder[];
  documents?: Document[];
  created_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface DocumentManagementPageProps {
  exchangeId?: string;
}

const DocumentManagementPage: React.FC<DocumentManagementPageProps> = ({ exchangeId: propExchangeId }) => {
  const { exchangeId: urlExchangeId } = useParams<{ exchangeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const exchangeId = propExchangeId || urlExchangeId;
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // State management
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('table');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  
  // Upload state
  const [uploadForm, setUploadForm] = useState({
    files: [] as File[],
    category: 'general',
    tags: [] as string[],
    newTag: '',
    description: '',
    confidential: false,
    notifyParticipants: true
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Create folder state
  const [newFolder, setNewFolder] = useState({
    name: '',
    parentId: selectedFolder?.id || null
  });

  const canManage = user?.role === 'admin' || user?.role === 'coordinator';

  // Load data
  const loadFolders = useCallback(async () => {
    if (!exchangeId) return;
    
    try {
      setLoading(true);
      const response = await apiService.get(`/folders/exchange/${exchangeId}`);
      setFolders(response.data || []);
    } catch (error: any) {
      console.error('Failed to load folders:', error);
      setError('Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, [exchangeId]);

  const loadDocuments = useCallback(async () => {
    if (!exchangeId) return;
    
    try {
      setLoading(true);
      const response = await apiService.get(`/documents?exchangeId=${exchangeId}`);
      const rawDocs = (response?.data || response?.documents || response || []) as any[];
      // Normalize to camelCase fields expected by UI
      const normalized = rawDocs.map((doc: any) => ({
        ...doc,
        id: doc.id,
        filename: doc.filename || doc.file_name || doc.stored_filename || doc.storedFilename,
        originalFilename: doc.originalFilename || doc.original_filename || doc.filename,
        fileSize: doc.fileSize ?? doc.file_size ?? 0,
        mimeType: doc.mimeType || doc.mime_type || '',
        createdAt: doc.createdAt || doc.created_at,
        folder_id: doc.folder_id ?? doc.folderId ?? null,
        exchange: doc.exchange,
      }));
      setDocuments(normalized as any);
    } catch (error: any) {
      console.error('Failed to load documents:', error);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [exchangeId]);

  const loadExchanges = useCallback(async () => {
    try {
      const response = await apiService.get('/exchanges');
      setExchanges(response.exchanges || response.data || []);
    } catch (error: any) {
      console.error('Failed to load exchanges:', error);
    }
  }, []);

  useEffect(() => {
    if (exchangeId) {
      loadFolders();
      loadDocuments();
    }
    loadExchanges();
  }, [exchangeId, loadFolders, loadDocuments, loadExchanges]);

  // Filter documents based on selected folder and search
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Filter by selected folder (virtual folders based on categories)
    if (selectedFolder) {
      // Extract category from virtual folder ID
      if (selectedFolder.id.startsWith('virtual-')) {
        const parts = selectedFolder.id.split('-');
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
        filtered = filtered.filter(doc => doc.folder_id === selectedFolder.id);
      }
    } else {
      // Show documents without folders (root level) - only when not using virtual folders
      const hasVirtualFolders = folders.some(f => f.id && f.id.startsWith('virtual-'));
      if (!hasVirtualFolders) {
        filtered = filtered.filter(doc => !doc.folder_id);
      }
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => {
        const matchesName = doc.original_filename?.toLowerCase().includes(searchLower) ||
                           doc.filename?.toLowerCase().includes(searchLower);
        const matchesDescription = doc.description?.toLowerCase().includes(searchLower);
        const matchesTags = doc.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        return matchesName || matchesDescription || matchesTags;
      });
    }

    // Sort documents
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = (a.original_filename || a.filename || '').localeCompare(b.original_filename || b.filename || '');
          break;
        case 'date':
          comparison = new Date(a.created_at || a.createdAt).getTime() - new Date(b.created_at || b.createdAt).getTime();
          break;
        case 'size':
          comparison = (a.file_size || a.fileSize || 0) - (b.file_size || b.fileSize || 0);
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [documents, selectedFolder, searchTerm, sortBy, sortOrder]);

  // File upload handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    setUploadForm(prev => ({ ...prev, files: [...prev.files, ...files] }));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadForm(prev => ({ ...prev, files: [...prev.files, ...files] }));
  };

  const removeFile = (index: number) => {
    setUploadForm(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleUpload = async () => {
    if (uploadForm.files.length === 0 || !exchangeId) {
      setError('Please select files and ensure an exchange is selected');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);
      setUploadProgress(0);

      const uploadPromises = uploadForm.files.map(async (file, index) => {
        try {
          // Use the apiService.uploadDocument method with options
          const response = await apiService.uploadDocument(
            file,
            exchangeId,
            uploadForm.category,
            {
              description: uploadForm.description,
              pinRequired: uploadForm.confidential,
              folderId: selectedFolder?.id
            }
          );
          
          setUploadProgress(prevProgress => Math.max(prevProgress, ((index + 1) * 100) / uploadForm.files.length));
          
          return { success: true, filename: file.name, data: response };
        } catch (error: any) {
          console.error(`Upload failed for ${file.name}:`, error);
          return { success: false, filename: file.name, error: error.message };
        }
      });

      const results = await Promise.all(uploadPromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      setUploadProgress(100);
      
      if (successful.length > 0) {
        setSuccess(`Successfully uploaded ${successful.length} document${successful.length > 1 ? 's' : ''}${failed.length > 0 ? `, ${failed.length} failed` : ''}`);
        
        // Clear form
        setUploadForm({
          files: [],
          category: 'general',
          tags: [],
          newTag: '',
          description: '',
          confidential: false,
          notifyParticipants: true
        });
        
        // Reload documents
        await loadDocuments();
        setShowUploadModal(false);
      }

      if (failed.length > 0) {
        const errorMessages = failed.map(f => `${f.filename}: ${f.error}`).join('; ');
        if (successful.length === 0) {
          setError(`Failed to upload all documents: ${errorMessages}`);
        } else {
          setError(`Some uploads failed: ${errorMessages}`);
        }
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload documents');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolder.name.trim() || !exchangeId) {
      setError('Folder name and exchange are required');
      return;
    }

    try {
      const response = await apiService.post('/folders', {
        name: newFolder.name.trim(),
        parentId: newFolder.parentId,
        exchangeId
      });

      setSuccess('Folder created successfully');
      setNewFolder({ name: '', parentId: null });
      setShowCreateFolderModal(false);
      await loadFolders();
    } catch (error: any) {
      console.error('Failed to create folder:', error);
      setError(error.message || 'Failed to create folder');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string, filename: string) => {
    if (mimeType.startsWith('image/')) return <PhotoIcon className="w-8 h-8 text-green-600" />;
    if (mimeType.includes('pdf')) return <DocumentIcon className="w-8 h-8 text-red-600" />;
    if (mimeType.includes('word')) return <DocumentTextIcon className="w-8 h-8 text-blue-600" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <DocumentIcon className="w-8 h-8 text-green-600" />;
    return <DocumentIcon className="w-8 h-8 text-gray-600" />;
  };

  const renderFolderTree = (folders: Folder[], parentId: string | null = null) => {
    const levelFolders = folders.filter(f => f.parent_id === parentId);
    
    return levelFolders.map(folder => (
      <div key={folder.id} className="space-y-1">
        <div 
          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-gray-100 ${
            selectedFolder?.id === folder.id ? 'bg-blue-50 border border-blue-200' : ''
          }`}
          onClick={() => setSelectedFolder(folder)}
        >
          <div className="flex items-center space-x-2">
            <FolderIcon className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">{folder.name}</span>
          </div>
          {folder.children && folder.children.length > 0 && (
            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
          )}
        </div>
        {folder.children && folder.children.length > 0 && (
          <div className="ml-4">
            {renderFolderTree(folders, folder.id)}
          </div>
        )}
      </div>
    ));
  };

  if (!exchangeId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Exchange Not Found</h2>
          <p className="text-gray-600">Please select an exchange to manage documents.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Folder Navigation */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Folders</h2>
            {canManage && (
              <button
                onClick={() => setShowCreateFolderModal(true)}
                className="p-1 text-blue-600 hover:text-blue-700"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* Root level */}
          <div 
            className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer hover:bg-gray-100 ${
              !selectedFolder ? 'bg-blue-50 border border-blue-200' : ''
            }`}
            onClick={() => setSelectedFolder(null)}
          >
            <FolderIcon className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">Root</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-1">
              {renderFolderTree(folders)}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedFolder ? selectedFolder.name : 'Documents'}
              </h1>
              <p className="text-gray-600">
                {selectedFolder ? `${selectedFolder.name} folder` : 'All documents'}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {canManage && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <CloudArrowUpIcon className="w-5 h-5" />
                  <span>Upload</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-80"
                />
              </div>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="category">Category</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 text-gray-600 hover:text-gray-800"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
              >
                <ChartBarIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
              >
                <ClipboardDocumentListIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
              >
                <DocumentIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="ml-3 text-sm text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                <p className="ml-3 text-sm text-green-700 font-medium">{success}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-16">
              <DocumentIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || selectedFolder 
                  ? 'Try adjusting your search or folder selection' 
                  : 'Get started by uploading your first document'}
              </p>
              {canManage && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                  Upload Documents
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocuments.map((document) => (
                <div key={document.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getFileIcon(document.mimeType || '', document.originalFilename || document.filename || '')}
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {document.originalFilename || document.filename}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(document.fileSize || 0)} • {document.mimeType}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-700 p-1">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-700 p-1">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                      </button>
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
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Upload Documents</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
              >
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-blue-500 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop files here or click to browse
                </p>
                <p className="text-gray-600 mb-4">
                  Support for PDF, Word, Excel, Images, and more (max 50MB per file)
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  Select Files
                </label>
              </div>

              {uploadForm.files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Selected Files:</h3>
                  {uploadForm.files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || uploadForm.files.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Create New Folder</h2>
              <button
                onClick={() => setShowCreateFolderModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolder.name}
                  onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter folder name"
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolder.name.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Folder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagementPage;
