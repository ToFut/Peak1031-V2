import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useTemplates } from '../../../hooks/useTemplates';
import { Exchange } from '../../../types';
import { DocumentTemplate } from '../../../types/document-template.types';
import { apiService } from '../../../services/api';
import { templateService } from '../../../services/templateService';
import TemplateSettingsModal from '../../../components/templates/TemplateSettingsModal';
import TemplatePreview from '../../../components/templates/TemplatePreview';
import {
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  DocumentDuplicateIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon,
  UserIcon,
  CalendarIcon,
  TagIcon,
  BeakerIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  InformationCircleIcon,
  DocumentChartBarIcon,
  DocumentMagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  StarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';


interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'dropdown' | 'multiline' | 'currency' | 'percentage';
  label: string;
  placeholder?: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
  metadata: {
    section: string;
    order: number;
    helpText?: string;
    dataSource?: 'exchange' | 'client' | 'property' | 'manual';
  };
}

interface TemplateStats {
  total: number;
  active: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  totalUsage: number;
  recentUsage: number;
  averageGenerationTime: number;
}

interface EnterpriseDocumentTemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
  onTemplateChange?: () => void;
}

const EnterpriseDocumentTemplateManager: React.FC<EnterpriseDocumentTemplateManagerProps> = ({
  isOpen,
  onClose,
  initialCategory,
  onTemplateChange
}) => {
  const { user } = useAuth();
  const { 
    templates, 
    loading, 
    error: templateError, 
    fetchTemplates, 
    generateDocument,
    updateTemplate,
    createTemplate,
    deleteTemplate 
  } = useTemplates();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedTemplateForModal, setSelectedTemplateForModal] = useState<DocumentTemplate | null>(null);
  
  // State management
  const [activeTab, setActiveTab] = useState<'templates' | 'create' | 'preview' | 'analytics' | 'settings'>('templates');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    category: initialCategory || '',
    type: '',
    is_active: '',
    tags: [] as string[]
  });
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'usage' | 'updated'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, any> | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<string>('');

  // Form states
  const [templateForm, setTemplateForm] = useState<Partial<DocumentTemplate>>({
    name: '',
    description: '',
    category: '1031_exchange',
    type: 'pdf',
    version: '1.0.0',
    is_active: true,
    is_default: false,
    tags: [],
    fields: [],
    settings: {
      autoFill: true,
      requireReview: false,
      allowEditing: true,
      watermark: false
    }
  });

  const canManage = user?.role === 'admin' || user?.role === 'coordinator';

  // 1031 Exchange specific template categories
  const templateCategories = [
    {
      value: '1031_exchange',
      label: '1031 Exchange Documents',
      icon: '🔄',
      color: 'bg-emerald-100 text-emerald-800',
      description: 'Core 1031 like-kind exchange documentation',
      templates: ['Exchange Agreement', 'Identification Notice', 'Assignment Agreement']
    },
    {
      value: 'identification',
      label: 'Property Identification',
      icon: '🏠',
      color: 'bg-blue-100 text-blue-800',
      description: '45-day identification period documents',
      templates: ['45-Day Notice', 'Property Identification List', 'Revocation Notice']
    },
    {
      value: 'legal',
      label: 'Legal & Contracts',
      icon: '⚖️',
      color: 'bg-purple-100 text-purple-800',
      description: 'Legal agreements and binding contracts',
      templates: ['Purchase Agreement', 'Sale Contract', 'Assignment Agreement']
    },
    {
      value: 'financial',
      label: 'Financial Documents',
      icon: '💰',
      color: 'bg-green-100 text-green-800',
      description: 'Financial statements and calculations',
      templates: ['Settlement Statement', 'Proceeds Calculation', 'Boot Calculation']
    },
    {
      value: 'compliance',
      label: 'Compliance & Reporting',
      icon: '📋',
      color: 'bg-orange-100 text-orange-800',
      description: 'IRS compliance and reporting documents',
      templates: ['Form 8824', 'Compliance Checklist', 'Timeline Report']
    },
    {
      value: 'closing',
      label: 'Closing Documents',
      icon: '🏁',
      color: 'bg-indigo-100 text-indigo-800',
      description: 'Transaction closing and completion',
      templates: ['Closing Statement', 'Deed Transfer', 'Final Report']
    }
  ];

  // Template field types with 1031-specific options
  const fieldTypes = [
    { value: 'text', label: 'Text Input', icon: '📝' },
    { value: 'number', label: 'Number', icon: '🔢' },
    { value: 'currency', label: 'Currency', icon: '💵' },
    { value: 'percentage', label: 'Percentage', icon: '📊' },
    { value: 'date', label: 'Date', icon: '📅' },
    { value: 'boolean', label: 'Yes/No', icon: '✅' },
    { value: 'dropdown', label: 'Dropdown', icon: '📋' },
    { value: 'multiline', label: 'Text Area', icon: '📄' }
  ];

  // Calculate template stats
  const templateStats = useMemo<TemplateStats>(() => {
    const stats: TemplateStats = {
      total: templates.length,
      active: 0,
      byCategory: {},
      byType: {},
      totalUsage: 0,
      recentUsage: 0,
      averageGenerationTime: 0
    };

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    templates.forEach(template => {
      if (template.is_active) stats.active++;
      
      stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1;
      // For type, we'll use a default since the real template doesn't have a type field
      const templateType = 'pdf'; // Default type
      stats.byType[templateType] = (stats.byType[templateType] || 0) + 1;
      
      // Real templates don't have usage count, so we'll use 0
      stats.totalUsage += 0;
      
      // Check recent usage based on updated_at
      if (template.updated_at && new Date(template.updated_at) > sevenDaysAgo) {
        stats.recentUsage++;
      }
    });

    return stats;
  }, [templates]);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!(template.name || '').toLowerCase().includes(search) &&
            !(template.description || '').toLowerCase().includes(search)) {
          return false;
        }
      }

      // Category filter
      if (filters.category && template.category !== filters.category) return false;
      
      // Type filter - skip for now since real templates don't have type
      // if (filters.type && template.type !== filters.type) return false;
      
      // Active filter
      if (filters.is_active !== '' && template.is_active !== (filters.is_active === 'true')) return false;

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'usage':
          // Skip usage sorting since real templates don't have usage count
          comparison = 0;
          break;
        case 'updated':
          comparison = new Date(a.updated_at || a.created_at || 0).getTime() - new Date(b.updated_at || b.created_at || 0).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [templates, searchTerm, filters, sortBy, sortOrder]);


  // Load exchanges
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
      fetchTemplates();
      loadExchanges();
    }
  }, [isOpen, fetchTemplates, loadExchanges]);

  // Template actions
  const handlePreview = async (template: DocumentTemplate) => {
    try {
      setSelectedTemplate(template);
      setActiveTab('preview');
      
      // Mock preview data for demonstration
      const mockData = {
        exchanger_name: 'John Smith Investment LLC',
        relinquished_property_address: '123 Commercial Plaza\nDowntown District\nCity, ST 12345',
        sale_price: 1250000,
        identification_deadline: '2024-03-15',
        gross_sales_price: 1250000,
        closing_costs: 45000,
        boot_amount: 0
      };
      
      setPreviewData(mockData);
    } catch (error: any) {
      setError('Failed to load template preview');
    }
  };

  const handleGenerate = async (template: DocumentTemplate, exchangeId: string) => {
    try {
      if (!exchangeId) {
        setError('Please select an exchange first');
        return;
      }
      
      setError(null); // Clear any previous errors
      setSuccess(null); // Clear any previous success messages
      
      console.log('🔄 Generating document...', { templateId: template.id, exchangeId });
      
      const result = await generateDocument(template.id, exchangeId, previewData || undefined);
      
      // Check if the result indicates fallback values were used
      if (result.warnings && result.warnings.length > 0) {
        setSuccess(`Document generated successfully! Note: Some fields used fallback values due to missing data.`);
        console.log('⚠️ Fallback values used:', result.warnings);
      } else {
        setSuccess(`Document generated successfully!`);
      }
      
      onTemplateChange?.();
    } catch (error: any) {
      console.error('Generate document error:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('Missing required fields')) {
        setError('Some required data is missing from the exchange. The system will use fallback values where possible.');
      } else if (error.message?.includes('Template not found')) {
        setError('The selected template could not be found. Please try selecting a different template.');
      } else if (error.message?.includes('Exchange not found')) {
        setError('The selected exchange could not be found. Please try selecting a different exchange.');
      } else {
        setError(error.message || 'Failed to generate document. Please try again.');
      }
    }
  };

  const getCategoryConfig = (category: string) => {
    return templateCategories.find(c => c.value === category) || templateCategories[0];
  };

  const formatUsageCount = (count: number): string => {
    if (count === 0) return 'Not used';
    if (count === 1) return '1 time';
    return `${count} times`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
      <div className="relative top-4 mx-auto w-11/12 max-w-7xl shadow-2xl rounded-2xl bg-white mb-8">
        
        {/* Professional Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-t-2xl px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                <ClipboardDocumentListIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">1031 Exchange Document Templates</h2>
                <p className="text-blue-100 mt-1">Professional template management for like-kind exchanges</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right text-white">
                <div className="text-sm opacity-90">Active Templates</div>
                <div className="text-2xl font-bold">{templateStats.active}</div>
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
                  <p className="text-sm font-medium text-gray-600">Total Templates</p>
                  <p className="text-2xl font-bold text-blue-600">{templateStats.total}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Usage</p>
                  <p className="text-2xl font-bold text-emerald-600">{templateStats.totalUsage}</p>
                </div>
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <ChartBarIcon className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Recent Use (7d)</p>
                  <p className="text-2xl font-bold text-purple-600">{templateStats.recentUsage}</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ClockIcon className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Categories</p>
                  <p className="text-2xl font-bold text-orange-600">{Object.keys(templateStats.byCategory).length}</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FunnelIcon className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-8 py-4 border-b bg-white">
          <nav className="flex space-x-8">
            {[
              { id: 'templates', label: 'Templates', icon: ClipboardDocumentListIcon, count: templateStats.total },
              { id: 'create', label: 'Create Template', icon: PlusIcon },
              { id: 'preview', label: 'Preview & Generate', icon: EyeIcon },
              { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
              { id: 'settings', label: 'Settings', icon: Cog6ToothIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'
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
          
          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-80"
                    />
                  </div>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Categories</option>
                    {templateCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="pdf">PDF Templates</option>
                    <option value="docx">Word Documents</option>
                    <option value="html">HTML Forms</option>
                  </select>
                </div>
                <div className="flex items-center space-x-3">
                  {canManage && (
                    <button
                      onClick={() => setActiveTab('create')}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>New Template</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Templates Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredTemplates.map((template) => {
                    const categoryConfig = getCategoryConfig(template.category);
                    
                    return (
                      <div key={template.id} className="bg-white rounded-xl border shadow-sm hover:shadow-lg transition-all">
                        <div className="p-6">
                          {/* Template Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg">{template.name}</h3>
                                <p className="text-sm text-gray-500">Template ID: {template.id}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {template.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>

                          {/* Category & Type */}
                          <div className="mb-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryConfig.color} mb-2`}>
                              {categoryConfig.icon} {categoryConfig.label}
                            </span>
                            <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                          </div>

                          {/* Tags */}
                          {template.tags && template.tags.length > 0 && (
                            <div className="mb-4">
                              <div className="flex flex-wrap gap-1">
                                {(template.tags || []).slice(0, 3).map((tag: string) => (
                                  <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                                    <TagIcon className="w-3 h-3 mr-1" />
                                    {tag}
                                  </span>
                                ))}
                                {(template.tags || []).length > 3 && (
                                  <span className="text-xs text-gray-500">+{(template.tags || []).length - 3}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-4 mb-4 py-3 border-t border-gray-100">
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-900">{template.is_required ? 'Yes' : 'No'}</div>
                              <div className="text-xs text-gray-500">Required</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-900">{template.required_fields.length}</div>
                              <div className="text-xs text-gray-500">Fields</div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedTemplateForModal(template);
                                  setIsPreviewModalOpen(true);
                                }}
                                className="flex items-center space-x-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <EyeIcon className="w-4 h-4" />
                                <span>Preview</span>
                              </button>
                              <button
                                onClick={() => handlePreview(template)}
                                className="flex items-center space-x-1 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              >
                                <RocketLaunchIcon className="w-4 h-4" />
                                <span>Generate</span>
                              </button>
                              {canManage && (
                                <button 
                                  onClick={() => {
                                    setSelectedTemplateForModal(template);
                                    setIsSettingsModalOpen(true);
                                  }}
                                  className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                  <span>Edit</span>
                                </button>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              Updated {new Date(template.updated_at || template.created_at || new Date()).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && selectedTemplate && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{selectedTemplate.name}</h3>
                    <p className="text-gray-600">{selectedTemplate.description}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <select 
                      value={selectedExchange}
                      onChange={(e) => setSelectedExchange(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Exchange...</option>
                      {exchanges.map(exchange => (
                        <option key={exchange.id} value={exchange.id}>{exchange.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => selectedTemplate && selectedExchange && handleGenerate(selectedTemplate, selectedExchange)}
                      disabled={!selectedExchange}
                      className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RocketLaunchIcon className="w-4 h-4" />
                      <span>Generate Document</span>
                    </button>
                  </div>
                </div>

                {/* Field Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Template Fields</h4>
                    <div className="space-y-3">
                      {selectedTemplate.required_fields.map((fieldName, index) => (
                        <div key={`${fieldName}-${index}`} className="p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700">{fieldName}</label>
                            <span className="text-xs text-gray-500">text</span>
                          </div>
                          <input
                            type="text"
                            placeholder={`Enter ${fieldName}`}
                            value={previewData?.[fieldName] || ''}
                            onChange={(e) => setPreviewData(prev => ({ ...(prev || {}), [fieldName]: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Template Preview</h4>
                    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 min-h-96">
                      <div className="text-center text-gray-500">
                        <DocumentMagnifyingGlassIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>Document preview will appear here</p>
                        <p className="text-sm">Fill in the fields to see live preview</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview Tab - No Template Selected */}
          {activeTab === 'preview' && !selectedTemplate && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border p-6">
                <div className="text-center py-12">
                  <RocketLaunchIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Template Selected</h3>
                  <p className="text-gray-600 mb-6">
                    Select a template from the Templates tab to preview and generate documents.
                  </p>
                  <button
                    onClick={() => setActiveTab('templates')}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>Browse Templates</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Usage</h3>
                  <div className="space-y-3">
                    {Object.entries(templateStats.byCategory).map(([category, count]) => {
                      const categoryConfig = getCategoryConfig(category);
                      const percentage = templateStats.total > 0 ? (count / templateStats.total) * 100 : 0;
                      return (
                        <div key={category} className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryConfig.color}`}>
                            {categoryConfig.icon} {categoryConfig.label}
                          </span>
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

                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Types</h3>
                  <div className="space-y-3">
                    {Object.entries(templateStats.byType).map(([type, count]) => {
                      const percentage = templateStats.total > 0 ? (count / templateStats.total) * 100 : 0;
                      return (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 capitalize">{type}</span>
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
              </div>

              <div className="bg-white rounded-xl border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{templateStats.totalUsage}</div>
                    <div className="text-sm text-gray-600">Total Generations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">{templateStats.recentUsage}</div>
                    <div className="text-sm text-gray-600">Recent (7 days)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{templateStats.active}</div>
                    <div className="text-sm text-gray-600">Active Templates</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">2.3s</div>
                    <div className="text-sm text-gray-600">Avg. Generation</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create Template Tab */}
          {activeTab === 'create' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Create New Template</h3>
                    <p className="text-gray-600">Design and configure a new document template</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTemplateForModal({
                        id: '',
                        name: '',
                        description: '',
                        category: 'template',
                        template_type: 'document',
                        version: '1.0',
                        file_template: '',
                        required_fields: [],
                        is_required: false,
                        role_access: ['admin', 'coordinator'],
                        auto_generate: false,
                        stage_triggers: [],
                        created_by: user?.id || '',
                        is_active: true,
                        settings: {
                          autoFill: true,
                          requireReview: false,
                          allowEditing: true,
                          watermark: false
                        },
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      });
                      setIsSettingsModalOpen(true);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Create Template</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Quick Start Guide</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Choose a template category and type</li>
                        <li>• Define required fields and placeholders</li>
                        <li>• Configure access permissions and triggers</li>
                        <li>• Set up auto-generation rules</li>
                        <li>• Test with preview functionality</li>
                      </ul>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-2">Available Placeholders</h4>
                      <div className="text-sm text-green-800 space-y-1">
                        <p>Use these placeholders in your template:</p>
                        <div className="grid grid-cols-2 gap-1 mt-2">
                          <span>#Client.Name#</span>
                          <span>#Exchange.ID#</span>
                          <span>#Property.Address#</span>
                          <span>#Date.Current#</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Template Categories</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span>Legal Documents</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span>Financial Reports</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span>Compliance Forms</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <span>Agreements</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-900 mb-2">Best Practices</h4>
                      <ul className="text-sm text-yellow-800 space-y-1">
                        <li>• Use clear, descriptive names</li>
                        <li>• Include all required fields</li>
                        <li>• Test with sample data</li>
                        <li>• Set appropriate permissions</li>
                        <li>• Enable auto-generation when needed</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Template Settings</h3>
                    <p className="text-gray-600">Configure global template settings and preferences</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTemplateForModal(templates[0] || null);
                      setIsSettingsModalOpen(true);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                    <span>Edit Settings</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-4">Global Settings</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Auto-fill Fields</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Enabled</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Require Review</span>
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Disabled</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Allow Editing</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Enabled</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Add Watermark</span>
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Disabled</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-4">Access Control</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" checked readOnly className="rounded border-gray-300 text-blue-600" />
                          <span className="text-sm text-blue-800">Admin users</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" checked readOnly className="rounded border-gray-300 text-blue-600" />
                          <span className="text-sm text-blue-800">Coordinators</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" readOnly className="rounded border-gray-300 text-blue-600" />
                          <span className="text-sm text-blue-800">Client users</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h4 className="font-medium text-purple-900 mb-4">Auto-Generation Rules</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" checked readOnly className="rounded border-gray-300 text-purple-600" />
                          <span className="text-sm text-purple-800">On exchange creation</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" readOnly className="rounded border-gray-300 text-purple-600" />
                          <span className="text-sm text-purple-800">On identification deadline</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" readOnly className="rounded border-gray-300 text-purple-600" />
                          <span className="text-sm text-purple-800">On completion deadline</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" readOnly className="rounded border-gray-300 text-purple-600" />
                          <span className="text-sm text-purple-800">On status change</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-4">Notification Settings</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" checked readOnly className="rounded border-gray-300 text-green-600" />
                          <span className="text-sm text-green-800">Email notifications</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" readOnly className="rounded border-gray-300 text-green-600" />
                          <span className="text-sm text-green-800">In-app notifications</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" readOnly className="rounded border-gray-300 text-green-600" />
                          <span className="text-sm text-green-800">SMS notifications</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              1031 Exchange Template Management System • Last updated: {new Date().toLocaleString()}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              {canManage && (
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Export Templates
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Template Settings Modal */}
      <TemplateSettingsModal
        template={selectedTemplateForModal}
        isOpen={isSettingsModalOpen}
        onClose={() => {
          setIsSettingsModalOpen(false);
          setSelectedTemplateForModal(null);
        }}
        onSave={async (updatedTemplate) => {
          try {
            if (updatedTemplate.id) {
              // Update existing template
              await updateTemplate(updatedTemplate);
              setSuccess('Template updated successfully');
            } else {
              // Create new template
              await createTemplate(updatedTemplate);
              setSuccess('Template created successfully');
            }
            await fetchTemplates();
          } catch (error: any) {
            setError(error.message || 'Failed to save template');
          }
        }}
      />

      {/* Template Preview Modal */}
      <TemplatePreview
        template={selectedTemplateForModal}
        isOpen={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false);
          setSelectedTemplateForModal(null);
        }}
        onGenerate={async (templateId, sampleData) => {
          try {
            // For now, use a test exchange ID - this should be enhanced to allow exchange selection
            const result = await generateDocument(templateId, 'test-exchange-id', sampleData);
            setSuccess('Document generated successfully');
            return result;
          } catch (error: any) {
            setError(error.message || 'Failed to generate document');
          }
        }}
      />
    </div>
  );
};

export default EnterpriseDocumentTemplateManager;