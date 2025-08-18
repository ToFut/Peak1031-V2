import React, { useState, useRef, useEffect } from 'react';
import { 
  XMarkIcon,
  PlusIcon,
  CalendarIcon,
  UserIcon,
  FlagIcon,
  TagIcon,
  SparklesIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

import { Task, TaskPriority } from '../../../types';
import { apiService } from '../../../services/api';

interface TaskQuickCreateProps {
  onTaskCreate: (task: Task) => void;
  onClose: () => void;
  exchangeId?: string;
  prefillData?: Partial<Task>;
}

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  priority: string;
  estimatedTime?: string;
  category?: string;
}

export const TaskQuickCreate: React.FC<TaskQuickCreateProps> = ({
  onTaskCreate,
  onClose,
  exchangeId,
  prefillData
}) => {
  const [title, setTitle] = useState(prefillData?.title || '');
  const [description, setDescription] = useState(prefillData?.description || '');
  const [priority, setPriority] = useState(prefillData?.priority || 'MEDIUM');
  const [dueDate, setDueDate] = useState(prefillData?.dueDate || prefillData?.due_date || '');
  const [assignee, setAssignee] = useState(prefillData?.assignedTo || prefillData?.assigned_to || '');
  const [tags, setTags] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [availableAssignees, setAvailableAssignees] = useState<any[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([]);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Task templates
  const templates: TaskTemplate[] = [
    {
      id: 'document-review',
      name: 'Document Review',
      description: 'Review and validate exchange documents',
      priority: 'HIGH',
      estimatedTime: '2 hours',
      category: 'Review'
    },
    {
      id: 'client-followup',
      name: 'Client Follow-up',
      description: 'Follow up with client on pending items',
      priority: 'MEDIUM',
      estimatedTime: '30 minutes',
      category: 'Communication'
    },
    {
      id: 'compliance-check',
      name: 'Compliance Check',
      description: 'Verify compliance requirements are met',
      priority: 'HIGH',
      estimatedTime: '1 hour',
      category: 'Compliance'
    },
    {
      id: 'status-update',
      name: 'Status Update',
      description: 'Update stakeholders on current progress',
      priority: 'LOW',
      estimatedTime: '15 minutes',
      category: 'Communication'
    }
  ];

  useEffect(() => {
    // Focus title input on mount
    titleInputRef.current?.focus();

    // Load available assignees
    loadAvailableAssignees();

    // Generate smart suggestions based on title
    if (title.length > 3) {
      generateSmartSuggestions();
    }
  }, [title]);

  const loadAvailableAssignees = async () => {
    try {
      const endpoint = exchangeId ? `/tasks/assignees/valid?exchangeId=${exchangeId}` : '/tasks/assignees/valid';
      const response = await apiService.get(endpoint);
      
      if (response.success) {
        setAvailableAssignees(response.data.assignees || []);
      }
    } catch (error) {
      console.error('Failed to load assignees:', error);
    }
  };

  const generateSmartSuggestions = async () => {
    try {
      // This would be an AI-powered suggestion endpoint
      const suggestions = [
        { field: 'priority', value: 'HIGH', reason: 'Contains urgent keywords' },
        { field: 'dueDate', value: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reason: 'Standard 3-day deadline' }
      ];
      setSmartSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    }
  };

  const applyTemplate = (template: TaskTemplate) => {
    setTitle(template.name);
    setDescription(template.description);
    setPriority(template.priority as any);
    setShowTemplates(false);
  };

  const applySuggestion = (suggestion: any) => {
    switch (suggestion.field) {
      case 'priority':
        setPriority(suggestion.value);
        break;
      case 'dueDate':
        setDueDate(suggestion.value);
        break;
    }
    setSmartSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    setIsCreating(true);
    
    try {
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        priority,
        due_date: dueDate || null,
        assigned_to: assignee || null,
        exchange_id: exchangeId || '00000000-0000-0000-0000-000000000000',
        status: 'PENDING',
        metadata: {
          tags,
          created_via: 'quick_create'
        }
      };

      const response = await apiService.post('/tasks', taskData);
      
      if (response.success) {
        onTaskCreate(response.data);
        onClose();
      } else {
        console.error('Failed to create task:', response.error);
      }
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e as any);
    }
  };

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const suggestedTags = ['urgent', 'review', 'followup', 'compliance', 'document'];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <PlusIcon className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Template Button */}
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <SparklesIcon className="w-4 h-4" />
            Templates
          </button>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Templates Panel */}
      {showTemplates && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Task Templates</h3>
          <div className="grid grid-cols-2 gap-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template)}
                className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-white transition-colors"
              >
                <div className="font-medium text-sm text-gray-900">{template.name}</div>
                <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    template.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                    template.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {template.priority}
                  </span>
                  {template.estimatedTime && (
                    <span className="text-xs text-gray-500">{template.estimatedTime}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
          <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
            <SparklesIcon className="w-4 h-4" />
            Smart Suggestions
          </h3>
          <div className="space-y-1">
            {smartSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => applySuggestion(suggestion)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 text-sm w-full"
              >
                <CheckIcon className="w-4 h-4 text-blue-600" />
                <span className="flex-1 text-left">
                  Set {suggestion.field} to <strong>{suggestion.value}</strong>
                </span>
                <span className="text-xs text-blue-600">{suggestion.reason}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="p-6">
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Title *
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Priority and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign to
            </label>
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Unassigned</option>
              {availableAssignees.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {suggestedTags.filter(tag => !tags.includes(tag)).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">⌘ + Enter</kbd> to create
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isCreating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreating && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              Create Task
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};