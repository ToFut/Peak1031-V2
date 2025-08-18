import React, { useState } from 'react';
import { PracticalTaskList } from '../components/PracticalTaskList';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { Task } from '../../../types';
import { apiService } from '../../../services/api';

const ModernTasksPage: React.FC = () => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      await apiService.put(`/tasks/${taskId}`, updates);
      
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
      await apiService.delete(`/tasks/${taskId}`);
      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  return (
    <div className="h-full">
      <PracticalTaskList onTaskSelect={handleTaskSelect} />

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}
    </div>
  );
};

export default ModernTasksPage;