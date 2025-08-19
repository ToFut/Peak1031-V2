import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Task, TaskStatus, TaskPriority } from '../../../types';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CalendarIcon,
  UserCircleIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  ListBulletIcon,
  TableCellsIcon,
  StarIcon,
  ArrowDownIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  FlagIcon
} from '@heroicons/react/24/outline';
import {
  StarIcon as StarSolidIcon
} from '@heroicons/react/24/solid';

interface ModernTaskUIProps {
  exchangeId?: string;
  initialView?: 'grid' | 'list' | 'kanban' | 'timeline';
  onTaskSelect?: (task: Task) => void;
  onCreateClick?: () => void;
}

interface Exchange {
  id: string;
  name: string;
  status: string;
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

type StatusConfigKey = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'review' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'REVIEW';

const STATUS_CONFIG: Record<StatusConfigKey, {
  label: string;
  color: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  bgClass: string;
  textClass: string;
  borderClass: string;
}> = {
  // Handle both uppercase and lowercase status values
  PENDING: { 
    label: 'To Do', 
    color: 'gray',
    icon: ClockIcon,
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-700',
    borderClass: 'border-gray-200'
  },
  pending: { 
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
  in_progress: { 
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
  completed: { 
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
  blocked: { 
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
  },
  review: { 
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
  onTaskSelect,
  onCreateClick
}) => {
  // const { user } = useAuth(); // Unused variable
  const [tasks, setTasks] = useState<Task[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(initialView);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExchange, setSelectedExchange] = useState<string>('all');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
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

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 ModernTaskUI: Loading tasks and exchanges...', { exchangeId });
      
      let tasksArray = [];
      let exchangesData = [];
      
      if (exchangeId) {
        // Load exchange-specific tasks
        console.log('🔍 ModernTaskUI: Loading tasks for specific exchange:', exchangeId);
        try {
          const response = await apiService.getTasksByExchange(exchangeId);
          console.log('🔍 ModernTaskUI: Exchange tasks response:', response);
          tasksArray = Array.isArray(response) ? response : [];
        } catch (exchangeError) {
          console.error('❌ ModernTaskUI: Error loading exchange tasks:', exchangeError);
          // Fallback to general tasks endpoint
          try {
            const fallbackResponse = await apiService.getTasks();
            console.log('🔍 ModernTaskUI: Fallback tasks response:', fallbackResponse);
            tasksArray = Array.isArray(fallbackResponse) ? fallbackResponse : [];
          } catch (fallbackError) {
            console.error('❌ ModernTaskUI: Fallback also failed:', fallbackError);
            tasksArray = [];
          }
        }
      } else {
        // Load all tasks and exchanges
        const [tasksResponse, exchangesResponse] = await Promise.all([
          apiService.getTasks(),
          apiService.getExchanges()
        ]);
        
        console.log('🔍 ModernTaskUI: All tasks response:', tasksResponse);
        tasksArray = Array.isArray(tasksResponse) ? tasksResponse : [];
        
        exchangesData = (exchangesResponse as any)?.data || exchangesResponse;
        setExchanges(Array.isArray(exchangesData) ? exchangesData : []);
      }
      
      // Normalize status and priority for consistent display
      const normalizedTasks = tasksArray.map(task => ({
        ...task,
        status: (typeof task.status === 'string' ? task.status.toUpperCase() : task.status) as TaskStatus,
        priority: (typeof task.priority === 'string' ? task.priority.toUpperCase() : task.priority) as TaskPriority
      }));
      
      console.log('🔍 ModernTaskUI: Setting normalized tasks:', normalizedTasks.length, 'tasks');
      setTasks(normalizedTasks as Task[]);
    } catch (error) {
      console.error('❌ ModernTaskUI: Failed to load tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [exchangeId]);

  // Load tasks
  useEffect(() => {
    loadTasks();
    }, [loadTasks]);

  // Filter and sort tasks
  const processedTasks = useMemo(() => {
    let filtered = [...tasks];

    // Filter by exchange selection
    if (selectedExchange !== 'all') {
      filtered = filtered.filter(task => task.exchangeId === selectedExchange || task.exchange_id === selectedExchange);
    }

    // Search
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.assignedTo || task.assigned_to || '').toLowerCase().includes(searchQuery.toLowerCase())
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
      filtered = filtered.filter(task => 
        (task.assignedTo || task.assigned_to) === filters.assignee
      );
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
  }, [tasks, searchQuery, selectedExchange, filters, sortBy, sortOrder]);

  // Group tasks for kanban view - normalize status for grouping
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    
    // Create normalized groups - map both cases to the primary status
    const statusMap = {
      'PENDING': 'pending',
      'pending': 'pending', 
      'IN_PROGRESS': 'in_progress',
      'in_progress': 'in_progress',
      'COMPLETED': 'completed',
      'completed': 'completed',
      'BLOCKED': 'blocked',
      'blocked': 'blocked',
      'REVIEW': 'review',
      'review': 'review'
    };
    
    // Initialize groups for display
    ['pending', 'in_progress', 'completed', 'blocked', 'review'].forEach(status => {
      groups[status] = [];
    });
    
    // Group tasks by normalized status
    processedTasks.forEach(task => {
      const normalizedStatus = statusMap[task.status as keyof typeof statusMap] || 'pending';
      if (!groups[normalizedStatus]) {
        groups[normalizedStatus] = [];
      }
      groups[normalizedStatus].push(task);
    });
    
    return groups;
  }, [processedTasks]);

  // Task stats
  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING' || t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'COMPLETED' || t.status === 'completed').length,
    overdue: tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && !['COMPLETED', 'completed'].includes(t.status)
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
    if (!window.confirm('Are you sure you want to delete this task?')) return;
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
        if (window.confirm(`Delete ${taskIds.length} tasks?`)) {
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

  // Enhanced Task Card Component - More informative and visually clear
  const TaskCard: React.FC<{ task: Task; view: string }> = ({ task, view }) => {
    const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.MEDIUM;
    const statusConfig = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
    const isSelected = selectedTasks.has(task.id);
    const PriorityIcon = priorityConfig.icon;
    const StatusIcon = statusConfig.icon;

    // Calculate time remaining or overdue
    const getDueDateInfo = () => {
      if (!task.dueDate) return null;
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return { text: `${Math.abs(diffDays)} days overdue`, color: 'text-red-600', urgent: true };
      } else if (diffDays === 0) {
        return { text: 'Due today', color: 'text-orange-600', urgent: true };
      } else if (diffDays === 1) {
        return { text: 'Due tomorrow', color: 'text-yellow-600', urgent: false };
      } else if (diffDays <= 7) {
        return { text: `Due in ${diffDays} days`, color: 'text-blue-600', urgent: false };
      } else {
        return { text: dueDate.toLocaleDateString(), color: 'text-gray-500', urgent: false };
      }
    };

    const dueDateInfo = getDueDateInfo();

    if (view === 'list') {
      return (
        <div
          className={`group flex flex-col sm:flex-row sm:items-center p-3 sm:p-5 bg-white border rounded-lg sm:rounded-xl hover:shadow-lg transition-all cursor-pointer ${
            isSelected ? 'ring-2 ring-purple-500 border-purple-500 shadow-md' : 'border-gray-200'
          } ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}
          onClick={() => onTaskSelect?.(task)}
        >
          <input
            type="checkbox"
            className="mr-4 w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
          
          <div className="flex items-center mr-4">
            <div className={`p-2 rounded-lg ${statusConfig.bgClass}`}>
              <StatusIcon className={`w-5 h-5 ${statusConfig.textClass}`} />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900 text-lg truncate">{task.title}</h3>
              {(task as any).starred && <StarSolidIcon className="w-5 h-5 text-yellow-500" />}
              {isOverdue && (
                <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                  <ExclamationTriangleIcon className="w-3 h-3" />
                  Overdue
                </span>
              )}
            </div>
            {task.description && (
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <PriorityIcon className={`w-4 h-4 ${priorityConfig.textClass}`} />
                <span className={priorityConfig.textClass}>{priorityConfig.label} Priority</span>
              </div>
              {dueDateInfo && (
                <div className={`flex items-center gap-1 ${dueDateInfo.color}`}>
                  <CalendarIcon className="w-4 h-4" />
                  <span className={dueDateInfo.urgent ? 'font-medium' : ''}>{dueDateInfo.text}</span>
                </div>
              )}
              {(task.assignedTo || task.assigned_to) && (
                <div className="flex items-center gap-1">
                  <UserCircleIcon className="w-4 h-4" />
                  <span>Assigned: {task.assignedTo || task.assigned_to}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 ml-4">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusConfig.bgClass} ${statusConfig.textClass}`}>
              {statusConfig.label}
            </span>
            {(task.assignedTo || task.assigned_to) && (
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-purple-600">
                  {(task.assignedTo || task.assigned_to || '').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="opacity-0 group-hover:opacity-100 flex gap-1">
              <button 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onTaskSelect?.(task);
                }}
              >
                <PencilIcon className="w-4 h-4 text-gray-500" />
              </button>
              <button 
                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTaskDelete(task.id);
                }}
              >
                <TrashIcon className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Enhanced Kanban/Grid card - Bigger and more informative
    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        className={`group bg-white p-6 rounded-xl shadow-sm border hover:shadow-lg transition-all cursor-pointer min-h-[200px] ${
          isSelected ? 'ring-2 ring-purple-500 border-purple-500 shadow-md' : 'border-gray-200'
        } ${isOverdue ? 'border-l-4 border-l-red-500 bg-red-50' : ''}`}
        onClick={() => onTaskSelect?.(task)}
      >
        {/* Header with priority indicator and star */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
            <div className={`p-2 rounded-lg ${priorityConfig.bgClass}`}>
              <PriorityIcon className={`w-5 h-5 ${priorityConfig.textClass}`} />
            </div>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${priorityConfig.bgClass} ${priorityConfig.textClass}`}>
              {priorityConfig.label}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {isOverdue && (
              <div className="p-1 bg-red-100 rounded-full">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
              </div>
            )}
            <button
              className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-100 rounded-lg transition-all"
              onClick={(e) => {
                e.stopPropagation();
                (task as any).starred = !(task as any).starred;
                handleTaskUpdate(task.id, { ...(task as any), starred: (task as any).starred } as any);
              }}
            >
              {(task as any).starred ? (
                <StarSolidIcon className="w-5 h-5 text-yellow-500" />
              ) : (
                <StarIcon className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Task title and description */}
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{task.description}</p>
          )}
        </div>

        {/* Due date section */}
        {dueDateInfo && (
          <div className={`mb-4 p-3 rounded-lg border ${
            dueDateInfo.urgent ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className={`flex items-center gap-2 ${dueDateInfo.color}`}>
              <CalendarIcon className="w-5 h-5" />
              <div>
                <p className={`font-medium ${dueDateInfo.urgent ? 'text-red-700' : ''}`}>
                  {dueDateInfo.text}
                </p>
                {dueDateInfo.urgent && (
                  <p className="text-xs text-red-600 mt-1">Needs immediate attention</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer with assignee and actions */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            {(task.assignedTo || task.assigned_to) && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-purple-600">
                    {(task.assignedTo || task.assigned_to || '').charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-gray-600">Assigned: {task.assignedTo || task.assigned_to}</span>
              </div>
            )}
            {(task as any).tags?.slice(0, 2).map((tag: string) => (
              <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          
          <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-all">
            <button 
              className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onTaskSelect?.(task);
              }}
              title="Edit task"
            >
              <PencilIcon className="w-4 h-4 text-purple-600" />
            </button>
            <button 
              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleTaskDelete(task.id);
              }}
              title="Delete task"
            >
              <TrashIcon className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render different views
  const renderKanbanView = () => {
    // Only show primary status columns, not duplicates
    const statusColumns = ['pending', 'in_progress', 'completed', 'blocked', 'review'];
    
    return (
      <div className="flex gap-3 sm:gap-6 p-3 sm:p-6 overflow-x-auto min-h-full">
        {statusColumns.map((status) => {
          const config = STATUS_CONFIG[status as StatusConfigKey] || STATUS_CONFIG.pending;
          const tasks = groupedTasks[status] || [];
          
          return (
            <div
              key={status}
              className={`flex-shrink-0 w-72 sm:w-80 lg:w-96 ${
                hoveredColumn === status ? 'bg-gray-50 rounded-lg' : ''
              }`}
              onDragOver={(e) => {
                handleDragOver(e);
                setHoveredColumn(status);
              }}
              onDragLeave={() => setHoveredColumn(null)}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Column Header */}
              <div className={`mb-6 p-4 ${config.bgClass} rounded-xl border-2 ${config.borderClass} shadow-sm`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 bg-white rounded-lg shadow-sm`}>
                      <config.icon className={`w-6 h-6 ${config.textClass}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg ${config.textClass}`}>{config.label}</h3>
                      <p className={`text-sm ${config.textClass} opacity-75`}>
                        {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button 
                    className={`p-2 hover:bg-white rounded-lg transition-colors ${config.textClass}`}
                    onClick={() => onCreateClick?.()}
                    title="Add new task"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Tasks Container */}
              <div className="space-y-4 min-h-[400px]">
                {tasks.map(task => (
                  <TaskCard key={task.id} task={task} view="kanban" />
                ))}
                
                {/* Empty state for column */}
                {tasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                    <config.icon className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500 text-center">
                      No {config.label.toLowerCase()} tasks
                    </p>
                    <button
                      onClick={() => onCreateClick?.()}
                      className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      + Add first task
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => (
    <div className="p-3 sm:p-6">
      <div className="space-y-2">
        {processedTasks.map(task => (
          <TaskCard key={task.id} task={task} view="list" />
        ))}
      </div>
    </div>
  );

  const renderGridView = () => (
    <div className="p-3 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
        {processedTasks.map(task => (
          <TaskCard key={task.id} task={task} view="grid" />
        ))}
      </div>
      {processedTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircleIcon className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 mb-4">No tasks match your current filters</p>
          <button
            onClick={() => onCreateClick?.()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Create first task
          </button>
        </div>
      )}
    </div>
  );

  const renderTimelineView = () => {
    // Group tasks by date (due date or created date)
    const tasksByDate = processedTasks.reduce((acc, task) => {
      const date = task.dueDate ? new Date(task.dueDate) : new Date(task.createdAt || '');
      const dateKey = date.toISOString().split('T')[0];
      
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(task);
      return acc;
    }, {} as Record<string, Task[]>);

    // Sort dates
    const sortedDates = Object.keys(tasksByDate).sort();

    return (
      <div className="p-3 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {sortedDates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <CalendarIcon className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 mb-4">No tasks scheduled</p>
              <button
                onClick={() => onCreateClick?.()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create first task
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {sortedDates.map((dateKey) => {
                const date = new Date(dateKey);
                const tasks = tasksByDate[dateKey];
                const isToday = date.toDateString() === new Date().toDateString();
                const isPast = date < new Date() && !isToday;
                const isFuture = date > new Date();

                return (
                  <div key={dateKey} className="relative">
                    {/* Date Header */}
                    <div className={`sticky top-0 z-10 mb-4 p-3 rounded-lg ${
                      isToday ? 'bg-purple-50 border border-purple-200' :
                      isPast ? 'bg-red-50 border border-red-200' :
                      'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CalendarIcon className={`w-5 h-5 ${
                            isToday ? 'text-purple-600' :
                            isPast ? 'text-red-600' :
                            'text-gray-600'
                          }`} />
                          <h3 className={`font-semibold ${
                            isToday ? 'text-purple-900' :
                            isPast ? 'text-red-900' :
                            'text-gray-900'
                          }`}>
                            {isToday ? 'Today' : 
                             isPast ? 'Overdue' :
                             date.toLocaleDateString('en-US', { 
                               weekday: 'long', 
                               month: 'long', 
                               day: 'numeric' 
                             })}
                          </h3>
                          <span className={`text-sm ${
                            isToday ? 'text-purple-700' :
                            isPast ? 'text-red-700' :
                            'text-gray-600'
                          }`}>
                            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <button
                          onClick={() => onCreateClick?.()}
                          className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                          Add Task
                        </button>
                      </div>
                    </div>

                    {/* Timeline Line */}
                    <div className="relative">
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                      
                      {/* Tasks */}
                      <div className="space-y-4">
                        {tasks.map((task, index) => {
                          const statusConfig = STATUS_CONFIG[task.status as StatusConfigKey] || STATUS_CONFIG.pending;
                          const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.MEDIUM;
                          const StatusIcon = statusConfig.icon;
                          const PriorityIcon = priorityConfig.icon;

                          return (
                            <div key={task.id} className="relative flex items-start gap-4 group">
                              {/* Timeline Dot */}
                              <div className={`relative z-10 w-12 h-12 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
                                isToday ? 'bg-purple-500' :
                                isPast ? 'bg-red-500' :
                                'bg-blue-500'
                              }`}>
                                <StatusIcon className="w-5 h-5 text-white" />
                              </div>

                              {/* Task Card */}
                              <div 
                                className={`flex-1 bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                                  isToday ? 'border-purple-200' :
                                  isPast ? 'border-red-200' :
                                  'border-gray-200'
                                }`}
                                onClick={() => onTaskSelect?.(task)}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-semibold text-gray-900">{task.title}</h4>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                                      {statusConfig.label}
                                    </span>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityConfig.bgClass} ${priorityConfig.textClass}`}>
                                      {priorityConfig.label}
                                    </span>
                                  </div>
                                </div>
                                
                                {task.description && (
                                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                                )}

                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <PriorityIcon className={`w-4 h-4 ${priorityConfig.textClass}`} />
                                    <span>{priorityConfig.label} Priority</span>
                                  </div>
                                  {(task.assignedTo || task.assigned_to) && (
                                    <div className="flex items-center gap-1">
                                      <UserCircleIcon className="w-4 h-4" />
                                      <span>Assigned to {task.assignedTo || task.assigned_to}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-3 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center gap-2 sm:gap-4">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tasks</h1>
                
                {/* Exchange Selector - Show only if we have exchanges */}
                {!exchangeId && exchanges.length > 0 && (
                  <div className="hidden lg:flex items-center gap-2">
                    <select
                      value={selectedExchange}
                      onChange={(e) => setSelectedExchange(e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="all">All Exchanges</option>
                      {exchanges.map(exchange => (
                        <option key={exchange.id} value={exchange.id}>
                          {exchange.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Quick Stats - Hidden on mobile, shown on sm+ */}
                <div className="hidden sm:flex items-center gap-2 lg:gap-3">
                  <div className="flex items-center gap-1 px-2 lg:px-3 py-1 bg-yellow-50 rounded-full">
                    <ClockIcon className="w-3 lg:w-4 h-3 lg:h-4 text-yellow-600" />
                    <span className="text-xs lg:text-sm font-medium text-yellow-700">{stats.pending}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 lg:px-3 py-1 bg-blue-50 rounded-full">
                    <ArrowPathIcon className="w-3 lg:w-4 h-3 lg:h-4 text-blue-600" />
                    <span className="text-xs lg:text-sm font-medium text-blue-700">{stats.inProgress}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 lg:px-3 py-1 bg-green-50 rounded-full">
                    <CheckCircleIcon className="w-3 lg:w-4 h-3 lg:h-4 text-green-600" />
                    <span className="text-xs lg:text-sm font-medium text-green-700">{stats.completed}</span>
                  </div>
                  {stats.overdue > 0 && (
                    <div className="flex items-center gap-1 px-2 lg:px-3 py-1 bg-red-50 rounded-full">
                      <ExclamationTriangleIcon className="w-3 lg:w-4 h-3 lg:h-4 text-red-600" />
                      <span className="text-xs lg:text-sm font-medium text-red-700">{stats.overdue} overdue</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {/* Search - Responsive width */}
                <div className="relative flex-1 sm:flex-initial">
                  <MagnifyingGlassIcon className="w-4 sm:w-5 h-4 sm:h-5 absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 w-full sm:w-48 lg:w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>

                {/* Filter Button - Icon only on mobile */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border ${
                    showFilters ? 'bg-purple-50 border-purple-300 text-purple-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FunnelIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {Object.values(filters).some(v => v !== 'all' && v !== false && (!Array.isArray(v) || v.length > 0)) && (
                    <span className="w-2 h-2 bg-purple-500 rounded-full" />
                  )}
                </button>

                {/* View Mode Switcher - Hidden on mobile */}
                <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={`p-1.5 sm:p-2 rounded ${viewMode === 'kanban' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                    title="Kanban Board"
                  >
                    <Squares2X2Icon className="w-3 sm:w-4 h-3 sm:h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 sm:p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                    title="List View"
                  >
                    <ListBulletIcon className="w-3 sm:w-4 h-3 sm:h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 sm:p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                    title="Card Grid"
                  >
                    <TableCellsIcon className="w-3 sm:w-4 h-3 sm:h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`p-1.5 sm:p-2 rounded ${viewMode === 'timeline' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                    title="Timeline View"
                  >
                    <CalendarIcon className="w-3 sm:w-4 h-3 sm:h-4" />
                  </button>
                </div>

                {/* Create Button - Icon only on mobile */}
                <button
                  onClick={() => onCreateClick?.()}
                  className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">New Task</span>
                </button>
              </div>
            </div>

            {/* Mobile Stats Bar */}
            <div className="flex sm:hidden items-center gap-2 mt-3 overflow-x-auto pb-2">
              <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 rounded-full flex-shrink-0">
                <ClockIcon className="w-3 h-3 text-yellow-600" />
                <span className="text-xs font-medium text-yellow-700">{stats.pending}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full flex-shrink-0">
                <ArrowPathIcon className="w-3 h-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">{stats.inProgress}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full flex-shrink-0">
                <CheckCircleIcon className="w-3 h-3 text-green-600" />
                <span className="text-xs font-medium text-green-700">{stats.completed}</span>
              </div>
              {stats.overdue > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-full flex-shrink-0">
                  <ExclamationTriangleIcon className="w-3 h-3 text-red-600" />
                  <span className="text-xs font-medium text-red-700">{stats.overdue}</span>
                </div>
              )}
            </div>

            {/* Filters Bar */}
            {showFilters && (
              <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
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
              <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-xs sm:text-sm font-medium text-purple-700">
                  {selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-1 sm:gap-2">
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
                onClick={() => onCreateClick?.()}
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
              {viewMode === 'timeline' && renderTimelineView()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernTaskUI;