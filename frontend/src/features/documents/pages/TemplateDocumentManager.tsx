import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { apiService } from '../../../services/api';
import {
  DocumentPlusIcon,
  CloudArrowUpIcon,
  FolderIcon,
  DocumentTextIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface TemplateDocument {
  id: string;
  name: string;
  description: string;
  category: string;
  file_path: string;
  mime_type: string;
  size: number;
  url: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

const TemplateDocumentManager: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TemplateDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    category: '',
    file: null as File | null
  });

  const categories = [
    { id: 'exchange-agreement', name: 'Exchange Agreement', icon: '📜' },
    { id: '1031-forms', name: '1031 Forms', icon: '📋' },
    { id: 'property-documents', name: 'Property Documents', icon: '🏠' },
    { id: 'tax-documents', name: 'Tax Documents', icon: '💰' },
    { id: 'legal-documents', name: 'Legal Documents', icon: '⚖️' },
    { id: 'compliance-forms', name: 'Compliance Forms', icon: '✅' },
    { id: 'client-communications', name: 'Client Communications', icon: '💬' },
    { id: 'other', name: 'Other', icon: '📁' }
  ];

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Auto-extract document name and category from filename
  const extractDocumentInfo = (file: File) => {
    const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    const cleanName = fileName
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase()); // Title case

    // Auto-detect category based on filename
    let detectedCategory = 'other';
    const lowerFileName = fileName.toLowerCase();
    
    if (lowerFileName.includes('exchange') || lowerFileName.includes('agreement')) {
      detectedCategory = 'exchange-agreement';
    } else if (lowerFileName.includes('1031') || lowerFileName.includes('form')) {
      detectedCategory = '1031-forms';
    } else if (lowerFileName.includes('property') || lowerFileName.includes('deed') || lowerFileName.includes('title')) {
      detectedCategory = 'property-documents';
    } else if (lowerFileName.includes('tax') || lowerFileName.includes('w2') || lowerFileName.includes('1099')) {
      detectedCategory = 'tax-documents';
    } else if (lowerFileName.includes('legal') || lowerFileName.includes('contract') || lowerFileName.includes('disclosure')) {
      detectedCategory = 'legal-documents';
    } else if (lowerFileName.includes('compliance') || lowerFileName.includes('regulation')) {
      detectedCategory = 'compliance-forms';
    } else if (lowerFileName.includes('letter') || lowerFileName.includes('email') || lowerFileName.includes('communication')) {
      detectedCategory = 'client-communications';
    }

    return { name: cleanName, category: detectedCategory };
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDocumentTemplates();
      setTemplates(response || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const info = extractDocumentInfo(file);
      setUploadForm({
        ...uploadForm,
        file,
        name: info.name,
        category: info.category
      });
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.name || !uploadForm.category) {
      alert('Please select a file and provide all required information');
      return;
    }

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', uploadForm.file);
    formData.append('name', uploadForm.name);
    formData.append('description', uploadForm.description);
    formData.append('category', uploadForm.category);

    try {
      await apiService.uploadDocumentTemplate(formData);
      
      await loadTemplates();
      setShowUploadModal(false);
      setUploadForm({ name: '', description: '', category: '', file: null });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload template document');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await apiService.delete(`/documents/templates/${templateId}`);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    else return Math.round(bytes / 1048576) + ' MB';
  };

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId) || { id: 'other', name: 'Other', icon: '📁' };
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access template management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <DocumentPlusIcon className="w-8 h-8 mr-3 text-blue-600" />
                Template Document Manager
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage document templates for 1031 exchanges
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center shadow-lg"
            >
              <CloudArrowUpIcon className="w-5 h-5 mr-2" />
              Upload Template
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Category Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FunnelIcon className="w-4 h-4 inline mr-1" />
                Filter by Category
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Categories
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.icon} {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="lg:w-80">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MagnifyingGlassIcon className="w-4 h-4 inline mr-1" />
                Search Templates
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or description..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading templates...</span>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <DocumentPlusIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your filters or search term'
                : 'Upload your first template document to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const category = getCategoryInfo(template.category);
              return (
                <div
                  key={template.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-2xl mr-2">{category.icon}</span>
                          <span className="text-sm font-medium text-gray-500">{category.name}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{template.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{template.description || 'No description'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>{formatFileSize(template.size)}</span>
                      <span>{new Date(template.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => window.open(template.url, '_blank')}
                          className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg transition-colors"
                          title="View document"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <a
                          href={template.url}
                          download
                          className="p-2 text-green-600 hover:text-green-800 bg-green-50 rounded-lg transition-colors"
                          title="Download document"
                        >
                          <ArrowDownTrayIcon className="w-5 h-5" />
                        </a>
                      </div>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="p-2 text-red-600 hover:text-red-800 bg-red-50 rounded-lg transition-colors"
                        title="Delete template"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Upload Template Document</h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadForm({ name: '', description: '', category: '', file: null });
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Document File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {uploadForm.file ? (
                      <div>
                        <DocumentTextIcon className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-900">{uploadForm.file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(uploadForm.file.size)}</p>
                      </div>
                    ) : (
                      <div>
                        <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-900">Click to upload file</p>
                        <p className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX, TXT up to 10MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Document Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Name *
                </label>
                <input
                  type="text"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  placeholder="e.g., Exchange Agreement Template"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-extracted from filename, but you can edit it</p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Auto-detected based on filename</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Brief description of this template document..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadForm({ name: '', description: '', category: '', file: null });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploadingFile || !uploadForm.file || !uploadForm.name || !uploadForm.category}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {uploadingFile ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                    Upload Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateDocumentManager;