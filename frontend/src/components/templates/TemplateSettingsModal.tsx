import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, Cog6ToothIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { DocumentTemplate, AVAILABLE_PLACEHOLDER_FIELDS, FIELD_DESCRIPTIONS } from '../../types/document-template.types';

interface TemplateSettingsModalProps {
  template: DocumentTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: DocumentTemplate) => void;
}

const TemplateSettingsModal: React.FC<TemplateSettingsModalProps> = ({
  template,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<DocumentTemplate>>({});
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [newCustomField, setNewCustomField] = useState<string>('');

  const availableRoles = ['admin', 'coordinator', 'client', 'qi'];
  const availableTriggers = [
    'exchange_created',
    'identification_deadline',
    'completion_deadline',
    'document_uploaded',
    'status_changed'
  ];
  const availableTags = [
    'legal', 'financial', 'compliance', 'agreement', 'notice', 'certificate', 'report'
  ];

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description,
        category: template.category,
        template_type: template.template_type || 'document',
        version: template.version || '1.0',
        is_required: template.is_required,
        is_active: template.is_active,
        auto_generate: template.auto_generate,
        settings: template.settings || {},
        file_template: template.file_template || ''
      });
      setSelectedFields(template.required_fields || []);
      setSelectedRoles(template.role_access || []);
      setSelectedTriggers(template.stage_triggers || []);
      setSelectedTags(template.tags || []);
      // Extract custom fields (those with #___# pattern) from required_fields
      const customFieldsFromTemplate = (template.required_fields || []).filter(field => 
        field.includes('#___#')
      );
      setCustomFields(customFieldsFromTemplate);
    }
  }, [template]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSettingsChange = (setting: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [setting]: value
      }
    }));
  };

  const toggleField = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers(prev => 
      prev.includes(trigger) 
        ? prev.filter(t => t !== trigger)
        : [...prev, trigger]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const addCustomField = () => {
    if (newCustomField.trim() && !customFields.includes(newCustomField.trim())) {
      setCustomFields(prev => [...prev, newCustomField.trim()]);
      setNewCustomField('');
    }
  };

  const removeCustomField = (field: string) => {
    setCustomFields(prev => prev.filter(f => f !== field));
  };

  const handleCustomFieldKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomField();
    }
  };

  const handleSave = () => {
    if (!template) return;

    // Combine standard fields and custom fields
    const allRequiredFields = [...selectedFields, ...customFields];

    const updatedTemplate: DocumentTemplate = {
      ...template,
      ...formData,
      required_fields: allRequiredFields,
      role_access: selectedRoles,
      stage_triggers: selectedTriggers,
      tags: selectedTags
    };

    onSave(updatedTemplate);
    onClose();
  };

  const getFieldDescription = (field: string): string => {
    return FIELD_DESCRIPTIONS[field] || field;
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white rounded-xl shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Cog6ToothIcon className="h-6 w-6 text-blue-600" />
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                Template Settings
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter template name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter template description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category || ''}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select category</option>
                      <option value="legal">Legal</option>
                      <option value="financial">Financial</option>
                      <option value="compliance">Compliance</option>
                      <option value="agreement">Agreement</option>
                      <option value="notice">Notice</option>
                      <option value="certificate">Certificate</option>
                      <option value="report">Report</option>
                      <option value="template">General Template</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Version
                    </label>
                    <input
                      type="text"
                      value={formData.version || '1.0'}
                      onChange={(e) => handleInputChange('version', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1.0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_required || false}
                      onChange={(e) => handleInputChange('is_required', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Required Template</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active !== false}
                      onChange={(e) => handleInputChange('is_active', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Template Settings</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.settings?.autoFill !== false}
                      onChange={(e) => handleSettingsChange('autoFill', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Auto-fill Fields</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.settings?.requireReview || false}
                      onChange={(e) => handleSettingsChange('requireReview', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Require Review</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.settings?.allowEditing !== false}
                      onChange={(e) => handleSettingsChange('allowEditing', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Allow Editing</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.settings?.watermark || false}
                      onChange={(e) => handleSettingsChange('watermark', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Add Watermark</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.auto_generate || false}
                      onChange={(e) => handleInputChange('auto_generate', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Auto-generate</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Required Fields */}
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Required Fields</h3>
              
              {/* Standard Fields */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-700 mb-3">Standard Fields</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-4">
                  {AVAILABLE_PLACEHOLDER_FIELDS.map((field) => (
                    <label key={field} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field)}
                        onChange={() => toggleField(field)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">{field}</span>
                      <span className="text-gray-500 text-xs">({getFieldDescription(field)})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Fields */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-700 mb-3">Custom Fields</h4>
                <div className="space-y-3">
                  {/* Add Custom Field */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newCustomField}
                      onChange={(e) => setNewCustomField(e.target.value)}
                      onKeyPress={handleCustomFieldKeyPress}
                      placeholder="Enter custom field name (e.g., #Custom.Field#)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={addCustomField}
                      disabled={!newCustomField.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                  
                  {/* Custom Fields List */}
                  {customFields.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Custom fields will be wrapped in #___# delimiters</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {customFields.map((field, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                            <span className="text-sm font-medium text-gray-700">{field}</span>
                            <button
                              onClick={() => removeCustomField(field)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Role Access */}
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Role Access</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {availableRoles.map((role) => (
                  <label key={role} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 capitalize">{role}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Stage Triggers */}
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Stage Triggers</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableTriggers.map((trigger) => (
                  <label key={trigger} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedTriggers.includes(trigger)}
                      onChange={() => toggleTrigger(trigger)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {trigger.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Tags</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {availableTags.map((tag) => (
                  <label key={tag} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 capitalize">{tag}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Template Content */}
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Template Content</h3>
              <textarea
                value={formData.file_template || ''}
                onChange={(e) => handleInputChange('file_template', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Enter template content with placeholders like #Client.Name#, #Exchange.ID#, etc."
              />
              <p className="text-xs text-gray-500 mt-1">
                Use placeholders like #Client.Name#, #Exchange.ID# to insert dynamic data
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Save Settings
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default TemplateSettingsModal;
