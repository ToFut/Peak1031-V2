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

// Default fallback data - moved outside component to avoid runtime errors
const FALLBACK_EXCHANGES = [
  { id: 'df7ea956-a936-45c6-b683-143e9dda5230', name: 'Smith Holdings Office to Retail Exchange', exchange_number: 'EX-2025-002', status: 'active' },
  { id: '66628d09-1843-42be-b257-dc05e13b8055', name: 'ABC Corp Industrial Warehouse Exchange', exchange_number: 'EX-2024-001', status: 'completed' },
  { id: '7354d84b-3d85-4c2c-aff3-d3349526880b', name: 'Johnson Trust Apartment Complex Exchange', exchange_number: 'EX-2025-001', status: 'active' },
  { id: 'bf69681b-12a6-46e2-b472-047538955dea', name: 'Smith Holdings Retail Property Exchange', exchange_number: 'EX-2024-002', status: 'completed' },
  { id: '8d1ea5f1-308a-48bd-b39a-6456d1b7c97f', name: 'ABC Corp Dallas Office Building Exchange', exchange_number: 'EX-2025-003', status: 'active' },
  { id: 'ba7865ac-da20-404a-b609-804d15cb0467', name: 'Demo Segev Exchange', exchange_number: 'SEGEV-DEMO-2025-001', status: 'active' }
];

const FALLBACK_USERS = [
  { id: 'admin-user', name: 'System Admin', role: 'admin', email: 'admin@peak1031.com' },
  { id: 'coordinator-user', name: 'Coordinator', role: 'coordinator', email: 'coordinator@peak1031.com' },
  { id: 'client-user', name: 'Client User', role: 'client', email: 'client@peak1031.com' }
];

interface SmartTaskCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchangeId?: string;
  exchangeName?: string; // Add exchange name prop for display
  initialText?: string;
  mode?: 'natural' | 'template' | 'manual';
  onTaskCreated?: (task: any) => void;
}

