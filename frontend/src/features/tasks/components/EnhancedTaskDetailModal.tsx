import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon,
  CalendarIcon,
  UserIcon,
  FlagIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  BuildingOfficeIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { Task, User, TaskStatus, TaskPriority } from '../../../types';
import { apiService } from '../../../services/api';

interface EnhancedTaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

export const EnhancedTaskDetailModal: React.FC<EnhancedTaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exchange, setExchange] = useState<any>(null);
  const [assignedUser, setAssignedUser] = useState<User | null>(null);
  const [createdByUser, setCreatedByUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'PENDING' as TaskStatus,
    priority: 'MEDIUM' as TaskPriority,
    due_date: '',
    assigned_to: ''
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'PENDING',
        priority: task.priority || 'MEDIUM',
        due_date: task.due_date || task.dueDate || '',
        assigned_to: task.assigned_to || task.assignedTo || ''
      });
      
      // Fetch related data
      fetchTaskDetails();
    }
  }, [task]);

  const fetchTaskDetails = async () => {
    if (!task) return;
    
    try {
      // Fetch exchange details
      if (task.exchange_id || task.exchangeId) {
        const exchangeResponse = await apiService.get(`/exchanges/${task.exchange_id || task.exchangeId}`);
        setExchange(exchangeResponse.data);
      }
      
      // Fetch assigned user details
      if (task.assigned_to || task.assignedTo) {
        try {
          const userResponse = await apiService.get(`/admin/users/${task.assigned_to || task.assignedTo}`);
          setAssignedUser(userResponse.data);
        } catch (error) {
          console.error('Error fetching assigned user:', error);
        }
      }
      
      // Fetch created by user details
      if (task.created_by) {
        try {
          const creatorResponse = await apiService.get(`/admin/users/${task.created_by}`);
          setCreatedByUser(creatorResponse.data);
        } catch (error) {
          console.error('Error fetching creator:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching task details:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    
    setLoading(true);
    try {
      const updateData = {
        ...formData,
        exchangeId: task.exchange_id || task.exchangeId // Include exchangeId for middleware
      };
      await onUpdate(task.id, updateData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    
    setLoading(true);
    try {
      await onUpdate(task.id, { 
        status: newStatus,
        completed_at: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
        exchangeId: task.exchange_id || task.exchangeId // Include exchangeId for middleware
      });
      setFormData(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    await handleStatusChange('COMPLETED');
  };

  const formatDate = (date: string) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (date: string) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600 bg-red-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-50';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50';
      case 'BLOCKED': return 'text-red-600 bg-red-50';
      case 'PENDING': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Task Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as TaskStatus }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="BLOCKED">Blocked</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date ? formData.due_date.split('T')[0] : ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Title and Status */}
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">{task.title}</h3>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(formData.status)}`}>
                    {formData.status}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(formData.priority)}`}>
                    {formData.priority} Priority
                  </span>
                </div>
              </div>

              {/* Description */}
              {task.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-6">
                {/* Exchange */}
                <div className="flex items-start gap-3">
                  <BuildingOfficeIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Exchange</p>
                    <p className="text-sm text-gray-600">
                      {exchange ? exchange.name || exchange.title : 'Not linked to exchange'}
                    </p>
                  </div>
                </div>

                {/* Assigned To */}
                <div className="flex items-start gap-3">
                  <UserIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Assigned To</p>
                    <p className="text-sm text-gray-600">
                      {assignedUser 
                        ? `${assignedUser.first_name || ''} ${assignedUser.last_name || ''}`.trim() || assignedUser.email
                        : 'Unassigned'}
                    </p>
                  </div>
                </div>

                {/* Due Date */}
                <div className="flex items-start gap-3">
                  <CalendarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Due Date</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(task.due_date || task.dueDate || '')}
                    </p>
                  </div>
                </div>

                {/* Created By */}
                <div className="flex items-start gap-3">
                  <UserGroupIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Created By</p>
                    <p className="text-sm text-gray-600">
                      {createdByUser 
                        ? `${createdByUser.first_name || ''} ${createdByUser.last_name || ''}`.trim() || createdByUser.email
                        : 'System'}
                    </p>
                  </div>
                </div>

                {/* Created At */}
                <div className="flex items-start gap-3">
                  <ClockIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Created</p>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(task.created_at || task.createdAt || '')}
                    </p>
                  </div>
                </div>

                {/* Last Updated */}
                <div className="flex items-start gap-3">
                  <ArrowPathIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Last Updated</p>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(task.updated_at || task.updatedAt || '')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  {formData.status !== 'COMPLETED' && (
                    <button
                      onClick={handleComplete}
                      disabled={loading}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      Mark Complete
                    </button>
                  )}
                  
                  {formData.status === 'PENDING' && (
                    <button
                      onClick={() => handleStatusChange('IN_PROGRESS')}
                      disabled={loading}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      Start Progress
                    </button>
                  )}

                  {formData.status === 'COMPLETED' && (
                    <button
                      onClick={() => handleStatusChange('PENDING')}
                      disabled={loading}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      Reopen Task
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isEditing && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            <button
              onClick={() => task && onDelete(task.id)}
              className="px-4 py-2 text-red-600 hover:text-red-700"
            >
              Delete Task
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit Task
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};