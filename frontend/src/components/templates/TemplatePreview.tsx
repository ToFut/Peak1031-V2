import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, EyeIcon, DocumentTextIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { DocumentTemplate, AVAILABLE_PLACEHOLDER_FIELDS, FIELD_DESCRIPTIONS } from '../../types/document-template.types';

interface TemplatePreviewProps {
  template: DocumentTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onGenerate?: (templateId: string, sampleData: any) => void;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  isOpen,
  onClose,
  onGenerate
}) => {
  const [previewData, setPreviewData] = useState<any>({});
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [customData, setCustomData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (template && isOpen) {
      generatePreview();
    }
  }, [template, isOpen]);

  const generatePreview = async () => {
    if (!template) return;

    setIsLoading(true);
    try {
      // Prepare sample data
      const sampleData = {
        ...previewData,
        ...customData
      };

      // Call API to generate preview
      const response = await fetch(`/api/templates/${template.id}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ sampleData })
      });

      if (response.ok) {
        const result = await response.json();
        setPreviewContent(result.data.preview.content || 'Preview not available');
      } else {
        setPreviewContent('Error generating preview');
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      setPreviewContent('Error generating preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomDataChange = (field: string, value: string) => {
    setCustomData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGenerateDocument = () => {
    if (onGenerate && template) {
      onGenerate(template.id, { ...previewData, ...customData });
    }
  };

  const getFieldDescription = (field: string): string => {
    return FIELD_DESCRIPTIONS[field] || field;
  };

  const formatPreviewContent = (content: string) => {
    // Simple formatting for better readability
    return content
      .split('\n')
      .map((line, index) => (
        <div key={index} className="mb-1">
          {line}
        </div>
      ));
  };

  if (!template) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-6xl w-full bg-white rounded-xl shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <EyeIcon className="h-6 w-6 text-blue-600" />
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                Template Preview: {template.name}
              </Dialog.Title>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Template Information */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Template Information</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Name:</span>
                      <span className="ml-2 text-gray-900">{template.name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Category:</span>
                      <span className="ml-2 text-gray-900 capitalize">{template.category}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Version:</span>
                      <span className="ml-2 text-gray-900">{template.version}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        template.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {template.description && (
                    <div className="mt-4">
                      <span className="font-medium text-gray-700 text-sm">Description:</span>
                      <p className="mt-1 text-sm text-gray-600">{template.description}</p>
                    </div>
                  )}
                </div>

                {/* Custom Data Input */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Custom Data</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Override default values for preview
                  </p>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {AVAILABLE_PLACEHOLDER_FIELDS.slice(0, 10).map((field) => (
                      <div key={field}>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {field}
                        </label>
                        <input
                          type="text"
                          value={customData[field] || ''}
                          onChange={(e) => handleCustomDataChange(field, e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder={getFieldDescription(field)}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={generatePreview}
                    disabled={isLoading}
                    className="mt-3 w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? 'Generating...' : 'Update Preview'}
                  </button>
                </div>

                {/* Template Settings */}
                {template.settings && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Settings</h3>
                    <div className="space-y-2 text-sm">
                      {Object.entries(template.settings).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium text-gray-700 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {value ? 'Yes' : 'No'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Content */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Preview</h3>
                    {onGenerate && (
                      <button
                        onClick={handleGenerateDocument}
                        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4" />
                        <span>Generate Document</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="p-4">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Generating preview...</span>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-md p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
                        {previewContent ? (
                          <div className="font-mono text-sm text-gray-900 whitespace-pre-wrap">
                            {formatPreviewContent(previewContent)}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            <DocumentTextIcon className="h-12 w-12 text-gray-300" />
                            <span className="ml-3">No preview content available</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Required Fields */}
                {template.required_fields && template.required_fields.length > 0 && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">Required Fields</h4>
                    <div className="flex flex-wrap gap-2">
                      {template.required_fields.map((field) => (
                        <span
                          key={field}
                          className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-md"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {template.tags && template.tags.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {template.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default TemplatePreview;


