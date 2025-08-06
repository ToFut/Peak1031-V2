import React from 'react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate?: string;
}

interface TaskBoardProps {
  tasks: Task[];
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, onTaskUpdate }) => {
  const columns = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
  
  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map(column => (
        <div key={column} className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">{column}</h3>
          <div className="space-y-3">
            {getTasksByStatus(column).map(task => (
              <div key={task.id} className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                <h4 className="font-medium text-gray-900">{task.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">Priority: {task.priority}</span>
                  {task.dueDate && (
                    <span className="text-xs text-gray-500">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}; 