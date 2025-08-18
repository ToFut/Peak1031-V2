import React from 'react';
import { CheckSquare, Clock, AlertCircle } from 'lucide-react';
import { Task } from '../../../types';
import { formatDate, isOverdue } from '../../../utils/date.utils';

interface TasksListProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskUpdate?: () => Promise<void>;
}

export const TasksList: React.FC<TasksListProps> = ({ tasks, onTaskClick, onTaskUpdate }) => {
  const sortedTasks = [...tasks].sort((a, b) => {
    // Sort by status (pending first) then by due date
    if (a.status !== b.status) {
      return a.status === 'PENDING' ? -1 : 1;
    }
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return 0;
  });

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No tasks found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedTasks.map((task) => {
        const overdue = task.dueDate && isOverdue(task.dueDate) && task.status === 'PENDING';
        
        return (
          <div
            key={task.id}
            onClick={() => onTaskClick?.(task)}
            className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
              onTaskClick ? 'cursor-pointer' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className={`mt-1 ${
                  task.status === 'COMPLETED' ? 'text-green-600' :
                  overdue ? 'text-red-600' :
                  'text-gray-400'
                }`}>
                  {task.status === 'COMPLETED' ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : overdue ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${
                    task.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-900'
                  }`}>
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      task.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                      task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.priority}
                    </span>
                    {task.dueDate && (
                      <span className={overdue ? 'text-red-600 font-medium' : ''}>
                        Due {formatDate(task.dueDate)}
                      </span>
                    )}
                    {task.assignedUser && (
                      <span>Assigned to {task.assignedUser.first_name} {task.assignedUser.last_name}</span>
                    )}
                  </div>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {task.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};