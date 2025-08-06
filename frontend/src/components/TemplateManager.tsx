import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import ModernCard from './ui/ModernCard';
import StatusBadge from './ui/StatusBadge';
import ModernDropdown from './ui/ModernDropdown';
import DocumentViewer from './DocumentViewer';

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
  SparklesIcon,
  Squares2X2Icon,
  QueueListIcon
} from '@heroicons/react/24/outline';

import { Exchange } from '../types';

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  file_template: string;
  required_fields: string[];
  is_required: boolean;
  role_access: string[];
  auto_generate: boolean;
  stage_triggers?: string[];
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

// Available placeholder fields that can be used in templates
const AVAILABLE_PLACEHOLDER_FIELDS = [
  '#Matter.Number#',
  '#Matter.Name#',
  '#Exchange.ID#',
  '#Exchange.Number#',
  '#Exchange.Name#',
  '#Exchange.Type#',
  '#Exchange.Status#',
  '#Exchange.Value#',
  '#Client.Name#',
  '#Client.FirstName#',
  '#Client.LastName#',
  '#Client.Email#',
  '#Client.Phone#',
  '#Client.Company#',
  '#Property.Address#',
  '#Property.RelinquishedAddress#',
  '#Property.SalePrice#',
  '#Property.ReplacementValue#',
  '#Financial.ExchangeValue#',
  '#Financial.RelinquishedValue#',
  '#Financial.ReplacementValue#',
  '#Financial.SalePrice#',
  '#Date.Start#',
  '#Date.IdentificationDeadline#',
  '#Date.CompletionDeadline#',
  '#Date.RelinquishedClosing#',
  '#Date.Current#',
  '#Date.Today#',
  '#QI.Company#',
  '#QI.Name#',
  '#Coordinator.Name#',
  '#Coordinator.Email#',
  '#System.Priority#',
  '#System.RiskLevel#',
  '#System.Notes#',
  '#System.CurrentDate#',
  '#System.CurrentDateTime#'
];

// Helper function to get field description
const getFieldDescription = (field: string): string => {
  const descriptions: Record<string, string> = {
    '#Matter.Number#': 'Exchange/Matter number',
    '#Matter.Name#': 'Exchange/Matter name',
    '#Exchange.ID#': 'Unique exchange ID',
    '#Exchange.Number#': 'Exchange number',
    '#Exchange.Name#': 'Exchange name',
    '#Exchange.Type#': 'Type of exchange (Delayed, Reverse, etc.)',
    '#Exchange.Status#': 'Current exchange status',
    '#Exchange.Value#': 'Total exchange value',
    '#Client.Name#': 'Full client name',
    '#Client.FirstName#': 'Client first name',
    '#Client.LastName#': 'Client last name',
    '#Client.Email#': 'Client email address',
    '#Client.Phone#': 'Client phone number',
    '#Client.Company#': 'Client company name',
    '#Property.Address#': 'Property address',
    '#Property.RelinquishedAddress#': 'Relinquished property address',
    '#Property.SalePrice#': 'Property sale price',
    '#Property.ReplacementValue#': 'Replacement property value',
    '#Financial.ExchangeValue#': 'Total exchange value',
    '#Financial.RelinquishedValue#': 'Relinquished property value',
    '#Financial.ReplacementValue#': 'Replacement property value',
    '#Financial.SalePrice#': 'Property sale price',
    '#Date.Start#': 'Exchange start date',
    '#Date.IdentificationDeadline#': '45-day identification deadline',
    '#Date.CompletionDeadline#': '180-day completion deadline',
    '#Date.RelinquishedClosing#': 'Relinquished property closing date',
    '#Date.Current#': 'Current date',
    '#Date.Today#': 'Today\'s date',
    '#QI.Company#': 'Qualified Intermediary company',
    '#QI.Name#': 'Qualified Intermediary name',
    '#Coordinator.Name#': 'Exchange coordinator name',
    '#Coordinator.Email#': 'Exchange coordinator email',
    '#System.Priority#': 'Exchange priority level',
    '#System.RiskLevel#': 'Risk assessment level',
    '#System.Notes#': 'Client notes',
    '#System.CurrentDate#': 'Current date',
    '#System.CurrentDateTime#': 'Current date and time'
  };
  return descriptions[field] || field;
};