export const SmartTaskCreationModal: React.FC<SmartTaskCreationModalProps> = ({
  isOpen,
  onClose,
  exchangeId,
  exchangeName,
  initialText = '',
  mode = 'natural',
  onTaskCreated
}) => {
  const { user } = useAuth();
  
  // Debug modal props and immediate fallback setup
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 SmartTaskCreationModal opened with props:', {
        isOpen,
        exchangeId,
        mode,
        hasUser: !!user,
        userRole: user?.role
      });
      
      // Initial setup - don't set fallbacks immediately, let the API calls handle it
      console.log('🔍 Modal opened - API calls will populate data');
    }
  }, [isOpen, exchangeId, mode, user]);
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
  const [selectedExchange, setSelectedExchange] = useState(exchangeId || ''); // Use provided exchangeId if available
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

  // Users for assignment - fetch real assignees based on context
  const [users, setUsers] = useState<Array<{ id: string; name: string; role: string; email?: string }>>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  
  // Exchanges for selection in dashboard context
  const [exchanges, setExchanges] = useState<Array<{ id: string; name: string; exchange_number?: string; status: string }>>([]);
  const [loadingExchanges, setLoadingExchanges] = useState(false);
  
  // Debug users and exchanges state
  useEffect(() => {
    console.log('👥 Users state updated:', users.length, 'users', users);
  }, [users]);
  
  useEffect(() => {
    console.log('🏢 Exchanges state updated:', exchanges.length, 'exchanges', exchanges);
  }, [exchanges]);
  
  // Check authentication token
  const getAuthToken = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    console.log('🔑 Token available:', !!token);
    return token;
  };

  // Fetch exchanges for dashboard context
  useEffect(() => {
    const fetchExchanges = async () => {
      if (exchangeId) {
        console.log('🔄 Skipping exchange fetch - already in exchange context:', exchangeId);
        return; // Skip if in exchange context
      }
      
      console.log('🚀 Starting exchange fetch for dashboard context...');
      setLoadingExchanges(true);
      
      try {
        const token = getAuthToken();
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch('/api/exchanges', {
          headers
        });
        
        console.log('📡 Exchange fetch response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
          const result = await response.json();
          console.log('📋 Raw exchanges response:', result);
          console.log('📋 Response keys:', Object.keys(result));
          
          // Handle different response formats
          const exchangeList = result.exchanges || result.data || result || [];
          console.log('📋 Extracted exchange list:', exchangeList);
          console.log('📋 Is array:', Array.isArray(exchangeList));
          console.log('📋 Length:', exchangeList.length);
          
          if (Array.isArray(exchangeList) && exchangeList.length > 0) {
            console.log('📋 First exchange sample:', exchangeList[0]);
            
            // Transform to expected format - use name as primary display
            const formattedExchanges = exchangeList.map((ex: any) => ({
              id: ex.id,
              name: ex.name || ex.exchangeNumber || ex.exchange_number || ex.number || `Exchange ${ex.id}`,
              exchange_number: ex.exchangeNumber || ex.exchange_number || ex.number,
              status: ex.status || ex.lifecycle_stage || 'active'
            }));
            
            console.log('📋 Formatted exchanges:', formattedExchanges);
            setExchanges(formattedExchanges);
            console.log('✅ Successfully set', formattedExchanges.length, 'exchanges');
          } else {
            console.warn('⚠️ No exchanges found or invalid format');
            // Try a different API endpoint or method
            console.log('🔍 Trying alternative exchange fetch methods...');
            
            // Let's try without authentication first to see if that's the issue
            const altResponse = await fetch('/api/exchanges');
            console.log('📡 Alternative response status:', altResponse.status);
            
            if (altResponse.ok) {
              const altResult = await altResponse.json();
              console.log('📋 Alternative response:', altResult);
              setExchanges(FALLBACK_EXCHANGES);
            } else {
              setExchanges(FALLBACK_EXCHANGES);
            }
          }
        } else {
          const errorText = await response.text();
          console.error('❌ Exchange fetch failed:', response.status, errorText);
          console.log('📋 Response body:', errorText);
          setExchanges(FALLBACK_EXCHANGES);
        }
      } catch (error) {
        console.error('❌ Error fetching exchanges:', error);
        setExchanges(FALLBACK_EXCHANGES);
      } finally {
        setLoadingExchanges(false);
        console.log('🏁 Exchange fetch completed');
      }
    };
    
    if (isOpen && !exchangeId) {
      console.log('🔓 Modal opened, triggering exchange fetch...');
      fetchExchanges();
    }
  }, [isOpen, exchangeId]);
  
  // Fetch valid assignees based on context (exchange vs dashboard)
  useEffect(() => {
    const fetchValidAssignees = async () => {
      setLoadingAssignees(true);
      try {
        const token = getAuthToken();
        
        // Determine context - if exchangeId exists, we're in exchange context
        const context = exchangeId ? 'exchange' : 'dashboard';
        const params = new URLSearchParams({ context });
        
        // Use exchangeId prop or selected exchange from dropdown
        const targetExchangeId = exchangeId || selectedExchange;
        if (targetExchangeId) {
          params.append('exchangeId', targetExchangeId);
        }
        
        const url = `/api/tasks/assignees/valid?${params}`;
        console.log('🔍 Fetching assignees from:', url);
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(url, {
          headers
        });
        
        console.log('📋 Assignees response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('📋 Assignees result:', result);
          
          if (result.success && result.data?.assignees) {
            const mappedUsers = result.data.assignees.map((a: any) => ({
              id: a.id,
              name: a.name || a.email || 'Unknown',
              role: a.role || 'participant',
              email: a.email
            }));
            console.log('✅ Setting users:', mappedUsers);
            setUsers(mappedUsers);
          } else {
            console.warn('⚠️ No assignees in response or unsuccessful:', result);
            // Try to provide fallback users so assignment can still work
            console.log('🔄 Using fallback users to enable assignment');
            setUsers(FALLBACK_USERS);
          }
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch assignees:', errorText);
          console.log('🔄 Using fallback users due to API failure');
          setUsers(FALLBACK_USERS);
        }
      } catch (error) {
        console.error('Error fetching assignees:', error);
        console.log('🔄 Using fallback users due to network error');
        setUsers(FALLBACK_USERS);
      } finally {
        setLoadingAssignees(false);
      }
    };
    
    if (isOpen) {
      // Always fetch users when modal is open and we have an exchange context
      const contextExchangeId = exchangeId || selectedExchange;
      
      if (contextExchangeId) {
        console.log('🔓 Fetching assignees for exchange:', contextExchangeId);
        fetchValidAssignees();
      } else if (!exchangeId) {
        // In dashboard context without exchange selected, wait for user to select exchange
        console.log('🔓 Waiting for exchange selection in dashboard context');
        setUsers([]); // Clear users until exchange is selected
      }
    }
  }, [isOpen, exchangeId, selectedExchange]);

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
      
      // Validate exchangeId is present (from prop or selection)
      const targetExchangeId = exchangeId || selectedExchange;
      console.log('🔍 Exchange ID validation:', {
        exchangeId,
        selectedExchange,
        targetExchangeId,
        currentMode,
        isExchangeContext: !!exchangeId,
        isDashboardContext: !exchangeId
      });
      
      if (!targetExchangeId) {
        console.error('❌ No exchange ID available for task creation');
        throw new Error('Exchange ID is required to create a task');
      }

      let createdTask;

      if (currentMode === 'natural' && (parsedTask || parsedPreview)) {
        // Create from natural language with user selections
        // In exchange context, always use the provided exchangeId
        const result = await createFromNaturalLanguage(naturalLanguageText, {
          assignedTo: selectedAssignee || parsedPreview?.extractedData?.assigneeInfo?.id || undefined,
          exchangeId: targetExchangeId || parsedPreview?.extractedData?.exchangeInfo?.id
        });
        createdTask = result.task;
      } else {
        // Validate manual form data
        console.log('🔍 Manual form validation check:', {
          title: manualForm.title,
          titleLength: manualForm.title?.length,
          titleTrimmed: manualForm.title?.trim(),
          titleTrimmedLength: manualForm.title?.trim()?.length,
          isEmpty: !manualForm.title || manualForm.title.trim() === ''
        });
        
        if (!manualForm.title || manualForm.title.trim() === '') {
          console.error('❌ Manual form validation failed: title is empty');
          throw new Error('Task title is required');
        }
        
        console.log('📝 Manual form data:', {
          ...manualForm,
          titleValid: !!(manualForm.title && manualForm.title.trim()),
          exchangeIdValid: !!targetExchangeId
        });
        
        // Create manual task - ensure both exchange_id and exchangeId for compatibility
        const taskData = {
          title: manualForm.title.trim(), // Ensure title is trimmed
          description: manualForm.description || '',
          priority: manualForm.priority || 'medium',
          category: manualForm.category || 'general',
          exchange_id: targetExchangeId,
          exchangeId: targetExchangeId, // Add both for backend compatibility
          ...(manualForm.assignedTo && { assigned_to: manualForm.assignedTo }),
          ...(manualForm.dueDate && { due_date: manualForm.dueDate }),
          ...(selectedTemplate && {
            metadata: {
              template_used: selectedTemplate,
              estimated_duration: manualForm.estimatedDuration
            }
          })
        };
        
        console.log('🚀 Creating task with data:', taskData);
        console.log('🔍 Task data fields:', {
          title: taskData.title,
          titleType: typeof taskData.title,
          titleEmpty: !taskData.title || taskData.title.trim() === '',
          exchange_id: taskData.exchange_id,
          exchangeIdType: typeof taskData.exchange_id,
          exchangeIdEmpty: !taskData.exchange_id || taskData.exchange_id.trim() === '',
          exchangeId: taskData.exchangeId,
          exchangeIdPropType: typeof taskData.exchangeId,
          exchangeIdPropEmpty: !taskData.exchangeId || taskData.exchangeId.trim() === ''
        });
        
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
    setSelectedAssignee('');
    // Only reset selectedExchange if not in exchange context
    if (!exchangeId) {
      setSelectedExchange('');
    }
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

                          {/* Exchange Selection for Natural Language - Only in dashboard context */}
                          {!exchangeId && (
                            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                              <h4 className="font-medium text-purple-900 mb-2">🏢 Select Exchange</h4>
                              <p className="text-sm text-purple-800 mb-3">
                                Choose which exchange this task belongs to
                              </p>
                              <select
                                value={selectedExchange}
                                onChange={(e) => {
                                  setSelectedExchange(e.target.value);
                                  // Clear assignee when exchange changes
                                  setSelectedAssignee('');
                                }}
                                className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                disabled={loadingExchanges}
                              >
                                <option value="">
                                  {loadingExchanges ? 'Loading exchanges...' : 
                                   exchanges.length === 0 ? 'No exchanges available' : 'Select an exchange...'}
                                </option>
                                {exchanges.map(exchange => (
                                  <option key={exchange.id} value={exchange.id}>
                                    {exchange.name} ({exchange.status})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

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
                                disabled={loadingAssignees || (!exchangeId && !selectedExchange)}
                              >
                                <option value="">
                                  {loadingAssignees ? 'Loading assignees...' : 
                                   !exchangeId && !selectedExchange ? 'Select exchange first' :
                                   users.length === 0 ? 'No assignees available' :
                                   `Select a user to assign (${exchangeId ? 'Exchange participants' : 'Exchange participants'})...`}
                                </option>
                                {users.map((user) => (
                                  <option key={user.id} value={user.id}>
                                    {user.name} {user.email ? `(${user.email})` : ''} - {user.role}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Exchange Selection Section - Only show if not in exchange context */}
                          {parsedPreview.extractedData?.needsExchangeSelection && !exchangeId && (
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
                          
                          {/* Exchange Context Display - Show when in exchange page */}
                          {exchangeId && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <h4 className="font-medium text-blue-900 mb-2">🏢 Current Exchange</h4>
                              <p className="text-sm text-blue-800">
                                {exchangeName ? `Task will be created in: ${exchangeName}` : 'Task will be created in the current exchange'}
                              </p>
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

                          {/* Found Exchange Info - Only show if not already in exchange context */}
                          {parsedPreview.extractedData?.exchangeInfo && !exchangeId && (
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
                      {/* Exchange Context Display for Manual Mode */}
                      {exchangeId && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">🏢 Current Exchange</h4>
                          <p className="text-sm text-blue-800">
                            {exchangeName ? `Task will be created in: ${exchangeName}` : 'Task will be created in the current exchange'}
                          </p>
                        </div>
                      )}
                      
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

                        {/* Exchange Selection - Only show in dashboard context */}
                        {!exchangeId && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Exchange *
                            </label>
                            <select
                              value={selectedExchange}
                              onChange={(e) => {
                                setSelectedExchange(e.target.value);
                                // Clear assignee when exchange changes
                                setSelectedAssignee('');
                                setManualForm(prev => ({ ...prev, assignedTo: '' }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              disabled={loadingExchanges}
                            >
                              <option value="">
                                {loadingExchanges ? 'Loading exchanges...' : 
                                 exchanges.length === 0 ? 'No exchanges available' : 'Select an exchange...'}
                              </option>
                              {exchanges.map(exchange => (
                                <option key={exchange.id} value={exchange.id}>
                                  {exchange.name} ({exchange.status})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Assign To
                          </label>
                          <select
                            value={manualForm.assignedTo}
                            onChange={(e) => setManualForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={loadingAssignees || (!exchangeId && !selectedExchange)}
                          >
                            <option value="">
                              {loadingAssignees ? 'Loading assignees...' : 
                               !exchangeId && !selectedExchange ? 'Select exchange first' :
                               users.length === 0 ? 'No assignees available' :
                               `Select assignee (${exchangeId ? 'Exchange participants' : 'Exchange participants'})...`}
                            </option>
                            {users.map(user => (
                              <option key={user.id} value={user.id}>
                                {user.name} {user.email ? `(${user.email})` : ''} - {user.role}
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
                        (currentMode === 'manual' && (!manualForm.title.trim() || (!exchangeId && !selectedExchange))) ||
                        (!exchangeId && !selectedExchange) || // Always require exchange selection
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