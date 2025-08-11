/**
 * Smart Task Creation Modal with Natural Language Processing and Auto-Complete
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  XMarkIcon,
  SparklesIcon,
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useEnhancedTasks, ParsedTask, TaskTemplate } from '../../hooks/useEnhancedTasks';
import { useAuth } from '../../hooks/useAuth';

interface SmartTaskCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchangeId?: string;
  initialText?: string;
  mode?: 'natural' | 'template' | 'manual';
  onTaskCreated?: (task: any) => void;
}

export const SmartTaskCreationModal: React.FC<SmartTaskCreationModalProps> = ({
  isOpen,
  onClose,
  exchangeId,
  initialText = '',
  mode = 'natural',
  onTaskCreated
}) => {
  const { user } = useAuth();
  const {
    parseNaturalLanguage,
    createFromNaturalLanguage,
    createTask,
    taskTemplates,
    suggestions,
    naturalLanguageLoading,
    parsedTask,
    error,
    clearError,
    clearParsedTask
  } = useEnhancedTasks(exchangeId);

  // State
  const [currentMode, setCurrentMode] = useState<'natural' | 'template' | 'manual'>(mode);
  const [naturalLanguageText, setNaturalLanguageText] = useState(initialText);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedExchange, setSelectedExchange] = useState('');
  const [parsedPreview, setParsedPreview] = useState<any>(null);
  const [manualForm, setManualForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'general',
    assignedTo: '',
    dueDate: '',
    estimatedDuration: ''
  });

  // Users for assignment (mock for now - replace with actual user fetching)
  const [users] = useState([
    { id: '1', name: 'John Coordinator', role: 'coordinator' },
    { id: '2', name: 'Jane Admin', role: 'admin' },
    { id: '3', name: 'Mike Assistant', role: 'assistant' }
  ]);

  // Priority options
  const priorityOptions = [
    { value: 'critical', label: 'Critical', color: 'red' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'medium', label: 'Medium', color: 'yellow' },
    { value: 'low', label: 'Low', color: 'green' }
  ];

  // Category options
  const categoryOptions = [
    { value: 'document', label: 'Document', icon: DocumentTextIcon },
    { value: 'communication', label: 'Communication', icon: UserIcon },
    { value: 'deadline', label: 'Deadline', icon: ClockIcon },
    { value: 'review', label: 'Review', icon: CheckCircleIcon },
    { value: 'property', label: 'Property', icon: LightBulbIcon },
    { value: 'coordination', label: 'Coordination', icon: UserIcon },
    { value: 'general', label: 'General', icon: ExclamationTriangleIcon }
  ];

  // Template options from backend
  const templateOptions = useMemo(() => {
    return Object.entries(taskTemplates).map(([key, template]) => ({
      key,
      ...template
    }));
  }, [taskTemplates]);

  // Handle natural language parsing
  const handleParseNaturalLanguage = async () => {
    if (!naturalLanguageText.trim()) return;

    try {
      clearError();
      const result = await parseNaturalLanguage(naturalLanguageText, {
        exchangeId,
        userId: user?.id
      });
      setParsedPreview(result);
      setShowPreview(true);
    } catch (err) {
      console.error('Parse error:', err);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const template = taskTemplates[templateKey];
    if (template) {
      setManualForm(prev => ({
        ...prev,
        title: template.title,
        description: template.description,
        category: template.category,
        estimatedDuration: template.estimatedDuration
      }));
      setCurrentMode('manual');
    }
  };

  // Handle task creation
  const handleCreateTask = async () => {
    try {
      clearError();
      let createdTask;

      if (currentMode === 'natural' && (parsedTask || parsedPreview)) {
        // Create from natural language with user selections
        const result = await createFromNaturalLanguage(naturalLanguageText, {
          assignedTo: selectedAssignee || parsedPreview?.extractedData?.assigneeInfo?.id || undefined,
          exchangeId: selectedExchange || parsedPreview?.extractedData?.exchangeInfo?.id || exchangeId
        });
        createdTask = result.task;
      } else {
        // Create manual task
        const taskData = {
          ...manualForm,
          exchange_id: exchangeId,
          assigned_to: manualForm.assignedTo || undefined,
          due_date: manualForm.dueDate || undefined,
          metadata: selectedTemplate ? {
            template_used: selectedTemplate,
            estimated_duration: manualForm.estimatedDuration
          } : undefined
        };
        
        createdTask = await createTask(taskData);
      }

      // Success - notify parent and close
      if (onTaskCreated) {
        onTaskCreated(createdTask);
      }
      
      handleClose();
    } catch (err) {
      console.error('Task creation error:', err);
    }
  };

  // Handle modal close
  const handleClose = () => {
    setNaturalLanguageText(initialText);
    setCurrentMode(mode);
    setSelectedTemplate(null);
    setShowPreview(false);
    setManualForm({
      title: '',
      description: '',
      priority: 'medium',
      category: 'general',
      assignedTo: '',
      dueDate: '',
      estimatedDuration: ''
    });
    clearError();
    clearParsedTask();
    onClose();
  };

  // Auto-parse when text changes (debounced)
  useEffect(() => {
    if (currentMode === 'natural' && naturalLanguageText && naturalLanguageText !== initialText) {
      const timer = setTimeout(() => {
        handleParseNaturalLanguage();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [naturalLanguageText, currentMode]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <SparklesIcon className="h-6 w-6 text-blue-600" />
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      Smart Task Creation
                    </Dialog.Title>
                  </div>
                  
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Mode Selection */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
                  <button
                    onClick={() => setCurrentMode('natural')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      currentMode === 'natural'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    <SparklesIcon className="h-4 w-4 inline mr-2" />
                    Natural Language
                  </button>
                  <button
                    onClick={() => setCurrentMode('template')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      currentMode === 'template'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    <DocumentTextIcon className="h-4 w-4 inline mr-2" />
                    Templates
                  </button>
                  <button
                    onClick={() => setCurrentMode('manual')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      currentMode === 'manual'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    <UserIcon className="h-4 w-4 inline mr-2" />
                    Manual
                  </button>
                </div>

                {/* Content based on mode */}
                <div className="space-y-6">
                  {/* Natural Language Mode */}
                  {currentMode === 'natural' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Describe your task in plain English
                        </label>
                        <textarea
                          value={naturalLanguageText}
                          onChange={(e) => setNaturalLanguageText(e.target.value)}
                          placeholder="e.g., Upload property identification document for exchange EX-2024-001 by Friday, assign to John"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          rows={4}
                        />
                      </div>

                      <div className="flex justify-between items-center">
                        <button
                          onClick={handleParseNaturalLanguage}
                          disabled={!naturalLanguageText.trim() || naturalLanguageLoading}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <SparklesIcon className="h-4 w-4" />
                          <span>{naturalLanguageLoading ? 'Parsing...' : 'Parse & Preview'}</span>
                        </button>
                      </div>

                      {/* Enhanced Preview */}
                      {showPreview && parsedPreview && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="font-medium text-blue-900 mb-3 flex items-center">
                            <SparklesIcon className="h-4 w-4 mr-2" />
                            Parsed Task Preview
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              {Math.round(parsedPreview.confidence * 100)}% confidence
                            </span>
                          </h3>

                          {/* User Assignment Section */}
                          {parsedPreview.extractedData?.needsUserSelection && (
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <h4 className="font-medium text-yellow-900 mb-2">👤 User Assignment Required</h4>
                              <p className="text-sm text-yellow-800 mb-3">
                                Looking for user: "{parsedPreview.extractedData.userSearchTerm}"
                              </p>
                              <select
                                value={selectedAssignee}
                                onChange={(e) => setSelectedAssignee(e.target.value)}
                                className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              >
                                <option value="">Select a user to assign...</option>
                                {parsedPreview.extractedData.availableUsers?.map((user: any) => (
                                  <option key={user.id} value={user.id}>
                                    {user.first_name} {user.last_name} ({user.email}) - {user.role}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Exchange Selection Section */}
                          {parsedPreview.extractedData?.needsExchangeSelection && (
                            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                              <h4 className="font-medium text-purple-900 mb-2">🏢 Exchange Assignment Required</h4>
                              <p className="text-sm text-purple-800 mb-3">
                                Looking for exchange: "{parsedPreview.extractedData.exchangeSearchTerm}"
                              </p>
                              <select
                                value={selectedExchange}
                                onChange={(e) => setSelectedExchange(e.target.value)}
                                className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              >
                                <option value="">Select an exchange...</option>
                                {parsedPreview.extractedData.availableExchanges?.map((exchange: any) => (
                                  <option key={exchange.id} value={exchange.id}>
                                    {exchange.exchange_number} - {exchange.status}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Found User Info */}
                          {parsedPreview.extractedData?.assigneeInfo && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <h4 className="font-medium text-green-900 mb-2 flex items-center">
                                ✅ User Found
                              </h4>
                              <div className="flex items-center space-x-2">
                                <div className="flex-shrink-0 w-8 h-8 bg-green-200 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-green-800">
                                    {parsedPreview.extractedData.assigneeInfo.name[0]}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-green-900">
                                    {parsedPreview.extractedData.assigneeInfo.name}
                                  </p>
                                  <p className="text-xs text-green-700">
                                    {parsedPreview.extractedData.assigneeInfo.email} • {parsedPreview.extractedData.assigneeInfo.role}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Found Exchange Info */}
                          {parsedPreview.extractedData?.exchangeInfo && (
                            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                              <h4 className="font-medium text-indigo-900 mb-2 flex items-center">
                                ✅ Exchange Found
                              </h4>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-indigo-900">
                                    {parsedPreview.extractedData.exchangeInfo.number}
                                  </p>
                                  <p className="text-xs text-indigo-700">
                                    Status: {parsedPreview.extractedData.exchangeInfo.status} • 
                                    Stage: {parsedPreview.extractedData.exchangeInfo.lifecycle_stage}
                                  </p>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                  parsedPreview.extractedData.exchangeInfo.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {parsedPreview.extractedData.exchangeInfo.status}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Lifecycle Suggestions */}
                          {parsedPreview.extractedData?.lifecycleSuggestions?.length > 0 && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <h4 className="font-medium text-amber-900 mb-2">💡 Related Lifecycle Tasks</h4>
                              <div className="space-y-1">
                                {parsedPreview.extractedData.lifecycleSuggestions.slice(0, 3).map((suggestion: string, index: number) => (
                                  <button
                                    key={index}
                                    onClick={() => setNaturalLanguageText(suggestion)}
                                    className="block w-full text-left text-xs text-amber-800 hover:text-amber-900 hover:bg-amber-100 px-2 py-1 rounded transition-colors"
                                  >
                                    • {suggestion}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Basic Task Info */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <label className="font-medium text-gray-700">Title:</label>
                              <p className="text-gray-900">{parsedPreview.title}</p>
                            </div>
                            <div>
                              <label className="font-medium text-gray-700">Priority:</label>
                              <p className="text-gray-900 capitalize">{parsedPreview.priority}</p>
                            </div>
                            <div>
                              <label className="font-medium text-gray-700">Category:</label>
                              <p className="text-gray-900 capitalize">{parsedPreview.category}</p>
                            </div>
                            <div>
                              <label className="font-medium text-gray-700">Template:</label>
                              <p className="text-gray-900">{parsedPreview.templateKey || 'None'}</p>
                            </div>
                          </div>

                          {parsedPreview.description && (
                            <div className="mt-3">
                              <label className="font-medium text-gray-700">Description:</label>
                              <p className="text-gray-900 text-sm">{parsedPreview.description}</p>
                            </div>
                          )}

                          {parsedPreview.autoActions?.length > 0 && (
                            <div className="mt-3">
                              <label className="font-medium text-gray-700">Auto Actions:</label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {parsedPreview.autoActions.map((action: string, index: number) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                  >
                                    {action.replace(/_/g, ' ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Template Mode */}
                  {currentMode === 'template' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Choose a task template
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {templateOptions.map((template) => (
                            <div
                              key={template.key}
                              onClick={() => handleTemplateSelect(template.key)}
                              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                selectedTemplate === template.key
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <h3 className="font-medium text-gray-900">{template.title}</h3>
                              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-500 capitalize">{template.category}</span>
                                <span className="text-xs text-blue-600">{template.estimatedDuration}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Suggestions */}
                      {suggestions.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            <LightBulbIcon className="h-4 w-4 inline mr-1" />
                            Suggested Tasks
                          </label>
                          <div className="space-y-2">
                            {suggestions.slice(0, 3).map((suggestion, index) => (
                              <div
                                key={index}
                                className="p-3 border border-gray-200 rounded-lg bg-yellow-50 hover:bg-yellow-100 cursor-pointer transition-colors"
                                onClick={() => {
                                  setNaturalLanguageText(suggestion.description);
                                  setCurrentMode('natural');
                                }}
                              >
                                <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                                <p className="text-sm text-gray-600">{suggestion.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual Mode */}
                  {currentMode === 'manual' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Title *
                          </label>
                          <input
                            type="text"
                            value={manualForm.title}
                            onChange={(e) => setManualForm(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter task title"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priority
                          </label>
                          <select
                            value={manualForm.priority}
                            onChange={(e) => setManualForm(prev => ({ ...prev, priority: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {priorityOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Category
                          </label>
                          <select
                            value={manualForm.category}
                            onChange={(e) => setManualForm(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {categoryOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Assign To
                          </label>
                          <select
                            value={manualForm.assignedTo}
                            onChange={(e) => setManualForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select assignee...</option>
                            {users.map(user => (
                              <option key={user.id} value={user.id}>
                                {user.name} ({user.role})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Due Date
                          </label>
                          <input
                            type="date"
                            value={manualForm.dueDate}
                            onChange={(e) => setManualForm(prev => ({ ...prev, dueDate: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Estimated Duration
                          </label>
                          <input
                            type="text"
                            value={manualForm.estimatedDuration}
                            onChange={(e) => setManualForm(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., 30m, 2h, 1d"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={manualForm.description}
                          onChange={(e) => setManualForm(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                          placeholder="Enter task description"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Cancel
                  </button>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleCreateTask}
                      disabled={
                        (currentMode === 'natural' && (!parsedTask || !showPreview)) ||
                        (currentMode === 'manual' && !manualForm.title.trim()) ||
                        naturalLanguageLoading
                      }
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <SparklesIcon className="h-4 w-4" />
                      <span>Create Task</span>
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};