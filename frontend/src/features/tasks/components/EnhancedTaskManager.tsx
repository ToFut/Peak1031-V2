/**
 * Enhanced Task Manager
 * Includes bulk operations, advanced filtering, and exchange-specific views
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  TagIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../../services/api';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assignedTo: string;
  exchangeId: string;
  exchangeName?: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskFilters {
  status?: string;
  priority?: string;
  assignedTo?: string;
  exchangeId?: string;
  search?: string;
}

const EnhancedTaskManager: React.FC<{ exchangeId?: string }> = ({ exchangeId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending' as Task['status'],
    priority: 'medium' as Task['priority'],
    assignedTo: '',
    exchangeId: '',
    dueDate: ''
  });

  useEffect(() => {
    loadTasks();
  }, [exchangeId]);

  useEffect(() => {
    applyFilters();
  }, [tasks, filters]);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const response = exchangeId 
        ? await apiService.getTasksByExchange(exchangeId)
        : await apiService.getTasks();
      
      setTasks(Array.isArray(response) ? response : (response.tasks || []));
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(task => task.status === filters.status);
    }

    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }

    if (filters.assignedTo && filters.assignedTo !== 'all') {
      filtered = filtered.filter(task => task.assignedTo === filters.assignedTo);
    }

    if (filters.exchangeId && filters.exchangeId !== 'all') {
      filtered = filtered.filter(task => task.exchangeId === filters.exchangeId);
    }

    if (filters.search) {
      filtered = filtered.filter(task =>
        (task.title || '').toLowerCase().includes(filters.search!.toLowerCase()) ||
        (task.description || '').toLowerCase().includes(filters.search!.toLowerCase())
      );
    }

    setFilteredTasks(filtered);
  };

  const handleBulkUpdate = async (updates: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    dueDate?: string;
  }) => {
    if (selectedTasks.length === 0) {
      alert('Please select tasks first');
      return;
    }

    try {
      const response = await apiService.bulkUpdateTasks({
        taskIds: selectedTasks,
        ...updates
      });

      if (response.updated > 0) {
        alert(`Successfully updated ${response.updated} tasks`);
        loadTasks();
        setSelectedTasks([]);
        setShowBulkActions(false);
      }

      if (response.failed > 0) {
        alert(`Failed to update ${response.failed} tasks`);
      }
    } catch (error) {
      console.error('Bulk update failed:', error);
      alert('Bulk update failed. Please try again.');
    }
  };

  const handleCreateTask = async () => {
    try {
      await apiService.createTask(formData);
      loadTasks();
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    }
  };

  const handleUpdateTask = async (taskId: string) => {
    try {
      await apiService.updateTask(taskId, formData);
      loadTasks();
      setShowEditModal(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task. Please try again.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await apiService.deleteTask(taskId);
      loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'PENDING',
      priority: 'MEDIUM',
      assignedTo: '',
      exchangeId: '',
      dueDate: ''
    });
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const selectAllTasks = () => {
    setSelectedTasks(
      selectedTasks.length === filteredTasks.length
        ? []
        : filteredTasks.map(task => task.id)
    );
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault();
    if (!draggedTask) return;

    try {
      await apiService.updateTask(draggedTask, { status: newStatus });
      loadTasks();
      setDraggedTask(null);
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const openEditModal = (task: Task) => {
    setFormData({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo,
      exchangeId: task.exchangeId,
      dueDate: task.dueDate
    });
    setShowEditModal(task.id);
  };

  const tasksByStatus = useMemo(() => {
    return {
      pending: filteredTasks.filter(task => task.status === 'PENDING'),
      in_progress: filteredTasks.filter(task => task.status === 'IN_PROGRESS'),
      completed: filteredTasks.filter(task => task.status === 'COMPLETED')
    };
  }, [filteredTasks]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-blue-600 mr-3" />
              Enhanced Task Manager
            </h1>
            <p className="text-gray-600 mt-2">
              Advanced task management with bulk operations and filtering
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {selectedTasks.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedTasks.length} selected
                </span>
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200"
                >
                  Bulk Actions
                </button>
              </div>
            )}
            
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setViewMode('board')}
                className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                  viewMode === 'board' 
                    ? 'bg-blue-50 border-blue-500 text-blue-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Board
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                  viewMode === 'list' 
                    ? 'bg-blue-50 border-blue-500 text-blue-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                List
              </button>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Task
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-4 flex-wrap">
          <div className="flex-1 max-w-lg relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.search || ''}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
          
          <select
            value={filters.status || 'all'}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select
            value={filters.priority || 'all'}
            onChange={(e) => setFilters({...filters, priority: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Priority</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Bulk Actions Panel */}
        {showBulkActions && selectedTasks.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-blue-900">
                Bulk Actions ({selectedTasks.length} tasks)
              </h3>
              <button
                onClick={() => setShowBulkActions(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => handleBulkUpdate({ status: 'PENDING' })}
                className="px-3 py-1 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700"
              >
                Set Pending
              </button>
              <button
                onClick={() => handleBulkUpdate({ status: 'IN_PROGRESS' })}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                Set In Progress
              </button>
              <button
                onClick={() => handleBulkUpdate({ status: 'COMPLETED' })}
                className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
              >
                Set Completed
              </button>
              <button
                onClick={() => {
                  const assignee = prompt('Enter assignee user ID:');
                  if (assignee) handleBulkUpdate({ assignedTo: assignee });
                }}
                className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700"
              >
                Reassign
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Task Statistics */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{tasksByStatus.pending.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex items-center">
            <ArrowPathIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{tasksByStatus.in_progress.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Completed</p>
              <p className="text-2xl font-bold text-green-600">{tasksByStatus.completed.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-8 w-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Overdue</p>
              <p className="text-2xl font-bold text-red-600">
                {filteredTasks.filter(task => 
                  new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED'
                ).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['pending', 'in_progress', 'completed'].map(status => (
            <div
              key={status}
              className="bg-gray-50 rounded-lg p-4"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status as Task['status'])}
            >
              <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                                    {status === 'PENDING' && <ClockIcon className="h-5 w-5 text-yellow-500 mr-2" />}
                    {status === 'IN_PROGRESS' && <ArrowPathIcon className="h-5 w-5 text-blue-500 mr-2" />}
                    {status === 'COMPLETED' && <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />}
                {status.replace('_', ' ').toUpperCase()} ({tasksByStatus[status as keyof typeof tasksByStatus].length})
              </h3>
              
              <div className="space-y-3">
                {tasksByStatus[status as keyof typeof tasksByStatus].map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    className="bg-white rounded-lg p-4 shadow-sm border cursor-move hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                      <div className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedTasks.includes(task.id)}
                          onChange={() => toggleTaskSelection(task.id)}
                        />
                        <button
                          onClick={() => openEditModal(task)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <PencilIcon className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    
                    {task.description && (
                      <p className="text-xs text-gray-600 mb-2">{task.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {task.exchangeName && (
                          <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-full">
                            {task.exchangeName}
                          </span>
                        )}
                      </div>
                      <span>{formatDate(task.dueDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredTasks.length > 0 ? (
            <>
              {/* Select All Checkbox */}
              <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedTasks.length === filteredTasks.length}
                    onChange={selectAllTasks}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Select All ({filteredTasks.length})
                  </span>
                </label>
              </div>

              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Select</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTasks.map(task => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedTasks.includes(task.id)}
                          onChange={() => toggleTaskSelection(task.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-gray-500">{task.description}</div>
                          )}
                          {task.exchangeName && (
                            <div className="text-xs text-blue-600 mt-1">{task.exchangeName}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(task.dueDate)}
                        {new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' && (
                          <ExclamationTriangleIcon className="inline h-4 w-4 text-red-500 ml-1" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditModal(task)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="text-center py-12">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No tasks found</h3>
              <p className="text-gray-600">Create a new task or adjust your filters</p>
            </div>
          )}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Task</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value as Task['priority']})}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as Task['status']})}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Task</h3>
              <button
                onClick={() => setShowEditModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value as Task['priority']})}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as Task['status']})}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateTask(showEditModal)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTaskManager;