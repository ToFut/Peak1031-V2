import React, { useState } from 'react';
import { ModernTaskUI } from '../components/ModernTaskUI';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { TaskCreateModal } from '../components/TaskCreateModal';
import { Task } from '../../../types';
import { apiService } from '../../../services/api';
import { PlusIcon } from '@heroicons/react/24/outline';

const ModernTasksPage: React.FC = () => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      await apiService.updateTask(taskId, updates);
      // Refresh the task list
      setRefreshKey(prev => prev + 1);
      
      // Update selected task if it's the one being updated
      if (selectedTask?.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      await apiService.deleteTask(taskId);
      setSelectedTask(null);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleTaskCreated = (task: Task) => {
    setRefreshKey(prev => prev + 1);
    setShowCreateModal(false);
  };

  return (
    <div className="relative h-full">
      {/* Floating Create Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-8 right-8 z-40 flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all hover:shadow-xl"
      >
        <PlusIcon className="w-5 h-5" />
        <span className="font-medium">New Task</span>
      </button>

      <ModernTaskUI
        key={refreshKey}
        onTaskSelect={handleTaskSelect}
        onCreateClick={() => setShowCreateModal(true)}
        initialView="kanban"
      />

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}

      <TaskCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
};

export default ModernTasksPage;