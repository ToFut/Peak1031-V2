import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '../../../types';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CalendarIcon,
  UserCircleIcon,
  TagIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  Squares2X2Icon,
  ListBulletIcon,
  TableCellsIcon,
  ChartBarIcon,
  BellIcon,
  StarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  ShareIcon,
  FlagIcon,
  SparklesIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import {
  StarIcon as StarSolidIcon,
  FlagIcon as FlagSolidIcon,
  CheckCircleIcon as CheckCircleSolidIcon
} from '@heroicons/react/24/solid';

interface ModernTaskUIProps {
  exchangeId?: string;
  initialView?: 'grid' | 'list' | 'kanban' | 'timeline';
  onTaskSelect?: (task: Task) => void;
}

// Priority and Status configurations
const PRIORITY_CONFIG = {
  HIGH: { 
    label: 'High', 
    color: 'red', 
    icon: ExclamationTriangleIcon,
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
    dotClass: 'bg-red-500'
  },
  MEDIUM: { 
    label: 'Medium', 
    color: 'yellow', 
    icon: FlagIcon,
    bgClass: 'bg-yellow-50',
    textClass: 'text-yellow-700',
    borderClass: 'border-yellow-200',
    dotClass: 'bg-yellow-500'
  },
  LOW: { 
    label: 'Low', 
    color: 'green', 
    icon: ArrowDownIcon,
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    borderClass: 'border-green-200',
    dotClass: 'bg-green-500'
  }
};

const STATUS_CONFIG = {
  PENDING: { 
    label: 'To Do', 
    color: 'gray',
    icon: ClockIcon,
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-700',
    borderClass: 'border-gray-200'
  },
  IN_PROGRESS: { 
    label: 'In Progress', 
    color: 'blue',
    icon: ArrowPathIcon,
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200'
  },
  COMPLETED: { 
    label: 'Done', 
    color: 'green',
    icon: CheckCircleIcon,
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    borderClass: 'border-green-200'
  },
  BLOCKED: { 
    label: 'Blocked', 
    color: 'red',
    icon: XMarkIcon,
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200'
  },
  REVIEW: { 
    label: 'Review', 
    color: 'purple',
    icon: DocumentTextIcon,
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200'
  }
};

