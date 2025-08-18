import React from 'react';
import { Task, TaskStatus } from '../../../types';
import {
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  XMarkIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChevronRightIcon,
  CheckIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface SimpleTaskCardProps {
  task: Task;
  onTaskClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onDelete?: (taskId: string) => void;
}

// Simple status configurations
const STATUS_CONFIG = {
  'pending': { label: 'To Do', icon: ClockIcon, color: 'gray', next: 'in_progress' },
  'PENDING': { label: 'To Do', icon: ClockIcon, color: 'gray', next: 'in_progress' },
  'in_progress': { label: 'In Progress', icon: ArrowPathIcon, color: 'blue', next: 'completed' },
  'IN_PROGRESS': { label: 'In Progress', icon: ArrowPathIcon, color: 'blue', next: 'completed' },
  'completed': { label: 'Done', icon: CheckCircleIcon, color: 'green', next: null },
  'COMPLETED': { label: 'Done', icon: CheckCircleIcon, color: 'green', next: null },
  'blocked': { label: 'Blocked', icon: XMarkIcon, color: 'red', next: 'in_progress' },
  'BLOCKED': { label: 'Blocked', icon: XMarkIcon, color: 'red', next: 'in_progress' },
  'review': { label: 'Review', icon: DocumentTextIcon, color: 'purple', next: 'completed' },
  'REVIEW': { label: 'Review', icon: DocumentTextIcon, color: 'purple', next: 'completed' }
};

const getColorClasses = (color: string) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    gray: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' }
  };
  return colors[color] || colors.gray;
};

export const SimpleTaskCard: React.FC<SimpleTaskCardProps> = ({
  task,
  onTaskClick,
  onStatusChange,
  onDelete
}) => {
  const statusConfig = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const colorClasses = getColorClasses(statusConfig.color);
  const nextStatus = statusConfig.next;
  
  // Format assignee name
  const getAssigneeName = () => {
    if (task.assignedUser) {
      const name = `${task.assignedUser.first_name || ''} ${task.assignedUser.last_name || ''}`.trim();
      return name || task.assignedUser.email?.split('@')[0] || 'Unknown';
    }
    return 'Unassigned';
  };
  
  // Format creator name
  const getCreatorName = () => {
    if (task.createdByUser) {
      const name = `${task.createdByUser.first_name || ''} ${task.createdByUser.last_name || ''}`.trim();
      return name || task.createdByUser.email?.split('@')[0] || 'System';
    }
    return 'System';
  };
  
  // Format due date
  const formatDueDate = () => {
    if (!task.dueDate) return null;
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, urgent: true };
    if (diffDays === 0) return { text: 'Today', urgent: true };
    if (diffDays === 1) return { text: 'Tomorrow', urgent: false };
    if (diffDays <= 7) return { text: `${diffDays}d`, urgent: false };
    return { text: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), urgent: false };
  };
  
  const dueDateInfo = formatDueDate();
  const isCompleted = task.status === 'completed' || task.status === 'COMPLETED';
  
  return (
    <div 
      className={`group bg-white p-4 rounded-lg border hover:shadow-md transition-all cursor-pointer ${
        isCompleted ? 'opacity-75' : ''
      }`}
      onClick={() => onTaskClick?.(task)}
    >
      {/* Header with Status */}
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-2 px-2 py-1 rounded-full ${colorClasses.bg}`}>
          <StatusIcon className={`w-4 h-4 ${colorClasses.text}`} />
          <span className={`text-xs font-medium ${colorClasses.text}`}>
            {statusConfig.label}
          </span>
        </div>
        
        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {nextStatus && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange?.(task.id, nextStatus as TaskStatus);
              }}
              className={`p-1.5 rounded hover:bg-gray-100 transition-colors`}
              title={`Move to ${STATUS_CONFIG[nextStatus as keyof typeof STATUS_CONFIG]?.label}`}
            >
              <ChevronRightIcon className="w-4 h-4 text-gray-600" />
            </button>
          )}
          {!isCompleted && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange?.(task.id, 'completed' as TaskStatus);
              }}
              className="p-1.5 rounded hover:bg-green-100 transition-colors"
              title="Mark as complete"
            >
              <CheckIcon className="w-4 h-4 text-green-600" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('Delete this task?')) {
                onDelete?.(task.id);
              }
            }}
            className="p-1.5 rounded hover:bg-red-100 transition-colors"
            title="Delete task"
          >
            <TrashIcon className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
      
      {/* Task Title */}
      <h3 className={`font-semibold text-gray-900 mb-3 line-clamp-2 ${
        isCompleted ? 'line-through text-gray-500' : ''
      }`}>
        {task.title}
      </h3>
      
      {/* Essential Info - Simple Grid */}
      <div className="grid grid-cols-2 gap-y-2 text-sm">
        {/* Created By */}
        <div className="text-gray-600">
          <span className="text-gray-400">By: </span>
          <span className="font-medium">{getCreatorName()}</span>
        </div>
        
        {/* Assigned To */}
        <div className="text-gray-600">
          <span className="text-gray-400">To: </span>
          <span className="font-medium">{getAssigneeName()}</span>
        </div>
        
        {/* Due Date */}
        {dueDateInfo && (
          <div className="col-span-2">
            <span className="text-gray-400">Due: </span>
            <span className={`font-medium ${
              dueDateInfo.urgent ? 'text-red-600' : 'text-gray-600'
            }`}>
              {dueDateInfo.text}
            </span>
          </div>
        )}
      </div>
      
      {/* Priority Indicator */}
      {task.priority === 'HIGH' && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
          High Priority
        </div>
      )}
    </div>
  );
};

export default SimpleTaskCard;