/**
 * Task Detail Modal - Compact and comprehensive task view/edit
 */

import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  PencilIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { useEnhancedTasks } from '../../hooks/useEnhancedTasks';
import { TaskCompletionWizard } from './TaskCompletionWizard';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
  onTaskUpdated?: (task: any) => void;
  onTaskDeleted?: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  onTaskUpdated,
  onTaskDeleted
}) => {
  const { updateTask, deleteTask, getAutoCompleteActions, executeAutoCompleteAction, loading } = useEnhancedTasks();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    dueDate: ''
  });
  const [autoActions, setAutoActions] = useState<any[]>([]);
  const [showCompletionWizard, setShowCompletionWizard] = useState(false);

  // Initialize form when task changes
  useEffect(() => {
    if (task) {
      setEditForm({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority?.toLowerCase() || 'medium',
        status: task.status?.toLowerCase() || 'pending',
        dueDate: task.dueDate || ''
      });

      // Load auto-complete actions
      if (task.id) {
        getAutoCompleteActions(task.id).then(result => {
          if (result?.autoActions) {
            setAutoActions(result.autoActions);
          }
        }).catch(console.error);
      }
    }
  }, [task, getAutoCompleteActions]);

  const handleSave = async () => {
    if (!task) return;

    try {
      const updatedTask = await updateTask(task.id, {
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority.toUpperCase(),
        status: editForm.status.toUpperCase(),
        due_date: editForm.dueDate || null
      });

      setIsEditing(false);
      onTaskUpdated?.(updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDelete = async () => {
    if (!task || !window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteTask(task.id);
      onTaskDeleted?.(task.id);
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;

    try {
      const updatedTask = await updateTask(task.id, { 
        status: newStatus.toUpperCase(),
        ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {})
      });
      onTaskUpdated?.(updatedTask);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAutoAction = async (action: any) => {
    try {
      await executeAutoCompleteAction(action);
    } catch (error) {
      console.error('Error executing auto action:', error);
    }
  };

  if (!task) return null;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
  const priorityColors = {
    critical: 'text-red-600 bg-red-50 border-red-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    low: 'text-green-600 bg-green-50 border-green-200'
  };

  const statusColors = {
    pending: 'text-gray-600 bg-gray-50 border-gray-200',
    in_progress: 'text-blue-600 bg-blue-50 border-blue-200',
    completed: 'text-green-600 bg-green-50 border-green-200',
    cancelled: 'text-red-600 bg-red-50 border-red-200'
  };

  const priorityColor = priorityColors[task.priority?.toLowerCase() as keyof typeof priorityColors] || priorityColors.medium;
  const statusColor = statusColors[task.status?.toLowerCase() as keyof typeof statusColors] || statusColors.pending;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg border ${priorityColor}`}>
                      {task.category === 'document' ? <DocumentTextIcon className="h-5 w-5" /> :
                       task.category === 'communication' ? <ChatBubbleLeftRightIcon className="h-5 w-5" /> :
                       <CheckCircleIcon className="h-5 w-5" />}
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-gray-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Task title..."
                          />
                        ) : (
                          task.title
                        )}
                      </Dialog.Title>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${priorityColor}`}>
                          {task.priority}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColor}`}>
                          {task.status?.replace('_', ' ')}
                        </span>
                        {isOverdue && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!isEditing ? (
                      <>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleDelete}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleSave}
                          disabled={loading}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-3 py-1 text-gray-600 text-sm rounded-lg hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={onClose}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
                    {isEditing ? (
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Task description..."
                      />
                    ) : (
                      <p className="text-gray-600 whitespace-pre-wrap">
                        {task.description || 'No description provided.'}
                      </p>
                    )}
                  </div>

                  {/* Task Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Priority & Status */}
                      {isEditing && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <select
                              value={editForm.priority}
                              onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                              value={editForm.status}
                              onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input
                              type="date"
                              value={editForm.dueDate}
                              onChange={(e) => setEditForm(prev => ({ ...prev, dueDate: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* Assignee */}
                      {task.assigneeName && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <UserIcon className="h-4 w-4" />
                          <span>Assigned to: <span className="font-medium">{task.assigneeName}</span></span>
                        </div>
                      )}

                      {/* Exchange */}
                      {task.exchange && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <TagIcon className="h-4 w-4" />
                          <span>Exchange: <span className="font-medium">{task.exchange.exchangeNumber || task.exchange.id}</span></span>
                        </div>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Due Date */}
                      {task.dueDate && (
                        <div className={`flex items-center space-x-2 text-sm ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                          <CalendarDaysIcon className="h-4 w-4" />
                          <span>
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                            {isOverdue && ' (Overdue)'}
                          </span>
                        </div>
                      )}

                      {/* Created */}
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <ClockIcon className="h-4 w-4" />
                        <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* AI Metadata */}
                      {task.metadata?.confidenceScore && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <SparklesIcon className="h-4 w-4" />
                          <span>AI Generated ({Math.round(task.metadata.confidenceScore * 100)}% confidence)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Auto Actions */}
                  {autoActions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
                      <div className="flex flex-wrap gap-2">
                        {autoActions.map((action, index) => (
                          <button
                            key={index}
                            onClick={() => handleAutoAction(action)}
                            className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                          >
                            <SparklesIcon className="h-4 w-4" />
                            <span>{action.label || action.type}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Status Actions */}
                  {!isEditing && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                      {task.status !== 'COMPLETED' && (
                        <>
                          <button
                            onClick={() => setShowCompletionWizard(true)}
                            disabled={loading}
                            className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                          >
                            <SparklesIcon className="h-4 w-4" />
                            <span>Complete with Wizard</span>
                          </button>
                          <button
                            onClick={() => handleStatusChange('COMPLETED')}
                            disabled={loading}
                            className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                            <span>Mark Complete</span>
                          </button>
                        </>
                      )}
                      
                      {task.status === 'PENDING' && (
                        <button
                          onClick={() => handleStatusChange('IN_PROGRESS')}
                          disabled={loading}
                          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          <ClockIcon className="h-4 w-4" />
                          <span>Start Work</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
        
        {/* Task Completion Wizard */}
        <TaskCompletionWizard
          isOpen={showCompletionWizard}
          onClose={() => setShowCompletionWizard(false)}
          task={task}
          onTaskCompleted={(updatedTask) => {
            setShowCompletionWizard(false);
            onTaskUpdated?.(updatedTask);
          }}
        />
      </Dialog>
    </Transition>
  );
};