// Edit Template Modal Component
interface EditTemplateModalProps {
  template: DocumentTemplate;
  availableFields: string[];
  availableSignatories: string[];
  getFieldLabel: (field: string) => string;
  onSave: (template: DocumentTemplate) => void;
  onClose: () => void;
}

const EditTemplateModal: React.FC<EditTemplateModalProps> = ({
  template,
  availableFields,
  availableSignatories,
  getFieldLabel,
  onSave,
  onClose
}) => {
  const [editForm, setEditForm] = useState({
    name: template.name,
    description: template.description,
    category: template.category,
    required_fields: [...template.required_fields],
    role_access: template.role_access ? [...template.role_access] : ['client', 'coordinator', 'admin'],
    is_required: template.is_required,
    auto_generate: template.auto_generate,
    stage_triggers: template.stage_triggers || []
  });

  const addRequiredField = (field: string) => {
    if (!editForm.required_fields.includes(field)) {
      setEditForm(prev => ({
        ...prev,
        required_fields: [...prev.required_fields, field]
      }));
    }
  };

  const removeRequiredField = (field: string) => {
    setEditForm(prev => ({
      ...prev,
      required_fields: prev.required_fields.filter(f => f !== field)
    }));
  };

  const toggleRoleAccess = (role: string) => {
    setEditForm(prev => ({
      ...prev,
      role_access: prev.role_access.includes(role)
        ? prev.role_access.filter(r => r !== role)
        : [...prev.role_access, role]
    }));
  };

  const handleSave = () => {
    if (!editForm.name.trim()) {
      alert('Please provide a template name');
      return;
    }

    onSave({
      ...template,
      ...editForm
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Edit Template</h3>
          <button
            onClick={onClose}
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
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={editForm.category}
                onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value as any }))}
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
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
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
                    disabled={editForm.required_fields.includes(field)}
                    className="text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {getFieldLabel(field)}
                  </button>
                ))}
              </div>
              
              {editForm.required_fields.length > 0 && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-sm text-gray-600 mb-2">Selected Fields:</div>
                  <div className="flex flex-wrap gap-2">
                    {editForm.required_fields.map((field) => (
                      <span
                        key={field}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
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

          {/* Role Access */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role Access</label>
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="flex flex-wrap gap-2">
                {['client', 'coordinator', 'admin', 'agency'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRoleAccess(role)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      editForm.role_access.includes(role)
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Template Settings */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_required"
                checked={editForm.is_required}
                onChange={(e) => setEditForm(prev => ({ ...prev, is_required: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_required" className="ml-2 text-sm text-gray-700">
                Required template (must be used in exchanges)
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_generate"
                  checked={editForm.auto_generate}
                  onChange={(e) => setEditForm(prev => ({ ...prev, auto_generate: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="auto_generate" className="ml-2 text-sm text-gray-700">
                  Auto-generate documents from this template
                </label>
              </div>
              
              {editForm.auto_generate && (
                <div className="ml-6 p-3 bg-blue-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stage Triggers
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    Select which exchange stages should trigger automatic document generation:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {['PENDING', '45D', '180D', 'COMPLETED'].map((stage) => (
                      <label key={stage} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editForm.stage_triggers?.includes(stage) || false}
                          onChange={(e) => {
                            const triggers = editForm.stage_triggers || [];
                            if (e.target.checked) {
                              setEditForm(prev => ({
                                ...prev,
                                stage_triggers: [...triggers, stage]
                              }));
                            } else {
                              setEditForm(prev => ({
                                ...prev,
                                stage_triggers: triggers.filter(t => t !== stage)
                              }));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{stage}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const TemplateManager: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    current: '',
    results: [] as Array<{ file: string; success: boolean; error?: string }>
  });

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  const [viewerDocumentUrl, setViewerDocumentUrl] = useState<string | null>(null);

  // Upload form data
  const [uploadData, setUploadData] = useState({
    name: '',
    description: '',
    category: 'custom' as 'core' | 'rules' | 'custom',
    required_fields: [] as string[],
    signature_required: false,
    signatories: [] as string[],
    file: null as File | null,
    files: [] as File[],
    autoExtract: true,
    isBulkUpload: false
  });

  // Extraction results
  const [extractionResults, setExtractionResults] = useState<{
    extractedTitle?: string;
    extractedCategory?: string;
    extractedDescription?: string;
    extractionInfo?: any;
  } | null>(null);

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
  
  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'card'>('card');
  
  // Selection state for bulk operations
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    // Validate file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    const validFiles = files.filter(file => allowedTypes.includes(file.type));
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      alert(`${invalidFiles.length} files were skipped due to unsupported format. Supported formats: PDF, Word, and Text files.`);
    }
    
    if (validFiles.length === 0) {
      alert('No valid files selected. Please select PDF, Word, or Text files.');
      return;
    }

    if (validFiles.length === 1) {
      // Single file upload
      setUploadData(prev => ({ 
        ...prev, 
        file: validFiles[0], 
        files: [],
        isBulkUpload: false 
      }));
      
      // Perform auto-extraction if enabled
      if (uploadData.autoExtract) {
        await performContentExtraction(validFiles[0]);
      }
    } else {
      // Bulk upload
      setUploadData(prev => ({ 
        ...prev, 
        file: null,
        files: validFiles,
        isBulkUpload: true 
      }));
      
      // Reset bulk upload progress
      setBulkUploadProgress({
        total: validFiles.length,
        completed: 0,
        failed: 0,
        current: '',
        results: []
      });
    }
  };

  const performContentExtraction = async (file: File) => {
    try {
      // For now, we'll simulate extraction results based on filename
      // In a full implementation, you'd want a separate extraction endpoint
      const fileName = file.name.toLowerCase();
      let extractedTitle = file.name.replace(/\.[^/.]+$/, '');
      let extractedCategory = 'template';
      
      // Simple categorization based on filename
      if (fileName.includes('agreement') || fileName.includes('contract') || fileName.includes('legal')) {
        extractedCategory = 'legal';
      } else if (fileName.includes('financial') || fileName.includes('statement') || fileName.includes('closing')) {
        extractedCategory = 'financial';
      } else if (fileName.includes('1031') || fileName.includes('exchange')) {
        extractedCategory = '1031-exchange';
      }
      
      // Clean up the title
      extractedTitle = extractedTitle
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      
      setExtractionResults({
        extractedTitle,
        extractedCategory,
        extractedDescription: `Auto-extracted document template from ${file.name}`,
        extractionInfo: {
          titleExtracted: true,
          categoryExtracted: extractedCategory !== 'template',
          descriptionExtracted: true,
          contentLength: file.size
        }
      });
      
      // Auto-populate fields if they were extracted and fields are empty
      if (!uploadData.name.trim()) {
        setUploadData(prev => ({ ...prev, name: extractedTitle }));
      }
      if (uploadData.category === 'custom' && extractedCategory !== 'template') {
        setUploadData(prev => ({ ...prev, category: extractedCategory as any }));
      }
      if (!uploadData.description.trim()) {
        setUploadData(prev => ({ ...prev, description: `Auto-extracted document template from ${file.name}` }));
      }
    } catch (error) {
      console.error('Content extraction failed:', error);
      // Continue without extraction
    }
  };

  const handleUploadTemplate = async () => {
    if (uploadData.isBulkUpload) {
      return await handleBulkUpload();
    }

    // Single file upload validation
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
      formData.append('autoExtract', uploadData.autoExtract.toString());
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

  const handleBulkUpload = async () => {
    if (uploadData.files.length === 0) {
      alert('Please select files to upload');
      return;
    }

    try {
      setUploading(true);
      const results: Array<{ file: string; success: boolean; error?: string }> = [];

      for (let i = 0; i < uploadData.files.length; i++) {
        const file = uploadData.files[i];
        
        setBulkUploadProgress(prev => ({
          ...prev,
          current: file.name,
          completed: i
        }));

        try {
          // Extract file info for bulk upload
          const fileName = file.name.replace(/\.[^/.]+$/, '');
          const cleanName = fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
          
          // Auto-detect category
          let detectedCategory = uploadData.category;
          const lowerFileName = fileName.toLowerCase();
          if (lowerFileName.includes('agreement') || lowerFileName.includes('contract')) {
            detectedCategory = 'core';
          } else if (lowerFileName.includes('rule') || lowerFileName.includes('regulation')) {
            detectedCategory = 'rules';
          }

          const formData = new FormData();
          formData.append('file', file);
          formData.append('name', cleanName);
          formData.append('description', `Auto-imported: ${cleanName}`);
          formData.append('category', detectedCategory);
          formData.append('autoExtract', 'true');
          formData.append('required_fields', JSON.stringify(uploadData.required_fields));
          formData.append('signature_required', uploadData.signature_required.toString());
          formData.append('signatories', JSON.stringify(uploadData.signatories));

          await apiService.uploadDocumentTemplate(formData);
          
          results.push({ file: file.name, success: true });
          
          setBulkUploadProgress(prev => ({
            ...prev,
            completed: i + 1,
            results: [...prev.results, { file: file.name, success: true }]
          }));
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          results.push({ 
            file: file.name, 
            success: false, 
            error: error instanceof Error ? error.message : 'Upload failed' 
          });
          
          setBulkUploadProgress(prev => ({
            ...prev,
            failed: prev.failed + 1,
            completed: i + 1,
            results: [...prev.results, { file: file.name, success: false, error: 'Upload failed' }]
          }));
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      alert(`Bulk upload completed: ${successful} successful, ${failed} failed`);
      
      if (successful > 0) {
        loadData();
      }
      
      // Keep modal open to show results if there were failures
      if (failed === 0) {
        setShowUploadModal(false);
        resetUploadForm();
      }
    } catch (error) {
      console.error('Bulk upload failed:', error);
      alert('Bulk upload failed. Please try again.');
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

  const handleViewTemplate = async (template: DocumentTemplate) => {
    try {
      const documentUrl = await apiService.viewDocumentTemplate(template.id);
      setSelectedTemplate(template);
      setViewerDocumentUrl(documentUrl);
      setShowDocumentViewer(true);
    } catch (error) {
      console.error('Failed to view template:', error);
      alert('Failed to view template. Please try again.');
    }
  };

  const handleDownloadTemplate = async (template: DocumentTemplate) => {
    try {
      const blob = await apiService.downloadDocumentTemplate(template.id);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template:', error);
      alert('Failed to download template. Please try again.');
    }
  };

  // Selection handlers
  const handleSelectTemplate = (templateId: string) => {
    const newSelected = new Set(selectedTemplates);
    if (newSelected.has(templateId)) {
      newSelected.delete(templateId);
    } else {
      newSelected.add(templateId);
    }
    setSelectedTemplates(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedTemplates.size === filteredTemplates.length) {
      setSelectedTemplates(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedTemplates(new Set(filteredTemplates.map(t => t.id)));
      setShowBulkActions(true);
    }
  };

  const handleClearSelection = () => {
    setSelectedTemplates(new Set());
    setShowBulkActions(false);
  };

  // Bulk download handler
  const handleBulkDownload = async () => {
    const selectedTemplatesList = filteredTemplates.filter(t => selectedTemplates.has(t.id));
    
    if (selectedTemplatesList.length === 0) {
      alert('Please select templates to download');
      return;
    }

    try {
      setLoading(true);
      
      // Download each template
      for (const template of selectedTemplatesList) {
        try {
          const blob = await apiService.downloadDocumentTemplate(template.id);
          
          // Create download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${template.name}.pdf`;
          document.body.appendChild(link);
          link.click();
          
          // Cleanup
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          // Small delay to prevent overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to download ${template.name}:`, error);
        }
      }
      
      alert(`Downloaded ${selectedTemplatesList.length} templates successfully!`);
      handleClearSelection();
    } catch (error) {
      console.error('Bulk download failed:', error);
      alert('Bulk download failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Edit handlers
  const handleEditTemplate = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setShowEditModal(true);
  };

  const handleSaveTemplate = async (updatedTemplate: DocumentTemplate) => {
    try {
      setLoading(true);
      
      // Call API to update template
      await apiService.updateDocumentTemplate(updatedTemplate.id, {
        name: updatedTemplate.name,
        description: updatedTemplate.description,
        category: updatedTemplate.category,
        required_fields: updatedTemplate.required_fields,
        role_access: updatedTemplate.role_access,
        is_required: updatedTemplate.is_required,
        auto_generate: updatedTemplate.auto_generate,
        stage_triggers: updatedTemplate.stage_triggers
      });
      
      // Reload templates to get updated data
      await loadData();
      
      alert('Template updated successfully!');
      setShowEditModal(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Failed to update template:', error);
      alert('Failed to update template. Please try again.');
    } finally {
      setLoading(false);
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
      file: null,
      files: [],
      autoExtract: true,
      isBulkUpload: false
    });
    setExtractionResults(null);
    setBulkUploadProgress({
      total: 0,
      completed: 0,
      failed: 0,
      current: '',
      results: []
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
          
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'card'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Squares2X2Icon className="w-4 h-4" />
              Cards
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <QueueListIcon className="w-4 h-4" />
              List
            </button>
          </div>

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

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-blue-900">
              {selectedTemplates.size} template{selectedTemplates.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleClearSelection}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Download Selected ({selectedTemplates.size})
            </button>
          </div>
        </div>
      )}

      {/* Templates Display - Card View */}
      {viewMode === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <ModernCard key={template.id} hover className="relative">
              {/* Selection Checkbox */}
              <div className="absolute top-3 left-3 z-10">
                <input
                  type="checkbox"
                  checked={selectedTemplates.has(template.id)}
                  onChange={() => handleSelectTemplate(template.id)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>

              <div className="flex items-start justify-between mb-4 pl-8">
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
                  {template.is_required && (
                    <div className="text-orange-500" title="Required Template">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                  {user?.role === 'admin' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="text-blue-500 hover:text-blue-700 p-1"
                        title="Edit Template"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
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
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>
              
              <div className="space-y-3">
                {template.required_fields.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Required Fields:</div>
                    <div className="flex flex-wrap gap-1">
                      {template.required_fields.slice(0, 3).map((field) => (
                        <span key={field} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {getFieldLabel(field)}
                        </span>
                      ))}
                      {template.required_fields.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          +{template.required_fields.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {template.role_access && template.role_access.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Access Roles:</div>
                    <div className="flex flex-wrap gap-1">
                      {template.role_access.slice(0, 3).map((role) => (
                        <span key={role} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                      ))}
                      {template.role_access.length > 3 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded">
                          +{template.role_access.length - 3} more
                        </span>
                      )}
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
                    onClick={() => handleViewTemplate(template)}
                    className="text-blue-600 hover:text-blue-700 p-1"
                    title="View Template"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownloadTemplate(template)}
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
      )}

      {/* Templates Display - Grid/List View */}
      {viewMode === 'grid' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
            <div className="grid grid-cols-13 gap-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedTemplates.size === filteredTemplates.length && filteredTemplates.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="col-span-4">Template</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Fields</div>
              <div className="col-span-2">Access</div>
              <div className="col-span-1">Created</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="grid grid-cols-13 gap-4 items-center">
                  {/* Checkbox */}
                  <div className="col-span-1">
                    <input
                      type="checkbox"
                      checked={selectedTemplates.has(template.id)}
                      onChange={() => handleSelectTemplate(template.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>

                  {/* Template Name & Description */}
                  <div className="col-span-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        template.category === 'core' 
                          ? 'bg-blue-100 text-blue-600'
                          : template.category === 'rules'
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-purple-100 text-purple-600'
                      }`}>
                        <DocumentTextIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{template.name}</p>
                          {template.is_required && (
                            <span className="text-orange-500" title="Required Template">
                              <UserIcon className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-1">{template.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="col-span-2">
                    <StatusBadge status={template.category} size="sm" variant="pill" />
                  </div>

                  {/* Required Fields */}
                  <div className="col-span-2">
                    <div className="flex flex-wrap gap-1">
                      {template.required_fields.length === 0 ? (
                        <span className="text-xs text-gray-500">None</span>
                      ) : (
                        <>
                          {template.required_fields.slice(0, 2).map((field) => (
                            <span key={field} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              {getFieldLabel(field).substring(0, 8)}
                              {getFieldLabel(field).length > 8 ? '...' : ''}
                            </span>
                          ))}
                          {template.required_fields.length > 2 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              +{template.required_fields.length - 2}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Access Roles */}
                  <div className="col-span-2">
                    <div className="flex flex-wrap gap-1">
                      {template.role_access && template.role_access.length > 0 ? (
                        <>
                          {template.role_access.slice(0, 2).map((role) => (
                            <span key={role} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </span>
                          ))}
                          {template.role_access.length > 2 && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded">
                              +{template.role_access.length - 2}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-500">All</span>
                      )}
                    </div>
                  </div>

                  {/* Created Date */}
                  <div className="col-span-1">
                    <span className="text-xs text-gray-500">
                      {new Date(template.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleViewTemplate(template)}
                        className="text-blue-600 hover:text-blue-700 p-1.5 rounded-md hover:bg-blue-50"
                        title="View Template"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadTemplate(template)}
                        className="text-green-600 hover:text-green-700 p-1.5 rounded-md hover:bg-green-50"
                        title="Download Template"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                      </button>
                      {user?.role === 'admin' && (
                        <>
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="text-purple-600 hover:text-purple-700 p-1.5 rounded-md hover:bg-purple-50"
                            title="Edit Template"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50"
                            title="Delete Template"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <h3 className="text-2xl font-bold text-gray-900">
                {uploadData.isBulkUpload ? 'Bulk Upload Document Templates' : 'Upload Document Template'}
              </h3>
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
              {!uploadData.isBulkUpload && (
                <>
                  {/* Basic Info - Single Upload */}
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
                </>
              )}

              {uploadData.isBulkUpload && (
                <>
                  {/* Bulk Upload Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CloudArrowUpIcon className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-900">Bulk Upload Mode</h4>
                    </div>
                    <p className="text-sm text-blue-800">
                      {uploadData.files.length} files ready for upload. Names and categories will be auto-detected from filenames.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Default Category</label>
                    <select
                      value={uploadData.category}
                      onChange={(e) => setUploadData(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="core">Core Documents</option>
                      <option value="rules">Rules Analysis</option>
                      <option value="custom">Custom Templates</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      This will be used as fallback when category cannot be auto-detected from filename
                    </p>
                  </div>
                </>
              )}

              {/* Auto-extraction toggle */}
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="auto-extract"
                  checked={uploadData.autoExtract}
                  onChange={(e) => setUploadData(prev => ({ ...prev, autoExtract: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="auto-extract" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-blue-500" />
                  Automatically extract title and category from document content
                </label>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template File{uploadData.isBulkUpload ? 's' : ''} *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="template-file"
                    accept=".pdf,.doc,.docx,.txt"
                    multiple
                  />
                  <label htmlFor="template-file" className="cursor-pointer">
                    <div className="text-center">
                      <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <div className="text-sm text-gray-600">
                        {uploadData.isBulkUpload ? (
                          <div>
                            <p className="font-medium text-blue-600">
                              {uploadData.files.length} files selected for bulk upload
                            </p>
                            <div className="mt-2 max-h-32 overflow-y-auto">
                              {uploadData.files.slice(0, 5).map((file, idx) => (
                                <p key={idx} className="text-xs text-gray-500">
                                  • {file.name} ({formatFileSize(file.size)})
                                </p>
                              ))}
                              {uploadData.files.length > 5 && (
                                <p className="text-xs text-gray-500">
                                  ... and {uploadData.files.length - 5} more files
                                </p>
                              )}
                            </div>
                          </div>
                        ) : uploadData.file ? (
                          <div>
                            <p className="font-medium">{uploadData.file.name}</p>
                            <p>{formatFileSize(uploadData.file.size)}</p>
                          </div>
                        ) : (
                          <div>
                            <p>Click to upload or drag and drop</p>
                            <p>PDF, Word, or Text files</p>
                            <p className="text-xs text-blue-500 mt-1">
                              💡 Select multiple files for bulk upload
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                </div>

                {/* Bulk Upload Progress */}
                {uploading && uploadData.isBulkUpload && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">
                        Bulk Upload Progress
                      </span>
                      <span className="text-sm text-blue-600">
                        {bulkUploadProgress.completed} / {bulkUploadProgress.total}
                      </span>
                    </div>
                    
                    <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(bulkUploadProgress.completed / bulkUploadProgress.total) * 100}%` 
                        }}
                      />
                    </div>
                    
                    {bulkUploadProgress.current && (
                      <p className="text-xs text-blue-700">
                        Currently uploading: {bulkUploadProgress.current}
                      </p>
                    )}
                    
                    {bulkUploadProgress.failed > 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        {bulkUploadProgress.failed} files failed
                      </p>
                    )}
                  </div>
                )}

                {/* Bulk Upload Results */}
                {bulkUploadProgress.results.length > 0 && !uploading && (
                  <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Upload Results</h5>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {bulkUploadProgress.results.map((result, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          {result.success ? (
                            <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                          <span className={result.success ? 'text-green-700' : 'text-red-700'}>
                            {result.file}
                          </span>
                          {result.error && (
                            <span className="text-red-600">- {result.error}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Extraction Results */}
              {extractionResults && extractionResults.extractionInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <SparklesIcon className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">Auto-Extraction Results</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    {extractionResults.extractionInfo.titleExtracted && (
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                        <span className="text-green-800">Title automatically extracted: "{extractionResults.extractedTitle}"</span>
                      </div>
                    )}
                    {extractionResults.extractionInfo.categoryExtracted && (
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                        <span className="text-green-800">Category automatically detected: "{extractionResults.extractedCategory}"</span>
                      </div>
                    )}
                    {extractionResults.extractionInfo.descriptionExtracted && (
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                        <span className="text-green-800">Description auto-generated from content</span>
                      </div>
                    )}
                    <div className="text-xs text-blue-700 mt-2">
                      Content analyzed: {extractionResults.extractionInfo.contentLength} characters
                    </div>
                  </div>
                </div>
              )}

              {/* Available Placeholder Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Placeholder Fields
                </label>
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <p className="text-sm text-gray-600 mb-3">
                    Use these placeholders in your template documents. They will be replaced with actual exchange data when generating documents:
                  </p>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {AVAILABLE_PLACEHOLDER_FIELDS.map((field) => (
                      <div key={field} className="flex items-center justify-between p-2 bg-white rounded border">
                        <code className="text-blue-600 font-mono flex-shrink-0">{field}</code>
                        <span className="text-gray-500 text-right ml-2 text-xs">
                          {getFieldDescription(field)}
                        </span>
                      </div>
                    ))}
                  </div>
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
                disabled={uploading || 
                  (uploadData.isBulkUpload ? uploadData.files.length === 0 : (!uploadData.file || !uploadData.name.trim()))}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {uploadData.isBulkUpload ? 'Uploading Files...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="w-4 h-4" />
                    {uploadData.isBulkUpload ? `Upload ${uploadData.files.length} Templates` : 'Upload Template'}
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
                            {template.is_required && (
                              <span className="text-xs text-orange-600">Required Template</span>
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

                {selectedTemplate.is_required && (
                  <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h5 className="font-semibold text-orange-900 mb-2">Required Template</h5>
                    <p className="text-sm text-orange-700">This is a required document template for the exchange process.</p>
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

      {/* Edit Template Modal */}
      {showEditModal && editingTemplate && (
        <EditTemplateModal
          template={editingTemplate}
          availableFields={availableFields}
          availableSignatories={availableSignatories}
          getFieldLabel={getFieldLabel}
          onSave={handleSaveTemplate}
          onClose={() => {
            setShowEditModal(false);
            setEditingTemplate(null);
          }}
        />
      )}

      {/* Document Viewer Modal */}
      {showDocumentViewer && selectedTemplate && viewerDocumentUrl && (
        <DocumentViewer
          documentUrl={viewerDocumentUrl}
          documentId={selectedTemplate.id}
          documentName={selectedTemplate.name}
          onClose={() => {
            setShowDocumentViewer(false);
            setSelectedTemplate(null);
            if (viewerDocumentUrl) {
              URL.revokeObjectURL(viewerDocumentUrl);
            }
            setViewerDocumentUrl(null);
          }}
          onDownload={() => handleDownloadTemplate(selectedTemplate)}
        />
      )}
    </div>
  );
};

export default TemplateManager;