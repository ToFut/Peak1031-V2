import React, { useState, useEffect } from 'react';
import { CheckIcon, ClockIcon, CalendarIcon, UserIcon, FlagIcon } from '@heroicons/react/24/outline';
import { Task } from '../../../types';
import { QuickTaskCreate } from './QuickTaskCreate';
import { TaskFilters } from './TaskFilters';
import { BulkActions } from './BulkActions';
import { apiService } from '../../../services/api';

interface PracticalTaskListProps {
  exchangeId?: string;
  onTaskSelect?: (task: Task) => void;
}

export const PracticalTaskList: React.FC<PracticalTaskListProps> = ({ 
  exchangeId, 
  onTaskSelect 
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [sortBy, setSortBy] = useState('due_date');

  useEffect(() => {
    loadTasks();
  }, [exchangeId, filters, sortBy]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (exchangeId) params.append('exchange_id', exchangeId);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.assignee === 'me') params.append('assigned_to_me', 'true');
      if (sortBy) params.append('sort_by', sortBy);

      const response = await apiService.get(`/tasks?${params.toString()}`);
      setTasks(response.tasks || response.data || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    try {
      const newStatus = completed ? 'COMPLETED' : 'PENDING';
      await apiService.put(`/tasks/${taskId}`, { status: newStatus });
      
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleBulkAction = async (action: string, value?: any) => {
    const updates: any = {};
    
    switch (action) {
      case 'updateStatus':
        updates.status = value;
        break;
      case 'updatePriority':
        updates.priority = value;
        break;
      case 'delete':
        for (const taskId of selectedTasks) {
          await apiService.delete(`/tasks/${taskId}`);
        }
        setTasks(prevTasks => prevTasks.filter(task => !selectedTasks.includes(task.id)));
        setSelectedTasks([]);
        return;
    }

    // Bulk update
    for (const taskId of selectedTasks) {
      await apiService.put(`/tasks/${taskId}`, updates);
    }
    
    setTasks(prevTasks =>
      prevTasks.map(task =>
        selectedTasks.includes(task.id) ? { ...task, ...updates } : task
      )
    );
    setSelectedTasks([]);
  };

  const handleTaskCreated = (newTask: Task) => {
    setTasks(prevTasks => [newTask, ...prevTasks]);
  };

  const handleSelectTask = (taskId: string, selected: boolean) => {
    if (selected) {
      setSelectedTasks(prev => [...prev, taskId]);
    } else {
      setSelectedTasks(prev => prev.filter(id => id !== taskId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTasks(filteredTasks.map(task => task.id));
    } else {
      setSelectedTasks([]);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const dueDate = task.due_date || task.dueDate;
    
    if (filters.timeframe === 'overdue') {
      return dueDate && new Date(dueDate) < new Date() && task.status !== 'COMPLETED';
    }
    if (filters.timeframe === 'today') {
      const today = new Date().toDateString();
      return dueDate && new Date(dueDate).toDateString() === today;
    }
    if (filters.timeframe === 'thisWeek') {
      if (!dueDate) return false;
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return new Date(dueDate) <= weekFromNow;
    }
    return true;
  });

  const taskCounts = {
    total: tasks.length,
    overdue: tasks.filter(t => {
      const dueDate = t.due_date || t.dueDate;
      return dueDate && new Date(dueDate) < new Date() && t.status !== 'COMPLETED';
    }).length,
    today: tasks.filter(t => {
      const dueDate = t.due_date || t.dueDate;
      return dueDate && new Date(dueDate).toDateString() === new Date().toDateString();
    }).length,
    thisWeek: tasks.filter(t => {
      const dueDate = t.due_date || t.dueDate;
      if (!dueDate) return false;
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return new Date(dueDate) <= weekFromNow;
    }).length,
    mine: tasks.filter(t => t.assignedTo || t.assigned_to).length // Simplified - should check current user
  };

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600 bg-red-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-50';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50';
      case 'BLOCKED': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
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
    <div className="bg-gray-50 min-h-screen">
      <TaskFilters 
        activeFilters={filters}
        onFilterChange={setFilters}
        taskCounts={taskCounts}
      />
      
      {selectedTasks.length > 0 && (
        <BulkActions
          selectedTasks={selectedTasks}
          onBulkAction={handleBulkAction}
          onCancel={() => setSelectedTasks([])}
        />
      )}

      <div className="p-4">
        {/* Quick Create */}
        <div className="mb-4">
          <QuickTaskCreate 
            exchangeId={exchangeId}
            onTaskCreated={handleTaskCreated}
          />
        </div>

        {/* Sort Options */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {tasks.length > 1 && (
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Select all
              </label>
            )}
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="due_date">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="status">Sort by Status</option>
            <option value="created_at">Sort by Created</option>
          </select>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const isSelected = selectedTasks.includes(task.id);
            const dueDate = task.due_date || task.dueDate;
            const isOverdue = dueDate && new Date(dueDate) < new Date() && task.status !== 'COMPLETED';
            
            return (
              <div
                key={task.id}
                className={`bg-white rounded-lg border p-4 transition-all hover:shadow-sm ${
                  isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                } ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleSelectTask(task.id, e.target.checked)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => handleTaskToggle(task.id, task.status !== 'COMPLETED')}
                        className={`p-1 rounded-full transition-colors ${
                          task.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                        }`}
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      
                      <h3
                        className={`font-medium text-gray-900 cursor-pointer hover:text-blue-600 ${
                          task.status === 'COMPLETED' ? 'line-through text-gray-500' : ''
                        }`}
                        onClick={() => onTaskSelect?.(task)}
                      >
                        {task.title}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {(task.due_date || task.dueDate) && (
                        <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
                          <CalendarIcon className="w-4 h-4" />
                          <span>{formatDate(task.due_date || task.dueDate!)}</span>
                        </div>
                      )}
                      
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority || 'MEDIUM')}`}>
                        {task.priority || 'Medium'}
                      </div>
                      
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status || 'PENDING')}`}>
                        {task.status === 'PENDING' ? 'To Do' : 
                         task.status === 'IN_PROGRESS' ? 'In Progress' : 
                         task.status || 'To Do'}
                      </div>
                      
                      {(task.assignedUser?.first_name || task.assignedTo) && (
                        <div className="flex items-center gap-1">
                          <UserIcon className="w-4 h-4" />
                          <span>
                            {task.assignedUser 
                              ? `${task.assignedUser.first_name} ${task.assignedUser.last_name}`.trim()
                              : task.assignedTo || task.assigned_to
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredTasks.length === 0 && (
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
    </div>
  );
};