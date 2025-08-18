import React, { useState, useMemo } from 'react';
import { 
  CheckCircleIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
  FlagIcon,
  EllipsisHorizontalIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

import { Task } from '../../../types';
import { TaskCard } from './TaskCard';
import { BulkActionBar } from './BulkActionBar';

interface EnhancedTaskListViewProps {
  tasks: Task[];
  loading: boolean;
  filters: any;
  selectedTasks: string[];
  onTaskSelect: (taskIds: string[]) => void;
  onTaskClick?: (task: Task) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onBulkAction: (action: string, value?: any) => Promise<void>;
  groupBy?: 'status' | 'priority' | 'assignee' | 'date' | 'none';
}

export const EnhancedTaskListView: React.FC<EnhancedTaskListViewProps> = ({
  tasks,
  loading,
  filters,
  selectedTasks,
  onTaskSelect,
  onTaskClick,
  onTaskUpdate,
  onTaskDelete,
  onBulkAction,
  groupBy = 'none'
}) => {
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created_at' | 'title'>('due_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showCompleted, setShowCompleted] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Group and sort tasks
  const groupedTasks = useMemo(() => {
    let filteredTasks = tasks.filter(task => 
      showCompleted || task.status !== 'COMPLETED'
    );

    // Sort tasks
    filteredTasks.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'due_date':
          const dateA = a.due_date || a.dueDate;
          const dateB = b.due_date || b.dueDate;
          if (!dateA && !dateB) comparison = 0;
          else if (!dateA) comparison = 1;
          else if (!dateB) comparison = -1;
          else comparison = new Date(dateA).getTime() - new Date(dateB).getTime();
          break;
        case 'priority':
          const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
          comparison = (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                      (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
          break;
        case 'created_at':
          comparison = new Date(b.createdAt || b.created_at || '').getTime() - 
                      new Date(a.createdAt || a.created_at || '').getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Group tasks
    if (groupBy === 'none') {
      return { 'All Tasks': filteredTasks };
    }

    const groups: Record<string, Task[]> = {};
    
    filteredTasks.forEach(task => {
      let groupKey = '';
      
      switch (groupBy) {
        case 'status':
          groupKey = task.status || 'Unknown';
          break;
        case 'priority':
          groupKey = task.priority || 'No Priority';
          break;
        case 'assignee':
          if (task.assignedUser) {
            groupKey = `${task.assignedUser.first_name} ${task.assignedUser.last_name}`.trim();
          } else if (task.assignedTo || task.assigned_to) {
            groupKey = task.assignedTo || task.assigned_to || 'Unknown User';
          } else {
            groupKey = 'Unassigned';
          }
          break;
        case 'date':
          const dueDate = task.due_date || task.dueDate;
          if (!dueDate) {
            groupKey = 'No Due Date';
          } else {
            const date = new Date(dueDate);
            const now = new Date();
            const diffTime = date.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) groupKey = 'Overdue';
            else if (diffDays === 0) groupKey = 'Due Today';
            else if (diffDays <= 7) groupKey = 'Due This Week';
            else if (diffDays <= 30) groupKey = 'Due This Month';
            else groupKey = 'Due Later';
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

    return groups;
  }, [tasks, groupBy, sortBy, sortOrder, showCompleted]);

  // Handle task selection
  const handleTaskSelect = (taskId: string, selected: boolean) => {
    if (selected) {
      onTaskSelect([...selectedTasks, taskId]);
    } else {
      onTaskSelect(selectedTasks.filter(id => id !== taskId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      onTaskSelect(tasks.map(task => task.id));
    } else {
      onTaskSelect([]);
    }
  };

  // Toggle group collapse
  const toggleGroupCollapse = (groupName: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupName)) {
      newCollapsed.delete(groupName);
    } else {
      newCollapsed.add(groupName);
    }
    setCollapsedGroups(newCollapsed);
  };

  // Get group statistics
  const getGroupStats = (groupTasks: Task[]) => {
    const completed = groupTasks.filter(t => t.status === 'COMPLETED').length;
    const overdue = groupTasks.filter(t => {
      const dueDate = t.due_date || t.dueDate;
      return dueDate && new Date(dueDate) < new Date() && t.status !== 'COMPLETED';
    }).length;
    
    return { total: groupTasks.length, completed, overdue };
  };

  // Get group color
  const getGroupColor = (groupName: string, groupBy: string) => {
    switch (groupBy) {
      case 'status':
        switch (groupName) {
          case 'COMPLETED': return 'text-green-600 bg-green-50 border-green-200';
          case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50 border-blue-200';
          case 'BLOCKED': return 'text-red-600 bg-red-50 border-red-200';
          default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
      case 'priority':
        switch (groupName) {
          case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
          case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
          case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
          default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
      case 'date':
        if (groupName === 'Overdue') return 'text-red-600 bg-red-50 border-red-200';
        if (groupName === 'Due Today') return 'text-orange-600 bg-orange-50 border-orange-200';
        if (groupName === 'Due This Week') return 'text-blue-600 bg-blue-50 border-blue-200';
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <BulkActionBar
          selectedCount={selectedTasks.length}
          onBulkAction={onBulkAction}
          onCancel={() => onTaskSelect([])}
        />
      )}

      {/* List Controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {tasks.length > 1 && (
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={selectedTasks.length === tasks.length && tasks.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Select all
              </label>
            )}

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Show completed
            </label>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="text-sm border border-gray-300 rounded px-3 py-1.5"
            >
              <option value="due_date-asc">Due Date (Earliest)</option>
              <option value="due_date-desc">Due Date (Latest)</option>
              <option value="priority-desc">Priority (High to Low)</option>
              <option value="priority-asc">Priority (Low to High)</option>
              <option value="created_at-desc">Recently Created</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task Groups */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedTasks).map(([groupName, groupTasks]) => {
          const stats = getGroupStats(groupTasks);
          const groupColor = getGroupColor(groupName, groupBy);
          const isCollapsed = collapsedGroups.has(groupName);
          
          return (
            <div key={groupName} className="mb-6">
              {/* Group Header */}
              {groupBy !== 'none' && (
                <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-6 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleGroupCollapse(groupName)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        aria-label={isCollapsed ? 'Expand group' : 'Collapse group'}
                      >
                        {isCollapsed ? (
                          <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4 text-gray-600" />
                        )}
                      </button>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${groupColor}`}>
                        {groupName}
                      </span>
                      <div className="text-sm text-gray-600">
                        {stats.total} task{stats.total !== 1 ? 's' : ''}
                        {stats.completed > 0 && (
                          <span className="ml-2 text-green-600">
                            • {stats.completed} completed
                          </span>
                        )}
                        {stats.overdue > 0 && (
                          <span className="ml-2 text-red-600">
                            • {stats.overdue} overdue
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {Math.round((stats.completed / stats.total) * 100)}% complete
                    </div>
                  </div>
                </div>
              )}

              {/* Group Tasks */}
              {!isCollapsed && (
                <div className="px-6 py-2 space-y-2">
                  {groupTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    selected={selectedTasks.includes(task.id)}
                    onSelect={(selected) => handleTaskSelect(task.id, selected)}
                    onClick={() => onTaskClick?.(task)}
                    onUpdate={(updates) => onTaskUpdate(task.id, updates)}
                    onDelete={() => onTaskDelete(task.id)}
                    compact={false}
                  />
                ))}
                
                  {groupTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No tasks in this group</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(groupedTasks).length === 0 && (
          <div className="text-center py-12">
            <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-600 mb-4">
              {Object.values(filters).some(v => v) 
                ? "Try adjusting your filters or create a new task." 
                : "Create your first task to get started."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};