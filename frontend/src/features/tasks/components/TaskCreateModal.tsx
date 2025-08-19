import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '../../../types';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { useExchanges } from '../../exchanges/hooks/useExchanges';
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

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Exchange {
  id: string;
  name: string;
  exchangeNumber?: string;
  client?: {
    firstName: string;
    lastName: string;
  };
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
  { value: 'COMPLETED', label: 'Completed', color: 'green', icon: CheckCircleIcon }
];

const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  exchangeId,
  prefilledData
}) => {
  const { user } = useAuth();
  const { exchanges, loading: exchangesLoading } = useExchanges();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [exchangeParticipants, setExchangeParticipants] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    status: 'PENDING',
    priority: 'MEDIUM',
    dueDate: '',
    assignedTo: '',
    exchangeId: exchangeId || '',
    tags: [],
    estimatedHours: 0,
    notifyAssignee: true,
    attachments: []
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (prefilledData) {
        setFormData(prev => ({
          ...prev,
          ...prefilledData,
          exchangeId: prefilledData.exchangeId || exchangeId || ''
        }));
      }
    }
  }, [isOpen, exchangeId, prefilledData]);

  useEffect(() => {
    if (formData.exchangeId) {
      loadExchangeParticipants(formData.exchangeId);
    }
  }, [formData.exchangeId]);

  const loadData = async () => {
    try {
      const usersResponse = await apiService.getUsers();
      const usersData = (usersResponse as any)?.data || usersResponse;
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadExchangeParticipants = async (exchangeId: string) => {
    try {
      const participants = await apiService.getExchangeParticipants(exchangeId);
      setExchangeParticipants(participants || []);
    } catch (error) {
      console.error('Error loading exchange participants:', error);
      setExchangeParticipants([]);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.exchangeId) {
      newErrors.exchangeId = 'Exchange is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const taskData = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
        assignedTo: formData.assignedTo === 'ALL' ? undefined : formData.assignedTo || undefined,
        exchangeId: formData.exchangeId,
        tags: formData.tags,
        estimatedHours: formData.estimatedHours,
        notifyAssignee: formData.notifyAssignee,
        metadata: {
          notify_all_users: formData.assignedTo === 'ALL'
        }
      };

      const createdTask = await apiService.createTask(taskData);
      onTaskCreated(createdTask);
      onClose();
    } catch (error: any) {
      console.error('Error creating task:', error);
      setErrors({ submit: error.message || 'Failed to create task' });
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: any) => {
    setFormData(prev => ({
      ...prev,
      ...template.data,
      title: template.data.title + (prev.title ? ` - ${prev.title}` : '')
    }));
  };

  const handleTagAdd = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmedTag] }));
    }
  };

  const handleTagRemove = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

      // Combine exchange participants and all users for assignment dropdown
    const allAssignmentOptions = [
      // Unassigned option
      {
        id: '',
        label: 'Unassigned',
        subtitle: 'No assignment',
        icon: UserCircleIcon,
        group: 'Assignment Options'
      },
      // All Users option
      {
        id: 'ALL',
        label: 'All Users (Notify Everyone)',
        subtitle: 'Notify all users in the system',
        icon: UserGroupIcon,
        group: 'Assignment Options'
      },
      // Exchange participants first
      ...(Array.isArray(exchangeParticipants) ? exchangeParticipants : []).map(participant => ({
        id: participant.id,
        label: participant.name || participant.email || 'Unknown User',
        subtitle: `Exchange Participant - ${participant.role || 'Participant'}`,
        icon: UserCircleIcon,
        group: 'Exchange Participants'
      })),
    // Then all users
    ...(Array.isArray(users) ? users : []).map(user => ({
      id: user.id,
      label: `${user.firstName} ${user.lastName}`,
      subtitle: `${user.email} - ${user.role}`,
      icon: UserCircleIcon,
      group: 'All Users'
    }))
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
            <p className="text-sm text-gray-500">Step {step} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-2 bg-gray-50">
          <div className="flex space-x-2">
            {[1, 2, 3].map(stepNumber => (
              <div
                key={stepNumber}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  stepNumber <= step ? 'bg-purple-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              {/* Quick Templates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Quick Templates
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {QUICK_TEMPLATES.map(template => {
                    const TemplateIcon = template.icon;
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left"
                      >
                        <TemplateIcon className="w-5 h-5 text-purple-600 mb-2" />
                        <div className="font-medium text-gray-900">{template.label}</div>
                        <div className="text-sm text-gray-500">Quick setup</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Basic Task Info */}
              <div className="space-y-6">
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
                    label: exchange.exchangeNumber || exchange.name || `Exchange ${exchange.id.slice(0, 8)}`,
                    subtitle: exchange.client ? `${exchange.client.firstName} ${exchange.client.lastName}` : 'No client assigned',
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
                    options={allAssignmentOptions}
                    value={formData.assignedTo}
                    onChange={(value) => setFormData(prev => ({ ...prev, assignedTo: value }))}
                    placeholder={
                      !formData.exchangeId 
                        ? 'Select an exchange first' 
                        : allAssignmentOptions.length === 0 
                          ? 'No users found' 
                          : 'Select a user'
                    }
                    searchPlaceholder="Search users..."
                    emptyMessage="No users found"
                    disabled={!formData.exchangeId}
                  />
                  {!formData.exchangeId && (
                    <p className="mt-1 text-sm text-gray-500">
                      Please select an exchange to see available users
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
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              {/* Task Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Task Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Title:</span>
                    <p className="font-medium">{formData.title}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Priority:</span>
                    <p className="font-medium">{formData.priority}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <p className="font-medium">{formData.status}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Due Date:</span>
                    <p className="font-medium">{formData.dueDate || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Assigned To:</span>
                    <p className="font-medium">
                      {formData.assignedTo ? 
                        allAssignmentOptions.find(opt => opt.id === formData.assignedTo)?.label || 'Unknown' 
                        : 'Unassigned'
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Exchange:</span>
                    <p className="font-medium">
                      {exchanges.find(ex => ex.id === formData.exchangeId)?.name || 'Unknown'}
                    </p>
                  </div>
                </div>
                {formData.description && (
                  <div className="mt-3">
                    <span className="text-gray-500">Description:</span>
                    <p className="text-sm mt-1">{formData.description}</p>
                  </div>
                )}
                {formData.tags.length > 0 && (
                  <div className="mt-3">
                    <span className="text-gray-500">Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formData.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notifyAssignee}
                    onChange={(e) => setFormData(prev => ({ ...prev, notifyAssignee: e.target.checked }))}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Notify assignee when task is created
                  </span>
                </label>
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600">{errors.submit}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            
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
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Task'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCreateModal;