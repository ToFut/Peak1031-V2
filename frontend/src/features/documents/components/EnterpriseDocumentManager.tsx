import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { apiService } from '@/shared/services/api';
import { Document, Exchange } from '../types';
import {
  DocumentIcon,
  FolderIcon,
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
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface EnterpriseDocument {
  id: string;
  filename: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  category: string;
  tags: string[];
  exchangeId: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  status: 'active' | 'archived' | 'pending' | 'approved' | 'rejected';
  permissions: {
    canView: boolean;
    canDownload: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
  metadata: {
    description?: string;
    confidential?: boolean;
    expiresAt?: string;
    reviewedBy?: string;
    reviewedAt?: string;
  };
  exchange?: {
    id: string;
    name: string;
    status: string;
  };
  uploader?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface DocumentStats {
  total: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  byExchange: Record<string, number>;
  totalSize: number;
  recentUploads: number;
}

interface DocumentFilter {
  category?: string;
  status?: string;
  exchangeId?: string;
  uploadedBy?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  confidential?: boolean;
}

interface EnterpriseDocumentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  initialExchangeId?: string;
  onDocumentChange?: () => void;
}

const EnterpriseDocumentManager: React.FC<EnterpriseDocumentManagerProps> = ({
  isOpen,
  onClose,
  initialExchangeId,
  onDocumentChange
}) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<EnterpriseDocument[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Professional state management
  const [activeTab, setActiveTab] = useState<'documents' | 'upload' | 'bulk' | 'analytics'>('documents');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('table');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<DocumentFilter>({
    exchangeId: initialExchangeId || ''
  });
  
  // Upload state
  const [uploadForm, setUploadForm] = useState({
    files: [] as File[],
    exchangeId: initialExchangeId || '',
    category: 'general',
    tags: [] as string[],
    newTag: '',
    description: '',
    confidential: false,
    notifyParticipants: true,
    autoProcessOCR: false
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'coordinator';

  // Professional document categories with enhanced metadata
  const documentCategories = [
    { 
      value: 'general', 
      label: 'General Documents', 
      icon: '📄', 
      color: 'bg-gray-100 text-gray-800',
      description: 'General exchange documentation'
    },
    { 
      value: 'contract', 
      label: 'Contracts & Agreements', 
      icon: '📋', 
      color: 'bg-blue-100 text-blue-800',
      description: 'Legal contracts and binding agreements'
    },
    { 
      value: 'financial', 
      label: 'Financial Records', 
      icon: '💰', 
      color: 'bg-green-100 text-green-800',
      description: 'Financial statements and records'
    },
    { 
      value: 'legal', 
      label: 'Legal Documents', 
      icon: '⚖️', 
      color: 'bg-purple-100 text-purple-800',
      description: 'Legal filings and documentation'
    },
    { 
      value: 'identification', 
      label: 'Property Identification', 
      icon: '🏠', 
      color: 'bg-orange-100 text-orange-800',
      description: '45-day identification documents'
    },
    { 
      value: 'deed', 
      label: 'Deeds & Titles', 
      icon: '📜', 
      color: 'bg-indigo-100 text-indigo-800',
      description: 'Property deeds and title documents'
    },
    { 
      value: 'appraisal', 
      label: 'Appraisals', 
      icon: '📊', 
      color: 'bg-emerald-100 text-emerald-800',
      description: 'Property appraisal reports'
    },
    { 
      value: 'inspection', 
      label: 'Inspections', 
      icon: '🔍', 
      color: 'bg-yellow-100 text-yellow-800',
      description: 'Property inspection reports'
    },
    { 
      value: 'title', 
      label: 'Title Insurance', 
      icon: '🛡️', 
      color: 'bg-rose-100 text-rose-800',
      description: 'Title insurance documents'
    },
    { 
      value: 'insurance', 
      label: 'Insurance', 
      icon: '🏥', 
      color: 'bg-cyan-100 text-cyan-800',
      description: 'Insurance policies and certificates'
    },
    { 
      value: 'tax', 
      label: 'Tax Documents', 
      icon: '🧾', 
      color: 'bg-amber-100 text-amber-800',
      description: 'Tax forms and related documents'
    },
    { 
      value: 'correspondence', 
      label: 'Correspondence', 
      icon: '✉️', 
      color: 'bg-slate-100 text-slate-800',
      description: 'Email and written correspondence'
    }
  ];

  // Document stats and analytics
  const documentStats = useMemo<DocumentStats>(() => {
    const stats: DocumentStats = {
      total: documents.length,
      byCategory: {},
      byStatus: {},
      byExchange: {},
      totalSize: 0,
      recentUploads: 0
    };

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    documents.forEach(doc => {
      // Count by category
      stats.byCategory[doc.category] = (stats.byCategory[doc.category] || 0) + 1;
      
      // Count by status
      stats.byStatus[doc.status] = (stats.byStatus[doc.status] || 0) + 1;
      
      // Count by exchange
      if (doc.exchange) {
        stats.byExchange[doc.exchange.name] = (stats.byExchange[doc.exchange.name] || 0) + 1;
      }
      
      // Total size
      stats.totalSize += doc.fileSize || 0;
      
      // Recent uploads
      if (new Date(doc.createdAt) > sevenDaysAgo) {
        stats.recentUploads++;
      }
    });

    return stats;
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = doc.originalFilename.toLowerCase().includes(searchLower);
        const matchesDescription = doc.metadata.description?.toLowerCase().includes(searchLower);
        const matchesTags = doc.tags.some(tag => tag.toLowerCase().includes(searchLower));
        const matchesExchange = doc.exchange?.name.toLowerCase().includes(searchLower);
        
        if (!matchesName && !matchesDescription && !matchesTags && !matchesExchange) {
          return false;
        }
      }

      // Category filter
      if (filters.category && doc.category !== filters.category) return false;

      // Status filter
      if (filters.status && doc.status !== filters.status) return false;

      // Exchange filter
      if (filters.exchangeId && doc.exchangeId !== filters.exchangeId) return false;

      // Confidential filter
      if (filters.confidential !== undefined && doc.metadata.confidential !== filters.confidential) return false;

      // Date range filter
      if (filters.dateRange) {
        const docDate = new Date(doc.createdAt);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        if (docDate < startDate || docDate > endDate) return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.originalFilename.localeCompare(b.originalFilename);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'size':
          comparison = (a.fileSize || 0) - (b.fileSize || 0);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [documents, searchTerm, filters, sortBy, sortOrder]);

  // Load data
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/documents');
      
      // Transform the response data to match our interface
      const transformedDocuments = (response.data || response.documents || response || []).map((doc: any) => ({
        id: doc.id,
        filename: doc.stored_filename || doc.filename,
        originalFilename: doc.original_filename || doc.originalFilename || doc.fileName,
        fileSize: doc.file_size || doc.fileSize || 0,
        mimeType: doc.mime_type || doc.mimeType || 'application/octet-stream',
        category: doc.category || 'general',
        tags: doc.tags || [],
        exchangeId: doc.exchange_id || doc.exchangeId,
        uploadedBy: doc.uploaded_by || doc.uploadedBy,
        createdAt: doc.created_at || doc.createdAt,
        updatedAt: doc.updated_at || doc.updatedAt,
        version: doc.version || 1,
        status: doc.status || 'active',
        permissions: {
          canView: true,
          canDownload: true,
          canEdit: user?.role === 'admin' || user?.role === 'coordinator',
          canDelete: user?.role === 'admin' || user?.role === 'coordinator',
          canShare: user?.role === 'admin' || user?.role === 'coordinator'
        },
        metadata: {
          description: doc.description,
          confidential: doc.pin_required || false,
          expiresAt: doc.expires_at,
          reviewedBy: doc.reviewed_by,
          reviewedAt: doc.reviewed_at
        },
        exchange: doc.exchange ? {
          id: doc.exchange.id,
          name: doc.exchange.name || doc.exchange.exchangeName,
          status: doc.exchange.status || doc.exchange.newStatus
        } : undefined,
        uploader: doc.uploaded_by_user || doc.uploader ? {
          id: (doc.uploaded_by_user || doc.uploader).id,
          firstName: (doc.uploaded_by_user || doc.uploader).first_name || (doc.uploaded_by_user || doc.uploader).firstName,
          lastName: (doc.uploaded_by_user || doc.uploader).last_name || (doc.uploaded_by_user || doc.uploader).lastName,
          email: (doc.uploaded_by_user || doc.uploader).email
        } : undefined
      }));

      setDocuments(transformedDocuments);
    } catch (error: any) {
      console.error('Failed to load documents:', error);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadExchanges = useCallback(async () => {
    try {
      const response = await apiService.get('/exchanges');
      setExchanges(response.exchanges || []);
    } catch (error: any) {
      console.error('Failed to load exchanges:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
      loadExchanges();
    }
  }, [isOpen, loadDocuments, loadExchanges]);

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

  const addTag = () => {
    if (uploadForm.newTag.trim() && !uploadForm.tags.includes(uploadForm.newTag.trim())) {
      setUploadForm(prev => ({
        ...prev,
        tags: [...prev.tags, prev.newTag.trim()],
        newTag: ''
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setUploadForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleUpload = async () => {
    if (uploadForm.files.length === 0 || !uploadForm.exchangeId) {
      setError('Please select files and an exchange');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);
      setUploadProgress(0);

      const uploadPromises = uploadForm.files.map(async (file, index) => {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('exchangeId', uploadForm.exchangeId);
          formData.append('category', uploadForm.category);
          formData.append('description', uploadForm.description);
          formData.append('pinRequired', uploadForm.confidential.toString());
          
          // Add PIN if confidential
          if (uploadForm.confidential) {
            const pin = Math.random().toString(36).substring(2, 8).toUpperCase();
            formData.append('pin', pin);
          }

          // Upload using fetch directly for better control over FormData and progress
          const token = localStorage.getItem('token');
          const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/documents`, {
            method: 'POST',
            headers: {
              ...(token && { 'Authorization': `Bearer ${token}` })
              // Don't set Content-Type for FormData - browser will set it with boundary
            },
            body: formData
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          }

          const responseData = await response.json();
          
          // Update progress for this file
          setUploadProgress(prevProgress => Math.max(prevProgress, ((index + 1) * 100) / uploadForm.files.length));
          
          return { 
            success: true, 
            filename: file.name, 
            data: responseData.data || responseData,
            message: responseData.message || 'Upload successful'
          };
        } catch (error: any) {
          console.error(`Upload failed for ${file.name}:`, error);
          return { 
            success: false, 
            filename: file.name, 
            error: error.message || 'Upload failed'
          };
        }
      });

      const results = await Promise.all(uploadPromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      setUploadProgress(100);
      
      if (successful.length > 0) {
        setSuccess(`Successfully uploaded ${successful.length} document${successful.length > 1 ? 's' : ''} to Supabase storage${failed.length > 0 ? `, ${failed.length} failed` : ''}`);
        
        // Clear form but keep exchange selection
        setUploadForm({
          files: [],
          exchangeId: uploadForm.exchangeId,
          category: 'general',
          tags: [],
          newTag: '',
          description: '',
          confidential: false,
          notifyParticipants: true,
          autoProcessOCR: false
        });
        
        // Reload documents and notify parent
        await loadDocuments();
        onDocumentChange?.();
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
      // Reset progress after a short delay
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const getCategoryConfig = (category: string) => {
    return documentCategories.find(c => c.value === category) || documentCategories[0];
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

  const exportDocuments = () => {
    const csvContent = [
      ['Name', 'Category', 'Exchange', 'Size', 'Uploaded By', 'Upload Date', 'Status', 'Tags'].join(','),
      ...filteredDocuments.map(doc => [
        `"${doc.originalFilename}"`,
        doc.category,
        doc.exchange?.name || '',
        formatFileSize(doc.fileSize),
        `${doc.uploader?.firstName} ${doc.uploader?.lastName}`,
        new Date(doc.createdAt).toLocaleDateString(),
        doc.status,
        doc.tags.join('; ')
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documents-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
      <div className="relative top-4 mx-auto w-11/12 max-w-7xl shadow-2xl rounded-2xl bg-white mb-8">
        
        {/* Professional Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-t-2xl px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                <FolderIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Enterprise Document Management</h2>
                <p className="text-emerald-100 mt-1">Centralized document storage and collaboration</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right text-white">
                <div className="text-sm opacity-90">Total Documents</div>
                <div className="text-2xl font-bold">{documentStats.total}</div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-xl transition-all"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="px-8 py-6 bg-gray-50 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Storage</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatFileSize(documentStats.totalSize)}</p>
                </div>
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <ArchiveBoxIcon className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Recent (7 days)</p>
                  <p className="text-2xl font-bold text-blue-600">{documentStats.recentUploads}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ClockIcon className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{documentStats.byStatus.active || 0}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Exchanges</p>
                  <p className="text-2xl font-bold text-purple-600">{Object.keys(documentStats.byExchange).length}</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BuildingOfficeIcon className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Tab Navigation */}
        <div className="px-8 py-4 border-b bg-white">
          <nav className="flex space-x-8">
            {[
              { id: 'documents', label: 'Documents', icon: FolderIcon, count: documentStats.total },
              { id: 'upload', label: 'Upload Documents', icon: CloudArrowUpIcon },
              { id: 'bulk', label: 'Bulk Operations', icon: ClipboardDocumentListIcon },
              { id: 'analytics', label: 'Analytics', icon: ChartBarIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      isActive ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="ml-3 text-sm text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mx-8 mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center">
              <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className="ml-3 text-sm text-green-700 font-medium">{success}</p>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-8 min-h-[600px] max-h-[800px] overflow-y-auto">
          
          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Advanced Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search documents, descriptions, tags..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-80"
                    />
                  </div>
                  <select
                    value={filters.exchangeId}
                    onChange={(e) => setFilters(f => ({ ...f, exchangeId: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All Exchanges</option>
                    {exchanges.map(exchange => (
                      <option key={exchange.id} value={exchange.id}>{exchange.name}</option>
                    ))}
                  </select>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All Categories</option>
                    {documentCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}  
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending Review</option>
                    <option value="approved">Approved</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="flex items-center space-x-3">
                  {selectedDocuments.size > 0 && canManage && (
                    <button className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                      <TrashIcon className="w-4 h-4" />
                      <span>Delete ({selectedDocuments.size})</span>
                    </button>
                  )}
                  <button
                    onClick={exportDocuments}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* Professional Documents Table */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {canManage && (
                          <th className="px-6 py-3 text-left">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Document
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category & Tags
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Exchange
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        {canManage && (
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredDocuments.map((document) => {
                        const categoryConfig = getCategoryConfig(document.category);
                        
                        return (
                          <tr key={document.id} className="hover:bg-gray-50">
                            {canManage && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0">
                                  {getFileIcon(document.mimeType, document.originalFilename)}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                                    {document.originalFilename}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {formatFileSize(document.fileSize)} • {document.mimeType.split('/')[1]?.toUpperCase()}
                                  </div>
                                  {document.metadata.confidential && (
                                    <div className="flex items-center mt-1">
                                      <LockClosedIcon className="w-3 h-3 text-red-500 mr-1" />
                                      <span className="text-xs text-red-600 font-medium">Confidential</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryConfig.color}`}>
                                  {categoryConfig.icon} {categoryConfig.label}
                                </span>
                                {document.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {document.tags.slice(0, 3).map(tag => (
                                      <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
                                        <TagIcon className="w-3 h-3 mr-1" />
                                        {tag}
                                      </span>
                                    ))}
                                    {document.tags.length > 3 && (
                                      <span className="text-xs text-gray-500">+{document.tags.length - 3} more</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {document.exchange && (
                                <div className="flex items-center">
                                  <BuildingOfficeIcon className="w-4 h-4 text-gray-400 mr-2" />
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{document.exchange.name}</div>
                                    <div className="text-sm text-gray-500">{document.exchange.status}</div>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-1">
                                <div className="flex items-center text-sm text-gray-500">
                                  <UserIcon className="w-4 h-4 text-gray-400 mr-2" />
                                  {document.uploader?.firstName} {document.uploader?.lastName}
                                </div>
                                <div className="flex items-center text-sm text-gray-500">
                                  <CalendarIcon className="w-4 h-4 text-gray-400 mr-2" />
                                  {new Date(document.createdAt).toLocaleDateString()}
                                </div>
                                {document.version > 1 && (
                                  <div className="text-xs text-blue-600">v{document.version}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                document.status === 'active' ? 'bg-green-100 text-green-800' :
                                document.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                document.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {document.status === 'active' && <CheckCircleIcon className="w-3 h-3 mr-1" />}
                                {document.status === 'pending' && <ClockIcon className="w-3 h-3 mr-1" />}
                                {document.status === 'approved' && <CheckIcon className="w-3 h-3 mr-1" />}
                                {document.status}
                              </span>
                            </td>
                            {canManage && (
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end space-x-2">
                                  <button className="text-emerald-600 hover:text-emerald-900 p-1">
                                    <EyeIcon className="w-4 h-4" />
                                  </button>
                                  <button className="text-blue-600 hover:text-blue-900 p-1">
                                    <ArrowDownTrayIcon className="w-4 h-4" />
                                  </button>
                                  <button className="text-gray-600 hover:text-gray-900 p-1">
                                    <ShareIcon className="w-4 h-4" />
                                  </button>
                                  <button className="text-amber-600 hover:text-amber-900 p-1">
                                    <PencilIcon className="w-4 h-4" />
                                  </button>
                                  <button className="text-red-600 hover:text-red-900 p-1">
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && canManage && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* File Upload Area */}
                <div className="xl:col-span-2 space-y-6">
                  <div
                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                      dragActive 
                        ? 'border-emerald-400 bg-emerald-50' 
                        : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={() => setDragActive(true)}
                    onDragLeave={() => setDragActive(false)}
                  >
                    <CloudArrowUpIcon className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Drop files here or click to browse
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Support for PDF, Word, Excel, Images, and more (max 100MB per file)
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
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                    >
                      <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
                      Select Files
                    </label>
                  </div>

                  {/* Selected Files */}
                  {uploadForm.files.length > 0 && (
                    <div className="bg-white rounded-xl border p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Selected Files ({uploadForm.files.length})
                      </h3>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {uploadForm.files.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              {getFileIcon(file.type, file.name)}
                              <div>
                                <div className="font-medium text-gray-900">{file.name}</div>
                                <div className="text-sm text-gray-500">
                                  {formatFileSize(file.size)} • {file.type.split('/')[1]?.toUpperCase() || 'Unknown'}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <XMarkIcon className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload Configuration */}
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Target Exchange *
                        </label>
                        <select
                          value={uploadForm.exchangeId}
                          onChange={(e) => setUploadForm(f => ({ ...f, exchangeId: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          required
                        >
                          <option value="">Select an exchange...</option>
                          {exchanges.map(exchange => (
                            <option key={exchange.id} value={exchange.id}>{exchange.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Document Category
                        </label>
                        <select
                          value={uploadForm.category}
                          onChange={(e) => setUploadForm(f => ({ ...f, category: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        >
                          {documentCategories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                        <p className="text-sm text-gray-500 mt-1">
                          {getCategoryConfig(uploadForm.category).description}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tags
                        </label>
                        <div className="flex space-x-2 mb-2">
                          <input
                            type="text"
                            value={uploadForm.newTag}
                            onChange={(e) => setUploadForm(f => ({ ...f, newTag: e.target.value }))}
                            onKeyPress={(e) => e.key === 'Enter' && addTag()}
                            placeholder="Add a tag..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            onClick={addTag}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {uploadForm.tags.map(tag => (
                            <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm bg-emerald-100 text-emerald-800">
                              {tag}
                              <button
                                onClick={() => removeTag(tag)}
                                className="ml-1 text-emerald-600 hover:text-emerald-800"
                              >
                                <XMarkIcon className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description (Optional)
                        </label>
                        <textarea
                          value={uploadForm.description}
                          onChange={(e) => setUploadForm(f => ({ ...f, description: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="Describe the documents..."
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={uploadForm.confidential}
                            onChange={(e) => setUploadForm(f => ({ ...f, confidential: e.target.checked }))}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <label className="ml-2 text-sm text-gray-700">Mark as confidential</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={uploadForm.notifyParticipants}
                            onChange={(e) => setUploadForm(f => ({ ...f, notifyParticipants: e.target.checked }))}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <label className="ml-2 text-sm text-gray-700">Notify exchange participants</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={uploadForm.autoProcessOCR}
                            onChange={(e) => setUploadForm(f => ({ ...f, autoProcessOCR: e.target.checked }))}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <label className="ml-2 text-sm text-gray-700">Auto-extract text (OCR)</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Upload Button */}
                  <button
                    onClick={handleUpload}
                    disabled={uploading || uploadForm.files.length === 0 || !uploadForm.exchangeId}
                    className="w-full bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {uploading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Uploading... {uploadProgress}%
                      </div>
                    ) : (
                      `Upload ${uploadForm.files.length} Document${uploadForm.files.length !== 1 ? 's' : ''}`
                    )}
                  </button>

                  {uploading && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bulk Operations Tab */}
          {activeTab === 'bulk' && canManage && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Category Update</h3>
                  <p className="text-gray-600 mb-4">Update category for multiple documents at once.</p>
                  <div className="space-y-4">
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option>Select new category...</option>
                      {documentCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                    <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                      Apply to Selected ({selectedDocuments.size})
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Archive</h3>
                  <p className="text-gray-600 mb-4">Archive multiple documents to reduce clutter.</p>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-emerald-600" />
                      <label className="ml-2 text-sm text-gray-700">Keep in search results</label>
                    </div>
                    <button className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">
                      Archive Selected ({selectedDocuments.size})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h3>
                  <div className="space-y-3">
                    {Object.entries(documentStats.byCategory).map(([category, count]) => {
                      const categoryConfig = getCategoryConfig(category);
                      const percentage = (count / documentStats.total) * 100;
                      return (
                        <div key={category} className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryConfig.color}`}>
                            {categoryConfig.icon} {categoryConfig.label}
                          </span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-emerald-600 h-2 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Exchange Distribution</h3>
                  <div className="space-y-3">
                    {Object.entries(documentStats.byExchange).slice(0, 5).map(([exchangeName, count]) => {
                      const percentage = (count / documentStats.total) * 100;
                      return (
                        <div key={exchangeName} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 truncate max-w-32">{exchangeName}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Activity</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">{documentStats.recentUploads}</div>
                    <div className="text-sm text-gray-600">Last 7 Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{formatFileSize(documentStats.totalSize)}</div>
                    <div className="text-sm text-gray-600">Total Storage</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{Object.keys(documentStats.byExchange).length}</div>
                    <div className="text-sm text-gray-600">Active Exchanges</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{documentStats.byStatus.pending || 0}</div>
                    <div className="text-sm text-gray-600">Pending Review</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Professional Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Document Management System • Last updated: {new Date().toLocaleString()}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              {canManage && (
                <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                  Generate Report
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseDocumentManager;