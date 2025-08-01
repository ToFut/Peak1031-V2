import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import ModernCard from './ui/ModernCard';
import StatusBadge from './ui/StatusBadge';
import ModernDropdown from './ui/ModernDropdown';

import {
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

import { Exchange } from '../types';

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'rules' | 'custom';
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  required_fields: string[];
  signature_required: boolean;
  signatories: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

interface GenerationData {
  clientName: string;
  exchangeId: string;
  propertyAddress: string;
  ownershipPercentage: string;
  propertyValue: string;
  qiName: string;
  sellerName: string;
  buyerName: string;
  deadline45: string;
  deadline180: string;
}

const TemplateManager: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);

  // Upload form data
  const [uploadData, setUploadData] = useState({
    name: '',
    description: '',
    category: 'custom' as 'core' | 'rules' | 'custom',
    required_fields: [] as string[],
    signature_required: false,
    signatories: [] as string[],
    file: null as File | null
  });

  // Generation form data
  const [generationData, setGenerationData] = useState<GenerationData>({
    clientName: '',
    exchangeId: '',
    propertyAddress: '',
    ownershipPercentage: '',
    propertyValue: '',
    qiName: 'Peak 1031 Exchange Services',
    sellerName: '',
    buyerName: '',
    deadline45: '',
    deadline180: ''
  });

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Available field options
  const availableFields = [
    'clientName',
    'propertyAddress', 
    'propertyValue',
    'ownershipPercentage',
    'qiName',
    'sellerName',
    'buyerName',
    'deadline45',
    'deadline180',
    'exchangeNumber',
    'startDate',
    'endDate',
    'currentDate'
  ];

  const availableSignatories = [
    'Client',
    'QI (Qualified Intermediary)',
    'Seller',
    'Buyer',
    'Attorney',
    'Real Estate Agent',
    'Accountant',
    'Notary'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, exchangesData] = await Promise.all([
        apiService.getDocumentTemplates(),
        apiService.getExchanges()
      ]);

      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setExchanges(Array.isArray(exchangesData) ? exchangesData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type (accept Word docs, PDFs, etc.)
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid document file (PDF, Word, or Text)');
        return;
      }

      setUploadData(prev => ({ ...prev, file }));
    }
  };

  const handleUploadTemplate = async () => {
    if (!uploadData.file || !uploadData.name.trim()) {
      alert('Please provide a template name and select a file');
      return;
    }

    try {
      setUploading(true);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('name', uploadData.name);
      formData.append('description', uploadData.description);
      formData.append('category', uploadData.category);
      formData.append('required_fields', JSON.stringify(uploadData.required_fields));
      formData.append('signature_required', uploadData.signature_required.toString());
      formData.append('signatories', JSON.stringify(uploadData.signatories));

      await apiService.uploadDocumentTemplate(formData);

      alert('Template uploaded successfully!');
      setShowUploadModal(false);
      resetUploadForm();
      loadData();
    } catch (error) {
      console.error('Failed to upload template:', error);
      alert('Failed to upload template. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      await apiService.deleteDocumentTemplate(templateId);
      alert('Template deleted successfully!');
      loadData();
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template. Please try again.');
    }
  };

  const handleExchangeSelect = (exchange: Exchange) => {
    setSelectedExchange(exchange);
    
    // Auto-populate fields from exchange data
    setGenerationData(prev => ({
      ...prev,
      clientName: exchange.clientName || (exchange.client ? `${exchange.client.firstName} ${exchange.client.lastName}` : '') || exchange.name || '',
      exchangeId: exchange.id,
      propertyAddress: exchange.propertyAddress || exchange.relinquishedPropertyAddress || '',
      propertyValue: exchange.exchangeValue?.toString() || exchange.relinquishedValue?.toString() || '',
      sellerName: exchange.sellerName || '',
      buyerName: exchange.buyerName || exchange.clientName || (exchange.client ? `${exchange.client.firstName} ${exchange.client.lastName}` : '') || '',
      deadline45: exchange.deadline45 || exchange.identificationDeadline || '',
      deadline180: exchange.deadline180 || exchange.completionDeadline || ''
    }));
  };

  const handleGenerateDocument = async () => {
    if (!selectedTemplate || !selectedExchange) {
      alert('Please select both a template and an exchange');
      return;
    }

    // Validate required fields
    const missingFields = selectedTemplate.required_fields.filter(
      field => !generationData[field as keyof GenerationData]?.trim()
    );

    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    try {
      setGenerating(true);

      const generationRequest = {
        template_id: selectedTemplate.id,
        exchange_id: selectedExchange.id,
        generation_data: generationData,
        generated_by: user?.id || 'system'
      };

      const response = await apiService.generateDocumentFromTemplate(generationRequest);
      
      alert(`Document "${selectedTemplate.name}" generated successfully! Document ID: ${response.document_id}`);
      setShowGenerateModal(false);
      resetGenerationForm();
    } catch (error) {
      console.error('Failed to generate document:', error);
      alert('Failed to generate document. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const resetUploadForm = () => {
    setUploadData({
      name: '',
      description: '',
      category: 'custom',
      required_fields: [],
      signature_required: false,
      signatories: [],
      file: null
    });
  };

  const resetGenerationForm = () => {
    setSelectedTemplate(null);
    setSelectedExchange(null);
    setGenerationData({
      clientName: '',
      exchangeId: '',
      propertyAddress: '',
      ownershipPercentage: '',
      propertyValue: '',
      qiName: 'Peak 1031 Exchange Services',
      sellerName: '',
      buyerName: '',
      deadline45: '',
      deadline180: ''
    });
  };

  const addRequiredField = (field: string) => {
    if (!uploadData.required_fields.includes(field)) {
      setUploadData(prev => ({
        ...prev,
        required_fields: [...prev.required_fields, field]
      }));
    }
  };

  const removeRequiredField = (field: string) => {
    setUploadData(prev => ({
      ...prev,
      required_fields: prev.required_fields.filter(f => f !== field)
    }));
  };

  const addSignatory = (signatory: string) => {
    if (!uploadData.signatories.includes(signatory)) {
      setUploadData(prev => ({
        ...prev,
        signatories: [...prev.signatories, signatory]
      }));
    }
  };

  const removeSignatory = (signatory: string) => {
    setUploadData(prev => ({
      ...prev,
      signatories: prev.signatories.filter(s => s !== signatory)
    }));
  };

  const filteredTemplates = templates.filter(template => {
    if (categoryFilter === 'all') return true;
    return template.category === categoryFilter;
  });

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'core', label: 'Core Documents' },
    { value: 'rules', label: 'Rules Analysis' },
    { value: 'custom', label: 'Custom Templates' }
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFieldLabel = (field: string) => {
    return field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Templates</h2>
          <p className="text-gray-600 mt-1">
            {user?.role === 'admin' 
              ? 'Upload and manage document templates for 1031 exchanges'
              : 'Generate documents from available templates'
            }
          </p>
        </div>
        <div className="flex gap-3">
          <ModernDropdown
            options={categoryOptions}
            value={categoryFilter}
            onChange={setCategoryFilter}
            className="w-48"
          />
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <CloudArrowUpIcon className="w-4 h-4" />
              Upload Template
            </button>
          )}
          {(user?.role === 'admin' || user?.role === 'coordinator') && (
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <SparklesIcon className="w-4 h-4" />
              Generate Document
            </button>
          )}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <ModernCard key={template.id} hover>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  template.category === 'core' 
                    ? 'bg-blue-100 text-blue-600'
                    : template.category === 'rules'
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-purple-100 text-purple-600'
                }`}>
                  <DocumentTextIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <StatusBadge status={template.category} size="sm" variant="pill" />
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {template.signature_required && (
                  <div className="text-orange-500" title="Signature Required">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                {user?.role === 'admin' && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete Template"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">{template.description}</p>
            
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">File Info:</div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>{template.file_name}</span>
                  <span>•</span>
                  <span>{formatFileSize(template.file_size)}</span>
                </div>
              </div>

              {template.required_fields.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Required Fields:</div>
                  <div className="flex flex-wrap gap-1">
                    {template.required_fields.map((field) => (
                      <span key={field} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {getFieldLabel(field)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {template.signature_required && template.signatories.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Signatories:</div>
                  <div className="flex flex-wrap gap-1">
                    {template.signatories.map((signatory) => (
                      <span key={signatory} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                        {signatory}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-xs text-gray-500">
                Created {new Date(template.created_at).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.open(template.file_url, '_blank')}
                  className="text-blue-600 hover:text-blue-700 p-1"
                  title="Preview Template"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = template.file_url;
                    link.download = template.file_name;
                    link.click();
                  }}
                  className="text-green-600 hover:text-green-700 p-1"
                  title="Download Template"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </ModernCard>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <ModernCard className="text-center py-12">
          <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Found</h3>
          <p className="text-gray-600 mb-4">
            {categoryFilter === 'all' 
              ? 'No document templates have been uploaded yet.'
              : `No templates found in the ${categoryFilter} category.`
            }
          </p>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Upload First Template
            </button>
          )}
        </ModernCard>
      )}

      {/* Upload Template Modal */}
      {showUploadModal && user?.role === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Upload Document Template</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Template Name *</label>
                  <input
                    type="text"
                    value={uploadData.name}
                    onChange={(e) => setUploadData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Like-Kind Assignment Agreement"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={uploadData.category}
                    onChange={(e) => setUploadData(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="core">Core Documents</option>
                    <option value="rules">Rules Analysis</option>
                    <option value="custom">Custom Templates</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Brief description of this template and its purpose"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template File *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="template-file"
                    accept=".pdf,.doc,.docx,.txt"
                  />
                  <label htmlFor="template-file" className="cursor-pointer">
                    <div className="text-center">
                      <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <div className="text-sm text-gray-600">
                        {uploadData.file ? (
                          <div>
                            <p className="font-medium">{uploadData.file.name}</p>
                            <p>{formatFileSize(uploadData.file.size)}</p>
                          </div>
                        ) : (
                          <div>
                            <p>Click to upload or drag and drop</p>
                            <p>PDF, Word, or Text files</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Required Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Required Fields</label>
                <div className="border border-gray-300 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                    {availableFields.map((field) => (
                      <button
                        key={field}
                        type="button"
                        onClick={() => addRequiredField(field)}
                        className="text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300"
                      >
                        {getFieldLabel(field)}
                      </button>
                    ))}
                  </div>
                  
                  {uploadData.required_fields.length > 0 && (
                    <div className="pt-3 border-t">
                      <div className="text-sm text-gray-600 mb-2">Selected fields:</div>
                      <div className="flex flex-wrap gap-2">
                        {uploadData.required_fields.map((field) => (
                          <span
                            key={field}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full flex items-center gap-2"
                          >
                            {getFieldLabel(field)}
                            <button
                              onClick={() => removeRequiredField(field)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <XMarkIcon className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Signature Requirements */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="signature-required"
                    checked={uploadData.signature_required}
                    onChange={(e) => setUploadData(prev => ({ ...prev, signature_required: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="signature-required" className="text-sm font-medium text-gray-700">
                    This document requires signatures
                  </label>
                </div>

                {uploadData.signature_required && (
                  <div className="border border-gray-300 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                      {availableSignatories.map((signatory) => (
                        <button
                          key={signatory}
                          type="button"
                          onClick={() => addSignatory(signatory)}
                          className="text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-orange-50 hover:border-orange-300"
                        >
                          {signatory}
                        </button>
                      ))}
                    </div>
                    
                    {uploadData.signatories.length > 0 && (
                      <div className="pt-3 border-t">
                        <div className="text-sm text-gray-600 mb-2">Required signatories:</div>
                        <div className="flex flex-wrap gap-2">
                          {uploadData.signatories.map((signatory) => (
                            <span
                              key={signatory}
                              className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full flex items-center gap-2"
                            >
                              {signatory}
                              <button
                                onClick={() => removeSignatory(signatory)}
                                className="text-orange-600 hover:text-orange-800"
                              >
                                <XMarkIcon className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadTemplate}
                disabled={uploading || !uploadData.file || !uploadData.name.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="w-4 h-4" />
                    Upload Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Document Modal */}
      {showGenerateModal && (user?.role === 'admin' || user?.role === 'coordinator') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Generate Document</h3>
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  resetGenerationForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Template Selection */}
              <div>
                <h4 className="text-lg font-semibold mb-4">1. Select Template</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`w-full p-4 text-left border rounded-lg hover:bg-blue-50 transition-colors ${
                        selectedTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-gray-500">{template.description}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={template.category} size="sm" />
                            {template.signature_required && (
                              <span className="text-xs text-orange-600">Signature Required</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Exchange Selection */}
              <div>
                <h4 className="text-lg font-semibold mb-4">2. Select Exchange</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {exchanges.map((exchange) => (
                    <button
                      key={exchange.id}
                      onClick={() => handleExchangeSelect(exchange)}
                      className={`w-full p-4 text-left border rounded-lg hover:bg-green-50 transition-colors ${
                        selectedExchange?.id === exchange.id ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="font-medium">{exchange.name || exchange.clientName}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                        <StatusBadge status={exchange.status} size="sm" />
                        {exchange.exchangeValue && (
                          <span>${exchange.exchangeValue.toLocaleString()}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Form Fields */}
            {selectedTemplate && selectedExchange && (
              <div className="mt-8">
                <h4 className="text-lg font-semibold mb-4">3. Document Data</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedTemplate.required_fields.map((field) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field === 'clientName' && <UserIcon className="w-4 h-4 inline mr-1" />}
                        {field === 'propertyAddress' && <MapPinIcon className="w-4 h-4 inline mr-1" />}
                        {field === 'propertyValue' && <CurrencyDollarIcon className="w-4 h-4 inline mr-1" />}
                        {field === 'qiName' && <BuildingOfficeIcon className="w-4 h-4 inline mr-1" />}
                        {getFieldLabel(field)} *
                      </label>
                      <input
                        type="text"
                        value={generationData[field as keyof GenerationData] || ''}
                        onChange={(e) => setGenerationData(prev => ({ 
                          ...prev, 
                          [field]: e.target.value 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder={getFieldLabel(field)}
                      />
                    </div>
                  ))}
                </div>

                {selectedTemplate.signature_required && selectedTemplate.signatories.length > 0 && (
                  <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h5 className="font-semibold text-orange-900 mb-2">Signature Requirements</h5>
                    <p className="text-sm text-orange-700 mb-2">This document will require signatures from:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.signatories.map((signatory) => (
                        <span key={signatory} className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
                          {signatory}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  resetGenerationForm();
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateDocument}
                disabled={generating || !selectedTemplate || !selectedExchange}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    Generate Document
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

export default TemplateManager;