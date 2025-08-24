import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Task, TaskStatus, TaskPriority } from '../../../types';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { useViewPreferences, VIEW_PREFERENCE_KEYS } from '../../../hooks/useViewPreferences';
import CalendarView from './CalendarView';
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
  FlagIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import {
  StarIcon as StarSolidIcon
} from '@heroicons/react/24/solid';

// Helper function for safe date formatting
const formatDateSafely = (dateString: string, options: Intl.DateTimeFormatOptions = {}) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  return date.toLocaleDateString('en-US', options);
};

interface ModernTaskUIProps {
  exchangeId?: string;
  initialView?: 'grid' | 'list' | 'kanban' | 'calendar' | 'timeline';
  onTaskSelect?: (task: Task) => void;
  onCreateClick?: () => void;
  defaultViews?: ('list' | 'calendar')[];
}

interface Exchange {
  id: string;
  name: string;
  status: string;
}

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  email: string;
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

type StatusConfigKey = 'pending' | 'in_progress' | 'completed' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

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
    label: 'Completed', 
    color: 'green',
    icon: CheckCircleIcon,
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    borderClass: 'border-green-200'
  },
  completed: { 
    label: 'Completed', 
    color: 'green',
    icon: CheckCircleIcon,
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    borderClass: 'border-green-200'
  }
};

export const ModernTaskUI: React.FC<ModernTaskUIProps> = ({
  exchangeId,
  initialView = 'list',
  onTaskSelect,
  onCreateClick,
  defaultViews = ['list', 'calendar']
}) => {
  // const { user } = useAuth(); // Unused variable
  
  // Handle view mode changes and save to preferences
  const handleViewModeChange = (newViewMode: 'grid' | 'list' | 'kanban' | 'calendar' | 'timeline') => {
    setViewMode(newViewMode);
    setSavedViewMode(newViewMode);
    // If switching to a single view, disable dual view
    if (!defaultViews.includes(newViewMode as any)) {
      setShowDualView(false);
    }
  };

  // Toggle dual view (list + calendar)
  const toggleDualView = () => {
    setShowDualView(!showDualView);
    if (!showDualView) {
      setViewMode('list'); // Default to list when enabling dual view
      setSavedViewMode('list');
    }
  };
  const [tasks, setTasks] = useState<Task[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { viewType: savedViewMode, setViewType: setSavedViewMode, loading: preferencesLoading } = useViewPreferences(
    VIEW_PREFERENCE_KEYS.TASK_LIST,
    initialView
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban' | 'calendar' | 'timeline'>(savedViewMode);
  const [showDualView, setShowDualView] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'exchange' | 'user'>('all');
  const [selectedExchange, setSelectedExchange] = useState<string>('all');

  // Update viewMode when saved preference loads
  useEffect(() => {
    if (!preferencesLoading) {
      setViewMode(savedViewMode);
    }
  }, [savedViewMode, preferencesLoading]);
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

  // Get user name by ID
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      const firstName = user.firstName || user.first_name;
      const lastName = user.lastName || user.last_name;
      return firstName && lastName ? `${firstName} ${lastName}` : userId;
    }
    return userId;
  };

  // Get exchange name by ID
  const getExchangeName = (exchangeId: string) => {
    if (exchangeId === 'no-exchange') return 'Unassigned Tasks';
    const exchange = exchanges.find(ex => ex.id === exchangeId);
    return exchange?.name || `Exchange ${exchangeId}`;
  };

  // Quick status change handler
  const handleQuickStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await apiService.updateTask(taskId, { status: newStatus });
      // Refresh tasks
      loadTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

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
          tasksArray = Array.isArray(response) ? response : ((response as any)?.tasks || []);
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
        // Load all tasks, exchanges, and users
        try {
          const [tasksResponse, exchangesResponse, usersResponse] = await Promise.all([
            apiService.getTasks(),
            apiService.getExchanges(),
            apiService.getUsers()
          ]);
          
          console.log('🔍 ModernTaskUI: All tasks response:', tasksResponse);
          tasksArray = Array.isArray(tasksResponse) ? tasksResponse : [];
          
          exchangesData = (exchangesResponse as any)?.data || exchangesResponse;
          setExchanges(Array.isArray(exchangesData) ? exchangesData : []);
          
          const usersData = (usersResponse as any)?.data || usersResponse;
          setUsers(Array.isArray(usersData) ? usersData : []);
        } catch (error) {
          console.error('❌ ModernTaskUI: Error loading data:', error);
          // Try to load just tasks if other endpoints fail
          try {
            const tasksResponse = await apiService.getTasks();
            tasksArray = Array.isArray(tasksResponse) ? tasksResponse : [];
            console.log('🔍 ModernTaskUI: Loaded tasks only:', tasksArray.length);
            // Set empty arrays for exchanges and users since they failed
            setExchanges([]);
            setUsers([]);
          } catch (tasksError) {
            console.error('❌ ModernTaskUI: Failed to load tasks:', tasksError);
            tasksArray = [];
          }
        }
      }
      
      // Normalize status and priority for consistent display
      const normalizedTasks = tasksArray.map((task: any) => ({
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

    // Enhanced search with search type
    if (searchQuery) {
      filtered = filtered.filter(task => {
        const searchLower = searchQuery.toLowerCase();
        
        // Search in task title and description
        const titleMatch = task.title.toLowerCase().includes(searchLower);
        const descMatch = task.description?.toLowerCase().includes(searchLower);
        
        // Search by exchange name
        const exchangeMatch = searchType === 'all' || searchType === 'exchange' ? 
          getExchangeName(task.exchangeId || task.exchange_id || '').toLowerCase().includes(searchLower) : false;
        
        // Search by user name
        const userMatch = searchType === 'all' || searchType === 'user' ? 
          getUserName(task.assignedTo || task.assigned_to || '').toLowerCase().includes(searchLower) : false;
        
        return titleMatch || descMatch || exchangeMatch || userMatch;
      });
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
    
    // Date range filtering
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      filtered = filtered.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        const taskDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        
        switch (filters.dateRange) {
          case 'today':
            return taskDate.getTime() === today.getTime();
          case 'week':
            return taskDate >= today && taskDate <= nextWeek;
          case 'month':
            return taskDate >= today && taskDate <= nextMonth;
          case 'overdue':
            return taskDate < today && task.status !== 'COMPLETED' && task.status !== 'completed';
          default:
            return true;
        }
      });
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
  }, [tasks, searchQuery, searchType, selectedExchange, filters, sortBy, sortOrder, users, exchanges]);

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
      'completed': 'completed'
    };
    
    // Initialize groups for display - only valid statuses
    ['pending', 'in_progress', 'completed'].forEach(status => {
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
          className={`group flex items-center gap-3 px-4 py-3 bg-white border-l-2 hover:bg-gray-50 transition-all cursor-pointer ${
            isSelected ? 'bg-purple-50 border-l-purple-500' : 
            isOverdue ? 'border-l-red-500' : 'border-l-transparent hover:border-l-gray-300'
          }`}
          onClick={() => onTaskSelect?.(task)}
        >
          {/* Minimal Checkbox */}
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-1 focus:ring-purple-500"
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
          
          {/* Clean Minimal Task Content */}
          <div className="flex-1 min-w-0">
            {/* Single Row: Title + Minimal Indicators */}
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 truncate pr-3">{task.title}</h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Priority Icon Only */}
                <div className="group relative">
                  <PriorityIcon className={`w-4 h-4 ${priorityConfig.textClass} cursor-help`} />
                  <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                    {priorityConfig.label}
                  </div>
                </div>
                
                {/* Status Dot Only */}
                <div className="group relative">
                  <div className={`w-2 h-2 rounded-full cursor-help ${
                    task.status === 'COMPLETED' ? 'bg-green-500' :
                    task.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                    isOverdue ? 'bg-red-500' : 'bg-gray-400'
                  }`}></div>
                  <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                    {isOverdue ? 'Overdue' : statusConfig.label}
                  </div>
                </div>
                
                {/* Due Date Icon Only */}
                {dueDateInfo && (
                  <div className="group relative">
                    <CalendarIcon className={`w-4 h-4 cursor-help ${dueDateInfo.urgent ? 'text-red-500' : 'text-gray-400'}`} />
                    <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                      {dueDateInfo.text}
                    </div>
                  </div>
                )}
                
                {/* Assignee Icon Only */}
                {(task.assignedTo || task.assigned_to) && (
                  <div className="group relative">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 hover:bg-purple-200 transition-colors cursor-help">
                      <span className="text-xs font-medium text-purple-700">
                        {getUserName(task.assignedTo || task.assigned_to || '').split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                      {getUserName(task.assignedTo || task.assigned_to || '')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hover Actions - Minimal */}
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 ml-2">
            <button 
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onTaskSelect?.(task);
              }}
              title="Edit"
            >
              <PencilIcon className="w-3 h-3 text-gray-500" />
            </button>
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

      </div>
    );
  };

  // Render different views
  // Enhanced Task Card Component
  const EnhancedTaskCard: React.FC<{ task: Task; view: string; onTaskSelect?: (task: Task) => void }> = ({ task, view, onTaskSelect }) => {
    const statusConfig = STATUS_CONFIG[task.status as StatusConfigKey] || STATUS_CONFIG.pending;
    const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.MEDIUM;
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
    const isDueSoon = task.dueDate && new Date(task.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000) && task.status !== 'COMPLETED';
    
    const getInitials = (name?: string) => {
      if (!name) return '?';
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getExchangeRef = (exchangeId?: string) => {
      if (!exchangeId) return '';
      // Extract numeric part and format as E-XXXX
      const numericPart = exchangeId.replace(/\D/g, '').slice(-4);
      return `E-${numericPart.padStart(4, '0')}`;
    };

    const getAssigneeName = (task: Task) => {
      if (task.assignedUser?.firstName && task.assignedUser?.lastName) {
        return `${task.assignedUser.firstName} ${task.assignedUser.lastName}`;
      }
      if (task.assignedUser?.first_name && task.assignedUser?.last_name) {
        return `${task.assignedUser.first_name} ${task.assignedUser.last_name}`;
      }
      if (task.assignedTo || task.assigned_to) {
        return getUserName(task.assignedTo || task.assigned_to || '');
      }
      return 'Unassigned';
    };

    return (
      <div 
        className={`group relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
          isOverdue ? 'border-red-300 bg-red-50' : 
          isDueSoon ? 'border-yellow-300 bg-yellow-50' : 
          'hover:border-purple-300'
        }`}
        onClick={() => onTaskSelect?.(task)}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', task.id);
          setDraggedTask(task.id);
        }}
      >
        {/* Priority Indicator */}
        <div className={`absolute top-0 left-0 w-1 h-full rounded-l-lg ${priorityConfig.dotClass}`} />
        
        {/* Compact Task Content */}
        <div className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 pr-2">
              <h4 className="font-medium text-gray-900 text-sm leading-tight line-clamp-1">
                {task.title}
              </h4>
              {/* Exchange Reference */}
              {task.exchangeId && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-500 font-mono">
                    {getExchangeRef(task.exchangeId)}
                  </span>
                </div>
              )}
            </div>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.bgClass} ${statusConfig.textClass}`}>
              {statusConfig.label}
            </span>
          </div>
          
          {/* Task Description - Compact */}
          {task.description && (
            <p className="text-xs text-gray-600 mb-2 line-clamp-1">
              {task.description}
            </p>
          )}
          
          {/* Compact Task Meta */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              {/* Assignee */}
              {getAssigneeName(task) !== 'Unassigned' ? (
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-purple-700">
                      {getInitials(getAssigneeName(task))}
                    </span>
                  </div>
                  <span className="truncate max-w-20 text-xs font-medium text-gray-700">
                    {getAssigneeName(task)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-gray-400">
                  <UserCircleIcon className="w-3 h-3" />
                  <span className="text-xs">Unassigned</span>
                </div>
              )}
              
              {/* Due Date with Override Option */}
              {task.dueDate && (
                <div className={`flex items-center gap-1 group/due ${
                  isOverdue ? 'text-red-600' : 
                  isDueSoon ? 'text-yellow-600' : 
                  'text-gray-500'
                }`}>
                  <CalendarIcon className="w-3 h-3" />
                  <span className="text-xs font-medium">
                    {formatDateSafely(task.dueDate, { month: 'short', day: 'numeric' })}
                  </span>
                  {/* Due Date Override Button - Only show for assignee */}
                  {task.assignedTo && (
                    <button
                      className="opacity-0 group-hover/due:opacity-100 p-0.5 text-gray-400 hover:text-purple-600 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement due date override modal
                        console.log('Override due date for task:', task.id);
                      }}
                      title="Override due date"
                    >
                      <PencilIcon className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* Priority Badge */}
            <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${priorityConfig.bgClass} ${priorityConfig.textClass}`}>
              {priorityConfig.label}
            </span>
          </div>
          
          {/* Quick Actions - Compact */}
          <div className="flex items-center justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button 
              className="p-1 text-gray-400 hover:text-purple-600 transition-colors rounded"
              onClick={(e) => {
                e.stopPropagation();
                // Quick status change
              }}
            >
              <CheckCircleIcon className="w-3 h-3" />
            </button>
            <button 
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded"
              onClick={(e) => {
                e.stopPropagation();
                // Quick edit
              }}
            >
              <PencilIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderKanbanView = () => {
    // Only show primary status columns, not duplicates
    const statusColumns = ['pending', 'in_progress', 'completed'];
    
    return (
      <div className="flex gap-2 sm:gap-4 p-2 sm:p-4 overflow-x-auto min-h-full bg-gradient-to-br from-gray-50 to-blue-50">
        {statusColumns.map((status) => {
          const config = STATUS_CONFIG[status as StatusConfigKey] || STATUS_CONFIG.pending;
          const tasks = groupedTasks[status] || [];
          const isOverdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length;
          
          return (
            <div
              key={status}
              className={`flex-shrink-0 w-64 sm:w-72 md:w-80 lg:w-96 ${
                hoveredColumn === status ? 'bg-white/80 rounded-xl shadow-lg transform scale-105 transition-all duration-200' : ''
              }`}
              onDragOver={(e) => {
                handleDragOver(e);
                setHoveredColumn(status);
              }}
              onDragLeave={() => setHoveredColumn(null)}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Enhanced Column Header */}
              <div className={`mb-6 p-6 ${config.bgClass} rounded-2xl border-2 ${config.borderClass} shadow-lg backdrop-blur-sm`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 bg-white/80 rounded-xl shadow-md backdrop-blur-sm`}>
                      <config.icon className={`w-7 h-7 ${config.textClass}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-xl ${config.textClass}`}>{config.label}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-sm font-medium ${config.textClass} opacity-90`}>
                          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                        </span>
                        {isOverdue > 0 && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                            {isOverdue} overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    className={`p-3 hover:bg-white/80 rounded-xl transition-all duration-200 ${config.textClass} hover:scale-110`}
                    onClick={() => onCreateClick?.()}
                    title="Add new task"
                  >
                    <PlusIcon className="w-6 h-6" />
                  </button>
                </div>
                
                {/* Column Progress Bar */}
                {tasks.length > 0 && (
                  <div className="w-full bg-white/50 rounded-full h-2 mb-3">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${config.textClass.replace('text-', 'bg-')}`}
                      style={{ 
                        width: `${Math.min((tasks.filter(t => t.status === 'COMPLETED').length / tasks.length) * 100, 100)}%` 
                      }}
                    />
                  </div>
                )}
                
                {/* Column Analytics */}
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>WIP: {tasks.length}</span>
                  <span>Due: {tasks.filter(t => t.dueDate && new Date(t.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length}</span>
                  <span>Overdue: {tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length}</span>
                </div>
              </div>
              
              {/* Enhanced Tasks Container */}
              <div className="space-y-3 min-h-[500px]">
                {tasks.map(task => (
                  <EnhancedTaskCard key={task.id} task={task} view="kanban" onTaskSelect={onTaskSelect} />
                ))}
                
                {/* Enhanced Empty State */}
                {tasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-2xl bg-white/50 backdrop-blur-sm hover:bg-white/70 transition-all duration-200">
                    <div className={`p-4 ${config.bgClass} rounded-full mb-4`}>
                      <config.icon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 text-center font-medium mb-2">
                      No {config.label.toLowerCase()} tasks
                    </p>
                    <p className="text-xs text-gray-400 text-center mb-4">
                      Create your first task to get started
                    </p>
                    <button
                      onClick={() => onCreateClick?.()}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 hover:scale-105"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add Task
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
    <div className="p-4 sm:p-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Enhanced List Header */}
          <div className="bg-gray-50 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-gray-700">
              <div className="col-span-4 sm:col-span-4">Task</div>
              <div className="col-span-2 sm:col-span-2">Status</div>
              <div className="col-span-2 sm:col-span-2">Priority</div>
              <div className="col-span-2 sm:col-span-2">Assignee</div>
              <div className="col-span-2 sm:col-span-2">Due Date</div>
            </div>
          </div>
        
        {/* Enhanced Task Rows */}
        <div className="divide-y divide-gray-200">
          {processedTasks.map(task => (
            <EnhancedListRow key={task.id} task={task} onTaskSelect={onTaskSelect} />
          ))}
        </div>
        
        {/* Empty State */}
        {processedTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <DocumentTextIcon className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-500 mb-4">Create your first task to get started</p>
            <button
              onClick={() => onCreateClick?.()}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Create Task
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Enhanced List Row Component
  const EnhancedListRow: React.FC<{ task: Task; onTaskSelect?: (task: Task) => void }> = ({ task, onTaskSelect }) => {
    const statusConfig = STATUS_CONFIG[task.status as StatusConfigKey] || STATUS_CONFIG.pending;
    const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.MEDIUM;
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
    const isDueSoon = task.dueDate && new Date(task.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000) && task.status !== 'COMPLETED';
    
    const getInitials = (name?: string) => {
      if (!name) return '?';
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getExchangeRef = (exchangeId?: string) => {
      if (!exchangeId) return '';
      const numericPart = exchangeId.replace(/\D/g, '').slice(-4);
      return `E-${numericPart.padStart(4, '0')}`;
    };

    const getAssigneeName = (task: Task) => {
      if (task.assignedUser?.firstName && task.assignedUser?.lastName) {
        return `${task.assignedUser.firstName} ${task.assignedUser.lastName}`;
      }
      if (task.assignedUser?.first_name && task.assignedUser?.last_name) {
        return `${task.assignedUser.first_name} ${task.assignedUser.last_name}`;
      }
      if (task.assignedTo || task.assigned_to) {
        return getUserName(task.assignedTo || task.assigned_to || '');
      }
      return 'Unassigned';
    };

    return (
      <div 
        className="grid grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 transition-colors cursor-pointer group"
        onClick={() => onTaskSelect?.(task)}
      >
        {/* Task Title & Description */}
        <div className="col-span-4">
          <div className="flex items-start gap-3">
            <div className={`w-2 h-2 rounded-full mt-2 ${priorityConfig.dotClass}`} />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm truncate">
                {task.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                {task.exchangeId && (
                  <span className="text-xs text-gray-500 font-mono">
                    {getExchangeRef(task.exchangeId)}
                  </span>
                )}
                {task.description && (
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {task.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Status */}
        <div className="col-span-2 flex items-center">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusConfig.bgClass} ${statusConfig.textClass}`}>
            {statusConfig.label}
          </span>
        </div>
        
        {/* Priority */}
        <div className="col-span-2 flex items-center">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${priorityConfig.bgClass} ${priorityConfig.textClass}`}>
            {priorityConfig.label}
          </span>
        </div>
        
        {/* Assignee */}
        <div className="col-span-2 flex items-center">
          {getAssigneeName(task) !== 'Unassigned' ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-purple-700">
                  {getInitials(getAssigneeName(task))}
                </span>
              </div>
              <span className="text-sm text-gray-900 truncate font-medium">
                {getAssigneeName(task)}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Unassigned</span>
          )}
        </div>
        
        {/* Due Date */}
        <div className="col-span-2 flex items-center">
          {task.dueDate ? (
            <div className={`flex items-center gap-2 ${
              isOverdue ? 'text-red-600' : 
              isDueSoon ? 'text-yellow-600' : 
              'text-gray-900'
            }`}>
              <CalendarIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                {(() => {
                  const dueDate = new Date(task.dueDate);
                  return isNaN(dueDate.getTime()) ? 'Invalid Date' : dueDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  });
                })()}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">No due date</span>
          )}
        </div>
        
        {/* Quick Actions (Hidden by default, shown on hover) */}
        <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-1">
            <button 
              className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // Quick status change
              }}
            >
              <CheckCircleIcon className="w-4 h-4" />
            </button>
            <button 
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // Quick edit
              }}
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderGridView = () => (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
        {processedTasks.map(task => (
          <EnhancedGridCard key={task.id} task={task} onTaskSelect={onTaskSelect} />
        ))}
      </div>
      
      {/* Empty State */}
      {processedTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Squares2X2Icon className="w-12 h-12 text-gray-300" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-500 mb-6 text-center max-w-md">
            Create your first task to start organizing your work in a beautiful grid layout
          </p>
          <button
            onClick={() => onCreateClick?.()}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 hover:scale-105"
          >
            <PlusIcon className="w-5 h-5" />
            Create First Task
          </button>
        </div>
      )}
    </div>
  );

  // Enhanced Grid Card Component
  const EnhancedGridCard: React.FC<{ task: Task; onTaskSelect?: (task: Task) => void }> = ({ task, onTaskSelect }) => {
    const statusConfig = STATUS_CONFIG[task.status as StatusConfigKey] || STATUS_CONFIG.pending;
    const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.MEDIUM;
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
    const isDueSoon = task.dueDate && new Date(task.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000) && task.status !== 'COMPLETED';
    
    const getInitials = (name?: string) => {
      if (!name) return '?';
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
      <div 
        className={`group relative bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer transform hover:scale-[1.02] ${
          isOverdue ? 'border-red-300 bg-red-50' : 
          isDueSoon ? 'border-yellow-300 bg-yellow-50' : 
          'border-gray-200 hover:border-purple-300'
        }`}
        onClick={() => onTaskSelect?.(task)}
      >
        {/* Priority Indicator */}
        <div className={`absolute top-0 left-0 w-1 h-full rounded-l-lg ${priorityConfig.dotClass}`} />
        
        {/* Compact Card Content */}
        <div className="p-3">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-gray-900 text-sm leading-tight flex-1 pr-2 line-clamp-2">
              {task.title}
            </h4>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.bgClass} ${statusConfig.textClass}`}>
              {statusConfig.label}
            </span>
          </div>
          
          {/* Task Description - Compact */}
          {task.description && (
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {task.description}
            </p>
          )}
          
          {/* Compact Task Meta */}
          <div className="space-y-2">
            {/* Assignee */}
            <div className="flex items-center gap-2">
              {task.assignedTo || task.assigned_to ? (
                <div className="group relative">
                  <div className="w-5 h-5 bg-purple-100 hover:bg-purple-200 rounded-full flex items-center justify-center transition-colors cursor-help">
                    <span className="text-xs font-medium text-purple-700">
                      {getInitials(task.assignedTo || task.assigned_to)}
                    </span>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                    {getUserName(task.assignedTo || task.assigned_to || '')}
                  </div>
                </div>
              ) : (
                <>
                  <UserCircleIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">Unassigned</span>
                </>
              )}
            </div>
            
            {/* Due Date */}
            {task.dueDate && (
              <div className={`flex items-center gap-2 ${
                isOverdue ? 'text-red-600' : 
                isDueSoon ? 'text-yellow-600' : 
                'text-gray-600'
              }`}>
                <CalendarIcon className="w-3 h-3" />
                <span className="text-xs font-medium">
                  {(() => {
                    const dueDate = new Date(task.dueDate);
                    return isNaN(dueDate.getTime()) ? 'Invalid Date' : dueDate.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    });
                  })()}
                </span>
                {isOverdue && (
                  <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                    Overdue
                  </span>
                )}
              </div>
            )}
            
            {/* Priority Badge */}
            <div className="flex items-center justify-between">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityConfig.bgClass} ${priorityConfig.textClass}`}>
                {priorityConfig.label} Priority
              </span>
            </div>
          </div>
        </div>
        
        {/* Quick Actions - Compact Overlay */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
          <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg p-1.5 shadow-lg">
            {/* Quick Status Change Dropdown */}
            <div className="relative group/status">
              <button 
                className="p-1.5 text-gray-600 hover:text-purple-600 transition-colors rounded hover:bg-purple-50"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <CheckCircleIcon className="w-3 h-3" />
              </button>
              <div className="absolute bottom-full left-0 mb-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover/status:opacity-100 group-hover/status:visible transition-all z-20">
                <div className="py-1">
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickStatusChange(task.id, key as TaskStatus);
                      }}
                      className="w-full text-left px-2 py-1 text-xs hover:bg-gray-50 flex items-center gap-1"
                    >
                      <config.icon className="w-3 h-3" />
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <button 
              className="p-1.5 text-gray-600 hover:text-blue-600 transition-colors rounded hover:bg-blue-50"
              onClick={(e) => {
                e.stopPropagation();
                onTaskSelect?.(task);
              }}
            >
              <PencilIcon className="w-3 h-3" />
            </button>
            <button 
              className="p-1.5 text-gray-600 hover:text-red-600 transition-colors rounded hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                // Quick delete - could add confirmation
                if (window.confirm('Are you sure you want to delete this task?')) {
                  apiService.deleteTask(task.id).then(() => loadTasks());
                }
              }}
            >
              <TrashIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTimelineView = () => {
    // Group tasks by date (due date or created date)
    const tasksByDate = processedTasks.reduce((acc, task) => {
      // Create date with fallback to current date if invalid
      let date: Date;
      if (task.dueDate) {
        date = new Date(task.dueDate);
        if (isNaN(date.getTime())) {
          date = new Date(); // Fallback to current date
        }
      } else if (task.createdAt) {
        date = new Date(task.createdAt);
        if (isNaN(date.getTime())) {
          date = new Date(); // Fallback to current date
        }
      } else {
        date = new Date(); // Fallback to current date
      }
      
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
      <div className="p-2 sm:p-4 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        <div className="max-w-full mx-auto">
          {/* Timeline Header */}
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Task Timeline</h2>
            <p className="text-gray-600">View your tasks in chronological order</p>
          </div>

          {sortedDates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mb-6">
                <CalendarIcon className="w-12 h-12 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks scheduled</h3>
              <p className="text-gray-500 mb-6 text-center max-w-md">
                Create your first task to start building your timeline
              </p>
              <button
                onClick={() => onCreateClick?.()}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 hover:scale-105"
              >
                <PlusIcon className="w-5 h-5" />
                Create First Task
              </button>
            </div>
          ) : (
            <div className="space-y-12">
              {sortedDates.map((dateKey) => {
                const date = new Date(dateKey);
                const tasks = tasksByDate[dateKey];
                const isToday = date.toDateString() === new Date().toDateString();
                const isPast = date < new Date() && !isToday;
                const isFuture = date > new Date();
                const overdueTasks = tasks.filter(t => {
                  if (!t.dueDate) return false;
                  const dueDate = new Date(t.dueDate);
                  return !isNaN(dueDate.getTime()) && dueDate < new Date() && t.status !== 'COMPLETED';
                });
                const completedTasks = tasks.filter(t => t.status === 'COMPLETED');

                return (
                  <div key={dateKey} className="relative">
                    {/* Enhanced Date Header */}
                    <div className={`sticky top-4 z-20 mb-8 p-6 rounded-2xl shadow-lg backdrop-blur-sm ${
                      isToday ? 'bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-200' :
                      isPast ? 'bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200' :
                      'bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${
                            isToday ? 'bg-purple-500' :
                            isPast ? 'bg-red-500' :
                            'bg-blue-500'
                          }`}>
                            <CalendarIcon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className={`text-xl font-bold ${
                              isToday ? 'text-purple-900' :
                              isPast ? 'text-red-900' :
                              'text-blue-900'
                            }`}>
                              {isToday ? 'Today' : 
                               isPast ? 'Overdue' :
                               date.toLocaleDateString('en-US', { 
                                 weekday: 'long', 
                                 month: 'long', 
                                 day: 'numeric' 
                               })}
                            </h3>
                            <div className="flex items-center gap-4 mt-1">
                              <span className={`text-sm font-medium ${
                                isToday ? 'text-purple-700' :
                                isPast ? 'text-red-700' :
                                'text-blue-700'
                              }`}>
                                {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                              </span>
                              {overdueTasks.length > 0 && (
                                <span className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                  {overdueTasks.length} overdue
                                </span>
                              )}
                              {completedTasks.length > 0 && (
                                <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                  {completedTasks.length} completed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => onCreateClick?.()}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 hover:scale-105"
                        >
                          <PlusIcon className="w-4 h-4" />
                          Add Task
                        </button>
                      </div>
                    </div>

                    {/* Enhanced Timeline */}
                    <div className="relative">
                      {/* Timeline Line */}
                      <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-300 to-gray-200 rounded-full"></div>
                      
                      {/* Tasks */}
                      <div className="space-y-6">
                        {tasks.map((task, index) => {
                          const statusConfig = STATUS_CONFIG[task.status as StatusConfigKey] || STATUS_CONFIG.pending;
                          const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.MEDIUM;
                          const StatusIcon = statusConfig.icon;
                          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
                          const isDueSoon = task.dueDate && new Date(task.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000) && task.status !== 'COMPLETED';
                          
                          const getInitials = (name?: string) => {
                            if (!name) return '?';
                            return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                          };

                          return (
                            <div key={task.id} className="relative flex items-start gap-6 group">
                              {/* Enhanced Timeline Dot */}
                              <div className={`relative z-10 w-16 h-16 rounded-full border-4 border-white shadow-lg flex items-center justify-center ${
                                isToday ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                                isPast ? 'bg-gradient-to-br from-red-500 to-red-600' :
                                'bg-gradient-to-br from-blue-500 to-blue-600'
                              }`}>
                                <StatusIcon className="w-7 h-7 text-white" />
                              </div>

                              {/* Enhanced Task Card */}
                              <div 
                                className={`flex-1 bg-white border-2 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-[1.02] ${
                                  isOverdue ? 'border-red-300 bg-red-50' :
                                  isDueSoon ? 'border-yellow-300 bg-yellow-50' :
                                  isToday ? 'border-purple-200 hover:border-purple-300' :
                                  'border-gray-200 hover:border-blue-300'
                                }`}
                                onClick={() => onTaskSelect?.(task)}
                              >
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 text-lg mb-2">{task.title}</h4>
                                    {task.description && (
                                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 ml-4">
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                                      {statusConfig.label}
                                    </span>
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${priorityConfig.bgClass} ${priorityConfig.textClass}`}>
                                      {priorityConfig.label}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Task Meta */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    {/* Assignee */}
                                    <div className="flex items-center gap-2">
                                      {task.assignedTo || task.assigned_to ? (
                                        <div className="group relative">
                                          <div className="w-8 h-8 bg-purple-100 hover:bg-purple-200 rounded-full flex items-center justify-center transition-colors cursor-help">
                                            <span className="text-sm font-medium text-purple-700">
                                              {getInitials(task.assignedTo || task.assigned_to)}
                                            </span>
                                          </div>
                                          {/* Tooltip */}
                                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                            {task.assignedUser?.firstName && task.assignedUser?.lastName ? `${task.assignedUser.firstName} ${task.assignedUser.lastName}` : task.assignedUser?.first_name && task.assignedUser?.last_name ? `${task.assignedUser.first_name} ${task.assignedUser.last_name}` : getUserName(task.assignedTo || task.assigned_to || '')}
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <UserCircleIcon className="w-6 h-6 text-gray-400" />
                                          <span className="text-sm text-gray-400">Unassigned</span>
                                        </>
                                      )}
                                    </div>
                                    
                                    {/* Due Date */}
                                    {task.dueDate && (
                                      <div className={`flex items-center gap-2 ${
                                        isOverdue ? 'text-red-600' : 
                                        isDueSoon ? 'text-yellow-600' : 
                                        'text-gray-600'
                                      }`}>
                                        <CalendarIcon className="w-4 h-4" />
                                        <span className="text-sm font-medium">
                                          {(() => {
                                            const dueDate = new Date(task.dueDate);
                                            return isNaN(dueDate.getTime()) ? 'Invalid Date' : dueDate.toLocaleDateString('en-US', { 
                                              month: 'short', 
                                              day: 'numeric',
                                              year: 'numeric'
                                            });
                                          })()}
                                        </span>
                                        {isOverdue && (
                                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                            Overdue
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Quick Actions */}
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button 
                                      className="p-2 text-gray-400 hover:text-purple-600 transition-colors rounded-lg hover:bg-purple-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Quick status change
                                      }}
                                    >
                                      <CheckCircleIcon className="w-4 h-4" />
                                    </button>
                                    <button 
                                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Quick edit
                                      }}
                                    >
                                      <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button 
                                      className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Quick delete
                                      }}
                                    >
                                      <TrashIcon className="w-4 h-4" />
                                    </button>
                                  </div>
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
    <div className="flex h-full bg-gray-50 w-full overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Enhanced Header with Better UI/UX */}
        <div className="bg-gradient-to-r from-white to-gray-50 border-b border-gray-200 shadow-sm">
          <div className="px-6 py-6">
            {/* Enhanced Breadcrumb Navigation */}
            <nav className="flex mb-6" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-3">
                <li>
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <DocumentTextIcon className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Tasks</span>
                  </div>
                </li>
                {selectedExchange !== 'all' && (
                  <li>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-300 mx-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="w-4 h-4 text-gray-500 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {exchanges.find(e => e.id === selectedExchange)?.name || 'Exchange'}
                        </span>
                      </div>
                    </div>
                  </li>
                )}
              </ol>
            </nav>

            {/* Enhanced Main Header Row - Compact Layout */}
            <div className="flex flex-col gap-4 mb-6">
              {/* Title and Exchange Row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Enhanced Title */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                    <DocumentTextIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
                    <p className="text-xs text-gray-600">Organize and track your work efficiently</p>
                  </div>
                </div>
                
                {/* Compact Exchange Selector */}
                {!exchangeId && exchanges.length > 0 && (
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm">
                    <BuildingOfficeIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Exchange:</span>
                    <select
                      value={selectedExchange}
                      onChange={(e) => setSelectedExchange(e.target.value)}
                      className="px-2 py-1 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-transparent hover:border-purple-300 transition-colors font-medium max-w-32"
                    >
                      <option value="all">All</option>
                      {exchanges.map(exchange => (
                        <option key={exchange.id} value={exchange.id}>
                          {exchange.name.length > 15 ? exchange.name.substring(0, 15) + '...' : exchange.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Compact Search */}
                <div className="relative group flex-1 max-w-sm">
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white shadow-sm hover:shadow-md transition-all duration-200"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Compact Filter Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
                    showFilters 
                      ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-md' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-purple-300 hover:shadow-md'
                  }`}
                >
                  <FunnelIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">Filters</span>
                  {Object.values(filters).some(v => v !== 'all' && v !== false && (!Array.isArray(v) || v.length > 0)) && (
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                  )}
                </button>

                {/* Compact Create Button */}
                <button
                  onClick={() => onCreateClick?.()}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span className="text-sm font-semibold">New Task</span>
                </button>
              </div>
            </div>

            {/* Compact Stats and View Controls Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Clickable Task Statistics */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Clear All Filters Button */}
                {(filters.status !== 'all' || filters.priority !== 'all' || filters.assignee !== 'all' || filters.dateRange !== 'all' || filters.starred) && (
                  <button
                    onClick={() => {
                      setFilters({
                        status: 'all',
                        priority: 'all',
                        assignee: 'all',
                        dateRange: 'all',
                        tags: [],
                        starred: false
                      });
                      setShowFilters(false);
                    }}
                    className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-200 transition-all duration-200 cursor-pointer group"
                  >
                    <XMarkIcon className="w-3 h-3 text-gray-600" />
                    <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">Clear</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setFilters(prev => ({ ...prev, status: 'pending' }));
                    setShowFilters(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200 shadow-sm hover:shadow-md hover:from-yellow-100 hover:to-yellow-200 transition-all duration-200 cursor-pointer group"
                >
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold text-yellow-800 group-hover:text-yellow-900">{stats.pending} Pending</span>
                </button>
                <button
                  onClick={() => {
                    setFilters(prev => ({ ...prev, status: 'in_progress' }));
                    setShowFilters(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 shadow-sm hover:shadow-md hover:from-blue-100 hover:to-blue-200 transition-all duration-200 cursor-pointer group"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold text-blue-800 group-hover:text-blue-900">{stats.inProgress} In Progress</span>
                </button>
                <button
                  onClick={() => {
                    setFilters(prev => ({ ...prev, status: 'completed' }));
                    setShowFilters(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200 shadow-sm hover:shadow-md hover:from-green-100 hover:to-green-200 transition-all duration-200 cursor-pointer group"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-bold text-green-800 group-hover:text-green-900">{stats.completed} Completed</span>
                </button>
                {stats.overdue > 0 && (
                  <button
                    onClick={() => {
                      setFilters(prev => ({ ...prev, dateRange: 'overdue' }));
                      setShowFilters(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-red-50 to-red-100 rounded-lg border border-red-200 shadow-sm hover:shadow-md hover:from-red-100 hover:to-red-200 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-red-800 group-hover:text-red-900">{stats.overdue} Overdue</span>
                  </button>
                )}
                {stats.dueToday > 0 && (
                  <button
                    onClick={() => {
                      setFilters(prev => ({ ...prev, dateRange: 'today' }));
                      setShowFilters(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200 shadow-sm hover:shadow-md hover:from-orange-100 hover:to-orange-200 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-orange-800 group-hover:text-orange-900">{stats.dueToday} Due Today</span>
                  </button>
                )}
              </div>

              {/* Compact View Mode Switcher */}
              <div className="flex items-center bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                <button
                  onClick={() => handleViewModeChange('kanban')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    viewMode === 'kanban' 
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Kanban Board"
                >
                  <Squares2X2Icon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleViewModeChange('list')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    viewMode === 'list' 
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  title="List View"
                >
                  <ListBulletIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleViewModeChange('grid')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    viewMode === 'grid' 
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Card Grid"
                >
                  <TableCellsIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleViewModeChange('calendar')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    viewMode === 'calendar' 
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Calendar View"
                >
                  <CalendarIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleViewModeChange('timeline')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    viewMode === 'timeline' 
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Timeline View"
                >
                  <ClockIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Dual View Toggle */}
              <div className="flex items-center bg-white rounded-lg p-1 shadow-sm border border-gray-200 ml-3">
                <button
                  onClick={toggleDualView}
                  className={`px-3 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                    showDualView 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Toggle List + Calendar View"
                >
                  {showDualView ? 'List + Calendar' : 'Single View'}
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Filters Bar */}
          {showFilters && (
            <div className="px-6 pb-6">
              <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FunnelIcon className="w-5 h-5 text-purple-600" />
                    Filter Tasks
                  </h3>
                  <button
                    onClick={() => setFilters({
                      status: 'all',
                      priority: 'all',
                      assignee: 'all',
                      dateRange: 'all',
                      tags: [],
                      starred: false
                    })}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    Clear all
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
                    >
                      <option value="all">All Status</option>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Priority</label>
                    <select
                      value={filters.priority}
                      onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
                    >
                      <option value="all">All Priority</option>
                      {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Due Date</label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
                    >
                      <option value="all">All Dates</option>
                      <option value="today">Due Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Assignee</label>
                    <select
                      value={filters.assignee}
                      onChange={(e) => setFilters(prev => ({ ...prev, assignee: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
                    >
                      <option value="all">All Assignees</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="flex items-center gap-3 text-sm cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filters.starred}
                      onChange={(e) => setFilters(prev => ({ ...prev, starred: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-gray-700 group-hover:text-gray-900 transition-colors">Show starred tasks only</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Bulk Actions Bar */}
          {selectedTasks.size > 0 && (
            <div className="px-6 pb-6">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                      <CheckCircleIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-purple-900">
                        {selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} selected
                      </span>
                      <p className="text-xs text-purple-700">Choose an action to perform on selected tasks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleBulkAction('complete')}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-purple-300 rounded-lg text-purple-700 hover:bg-purple-50 transition-colors text-sm font-medium shadow-sm"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      Mark Complete
                    </button>
                    <button
                      onClick={() => handleBulkAction('assign')}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-purple-300 rounded-lg text-purple-700 hover:bg-purple-50 transition-colors text-sm font-medium shadow-sm"
                    >
                      <UserCircleIcon className="w-4 h-4" />
                      Assign
                    </button>
                    <button
                      onClick={() => handleBulkAction('delete')}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 rounded-lg text-red-700 hover:bg-red-50 transition-colors text-sm font-medium shadow-sm"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </button>
                    <button
                      onClick={() => setSelectedTasks(new Set())}
                      className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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
              {showDualView && (defaultViews.includes('list' as any) || defaultViews.includes('calendar' as any)) ? (
                // Dual View: List + Calendar
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <ListBulletIcon className="w-5 h-5 text-purple-600" />
                        Task List
                      </h3>
                    </div>
                    <div className="p-0">
                      {renderListView()}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-purple-600" />
                        Calendar View
                      </h3>
                    </div>
                    <div className="p-0">
                      <CalendarView
                        tasks={processedTasks}
                        onTaskSelect={onTaskSelect}
                        onCreateTask={(date) => onCreateClick?.()}
                        onTaskUpdate={(taskId, updates) => {
                          // Handle task updates
                          console.log('Task update:', taskId, updates);
                        }}
                        exchangeId={exchangeId}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Single View
                <>
                  {viewMode === 'kanban' && renderKanbanView()}
                  {viewMode === 'list' && renderListView()}
                  {viewMode === 'grid' && renderGridView()}
                  {viewMode === 'timeline' && renderTimelineView()}

                  {viewMode === 'calendar' && (
                    <CalendarView
                      tasks={processedTasks}
                      onTaskSelect={onTaskSelect}
                      onCreateTask={(date) => onCreateClick?.()}
                      onTaskUpdate={(taskId, updates) => {
                        // Handle task updates
                        console.log('Task update:', taskId, updates);
                      }}
                      exchangeId={exchangeId}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernTaskUI;