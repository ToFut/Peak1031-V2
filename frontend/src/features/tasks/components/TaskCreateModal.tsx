import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '../../../types';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { SearchableDropdown } from '../../../components/ui/SearchableDropdown';
import {
  XMarkIcon,
  CalendarIcon,
  UserCircleIcon,
  TagIcon,
  FlagIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  SparklesIcon,
  PlusIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ChatBubbleLeftRightIcon,
  PaperClipIcon,
  BoltIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: Task) => void;
  exchangeId?: string;
  prefilledData?: Partial<Task>;
}

interface FormData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignedTo: string;
  exchangeId: string;
  tags: string[];
  estimatedHours: number;
  notifyAssignee: boolean;
  attachments: File[];
}

const QUICK_TEMPLATES = [
  { 
    id: 'document-review',
    icon: DocumentTextIcon, 
    label: 'Document Review',
    data: {
      title: 'Review documents',
      priority: 'MEDIUM' as TaskPriority,
      tags: ['documents', 'review']
    }
  },
  { 
    id: 'client-call',
    icon: ChatBubbleLeftRightIcon, 
    label: 'Client Call',
    data: {
      title: 'Call with client',
      priority: 'HIGH' as TaskPriority,
      tags: ['communication', 'client']
    }
  },
  { 
    id: 'deadline',
    icon: ExclamationTriangleIcon, 
    label: 'Deadline Task',
    data: {
      title: 'Deadline: ',
      priority: 'HIGH' as TaskPriority,
      status: 'IN_PROGRESS' as TaskStatus,
      tags: ['urgent', 'deadline']
    }
  },
  { 
    id: 'follow-up',
    icon: ArrowPathIcon, 
    label: 'Follow Up',
    data: {
      title: 'Follow up on',
      priority: 'LOW' as TaskPriority,
      tags: ['follow-up']
    }
  }
];

const PRIORITY_OPTIONS = [
  { value: 'HIGH', label: 'High', color: 'red', icon: ExclamationTriangleIcon },
  { value: 'MEDIUM', label: 'Medium', color: 'yellow', icon: FlagIcon },
  { value: 'LOW', label: 'Low', color: 'green', icon: FlagIcon }
];

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'To Do', color: 'gray', icon: ClockIcon },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'blue', icon: ArrowPathIcon },
  { value: 'REVIEW', label: 'In Review', color: 'purple', icon: DocumentTextIcon },
  { value: 'COMPLETED', label: 'Completed', color: 'green', icon: CheckCircleIcon }
];

export const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  exchangeId = '',
  prefilledData = {}
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [exchangeParticipants, setExchangeParticipants] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    title: prefilledData.title || '',
    description: prefilledData.description || '',
    status: prefilledData.status || 'PENDING',
    priority: prefilledData.priority || 'MEDIUM',
    dueDate: prefilledData.dueDate || '',
    assignedTo: prefilledData.assignedTo || '',
    exchangeId: exchangeId || prefilledData.exchange_id || '',
    tags: (prefilledData as any).tags || [],
    estimatedHours: (prefilledData as any).estimatedHours || 0,
    notifyAssignee: true,
    attachments: []
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.exchangeId) {
      console.log('Loading participants for exchange:', formData.exchangeId);
      loadExchangeParticipants(formData.exchangeId);
    } else {
      // If no exchange selected, clear participants
      console.log('No exchange selected, clearing participants');
      setExchangeParticipants([]);
    }
  }, [formData.exchangeId]);

  const loadData = async () => {
    try {
      const [exchangesRes, usersRes] = await Promise.all([
        apiService.getExchanges(),
        apiService.getUsers()
      ]);
      
      console.log('Exchanges response:', exchangesRes);
      
      // The API already extracts the exchanges array from response.exchanges
      const exchangesData = Array.isArray(exchangesRes) ? exchangesRes : [];
      
      console.log('Exchanges data:', exchangesData);
      console.log('First exchange:', exchangesData[0]);
      console.log('Exchange properties:', exchangesData[0] ? Object.keys(exchangesData[0]) : 'No exchanges');
      
      setExchanges(exchangesData);
      setUsers(usersRes || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadExchangeParticipants = async (exchangeId: string) => {
    try {
      const response = await apiService.getExchangeParticipants(exchangeId);
      console.log('Exchange participants response:', response);
      
      // Handle different response formats
      const participants = response.data || response.participants || response || [];
      
      // Format participants for display
      const participantUsers = participants
        .filter((p: any) => p.id) // Ensure participant has an ID
        .map((p: any) => ({
          id: p.id,
          // Store the actual ID that should be used for assignment
          assignmentId: p.userId || p.contactId || p.id,
          userId: p.userId,
          contactId: p.contactId,
          name: p.firstName && p.lastName 
            ? `${p.firstName} ${p.lastName}` 
            : p.name || p.email || 'Unknown',
          email: p.email,
          role: p.role
        }));
      
      console.log('Formatted participants:', participantUsers);
      setExchangeParticipants(participantUsers);
    } catch (error) {
      console.error('Failed to load exchange participants:', error);
      // Fallback to showing all users if failed
      setExchangeParticipants(users);
    }
  };

  const handleTemplateSelect = (template: typeof QUICK_TEMPLATES[0]) => {
    setSelectedTemplate(template.id);
    setFormData(prev => ({
      ...prev,
      ...template.data
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.exchangeId && exchanges.length > 0) {
      newErrors.exchangeId = 'Please select an exchange';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const taskData = {
        ...formData,
        exchange_id: formData.exchangeId,
        assigned_to: formData.assignedTo?.trim() || undefined, // Use undefined instead of null
        created_by: user?.id
      };
      
      // Remove the old camelCase field to avoid confusion
      delete (taskData as any).assignedTo;
      
      const newTask = await apiService.createTask(taskData);
      onTaskCreated(newTask);
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        status: 'PENDING',
        priority: 'MEDIUM',
        dueDate: '',
        assignedTo: '',
        exchangeId: '',
        tags: [],
        estimatedHours: 0,
        notifyAssignee: true,
        attachments: []
      });
      setStep(1);
      setSelectedTemplate(null);
    } catch (error: any) {
      console.error('Failed to create task:', error);
      
      // Show user-friendly error message
      if (error.message?.includes('not a participant')) {
        alert('Assignment Error: The selected user is not a participant in this exchange. Please select a different assignee or leave the assignment blank.');
      } else {
        alert(`Failed to create task: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTagAdd = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const handleTagRemove = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const currentPriority = PRIORITY_OPTIONS.find(p => p.value === formData.priority) || PRIORITY_OPTIONS[1];
  const currentStatus = STATUS_OPTIONS.find(s => s.value === formData.status) || STATUS_OPTIONS[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
                <SparklesIcon className="w-4 sm:w-5 h-4 sm:h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Create New Task</h2>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Fill in the details to create a task</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-4 sm:px-6 py-2 sm:py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setStep(1)}
                className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${
                  step === 1 ? 'bg-purple-100 text-purple-700' : 'text-gray-500'
                }`}
              >
                1. Basic Info
              </button>
              <ChevronDownIcon className="w-4 h-4 text-gray-400 rotate-[-90deg]" />
              <button
                onClick={() => setStep(2)}
                className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${
                  step === 2 ? 'bg-purple-100 text-purple-700' : 'text-gray-500'
                }`}
              >
                2. Details
              </button>
              <ChevronDownIcon className="w-4 h-4 text-gray-400 rotate-[-90deg]" />
              <button
                onClick={() => setStep(3)}
                className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${
                  step === 3 ? 'bg-purple-100 text-purple-700' : 'text-gray-500'
                }`}
              >
                3. Review
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {step === 1 && (
            <div className="space-y-6">
              {/* Quick Templates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Quick Templates
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                  {QUICK_TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedTemplate === template.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <template.icon className={`w-6 h-6 mx-auto mb-1 ${
                        selectedTemplate === template.id ? 'text-purple-600' : 'text-gray-500'
                      }`} />
                      <span className="text-xs font-medium text-gray-700">{template.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter task title..."
                  autoFocus
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Add a detailed description..."
                />
              </div>

              {/* Priority and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRIORITY_OPTIONS.map(priority => (
                      <button
                        key={priority.value}
                        onClick={() => setFormData(prev => ({ ...prev, priority: priority.value as TaskPriority }))}
                        className={`p-2 rounded-lg border-2 transition-all ${
                          formData.priority === priority.value
                            ? `border-${priority.color}-500 bg-${priority.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <priority.icon className={`w-4 h-4 mx-auto mb-1 text-${priority.color}-600`} />
                        <span className={`text-xs font-medium text-${priority.color}-700`}>
                          {priority.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Status
                  </label>
                  <SearchableDropdown
                    options={STATUS_OPTIONS.map(status => ({
                      id: status.value,
                      label: status.label,
                      icon: status.icon
                    }))}
                    value={formData.status}
                    onChange={(value) => setFormData(prev => ({ ...prev, status: value as TaskStatus }))}
                    placeholder="Select status..."
                    searchPlaceholder="Search status..."
                    emptyMessage="No status options found"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Exchange Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exchange {exchanges.length > 0 && <span className="text-red-500">*</span>}
                </label>
                <SearchableDropdown
                  options={exchanges.map(exchange => ({
                    id: exchange.id,
                    label: exchange.exchange_number || exchange.exchangeNumber || exchange.name || exchange.exchangeName || `Exchange ${exchange.id.slice(0, 8)}`,
                    subtitle: exchange.client ? `${exchange.client.first_name} ${exchange.client.last_name}` : 'No client assigned',
                    icon: BuildingOfficeIcon
                  }))}
                  value={formData.exchangeId}
                  onChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    exchangeId: value,
                    assignedTo: '' // Clear assignee when exchange changes
                  }))}
                  placeholder="Select an exchange..."
                  searchPlaceholder="Search exchanges..."
                  emptyMessage="No exchanges found"
                  error={!!errors.exchangeId}
                />
                {errors.exchangeId && (
                  <p className="mt-1 text-sm text-red-600">{errors.exchangeId}</p>
                )}
              </div>

              {/* Due Date and Assignee */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <div className="relative">
                    <CalendarIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign To
                  </label>
                  <SearchableDropdown
                    options={exchangeParticipants.map(participant => ({
                      id: participant.assignmentId,
                      label: participant.name || participant.email || 'Unknown User',
                      subtitle: participant.role ? `Role: ${participant.role}` : undefined,
                      icon: UserCircleIcon
                    }))}
                    value={formData.assignedTo}
                    onChange={(value) => setFormData(prev => ({ ...prev, assignedTo: value }))}
                    placeholder={
                      !formData.exchangeId 
                        ? 'Select an exchange first' 
                        : exchangeParticipants.length === 0 
                          ? 'No participants found' 
                          : 'Select a participant'
                    }
                    searchPlaceholder="Search participants..."
                    emptyMessage="No participants found"
                    disabled={!formData.exchangeId}
                  />
                  {!formData.exchangeId && (
                    <p className="mt-1 text-sm text-gray-500">
                      Please select an exchange to see available participants
                    </p>
                  )}
                </div>
              </div>

              {/* Estimated Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Hours
                </label>
                <div className="relative">
                  <ClockIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: Number(e.target.value) }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    min="0"
                    step="0.5"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => handleTagRemove(tag)}
                        className="ml-1 text-purple-500 hover:text-purple-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add tags (press Enter)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      handleTagAdd(input.value);
                      input.value = '';
                    }
                  }}
                />
              </div>

              {/* Notification */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.notifyAssignee}
                    onChange={(e) => setFormData(prev => ({ ...prev, notifyAssignee: e.target.checked }))}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Notify assignee when task is created</span>
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Task Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-500">Title</span>
                    <p className="text-gray-900 font-medium">{formData.title || 'Not set'}</p>
                  </div>
                  
                  {formData.description && (
                    <div>
                      <span className="text-sm text-gray-500">Description</span>
                      <p className="text-gray-900">{formData.description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Priority</span>
                      <div className="flex items-center gap-2 mt-1">
                        <currentPriority.icon className={`w-4 h-4 text-${currentPriority.color}-600`} />
                        <span className={`text-${currentPriority.color}-700 font-medium`}>
                          {currentPriority.label}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-500">Status</span>
                      <div className="flex items-center gap-2 mt-1">
                        <currentStatus.icon className={`w-4 h-4 text-${currentStatus.color}-600`} />
                        <span className={`text-${currentStatus.color}-700 font-medium`}>
                          {currentStatus.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {formData.dueDate && (
                    <div>
                      <span className="text-sm text-gray-500">Due Date</span>
                      <p className="text-gray-900">
                        {new Date(formData.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  
                  {formData.assignedTo && (
                    <div>
                      <span className="text-sm text-gray-500">Assigned To</span>
                      <p className="text-gray-900">
                        {exchangeParticipants.find(u => u.assignmentId === formData.assignedTo)?.name || 'Selected participant'}
                      </p>
                    </div>
                  )}
                  
                  {formData.tags.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-500">Tags</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {formData.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <BoltIcon className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Ready to create task</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Your task will be created and {formData.notifyAssignee && formData.assignedTo ? 'the assignee will be notified' : 'added to the exchange'}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Previous
                </button>
              )}
              
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4" />
                      Create Task
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCreateModal;