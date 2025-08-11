import React, { useState, useCallback } from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Calendar,
  User,
  Flag,
  Filter,
  Search,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Task, TaskStatus } from '../../types';
import { formatDate, isOverdue } from '../../utils/date.utils';

export interface TaskManagerProps {
  tasks: Task[];
  exchangeId?: string;
  onTaskClick?: (task: Task) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onCreateTask?: () => void;
  showCreateButton?: boolean;
  compact?: boolean;
  groupBy?: 'status' | 'priority' | 'dueDate' | 'none';
  allowStatusChange?: boolean;
  className?: string;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  tasks,
  exchangeId,
  onTaskClick,
  onTaskUpdate,
  onCreateTask,
  showCreateButton = true,
  compact = false,
  groupBy = 'status',
  allowStatusChange = true,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['PENDING', 'IN_PROGRESS']));

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchTerm || 
      (task.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Group tasks
  const groupedTasks = useCallback(() => {
    if (groupBy === 'none') {
      return { 'All Tasks': filteredTasks };
    }

    const groups: { [key: string]: Task[] } = {};

    filteredTasks.forEach(task => {
      let groupKey = '';
      
      switch (groupBy) {
        case 'status':
          groupKey = task.status || 'NO_STATUS';
          break;
        case 'priority':
          groupKey = task.priority || 'NO_PRIORITY';
          break;
        case 'dueDate':
          if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            const today = new Date();
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) groupKey = 'Overdue';
            else if (diffDays === 0) groupKey = 'Due Today';
            else if (diffDays <= 7) groupKey = 'Due This Week';
            else if (diffDays <= 30) groupKey = 'Due This Month';
            else groupKey = 'Future';
          } else {
            groupKey = 'No Due Date';
          }
          break;
        default:
          groupKey = 'All Tasks';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(task);
    });

    // Sort groups
    const sortedGroups: { [key: string]: Task[] } = {};
    const groupOrder = groupBy === 'status' 
      ? ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']
      : groupBy === 'priority'
      ? ['URGENT', 'HIGH', 'MEDIUM', 'LOW']
      : Object.keys(groups).sort();

    groupOrder.forEach(key => {
      if (groups[key]) {
        sortedGroups[key] = groups[key].sort((a, b) => {
          if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }
          return 0;
        });
      }
    });

    // Add remaining groups
    Object.keys(groups).forEach(key => {
      if (!sortedGroups[key]) {
        sortedGroups[key] = groups[key];
      }
    });

    return sortedGroups;
  }, [filteredTasks, groupBy]);

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const handleStatusChange = async (task: Task, newStatus: string) => {
    if (onTaskUpdate) {
      await onTaskUpdate(task.id, { status: newStatus as TaskStatus });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'CANCELLED':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'URGENT':
        return 'text-red-600 bg-red-100';
      case 'HIGH':
        return 'text-orange-600 bg-orange-100';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100';
      case 'LOW':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (tasks.length === 0) {
    return (
      <div className={`text-center py-12 bg-gray-50 rounded-lg ${className}`}>
        <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">No tasks found</p>
        {showCreateButton && onCreateTask && (
          <button
            onClick={onCreateTask}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Task
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {!compact && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-1 gap-4 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {showCreateButton && onCreateTask && (
            <button
              onClick={onCreateTask}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </button>
          )}
        </div>
      )}

      {/* Task Groups */}
      <div className="space-y-4">
        {Object.entries(groupedTasks()).map(([groupName, groupTasks]) => (
          <div key={groupName} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {groupBy !== 'none' && (
              <button
                onClick={() => toggleGroup(groupName)}
                className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {expandedGroups.has(groupName) ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="font-medium text-gray-900">{groupName}</span>
                  <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                    {groupTasks.length}
                  </span>
                </div>
              </button>
            )}

            {(groupBy === 'none' || expandedGroups.has(groupName)) && (
              <div className="divide-y divide-gray-200">
                {groupTasks.map((task) => {
                  const overdue = task.dueDate && isOverdue(task.dueDate) && task.status === 'PENDING';
                  
                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick?.(task)}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        onTaskClick ? 'cursor-pointer' : ''
                      } ${overdue ? 'bg-red-50 border-l-4 border-red-500' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getStatusIcon(task.status)}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className={`text-sm font-medium ${
                                task.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-gray-900'
                              }`}>
                                {task.title}
                              </h4>
                              
                              {task.priority && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                  <Flag className="w-3 h-3 mr-1" />
                                  {task.priority}
                                </span>
                              )}
                            </div>

                            {task.description && !compact && (
                              <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                            )}

                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              {task.dueDate && (
                                <div className={`flex items-center space-x-1 ${
                                  overdue ? 'text-red-600 font-medium' : ''
                                }`}>
                                  <Calendar className="w-3 h-3" />
                                  <span>Due {formatDate(task.dueDate)}</span>
                                  {overdue && <span className="font-medium">(Overdue)</span>}
                                </div>
                              )}
                              
                              {task.assignedUser && (
                                <div className="flex items-center space-x-1">
                                  <User className="w-3 h-3" />
                                  <span>{task.assignedUser.firstName} {task.assignedUser.lastName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {allowStatusChange && task.status !== 'COMPLETED' && (
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="ml-4 text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};