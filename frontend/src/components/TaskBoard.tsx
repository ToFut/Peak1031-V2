import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';

interface TaskBoardProps {
  tasks: Task[];
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskSelect?: (task: Task) => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, onTaskUpdate, onTaskSelect }) => {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const columns = [
    { id: 'PENDING' as TaskStatus, title: 'Pending', color: 'bg-yellow-50 border-yellow-200' },
    { id: 'IN_PROGRESS' as TaskStatus, title: 'In Progress', color: 'bg-blue-50 border-blue-200' },
    { id: 'COMPLETED' as TaskStatus, title: 'Completed', color: 'bg-green-50 border-green-200' }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedTask && onTaskUpdate) {
      onTaskUpdate(draggedTask, { status });
    }
    setDraggedTask(null);
  };

  const filteredTasks = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <div className="flex space-x-4 h-full">
      {columns.map(column => (
        <div
          key={column.id}
          className={`flex-1 ${column.color} border rounded-lg p-4 min-h-[500px]`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <h3 className="font-semibold text-gray-900 mb-4">{column.title}</h3>
          
          <div className="space-y-3">
            {filteredTasks(column.id).map(task => (
              <div
                key={task.id}
                className="bg-white rounded-lg shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow"
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onClick={() => onTaskSelect?.(task)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                
                {task.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {task.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  {task.dueDate && (
                    <span>
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  
                  {task.assignedUser && (
                    <span>
                      {task.assignedUser.firstName} {task.assignedUser.lastName}
                    </span>
                  )}
                </div>
                
                {task.exchange && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      Exchange: {task.exchange.name}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}; 