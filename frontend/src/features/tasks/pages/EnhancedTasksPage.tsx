import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Squares2X2Icon, 
  ListBulletIcon, 
  CalendarIcon, 
  ChartBarIcon,
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  ViewColumnsIcon,
  QueueListIcon,
  FolderIcon,
  FlagIcon,
  UserIcon
} from '@heroicons/react/24/outline';

import { Task, User } from '../../../types';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';

// Import our enhanced components
import { EnhancedTaskListView } from '../components/EnhancedTaskListView';
import { KanbanBoardView } from '../components/KanbanBoardView';
import { TaskCalendarView } from '../components/TaskCalendarView';
import { TaskTimelineView } from '../components/TaskTimelineView';
import { SmartFilters } from '../components/SmartFilters';
import { TaskQuickCreate } from '../components/TaskQuickCreate';
import { KeyboardShortcuts } from '../components/KeyboardShortcuts';
import { EnhancedTaskDetailModal } from '../components/EnhancedTaskDetailModal';
import { EnhancedTaskCreateModal } from '../components/EnhancedTaskCreateModal';

type ViewType = 'list' | 'board' | 'calendar' | 'timeline';

interface TaskFilters {
  search?: string;
  status?: string[];
  priority?: string[];
  assignee?: string[];
  dateRange?: { start: string; end: string };
  tags?: string[];
  groupBy?: 'status' | 'priority' | 'assignee' | 'date' | 'none';
  sortBy?: 'due_date' | 'priority' | 'created_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}

interface ViewConfig {
  columns?: string[];
  grouping?: string;
  filters?: TaskFilters;
  autoRefresh?: boolean;
}

const EnhancedTasksPage: React.FC = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TaskFilters>({ groupBy: 'priority' });
  const [viewConfig, setViewConfig] = useState<ViewConfig>({});
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const quickCreateRef = useRef<HTMLDivElement>(null);

  // Load tasks with filters
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Apply filters
      if (filters.search) params.append('search', filters.search);
      if (filters.status?.length) {
        filters.status.forEach(status => params.append('status', status));
      }
      if (filters.priority?.length) {
        filters.priority.forEach(priority => params.append('priority', priority));
      }
      if (filters.assignee?.length) {
        filters.assignee.forEach(assignee => params.append('assignee', assignee));
      }
      if (filters.sortBy) params.append('sort_by', filters.sortBy);
      if (filters.sortOrder) params.append('sort_order', filters.sortOrder);
      
      const response = await apiService.get(`/tasks?${params.toString()}`);
      
      if (response.success) {
        setTasks(response.tasks || response.data || []);
      } else {
        console.error('Failed to load tasks:', response.error);
        setTasks([]);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcuts
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            searchInputRef.current?.focus();
            break;
          case 'n':
            e.preventDefault();
            setShowCreateModal(true);
            break;
          case 'f':
            e.preventDefault();
            setShowFilters(!showFilters);
            break;
          case '?':
            e.preventDefault();
            setShowKeyboardShortcuts(true);
            break;
          case '1':
            e.preventDefault();
            setCurrentView('list');
            break;
          case '2':
            e.preventDefault();
            setCurrentView('board');
            break;
          case '3':
            e.preventDefault();
            setCurrentView('calendar');
            break;
          case '4':
            e.preventDefault();
            setCurrentView('timeline');
            break;
        }
      }
      
      // Escape key
      if (e.key === 'Escape') {
        setShowQuickCreate(false);
        setShowFilters(false);
        setShowKeyboardShortcuts(false);
        setSelectedTasks([]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showFilters]);

  // Handle task updates
  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      // Find the task to get its exchangeId
      const task = tasks.find(t => t.id === taskId);
      const updateData = {
        ...updates,
        exchangeId: task?.exchange_id || task?.exchangeId // Include exchangeId for middleware
      };
      
      const response = await apiService.put(`/tasks/${taskId}`, updateData);
      if (response.success) {
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId ? { ...task, ...updates } : task
          )
        );
        
        // Update selected task if it's the one being updated
        if (selectedTask?.id === taskId) {
          setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
        }
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  // Handle task creation
  const handleTaskCreate = async (taskData: Partial<Task>) => {
    try {
      const response = await apiService.post('/tasks', taskData);
      if (response.success) {
        const newTask = response.data || response.task;
        setTasks(prevTasks => [newTask, ...prevTasks]);
        setShowQuickCreate(false);
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  // Handle task deletion
  const handleTaskDelete = async (taskId: string) => {
    try {
      await apiService.delete(`/tasks/${taskId}`);
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      
      // Close modal if deleted task was selected
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };
  
  // Handle task click
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  // Handle bulk actions
  const handleBulkAction = async (action: string, value?: any) => {
    const updates: Partial<Task> = {};
    
    switch (action) {
      case 'updateStatus':
        updates.status = value;
        break;
      case 'updatePriority':
        updates.priority = value;
        break;
      case 'delete':
        for (const taskId of selectedTasks) {
          await handleTaskDelete(taskId);
        }
        setSelectedTasks([]);
        return;
    }

    // Apply updates to selected tasks
    for (const taskId of selectedTasks) {
      await handleTaskUpdate(taskId, updates);
    }
    setSelectedTasks([]);
  };

  // View components map
  const viewComponents = {
    list: (
      <EnhancedTaskListView
        tasks={tasks}
        loading={loading}
        filters={filters}
        selectedTasks={selectedTasks}
        onTaskSelect={setSelectedTasks}
        onTaskClick={handleTaskClick}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleTaskDelete}
        onBulkAction={handleBulkAction}
        groupBy={filters.groupBy}
      />
    ),
    board: (
      <KanbanBoardView
        tasks={tasks}
        loading={loading}
        onTaskUpdate={handleTaskUpdate}
        onTaskCreate={handleTaskCreate}
        groupBy={filters.groupBy === 'date' || filters.groupBy === 'none' ? 'status' : (filters.groupBy || 'status')}
      />
    ),
    calendar: (
      <TaskCalendarView
        tasks={tasks}
        loading={loading}
        onTaskUpdate={handleTaskUpdate}
        onTaskCreate={handleTaskCreate}
      />
    ),
    timeline: (
      <TaskTimelineView
        tasks={tasks}
        loading={loading}
        onTaskUpdate={handleTaskUpdate}
        filters={filters}
      />
    )
  };

  // View options
  const viewOptions = [
    { key: 'list', label: 'List', icon: ListBulletIcon, shortcut: '⌘1' },
    { key: 'board', label: 'Board', icon: Squares2X2Icon, shortcut: '⌘2' },
    { key: 'calendar', label: 'Calendar', icon: CalendarIcon, shortcut: '⌘3' },
    { key: 'timeline', label: 'Timeline', icon: ChartBarIcon, shortcut: '⌘4' }
  ] as const;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search tasks... (⌘K)"
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {viewOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setCurrentView(option.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === option.key
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title={`${option.label} ${option.shortcut}`}
                >
                  <option.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              Filters
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <PlusIcon className="w-4 h-4" />
              New Task (⌘N)
            </button>

            <button
              onClick={() => setShowKeyboardShortcuts(true)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              title="Keyboard shortcuts (⌘?)"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Grouping Toggle for List View */}
        {currentView === 'list' && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-500">Group by:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setFilters(prev => ({ ...prev, groupBy: 'priority' }))}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filters.groupBy === 'priority'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Group by Priority"
              >
                <FlagIcon className="w-3 h-3" />
                Priority
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, groupBy: 'status' }))}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filters.groupBy === 'status'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Group by Status"
              >
                <QueueListIcon className="w-3 h-3" />
                Status
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, groupBy: 'assignee' }))}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filters.groupBy === 'assignee'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Group by Assignee"
              >
                <UserIcon className="w-3 h-3" />
                Assignee
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, groupBy: 'date' }))}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filters.groupBy === 'date'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Group by Due Date"
              >
                <CalendarIcon className="w-3 h-3" />
                Date
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, groupBy: 'none' }))}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filters.groupBy === 'none'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="No Grouping"
              >
                <ListBulletIcon className="w-3 h-3" />
                None
              </button>
            </div>
          </div>
        )}

        {/* Task Stats */}
        <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
          <span>{tasks.length} total tasks</span>
          <span>{tasks.filter(t => t.status === 'PENDING').length} pending</span>
          <span>{tasks.filter(t => t.status === 'IN_PROGRESS').length} in progress</span>
          <span>{tasks.filter(t => t.status === 'COMPLETED').length} completed</span>
          {selectedTasks.length > 0 && (
            <span className="text-blue-600 font-medium">
              {selectedTasks.length} selected
            </span>
          )}
        </div>
      </div>

      {/* Smart Filters */}
      {showFilters && (
        <SmartFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilters(false)}
          tasks={tasks}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {viewComponents[currentView]}
      </div>

      {/* Quick Create Modal */}
      {showQuickCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div ref={quickCreateRef} className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
            <TaskQuickCreate
              onTaskCreate={handleTaskCreate}
              onClose={() => setShowQuickCreate(false)}
            />
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      {showKeyboardShortcuts && (
        <KeyboardShortcuts onClose={() => setShowKeyboardShortcuts(false)} />
      )}
      
      {/* Task Detail Modal */}
      <EnhancedTaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
      />
      
      {/* Task Create Modal */}
      <EnhancedTaskCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleTaskCreate}
      />
    </div>
  );
};

export default EnhancedTasksPage;