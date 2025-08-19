/**
 * Enhanced Task Manager
 * Uses the same components and patterns as the main Tasks tab
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ChartBarIcon,
  PlusIcon,
  XMarkIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  FlagIcon
} from '@heroicons/react/24/outline';
import { SearchableDropdown } from '../../../components/ui/SearchableDropdown';
import { apiService } from '../../../services/api';

const EnhancedTaskManager: React.FC<{ 
  exchangeId?: string; 
  exchangeName?: string;
  onTaskCreated?: () => void;
}> = ({ exchangeId, exchangeName, onTaskCreated }) => {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [compactView, setCompactView] = useState(true);
  
  // Task creation form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    exchange_id: exchangeId || '',
    assigned_to: '',
    due_date: ''
  });
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load exchanges and users on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [exchangesResponse, usersResponse] = await Promise.all([
          apiService.getExchanges(),
          apiService.getUsers()
        ]);

        const exchangesData = (exchangesResponse as any)?.data || exchangesResponse;
        const usersData = (usersResponse as any)?.data || usersResponse;

        setExchanges(Array.isArray(exchangesData) ? exchangesData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  // Update form data when exchangeId prop changes
  useEffect(() => {
    if (exchangeId) {
      setFormData(prev => ({ ...prev, exchange_id: exchangeId }));
    }
  }, [exchangeId]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }

    if (!formData.exchange_id) {
      newErrors.exchange_id = 'Exchange is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const taskData = {
        ...formData,
        // If assigned_to is 'ALL', we'll handle this specially in the backend
        assigned_to: formData.assigned_to === 'ALL' ? undefined : formData.assigned_to,
        // Add metadata to indicate if this should notify all users
        metadata: {
          notify_all_users: formData.assigned_to === 'ALL'
        }
      };

      const createdTask = await apiService.createTask(taskData);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'MEDIUM',
        exchange_id: exchangeId || '',
        assigned_to: '',
        due_date: ''
      });
      setErrors({});
      setShowCreateModal(false);
      
      if (onTaskCreated) {
        onTaskCreated();
      }
    } catch (error: any) {
      console.error('Error creating task:', error);
      setErrors({ submit: error.message || 'Failed to create task' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <SparklesIcon className="h-6 w-6 text-blue-600 mr-3" />
              Task Management
            </h2>
            <p className="mt-1 text-gray-600">
              {exchangeId ? 'Exchange-specific tasks with AI assistance' : 'AI-powered task management'}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('board')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'board'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Squares2X2Icon className="h-4 w-4" />
                <span>Board</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TableCellsIcon className="h-4 w-4" />
                <span>List</span>
              </button>
            </div>

            {/* Compact View Toggle */}
            <button
              onClick={() => setCompactView(!compactView)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                compactView
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ChartBarIcon className="h-4 w-4" />
              <span className="text-sm font-medium">
                {compactView ? 'Compact' : 'Detailed'}
              </span>
            </button>

            {/* Create Task Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Create Task</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-900">Pending</p>
                <p className="text-2xl font-bold text-blue-600">0</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-yellow-900">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">0</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-900">Completed</p>
                <p className="text-2xl font-bold text-green-600">0</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <SparklesIcon className="h-5 w-5 text-purple-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-purple-900">AI Suggestions</p>
                <p className="text-2xl font-bold text-purple-600">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="mt-4">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
              AI-Powered
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
              Smart Templates
            </span>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
              Chat Integration
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'board' ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          <Squares2X2Icon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Enhanced Task Board coming soon. Use List view for now.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          <TableCellsIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>List view coming soon. Use Board view for now.</p>
        </div>
      )}

      {/* Task Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Create New Task</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Task Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter task title..."
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
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter task description..."
                />
              </div>

              {/* Exchange Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exchange *
                </label>
                <SearchableDropdown
                  options={[
                    ...exchanges.map((exchange: any) => ({
                      id: exchange.id,
                      label: exchange.name,
                      icon: BuildingOfficeIcon
                    }))
                  ]}
                  value={formData.exchange_id}
                  onChange={(value) => handleInputChange('exchange_id', value)}
                  placeholder="Select exchange..."
                  searchPlaceholder="Search exchanges..."
                  disabled={!!exchangeId} // Disable if exchange is pre-selected
                />
                {errors.exchange_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.exchange_id}</p>
                )}
                {exchangeName && (
                  <p className="mt-1 text-sm text-gray-500">
                    Pre-selected: {exchangeName}
                  </p>
                )}
              </div>

              {/* User Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign To
                </label>
                <SearchableDropdown
                  options={[
                    { id: '', label: 'Unassigned', icon: UserGroupIcon },
                    { id: 'ALL', label: 'All Users (Notify Everyone)', icon: UserGroupIcon },
                    ...users.map((user: any) => ({
                      id: user.id,
                      label: `${user.firstName} ${user.lastName}`,
                      icon: UserGroupIcon
                    }))
                  ]}
                  value={formData.assigned_to}
                  onChange={(value) => handleInputChange('assigned_to', value)}
                  placeholder="Select assignee..."
                  searchPlaceholder="Search users..."
                />
                {formData.assigned_to === 'ALL' && (
                  <p className="mt-1 text-sm text-blue-600">
                    This task will be visible to all users and they will be notified
                  </p>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <SearchableDropdown
                  options={[
                    { id: 'LOW', label: 'Low Priority', icon: FlagIcon },
                    { id: 'MEDIUM', label: 'Medium Priority', icon: FlagIcon },
                    { id: 'HIGH', label: 'High Priority', icon: ExclamationTriangleIcon }
                  ]}
                  value={formData.priority}
                  onChange={(value) => handleInputChange('priority', value)}
                  placeholder="Select priority..."
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <div className="relative">
                  <CalendarDaysIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => handleInputChange('due_date', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Task</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTaskManager;