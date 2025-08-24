import React, { useState, useEffect, useMemo } from 'react';
import { Task } from '../../../types';
import { TaskBoard } from '../components/TaskBoard';
import EnhancedTaskManager from '../components/EnhancedTaskManager';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { useRealTimeTasks } from '../../../hooks/useRealTimeTasks';
import { SearchableDropdown } from '../../../components/ui/SearchableDropdown';
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
  ListBulletIcon,
  FlagIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  ChevronDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

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

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEnhancedManager, setShowEnhancedManager] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'exchange' | 'user'>('all');
  const [exchangeSearchQuery, setExchangeSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showExchangeDropdown, setShowExchangeDropdown] = useState(false);
  const { user } = useAuth();

  // Real-time task updates
  useRealTimeTasks({
    onTaskCreated: (event) => {
      console.log('📋 New task created:', event);
      loadData(); // Reload all tasks
    },
    onTaskUpdated: (event) => {
      console.log('📋 Task updated:', event);
      loadData(); // Reload all tasks
    },
    onTaskDeleted: (event) => {
      console.log('📋 Task deleted:', event);
      loadData(); // Reload all tasks
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.exchange-dropdown')) {
        setShowExchangeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load tasks, exchanges, and users
      const [tasksResponse, exchangesResponse, usersResponse] = await Promise.all([
        apiService.getTasks(),
        apiService.getExchanges(),
        apiService.getUsers()
      ]);
      
      setTasks(Array.isArray(tasksResponse) ? tasksResponse : []);
      const exchangesData = (exchangesResponse as any)?.data || exchangesResponse;
      setExchanges(Array.isArray(exchangesData) ? exchangesData : []);
      const usersData = (usersResponse as any)?.data || usersResponse;
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load tasks and exchanges');
    } finally {
      setLoading(false);
    }
  };

  // Filter exchanges based on search
  const filteredExchanges = useMemo(() => {
    if (!exchangeSearchQuery) return exchanges;
    return exchanges.filter(exchange => 
      exchange.name.toLowerCase().includes(exchangeSearchQuery.toLowerCase())
    );
  }, [exchanges, exchangeSearchQuery]);

  // Get unique assignees with user names for filter dropdown
  const uniqueAssignees = useMemo(() => {
    const assignees = new Map<string, { id: string; name: string; email: string }>();
    
    tasks.forEach(task => {
      const assigneeId = task.assignedTo || task.assigned_to;
      if (assigneeId) {
        const user = users.find(u => u.id === assigneeId);
        if (user) {
          assignees.set(assigneeId, {
            id: assigneeId,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email
          });
        } else {
          // Fallback to ID if user not found
          assignees.set(assigneeId, {
            id: assigneeId,
            name: assigneeId,
            email: ''
          });
        }
      }
    });
    
    return Array.from(assignees.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks, users]);

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

  // Filter and group tasks
  const filteredAndGroupedTasks = useMemo(() => {
    let filtered = tasks;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(task => {
        const searchLower = searchQuery.toLowerCase();
        
        // Search in task title and description
        const titleMatch = task.title.toLowerCase().includes(searchLower);
        const descMatch = task.description?.toLowerCase().includes(searchLower);
        
        // Search by exchange name
        const exchangeMatch = searchType === 'all' || searchType === 'exchange' ? 
          getExchangeName(task.exchange_id || '').toLowerCase().includes(searchLower) : false;
        
        // Search by user name
        const userMatch = searchType === 'all' || searchType === 'user' ? 
          getUserName(task.assignedTo || task.assigned_to || '').toLowerCase().includes(searchLower) : false;
        
        return titleMatch || descMatch || exchangeMatch || userMatch;
      });
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

    // Filter by assignee
    if (filterAssignee !== 'all') {
      if (filterAssignee === '') {
        // Show unassigned tasks
        filtered = filtered.filter(task => 
          !task.assignedTo && !task.assigned_to
        );
      } else {
        // Show tasks assigned to specific person
        filtered = filtered.filter(task => 
          (task.assignedTo || task.assigned_to) === filterAssignee
        );
      }
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
  }, [tasks, searchQuery, searchType, selectedExchange, filterStatus, filterPriority, filterAssignee, users, exchanges]);

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
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900 mb-3">Task Management</h1>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-yellow-50 p-2 rounded-lg">
              <div className="flex items-center">
                <ClockIcon className="w-3 h-3 text-yellow-600 mr-1" />
                <div>
                  <div className="text-xs font-semibold text-yellow-700">{taskStats.pending}</div>
                  <div className="text-xs text-yellow-600">Pending</div>
                </div>
              </div>
            </div>
            <div className="bg-red-50 p-2 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-3 h-3 text-red-600 mr-1" />
                <div>
                  <div className="text-xs font-semibold text-red-700">{taskStats.overdue}</div>
                  <div className="text-xs text-red-600">Overdue</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Exchange List */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Exchange Search */}
          <div className="mb-4">
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search exchanges..."
                value={exchangeSearchQuery}
                onChange={(e) => setExchangeSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

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
            
            {filteredExchanges.map(exchange => {
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

            {/* No exchanges found message */}
            {exchangeSearchQuery && filteredExchanges.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No exchanges found matching "{exchangeSearchQuery}"
              </div>
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
                <SearchableDropdown
                  options={[
                    { id: 'all', label: 'All Status', icon: ClockIcon },
                    { id: 'PENDING', label: 'Pending', icon: ClockIcon },
                    { id: 'IN_PROGRESS', label: 'In Progress', icon: ExclamationTriangleIcon },
                    { id: 'COMPLETED', label: 'Completed', icon: CheckIcon }
                  ]}
                  value={filterStatus}
                  onChange={setFilterStatus}
                  placeholder="Select status..."
                  searchPlaceholder="Search status..."
                  className="text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                <SearchableDropdown
                  options={[
                    { id: 'all', label: 'All Priority', icon: FlagIcon },
                    { id: 'HIGH', label: 'High Priority', icon: ExclamationTriangleIcon },
                    { id: 'MEDIUM', label: 'Medium Priority', icon: FlagIcon },
                    { id: 'LOW', label: 'Low Priority', icon: FlagIcon }
                  ]}
                  value={filterPriority}
                  onChange={setFilterPriority}
                  placeholder="Select priority..."
                  searchPlaceholder="Search priority..."
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
                <SearchableDropdown
                  options={[
                    { id: 'all', label: 'All Assignees', icon: UserCircleIcon },
                    { id: '', label: 'Unassigned', icon: UserCircleIcon },
                    ...uniqueAssignees.map(assignee => ({
                      id: assignee.id,
                      label: assignee.name,
                      icon: UserCircleIcon
                    }))
                  ]}
                  value={filterAssignee}
                  onChange={setFilterAssignee}
                  placeholder="Select assignee..."
                  searchPlaceholder="Search assignees..."
                  className="text-sm"
                />
              </div>
            </div>
          )}


        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Content Header */}
        <div className="bg-white px-6 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              {/* Exchange Filter Button */}
              <div className="relative exchange-dropdown">
                <button
                  onClick={() => {
                    console.log('Dropdown clicked, current state:', showExchangeDropdown);
                    setShowExchangeDropdown(!showExchangeDropdown);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors text-sm"
                >
                  <BuildingOfficeIcon className="w-4 h-4" />
                  <span className="max-w-32 truncate">
                    {selectedExchange === 'all' ? 'All Exchanges' : getExchangeName(selectedExchange)}
                  </span>
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
                
                {/* Exchange/User Dropdown */}
                {showExchangeDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10 max-h-96 overflow-y-auto">
                    <div className="p-3">
                      {/* Search within dropdown */}
                      <div className="mb-3">
                        <div className="relative">
                          <MagnifyingGlassIcon className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search exchanges..."
                            value={exchangeSearchQuery}
                            onChange={(e) => setExchangeSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                      {/* All Exchanges option */}
                      <button
                        onClick={() => {
                          setSelectedExchange('all');
                          setShowExchangeDropdown(false);
                          setExchangeSearchQuery('');
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                          selectedExchange === 'all' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        📋 All Exchanges
                      </button>
                      
                      {/* Divider */}
                      <div className="border-t border-gray-200 my-2"></div>
                      
                      {/* Exchange list with better formatting */}
                      <div className="space-y-1">
                        {filteredExchanges.slice(0, 8).map(exchange => (
                          <button
                            key={exchange.id}
                            onClick={() => {
                              setSelectedExchange(exchange.id);
                              setShowExchangeDropdown(false);
                              setExchangeSearchQuery('');
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                              selectedExchange === exchange.id ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate">{exchange.name}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                {filteredAndGroupedTasks[exchange.id]?.length || 0} tasks
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      {/* Show more indicator */}
                      {filteredExchanges.length > 8 && (
                        <div className="text-xs text-gray-500 px-3 py-2 mt-2 border-t border-gray-100">
                          +{filteredExchanges.length - 8} more exchanges
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Search Field */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => {
                      console.log('Search query changed:', e.target.value);
                      setSearchQuery(e.target.value);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            {/* Right side actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={loadData}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              
              {/* New Task Button */}
              <button
                onClick={() => {
                  console.log('New Task button clicked');
                  setShowEnhancedManager(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span>New Task</span>
              </button>
            </div>
          </div>
          
          {/* Task count and search info */}
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              {Object.values(filteredAndGroupedTasks).flat().length} tasks
              {searchQuery && ` matching "${searchQuery}"`}
              {selectedExchange !== 'all' && ` in ${getExchangeName(selectedExchange)}`}
            </p>
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
                      users={users}
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
              users={users}
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
              <EnhancedTaskManager 
                exchangeId={selectedExchange !== 'all' ? selectedExchange : undefined}
                exchangeName={selectedExchange !== 'all' ? getExchangeName(selectedExchange) : undefined}
                onTaskCreated={() => {
                  console.log('Task created in EnhancedTaskManager');
                  setShowEnhancedManager(false);
                  loadData();
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;