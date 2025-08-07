import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { TaskBoard } from '../features/tasks/components/TaskBoard';
import { apiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Note: Auto-login removed - users should use proper login flow
      
      const response = await apiService.getTasks();
      setTasks(Array.isArray(response) ? response : []);
    } catch (err: any) {
      console.error('Error loading tasks:', err);
      setError(err.message || 'Failed to load tasks from Practice Partner database');
    } finally {
      setLoading(false);
    }
  };

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
    // Could navigate to task details or open a modal
    console.log('Selected task:', task);
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
              onClick={loadTasks}
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
    <div className="p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
        <div className="text-sm text-gray-500">
          {tasks.length} total tasks
        </div>
      </div>

      <TaskBoard 
        tasks={tasks}
        onTaskUpdate={handleTaskUpdate}
        onTaskSelect={handleTaskSelect}
      />
    </div>
  );
};

export default TasksPage;