import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { Exchange } from '../types';
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

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'pdf' | 'docx' | 'html' | 'form';
  version: string;
  isActive: boolean;
  isDefault: boolean;
  tags: string[];
  fields: TemplateField[];
  metadata: {
    author: string;
    createdAt: string;
    updatedAt: string;
    lastUsed?: string;
    usageCount: number;
    fileSize?: number;
    previewUrl?: string;
  };
  compatibility: {
    exchanges: string[];
    roles: string[];
    requirements: string[];
  };
  settings: {
    autoFill: boolean;
    requireReview: boolean;
    allowEditing: boolean;
    expiresAfterDays?: number;
    watermark?: boolean;
  };
}

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
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // State management
  const [activeTab, setActiveTab] = useState<'templates' | 'create' | 'preview' | 'analytics' | 'settings'>('templates');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    category: initialCategory || '',
    type: '',
    isActive: '',
    tags: [] as string[]
  });
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'usage' | 'updated'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, any> | null>(null);

  // Form states
  const [templateForm, setTemplateForm] = useState<Partial<DocumentTemplate>>({
    name: '',
    description: '',
    category: '1031_exchange',
    type: 'pdf',
    version: '1.0.0',
    isActive: true,
    isDefault: false,
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
      if (template.isActive) stats.active++;
      
      stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1;
      stats.byType[template.type] = (stats.byType[template.type] || 0) + 1;
      stats.totalUsage += template.metadata.usageCount || 0;
      
      if (template.metadata.lastUsed && new Date(template.metadata.lastUsed) > sevenDaysAgo) {
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
        if (!template.name.toLowerCase().includes(search) &&
            !template.description.toLowerCase().includes(search) &&
            !template.tags.some(tag => tag.toLowerCase().includes(search))) {
          return false;
        }
      }

      // Category filter
      if (filters.category && template.category !== filters.category) return false;
      
      // Type filter
      if (filters.type && template.type !== filters.type) return false;
      
      // Active filter
      if (filters.isActive !== '' && template.isActive !== (filters.isActive === 'true')) return false;

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
          comparison = (a.metadata.usageCount || 0) - (b.metadata.usageCount || 0);
          break;
        case 'updated':
          comparison = new Date(a.metadata.updatedAt).getTime() - new Date(b.metadata.updatedAt).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [templates, searchTerm, filters, sortBy, sortOrder]);

  // Load templates
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/documents/templates');
      
      // Transform mock data for 1031 templates
      const mockTemplates: DocumentTemplate[] = [
        {
          id: '1',
          name: '1031 Exchange Agreement',
          description: 'Comprehensive 1031 like-kind exchange agreement template with all required IRS compliance elements',
          category: '1031_exchange',
          type: 'pdf',
          version: '2.1.0',
          isActive: true,
          isDefault: true,
          tags: ['1031', 'exchange', 'agreement', 'irs', 'compliance'],
          fields: [
            {
              id: 'exchanger_name',
              name: 'exchanger_name',
              type: 'text',
              label: 'Exchanger Name',
              required: true,
              defaultValue: '',
              metadata: { section: 'Parties', order: 1, dataSource: 'client' }
            },
            {
              id: 'relinquished_property_address',
              name: 'relinquished_property_address',
              type: 'multiline',
              label: 'Relinquished Property Address',
              required: true,
              defaultValue: '',
              metadata: { section: 'Properties', order: 2, dataSource: 'property' }
            },
            {
              id: 'sale_price',
              name: 'sale_price',
              type: 'currency',
              label: 'Sale Price',
              required: true,
              defaultValue: 0,
              metadata: { section: 'Financial', order: 3, dataSource: 'exchange' }
            }
          ],
          metadata: {
            author: 'Admin User',
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-20T14:30:00Z',
            lastUsed: '2024-01-25T09:15:00Z',
            usageCount: 45,
            fileSize: 2048000
          },
          compatibility: {
            exchanges: ['simultaneous', 'delayed', 'reverse', 'build-to-suit'],
            roles: ['admin', 'coordinator'],
            requirements: ['qualified_intermediary', 'exchange_period']
          },
          settings: {
            autoFill: true,
            requireReview: true,
            allowEditing: false,
            expiresAfterDays: 180,
            watermark: true
          }
        },
        {
          id: '2',
          name: '45-Day Identification Notice',
          description: 'Official notice for 45-day identification period compliance with replacement property details',
          category: 'identification',
          type: 'pdf',
          version: '1.5.0',
          isActive: true,
          isDefault: false,
          tags: ['45-day', 'identification', 'notice', 'replacement', 'property'],
          fields: [
            {
              id: 'identification_deadline',
              name: 'identification_deadline',
              type: 'date',
              label: 'Identification Deadline',
              required: true,
              defaultValue: '',
              metadata: { section: 'Timeline', order: 1, dataSource: 'exchange' }
            },
            {
              id: 'identified_properties',
              name: 'identified_properties',
              type: 'multiline',
              label: 'Identified Properties List',
              required: true,
              defaultValue: '',
              metadata: { section: 'Properties', order: 2, dataSource: 'manual' }
            }
          ],
          metadata: {
            author: 'Legal Team',
            createdAt: '2024-01-10T08:00:00Z',
            updatedAt: '2024-01-18T16:45:00Z',
            lastUsed: '2024-01-24T11:20:00Z',
            usageCount: 32
          },
          compatibility: {
            exchanges: ['delayed', 'reverse'],
            roles: ['admin', 'coordinator', 'client'],
            requirements: ['identification_period']
          },
          settings: {
            autoFill: true,
            requireReview: false,
            allowEditing: true,
            expiresAfterDays: 45,
            watermark: false
          }
        },
        {
          id: '3',
          name: 'Settlement Statement (Form HUD-1)',
          description: 'Detailed settlement statement for 1031 exchange transactions with boot calculations',
          category: 'financial',
          type: 'pdf',
          version: '3.0.0',
          isActive: true,
          isDefault: false,
          tags: ['settlement', 'hud-1', 'financial', 'closing', 'boot'],
          fields: [
            {
              id: 'gross_sales_price',
              name: 'gross_sales_price',
              type: 'currency',
              label: 'Gross Sales Price',
              required: true,
              defaultValue: 0,
              metadata: { section: 'Financial', order: 1, dataSource: 'exchange' }
            },
            {
              id: 'closing_costs',
              name: 'closing_costs',
              type: 'currency',
              label: 'Total Closing Costs',
              required: true,
              defaultValue: 0,
              metadata: { section: 'Financial', order: 2, dataSource: 'exchange' }
            },
            {
              id: 'boot_amount',
              name: 'boot_amount',
              type: 'currency',
              label: 'Boot Amount (if any)',
              required: false,
              defaultValue: 0,
              metadata: { section: 'Financial', order: 3, dataSource: 'manual' }
            }
          ],
          metadata: {
            author: 'Finance Department',
            createdAt: '2024-01-05T12:00:00Z',
            updatedAt: '2024-01-22T10:15:00Z',
            lastUsed: '2024-01-23T15:30:00Z',
            usageCount: 28
          },
          compatibility: {
            exchanges: ['simultaneous', 'delayed', 'reverse', 'build-to-suit'],
            roles: ['admin', 'coordinator'],
            requirements: ['closing_process']
          },
          settings: {
            autoFill: true,
            requireReview: true,
            allowEditing: true,
            expiresAfterDays: 30,
            watermark: true
          }
        }
      ];

      setTemplates(response.data || mockTemplates);
    } catch (error: any) {
      console.error('Failed to load templates:', error);
      setError('Failed to load document templates');
    } finally {
      setLoading(false);
    }
  }, []);

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
      loadTemplates();
      loadExchanges();
    }
  }, [isOpen, loadTemplates, loadExchanges]);

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
      setLoading(true);
      const response = await apiService.post('/documents/generate', {
        templateId: template.id,
        exchangeId: exchangeId,
        additionalData: previewData
      });
      
      setSuccess(`Document generated successfully: ${response.data.filename}`);
      onTemplateChange?.();
    } catch (error: any) {
      setError(`Failed to generate document: ${error.message}`);
    } finally {
      setLoading(false);
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
                                <p className="text-sm text-gray-500">v{template.version}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {template.isDefault && (
                                <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
                              )}
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {template.isActive ? 'Active' : 'Inactive'}
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
                          {template.tags.length > 0 && (
                            <div className="mb-4">
                              <div className="flex flex-wrap gap-1">
                                {template.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                                    <TagIcon className="w-3 h-3 mr-1" />
                                    {tag}
                                  </span>
                                ))}
                                {template.tags.length > 3 && (
                                  <span className="text-xs text-gray-500">+{template.tags.length - 3}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-4 mb-4 py-3 border-t border-gray-100">
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-900">{template.metadata.usageCount || 0}</div>
                              <div className="text-xs text-gray-500">Uses</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-900">{template.fields.length}</div>
                              <div className="text-xs text-gray-500">Fields</div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handlePreview(template)}
                                className="flex items-center space-x-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <EyeIcon className="w-4 h-4" />
                                <span>Preview</span>
                              </button>
                              {canManage && (
                                <button className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                                  <PencilIcon className="w-4 h-4" />
                                  <span>Edit</span>
                                </button>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              Updated {new Date(template.metadata.updatedAt).toLocaleDateString()}
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
                    <select className="px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="">Select Exchange...</option>
                      {exchanges.map(exchange => (
                        <option key={exchange.id} value={exchange.id}>{exchange.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => selectedTemplate && handleGenerate(selectedTemplate, 'test-exchange')}
                      className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
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
                      {selectedTemplate.fields.map((field) => (
                        <div key={field.id} className="p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700">{field.label}</label>
                            <span className="text-xs text-gray-500">{field.type}</span>
                          </div>
                          {field.type === 'text' && (
                            <input
                              type="text"
                              placeholder={field.placeholder}
                              value={previewData?.[field.name] || ''}
                              onChange={(e) => setPreviewData(prev => ({ ...(prev || {}), [field.name]: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                          )}
                          {field.type === 'currency' && (
                            <input
                              type="number"
                              placeholder="0.00"
                              value={previewData?.[field.name] || ''}
                              onChange={(e) => setPreviewData(prev => ({ ...(prev || {}), [field.name]: parseFloat(e.target.value) || 0 }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                          )}
                          {field.type === 'multiline' && (
                            <textarea
                              rows={3}
                              placeholder={field.placeholder}
                              value={previewData?.[field.name] || ''}
                              onChange={(e) => setPreviewData(prev => ({ ...(prev || {}), [field.name]: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                          )}
                          {field.type === 'date' && (
                            <input
                              type="date"
                              value={previewData?.[field.name] || ''}
                              onChange={(e) => setPreviewData(prev => ({ ...(prev || {}), [field.name]: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                          )}
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
    </div>
  );
};

export default EnterpriseDocumentTemplateManager;