export const ModernTaskUI: React.FC<ModernTaskUIProps> = ({
  exchangeId,
  initialView = 'kanban',
  onTaskSelect
}) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(initialView);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    assignee: 'all',
    dateRange: 'all',
    tags: [] as string[],
    starred: false
  });

  // Sort
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'title' | 'created'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Load tasks
  useEffect(() => {
    loadTasks();
  }, [exchangeId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTasks(exchangeId);
      setTasks(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort tasks
  const processedTasks = useMemo(() => {
    let filtered = [...tasks];

    // Search
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filters
    if (filters.status !== 'all') {
      filtered = filtered.filter(task => task.status === filters.status);
    }
    if (filters.priority !== 'all') {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }
    if (filters.assignee !== 'all') {
      filtered = filtered.filter(task => task.assignedTo === filters.assignee);
    }
    // TODO: Add starred property to Task type
    // if (filters.starred) {
    //   filtered = filtered.filter(task => (task as any).starred);
    // }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'dueDate':
          comparison = new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime();
          break;
        case 'priority':
          const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          comparison = (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                      (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'created':
          comparison = new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [tasks, searchQuery, filters, sortBy, sortOrder]);

  // Group tasks for kanban view
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    Object.keys(STATUS_CONFIG).forEach(status => {
      groups[status] = processedTasks.filter(task => task.status === status);
    });
    return groups;
  }, [processedTasks]);

  // Task stats
  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    overdue: tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED'
    ).length,
    dueToday: tasks.filter(t => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      const today = new Date();
      return due.toDateString() === today.toDateString();
    }).length,
    highPriority: tasks.filter(t => t.priority === 'HIGH').length
  }), [tasks]);

  // Handlers
  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      await apiService.updateTask(taskId, updates);
      setTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      ));
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await apiService.deleteTask(taskId);
      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleBulkAction = async (action: string) => {
    const taskIds = Array.from(selectedTasks);
    if (taskIds.length === 0) return;

    switch (action) {
      case 'complete':
        for (const id of taskIds) {
          await handleTaskUpdate(id, { status: 'COMPLETED' });
        }
        break;
      case 'delete':
        if (confirm(`Delete ${taskIds.length} tasks?`)) {
          for (const id of taskIds) {
            await handleTaskDelete(id);
          }
        }
        break;
      case 'assign':
        // Open assign modal
        break;
    }
    setSelectedTasks(new Set());
  };

  // Drag and drop for kanban
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedTask) {
      handleTaskUpdate(draggedTask, { status: status as TaskStatus });
      setDraggedTask(null);
      setHoveredColumn(null);
    }
  };

  // Task Card Component
  const TaskCard: React.FC<{ task: Task; view: string }> = ({ task, view }) => {
    const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.MEDIUM;
    const statusConfig = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
    const isSelected = selectedTasks.has(task.id);

    if (view === 'list') {
      return (
        <div
          className={`group flex items-center p-4 bg-white border rounded-lg hover:shadow-md transition-all cursor-pointer ${
            isSelected ? 'ring-2 ring-purple-500 border-purple-500' : 'border-gray-200'
          }`}
          onClick={() => onTaskSelect?.(task)}
        >
          <input
            type="checkbox"
            className="mr-3 rounded border-gray-300"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              setSelectedTasks(prev => {
                const next = new Set(prev);
                if (next.has(task.id)) {
                  next.delete(task.id);
                } else {
                  next.add(task.id);
                }
                return next;
              });
            }}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
              {(task as any).starred && <StarSolidIcon className="w-4 h-4 text-yellow-500" />}
              {isOverdue && <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />}
            </div>
            {task.description && (
              <p className="text-sm text-gray-500 truncate mt-1">{task.description}</p>
            )}
          </div>

          <div className="flex items-center gap-4 ml-4">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityConfig.bgClass} ${priorityConfig.textClass}`}>
              {priorityConfig.label}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.bgClass} ${statusConfig.textClass}`}>
              {statusConfig.label}
            </span>
            {task.dueDate && (
              <div className="flex items-center text-sm text-gray-500">
                <CalendarIcon className="w-4 h-4 mr-1" />
                {new Date(task.dueDate).toLocaleDateString()}
              </div>
            )}
            {task.assignedTo && (
              <div className="flex items-center">
                <UserCircleIcon className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="opacity-0 group-hover:opacity-100 flex gap-1">
              <button className="p-1 hover:bg-gray-100 rounded">
                <PencilIcon className="w-4 h-4 text-gray-500" />
              </button>
              <button className="p-1 hover:bg-gray-100 rounded">
                <TrashIcon className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Kanban/Grid card
    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        className={`group bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-all cursor-pointer ${
          isSelected ? 'ring-2 ring-purple-500 border-purple-500' : 'border-gray-200'
        } ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}
        onClick={() => onTaskSelect?.(task)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                setSelectedTasks(prev => {
                  const next = new Set(prev);
                  if (next.has(task.id)) {
                    next.delete(task.id);
                  } else {
                    next.add(task.id);
                  }
                  return next;
                });
              }}
            />
            <div className={`w-2 h-2 rounded-full ${priorityConfig.dotClass}`} />
          </div>
          <button
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded"
            onClick={(e) => {
              e.stopPropagation();
              (task as any).starred = !(task as any).starred;
              handleTaskUpdate(task.id, { ...(task as any), starred: (task as any).starred } as any);
            }}
          >
            {(task as any).starred ? (
              <StarSolidIcon className="w-4 h-4 text-yellow-500" />
            ) : (
              <StarIcon className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>

        <h3 className="font-medium text-gray-900 mb-2">{task.title}</h3>
        
        {task.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {task.dueDate && (
              <div className={`flex items-center text-xs ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                <CalendarIcon className="w-3 h-3 mr-1" />
                {new Date(task.dueDate).toLocaleDateString()}
              </div>
            )}
          </div>
          
          {task.assignedTo && (
            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-purple-600">
                {task.assignedTo.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityConfig.bgClass} ${priorityConfig.textClass}`}>
            {priorityConfig.label}
          </span>
          {(task as any).tags?.map((tag: string) => (
            <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Render different views
  const renderKanbanView = () => (
    <div className="flex gap-4 p-6 overflow-x-auto">
      {Object.entries(STATUS_CONFIG).map(([status, config]) => (
        <div
          key={status}
          className={`flex-shrink-0 w-80 ${
            hoveredColumn === status ? 'bg-gray-50' : ''
          }`}
          onDragOver={(e) => {
            handleDragOver(e);
            setHoveredColumn(status);
          }}
          onDragLeave={() => setHoveredColumn(null)}
          onDrop={(e) => handleDrop(e, status)}
        >
          <div className={`mb-4 p-3 ${config.bgClass} rounded-lg border ${config.borderClass}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <config.icon className={`w-5 h-5 ${config.textClass}`} />
                <h3 className={`font-semibold ${config.textClass}`}>{config.label}</h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-white ${config.textClass}`}>
                  {groupedTasks[status]?.length || 0}
                </span>
              </div>
              <button className={`p-1 hover:bg-white rounded ${config.textClass}`}>
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            {groupedTasks[status]?.map(task => (
              <TaskCard key={task.id} task={task} view="kanban" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="p-6">
      <div className="space-y-2">
        {processedTasks.map(task => (
          <TaskCard key={task.id} task={task} view="list" />
        ))}
      </div>
    </div>
  );

  const renderGridView = () => (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {processedTasks.map(task => (
          <TaskCard key={task.id} task={task} view="grid" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
                
                {/* Quick Stats */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 px-3 py-1 bg-yellow-50 rounded-full">
                    <ClockIcon className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-700">{stats.pending}</span>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1 bg-blue-50 rounded-full">
                    <ArrowPathIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">{stats.inProgress}</span>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1 bg-green-50 rounded-full">
                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">{stats.completed}</span>
                  </div>
                  {stats.overdue > 0 && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-red-50 rounded-full">
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-700">{stats.overdue} overdue</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Filter Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    showFilters ? 'bg-purple-50 border-purple-300 text-purple-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FunnelIcon className="w-4 h-4" />
                  <span>Filters</span>
                  {Object.values(filters).some(v => v !== 'all' && v !== false && (!Array.isArray(v) || v.length > 0)) && (
                    <span className="w-2 h-2 bg-purple-500 rounded-full" />
                  )}
                </button>

                {/* View Mode Switcher */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                  >
                    <Squares2X2Icon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                  >
                    <ListBulletIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                  >
                    <TableCellsIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Create Button */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>New Task</span>
                </button>
              </div>
            </div>

            {/* Filters Bar */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-4">
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Status</option>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>

                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Priority</option>
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>

                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Due Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="overdue">Overdue</option>
                  </select>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.starred}
                      onChange={(e) => setFilters(prev => ({ ...prev, starred: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span>Starred only</span>
                  </label>

                  <div className="flex-1" />

                  <button
                    onClick={() => setFilters({
                      status: 'all',
                      priority: 'all',
                      assignee: 'all',
                      dateRange: 'all',
                      tags: [],
                      starred: false
                    })}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}

            {/* Bulk Actions Bar */}
            {selectedTasks.size > 0 && (
              <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200 flex items-center justify-between">
                <span className="text-sm font-medium text-purple-700">
                  {selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkAction('complete')}
                    className="px-3 py-1 text-sm bg-white border border-purple-300 rounded text-purple-700 hover:bg-purple-100"
                  >
                    Mark Complete
                  </button>
                  <button
                    onClick={() => handleBulkAction('assign')}
                    className="px-3 py-1 text-sm bg-white border border-purple-300 rounded text-purple-700 hover:bg-purple-100"
                  >
                    Assign
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="px-3 py-1 text-sm bg-white border border-red-300 rounded text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedTasks(new Set())}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : processedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircleIcon className="w-24 h-24 text-gray-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || Object.values(filters).some(v => v !== 'all' && v !== false && (!Array.isArray(v) || v.length > 0))
                  ? 'Try adjusting your filters or search query'
                  : 'Create your first task to get started'}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Create Task</span>
              </button>
            </div>
          ) : (
            <>
              {viewMode === 'kanban' && renderKanbanView()}
              {viewMode === 'list' && renderListView()}
              {viewMode === 'grid' && renderGridView()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernTaskUI;