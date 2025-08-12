import React, { useState } from 'react';
import { ModernTaskUI } from '../components/ModernTaskUI';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { TaskCreateModal } from '../components/TaskCreateModal';
import { Task } from '../../../types';
import { apiService } from '../../../services/api';

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
    <>
      <ModernTaskUI
        key={refreshKey}
        onTaskSelect={handleTaskSelect}
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
    </>
  );
};

export default ModernTasksPage;