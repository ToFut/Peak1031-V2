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
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  SparklesIcon,
  UserIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

import { Exchange, Document } from '../types';

interface DocumentTemplate {
  id: string;
  name: string;
  category: 'core' | 'rules' | 'custom';
  description: string;
  requiredFields: string[];
  signatureRequired: boolean;
  signatories?: string[];
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
}

const DocumentGenerationSystem: React.FC = () => {
  const { user } = useAuth();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [showTemplateUploadModal, setShowTemplateUploadModal] = useState(false);
  const [docGenerationFilter, setDocGenerationFilter] = useState('all');
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const [generationData, setGenerationData] = useState<GenerationData>({
    clientName: '',
    exchangeId: '',
    propertyAddress: '',
    ownershipPercentage: '',
    propertyValue: '',
    qiName: '',
    sellerName: '',
    buyerName: ''
  });

  // Document templates from the reference
  const documentTemplates: DocumentTemplate[] = [
    {
      id: 'like-kind-assignment',
      name: 'Like-Kind Assignment',
      category: 'core',
      description: 'Assignment of purchase and sale agreement for like-kind exchange',
      requiredFields: ['clientName', 'propertyAddress', 'qiName', 'sellerName'],
      signatureRequired: true,
      signatories: ['QI', 'Seller', 'Buyer']
    },
    {
      id: 'exchange-agreement',
      name: 'Exchange Agreement',
      category: 'core',
      description: 'Master exchange agreement between client and QI',
      requiredFields: ['clientName', 'qiName', 'propertyValue'],
      signatureRequired: true,
      signatories: ['QI', 'Client']
    },
    {
      id: 'authorization-form',
      name: 'Authorization Form',
      category: 'core',
      description: 'Authorization for QI to act on behalf of client',
      requiredFields: ['clientName', 'qiName'],
      signatureRequired: true,
      signatories: ['Client']
    },
    {
      id: 'introduction-letter',
      name: 'Introduction Letter',
      category: 'core',
      description: 'Introduction letter for exchange parties',
      requiredFields: ['clientName', 'qiName', 'sellerName', 'buyerName'],
      signatureRequired: false
    },
    {
      id: 'w9-form',
      name: 'W9 Form',
      category: 'core',
      description: 'Tax identification form for exchange',
      requiredFields: ['clientName'],
      signatureRequired: true,
      signatories: ['Client']
    },
    {
      id: '3-property-rule',
      name: '3-Property Rule Analysis',
      category: 'rules',
      description: 'Analysis of 3-property identification rule compliance',
      requiredFields: ['clientName', 'propertyAddress', 'propertyValue'],
      signatureRequired: false
    },
    {
      id: '200-percent-rule',
      name: '200% Rule Analysis',
      category: 'rules',
      description: 'Analysis of 200% rule compliance for property identification',
      requiredFields: ['clientName', 'propertyValue'],
      signatureRequired: false
    },
    {
      id: '95-percent-rule',
      name: '95% Rule Analysis',
      category: 'rules',
      description: 'Analysis of 95% rule compliance for property acquisition',
      requiredFields: ['clientName', 'propertyValue', 'ownershipPercentage'],
      signatureRequired: false
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [exchangesData, documentsData] = await Promise.all([
        apiService.getExchanges(),
        apiService.getDocuments()
      ]);

      setExchanges(Array.isArray(exchangesData) ? exchangesData : []);
      setDocuments(Array.isArray(documentsData) ? documentsData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
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
      // These would come from exchange participants/details
      qiName: exchange.qiCompany || 'Peak 1031 Exchange Services',
      sellerName: exchange.sellerName || '',
      buyerName: exchange.buyerName || exchange.clientName || (exchange.client ? `${exchange.client.firstName} ${exchange.client.lastName}` : '') || ''
    }));
  };

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setShowGenerationModal(true);
  };

  const generateDocument = async () => {
    if (!selectedTemplate || !selectedExchange) return;

    try {
      // Simulate AI document generation
      const generatedDoc = {
        id: Date.now().toString(),
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        exchangeId: selectedExchange.id,
        clientName: generationData.clientName,
        generatedAt: new Date().toISOString(),
        status: 'generated',
        signatureRequired: selectedTemplate.signatureRequired,
        signatories: selectedTemplate.signatories || []
      };

      // In real implementation, this would call the API
      // await apiService.generateDocument(generatedDoc);

      alert(`Document "${selectedTemplate.name}" generated successfully for ${generationData.clientName}!`);
      setShowGenerationModal(false);
      setSelectedTemplate(null);
      loadData(); // Refresh documents list
    } catch (error) {
      console.error('Failed to generate document:', error);
      alert('Failed to generate document. Please try again.');
    }
  };

  const getSignatureStatus = (document: any) => {
    if (!document.signatureRequired) return 'Not Required';
    
    // Mock signature status
    const signatories = document.signatories || [];
    const signed = Math.floor(Math.random() * (signatories.length + 1));
    
    if (signed === signatories.length) return 'Complete';
    if (signed > 0) return `${signed}/${signatories.length} Signed`;
    return 'Pending';
  };

  const filteredTemplates = documentTemplates.filter(template => {
    if (docGenerationFilter === 'all') return true;
    return template.category === docGenerationFilter;
  });

  const filterOptions = [
    { value: 'all', label: 'All Templates' },
    { value: 'core', label: 'Core Documents' },
    { value: 'rules', label: 'Rules Analysis' },
    { value: 'custom', label: 'Custom Templates' }
  ];

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
          <h2 className="text-2xl font-bold text-gray-900">Document Generation</h2>
          <p className="text-gray-600 mt-1">AI-powered document templates for 1031 exchanges</p>
        </div>
        <div className="flex gap-3">
          <ModernDropdown
            options={filterOptions}
            value={docGenerationFilter}
            onChange={setDocGenerationFilter}
            className="w-48"
          />
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowTemplateUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Upload Template
            </button>
          )}
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <ModernCard key={template.id} hover className="cursor-pointer" onClick={() => handleTemplateSelect(template)}>
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
              {template.signatureRequired && (
                <div className="text-orange-500" title="Signature Required">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-4">{template.description}</p>
            
            <div className="space-y-2">
              <div className="text-xs text-gray-500">Required Fields:</div>
              <div className="flex flex-wrap gap-1">
                {template.requiredFields.map((field) => (
                  <span key={field} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                ))}
              </div>
            </div>
            
            {template.signatureRequired && template.signatories && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-gray-500 mb-1">Signatories:</div>
                <div className="flex gap-1">
                  {template.signatories.map((signatory) => (
                    <span key={signatory} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                      {signatory}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </ModernCard>
        ))}
      </div>

      {/* Generated Documents */}
      <ModernCard>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Generated Documents</h3>
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-gray-600">AI Generated</span>
          </div>
        </div>
        
        <div className="space-y-3">
          {/* Mock generated documents */}
          {[
            { name: 'Like-Kind Assignment - Johnson Family Trust', status: 'Complete', signatures: '3/3 Signed', date: '2024-01-15' },
            { name: 'Exchange Agreement - Smith Properties', status: 'Pending', signatures: '1/2 Signed', date: '2024-01-14' },
            { name: '3-Property Rule Analysis - Davis LLC', status: 'Generated', signatures: 'Not Required', date: '2024-01-13' }
          ].map((doc, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                <div>
                  <h4 className="font-medium text-gray-900">{doc.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={doc.status} size="sm" />
                    <span className="text-xs text-gray-500">{doc.signatures}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{doc.date}</span>
                <button className="text-blue-600 hover:text-blue-700">
                  <EyeIcon className="w-4 h-4" />
                </button>
                <button className="text-green-600 hover:text-green-700">
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </ModernCard>

      {/* Document Generation Modal */}
      {showGenerationModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Generate Document</h3>
                <p className="text-gray-600">{selectedTemplate.name}</p>
              </div>
              <button
                onClick={() => setShowGenerationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Exchange Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Exchange</label>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                {exchanges.map((exchange) => (
                  <button
                    key={exchange.id}
                    onClick={() => handleExchangeSelect(exchange)}
                    className={`p-3 text-left border rounded-lg hover:bg-blue-50 transition-colors ${
                      selectedExchange?.id === exchange.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="font-medium">{exchange.name || exchange.clientName}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <StatusBadge status={exchange.status} size="sm" />
                      {exchange.exchangeValue && (
                        <span>${exchange.exchangeValue.toLocaleString()}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <UserIcon className="w-4 h-4 inline mr-1" />
                  Client Name
                </label>
                <input
                  type="text"
                  value={generationData.clientName}
                  onChange={(e) => setGenerationData(prev => ({ ...prev, clientName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPinIcon className="w-4 h-4 inline mr-1" />
                  Property Address
                </label>
                <input
                  type="text"
                  value={generationData.propertyAddress}
                  onChange={(e) => setGenerationData(prev => ({ ...prev, propertyAddress: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CurrencyDollarIcon className="w-4 h-4 inline mr-1" />
                  Property Value
                </label>
                <input
                  type="text"
                  value={generationData.propertyValue}
                  onChange={(e) => setGenerationData(prev => ({ ...prev, propertyValue: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <BuildingOfficeIcon className="w-4 h-4 inline mr-1" />
                  QI Name
                </label>
                <input
                  type="text"
                  value={generationData.qiName}
                  onChange={(e) => setGenerationData(prev => ({ ...prev, qiName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {selectedTemplate.requiredFields.includes('sellerName') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Seller Name</label>
                  <input
                    type="text"
                    value={generationData.sellerName}
                    onChange={(e) => setGenerationData(prev => ({ ...prev, sellerName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {selectedTemplate.requiredFields.includes('buyerName') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Buyer Name</label>
                  <input
                    type="text"
                    value={generationData.buyerName}
                    onChange={(e) => setGenerationData(prev => ({ ...prev, buyerName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {selectedTemplate.requiredFields.includes('ownershipPercentage') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ownership Percentage</label>
                  <input
                    type="text"
                    value={generationData.ownershipPercentage}
                    onChange={(e) => setGenerationData(prev => ({ ...prev, ownershipPercentage: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Signature Requirements */}
            {selectedTemplate.signatureRequired && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="font-semibold text-orange-900 mb-2">Signature Required</h4>
                <p className="text-sm text-orange-700 mb-2">This document requires signatures from:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.signatories?.map((signatory) => (
                    <span key={signatory} className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
                      {signatory}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowGenerationModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={generateDocument}
                disabled={!selectedExchange || !generationData.clientName}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <SparklesIcon className="w-4 h-4" />
                Generate Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentGenerationSystem;