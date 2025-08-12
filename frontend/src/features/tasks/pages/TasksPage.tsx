import React, { useState, useEffect, useMemo } from 'react';
import { Task } from '../../../types';
import { TaskBoard } from '../components/TaskBoard';
import EnhancedTaskManager from '../components/EnhancedTaskManager';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Cog6ToothIcon, 
  XMarkIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  Squares2X2Icon,
  ListBulletIcon
} from '@heroicons/react/24/outline';

interface Exchange {
  id: string;
  name: string;
  status: string;
}

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEnhancedManager, setShowEnhancedManager] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load both tasks and exchanges
      const [tasksResponse, exchangesResponse] = await Promise.all([
        apiService.getTasks(),
        apiService.getExchanges()
      ]);
      
      setTasks(Array.isArray(tasksResponse) ? tasksResponse : []);
      const exchangesData = (exchangesResponse as any)?.data || exchangesResponse;
      setExchanges(Array.isArray(exchangesData) ? exchangesData : []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load tasks and exchanges');
    } finally {
      setLoading(false);
    }
  };

  // Filter and group tasks
  const filteredAndGroupedTasks = useMemo(() => {
    let filtered = tasks;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by exchange
    if (selectedExchange !== 'all') {
      filtered = filtered.filter(task => task.exchange_id === selectedExchange);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    // Group by exchange
    const grouped = filtered.reduce((acc, task) => {
      const exchangeId = task.exchange_id || 'no-exchange';
      if (!acc[exchangeId]) {
        acc[exchangeId] = [];
      }
      acc[exchangeId].push(task);
      return acc;
    }, {} as Record<string, Task[]>);

    return grouped;
  }, [tasks, searchQuery, selectedExchange, filterStatus, filterPriority]);

  // Task statistics
  const taskStats = useMemo(() => {
    const allFilteredTasks = Object.values(filteredAndGroupedTasks).flat();
    return {
      total: allFilteredTasks.length,
      pending: allFilteredTasks.filter(t => t.status === 'PENDING').length,
      inProgress: allFilteredTasks.filter(t => t.status === 'IN_PROGRESS').length,
      completed: allFilteredTasks.filter(t => t.status === 'COMPLETED').length,
      overdue: allFilteredTasks.filter(t => 
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED'
      ).length
    };
  }, [filteredAndGroupedTasks]);

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      await apiService.updateTask(taskId, updates);
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));
    } catch (err: any) {
      console.error('Error updating task:', err);
    }
  };

  const handleTaskSelect = (task: Task) => {
    // TODO: Navigate to task details or open a modal
    console.log('Selected task:', task);
  };

  const getExchangeName = (exchangeId: string) => {
    if (exchangeId === 'no-exchange') return 'Unassigned Tasks';
    const exchange = exchanges.find(ex => ex.id === exchangeId);
    return exchange?.name || `Exchange ${exchangeId}`;
  };

  const handleBulkAction = (action: string, taskIds: string[]) => {
    // TODO: Implement bulk operations
    console.log('Bulk action:', action, 'for tasks:', taskIds);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="flex space-x-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-1 bg-gray-200 rounded-lg h-96"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tasks</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadData}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-sm border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Task Management</h1>
          
          {/* Search */}
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="flex items-center">
                <ClockIcon className="w-4 h-4 text-yellow-600 mr-2" />
                <div>
                  <div className="text-sm font-semibold text-yellow-700">{taskStats.pending}</div>
                  <div className="text-xs text-yellow-600">Pending</div>
                </div>
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-600 mr-2" />
                <div>
                  <div className="text-sm font-semibold text-red-700">{taskStats.overdue}</div>
                  <div className="text-xs text-red-600">Overdue</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Exchange List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            <button
              onClick={() => setSelectedExchange('all')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between ${
                selectedExchange === 'all' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
              }`}
            >
              <span className="font-medium">All Tasks</span>
              <span className="text-sm bg-gray-200 px-2 py-1 rounded-full">
                {taskStats.total}
              </span>
            </button>
            
            {exchanges.map(exchange => {
              const exchangeTasks = filteredAndGroupedTasks[exchange.id] || [];
              return (
                <button
                  key={exchange.id}
                  onClick={() => setSelectedExchange(exchange.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between ${
                    selectedExchange === exchange.id ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="truncate">{exchange.name}</span>
                  <span className="text-sm bg-gray-200 px-2 py-1 rounded-full">
                    {exchangeTasks.length}
                  </span>
                </button>
              );
            })}
            
            {/* Unassigned tasks */}
            {filteredAndGroupedTasks['no-exchange'] && (
              <button
                onClick={() => setSelectedExchange('no-exchange')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between ${
                  selectedExchange === 'no-exchange' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                }`}
              >
                <span className="text-gray-600">Unassigned Tasks</span>
                <span className="text-sm bg-gray-200 px-2 py-1 rounded-full">
                  {filteredAndGroupedTasks['no-exchange'].length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <FunnelIcon className="w-4 h-4" />
              <span>Filters</span>
            </button>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('board')}
                className={`p-2 rounded ${viewMode === 'board' ? 'bg-purple-100 text-purple-600' : 'text-gray-400'}`}
              >
                <Squares2X2Icon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-purple-100 text-purple-600' : 'text-gray-400'}`}
              >
                <ListBulletIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="space-y-3 border-t pt-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="all">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="all">All Priority</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowEnhancedManager(true)}
            className="w-full mt-3 flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Content Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedExchange === 'all' ? 'All Tasks' : getExchangeName(selectedExchange)}
              </h2>
              <p className="text-sm text-gray-500">
                {Object.values(filteredAndGroupedTasks).flat().length} tasks
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={loadData}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Task Content */}
        <div className="flex-1 p-6 overflow-auto">
          {selectedExchange === 'all' ? (
            // Show all exchanges
            <div className="space-y-8">
              {Object.entries(filteredAndGroupedTasks).map(([exchangeId, exchangeTasks]) => (
                <div key={exchangeId} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      {getExchangeName(exchangeId)}
                    </h3>
                    <p className="text-sm text-gray-500">{exchangeTasks.length} tasks</p>
                  </div>
                  <div className="p-6">
                    <TaskBoard 
                      tasks={exchangeTasks}
                      onTaskUpdate={handleTaskUpdate}
                      onTaskSelect={handleTaskSelect}
                      showExchangeInfo={false}
                      compact={true}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Show single exchange
            <TaskBoard 
              tasks={filteredAndGroupedTasks[selectedExchange] || []}
              onTaskUpdate={handleTaskUpdate}
              onTaskSelect={handleTaskSelect}
              showExchangeInfo={false}
            />
          )}
        </div>
      </div>

      {/* Enhanced Task Manager Modal */}
      {showEnhancedManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Enhanced Task Manager</h2>
              <button
                onClick={() => setShowEnhancedManager(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <EnhancedTaskManager />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;