import React, { useState } from 'react';
import { 
  CheckCircleIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
  FlagIcon,
  EllipsisHorizontalIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftIcon,
  PaperClipIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

import { Task, TaskPriority } from '../../../types';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface TaskCardProps {
  task: Task;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onClick?: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  compact?: boolean;
  showExchange?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  selected,
  onSelect,
  onClick,
  onUpdate,
  onDelete,
  compact = false,
  showExchange = true
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Quick status toggle
  const handleStatusToggle = async () => {
    setIsUpdating(true);
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    await onUpdate({ 
      status: newStatus,
      completed_at: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined
    });
    setIsUpdating(false);
  };

  // Priority quick change
  const handlePriorityChange = async (priority: string) => {
    await onUpdate({ priority: priority as TaskPriority });
    setShowMenu(false);
  };

  // Format date
  const formatDate = (date: string) => {
    const taskDate = new Date(date);
    const now = new Date();
    const diffTime = taskDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    if (diffDays < 7) return `In ${diffDays} days`;
    
    return taskDate.toLocaleDateString();
  };

  // Get priority colors
  const getPriorityColors = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get status colors
  const getStatusColors = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-50 border-green-200';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'BLOCKED': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Check if overdue
  const dueDate = task.due_date || task.dueDate;
  const isOverdue = dueDate && new Date(dueDate) < new Date() && task.status !== 'COMPLETED';
  const isDueToday = dueDate && new Date(dueDate).toDateString() === new Date().toDateString();

  return (
    <div
      className={`group bg-white rounded-lg border transition-all hover:shadow-sm ${
        selected ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' : 'border-gray-200'
      } ${isOverdue ? 'border-l-4 border-l-red-500' : ''} ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Selection Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />

        {/* Status Toggle */}
        <button
          onClick={handleStatusToggle}
          disabled={isUpdating}
          className={`mt-0.5 p-1 rounded-full transition-colors ${
            task.status === 'COMPLETED'
              ? 'bg-green-100 text-green-600'
              : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
          } ${isUpdating ? 'animate-pulse' : ''}`}
        >
          {isUpdating ? (
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
          ) : task.status === 'COMPLETED' ? (
            <CheckCircleIconSolid className="w-4 h-4" />
          ) : (
            <CheckCircleIcon className="w-4 h-4" />
          )}
        </button>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Title and Tags */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3
                onClick={onClick}
                className={`font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors ${
                  task.status === 'COMPLETED' ? 'line-through text-gray-500' : ''
                } ${compact ? 'text-sm' : 'text-base'}`}
              >
                {task.title}
              </h3>
              
              {/* Description */}
              {!compact && task.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>

            {/* Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 rounded transition-all"
              >
                <EllipsisHorizontalIcon className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-6 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[150px]">
                  <button
                    onClick={() => handlePriorityChange('HIGH')}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FlagIcon className="w-4 h-4 text-red-500" />
                    High Priority
                  </button>
                  <button
                    onClick={() => handlePriorityChange('MEDIUM')}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FlagIcon className="w-4 h-4 text-yellow-500" />
                    Medium Priority
                  </button>
                  <button
                    onClick={() => handlePriorityChange('LOW')}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FlagIcon className="w-4 h-4 text-green-500" />
                    Low Priority
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={onDelete}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600"
                  >
                    Delete Task
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Meta Information */}
          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
            {/* Due Date */}
            {dueDate && (
              <div className={`flex items-center gap-1 ${
                isOverdue ? 'text-red-600' : isDueToday ? 'text-orange-600' : ''
              }`}>
                <CalendarIcon className="w-4 h-4" />
                <span>{formatDate(dueDate)}</span>
                {isOverdue && <ExclamationTriangleIcon className="w-4 h-4" />}
              </div>
            )}

            {/* Priority */}
            <div className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColors(task.priority || 'MEDIUM')}`}>
              {task.priority || 'Medium'}
            </div>

            {/* Status */}
            <div className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColors(task.status || 'PENDING')}`}>
              {task.status === 'PENDING' ? 'To Do' : 
               task.status === 'IN_PROGRESS' ? 'In Progress' : 
               task.status || 'To Do'}
            </div>

            {/* Assignee */}
            {(task.assignedUser || task.assigned_to || task.assignedTo) && (
              <div className="flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                <span>
                  {task.assignedUser 
                    ? `${task.assignedUser.first_name || ''} ${task.assignedUser.last_name || ''}`.trim() || task.assignedUser.email
                    : 'Assigned'
                  }
                </span>
              </div>
            )}

            {/* Exchange Info */}
            {showExchange && (task.exchange || task.exchange_id || task.exchangeId) && (
              <div className="flex items-center gap-1">
                <BuildingOfficeIcon className="w-4 h-4" />
                <span className="text-xs">
                  {task.exchange?.name || 'Exchange'}
                  {task.exchange?.client && (
                    <span className="ml-1 text-gray-500">
                      - {task.exchange.client.firstName && task.exchange.client.lastName
                        ? `${task.exchange.client.firstName} ${task.exchange.client.lastName}`
                        : task.exchange.client.email}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Additional Metadata */}
          {!compact && (
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              {/* Source */}
              {task.source && (
                <span className="capitalize">{task.source}</span>
              )}

              {/* Comments/Messages indicator */}
              {task.metadata?.created_from_chat && (
                <div className="flex items-center gap-1">
                  <ChatBubbleLeftIcon className="w-3 h-3" />
                  <span>From chat</span>
                </div>
              )}

              {/* Created date and by whom */}
              <span>
                Created {new Date(task.createdAt || task.created_at || '').toLocaleDateString()}
                {task.created_by ? (
                  <span className="ml-1">
                    by {task.createdByUser 
                      ? `${task.createdByUser.first_name || ''} ${task.createdByUser.last_name || ''}`.trim() || task.createdByUser.email
                      : 'User'}
                  </span>
                ) : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress indicator for multi-step tasks */}
      {task.metadata?.subtasks && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Subtasks</span>
            <span>{task.metadata.completed_subtasks || 0} of {task.metadata.total_subtasks || 0}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-blue-600 h-1 rounded-full transition-all"
              style={{ 
                width: `${((task.metadata.completed_subtasks || 0) / (task.metadata.total_subtasks || 1)) * 100}%` 
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};