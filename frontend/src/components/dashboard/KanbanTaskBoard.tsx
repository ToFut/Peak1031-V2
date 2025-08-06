import React, { useState } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CalendarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: string;
  assignedUser?: { first_name: string; last_name: string };
  dueDate?: string;
  exchangeId?: string;
  exchange?: { name: string };
}

interface KanbanTaskBoardProps {
  tasks: Task[];
  onTaskUpdate?: (taskId: string, newStatus: string) => void;
  onTaskReassign?: (taskId: string, newAssignee: string) => void;
}

const KanbanTaskBoard: React.FC<KanbanTaskBoardProps> = ({ 
  tasks, 
  onTaskUpdate, 
  onTaskReassign 
}) => {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const columns = [
    { id: 'TODO', title: 'Todo', color: 'blue', tasks: tasks.filter(t => t.status === 'TODO') },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'yellow', tasks: tasks.filter(t => t.status === 'IN_PROGRESS') },
    { id: 'COMPLETED', title: 'Completed', color: 'green', tasks: tasks.filter(t => t.status === 'COMPLETED') }
  ];

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedTask && onTaskUpdate) {
      onTaskUpdate(draggedTask, newStatus);
    }
    setDraggedTask(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => (
    <div
      draggable
      onDragStart={() => handleDragStart(task.id)}
      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-move mb-3"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900 text-sm leading-tight">{task.title}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
      </div>
      
      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}

      {task.exchange && (
        <div className="flex items-center mb-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-xs text-gray-600 truncate">{task.exchange.name}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          {task.assignedUser && (
            <div className="flex items-center space-x-1">
              <UserIcon className="w-3 h-3" />
              <span className="truncate max-w-20">
                {task.assignedUser.first_name[0]}.{task.assignedUser.last_name}
              </span>
            </div>
          )}
        </div>
        
        {task.dueDate && (
          <div className={`flex items-center space-x-1 ${isOverdue(task.dueDate) ? 'text-red-600' : ''}`}>
            <CalendarIcon className="w-3 h-3" />
            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            {isOverdue(task.dueDate) && <ExclamationTriangleIcon className="w-3 h-3" />}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Task Coordination Center</h2>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span className="flex items-center">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
            Overdue: {tasks.filter(t => isOverdue(t.dueDate) && t.status !== 'COMPLETED').length}
          </span>
          <span className="flex items-center">
            <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
            Due Today: {tasks.filter(t => {
              if (!t.dueDate || t.status === 'COMPLETED') return false;
              const today = new Date().toDateString();
              return new Date(t.dueDate).toDateString() === today;
            }).length}
          </span>
          <span className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            On Track: {tasks.filter(t => t.status !== 'COMPLETED' && !isOverdue(t.dueDate)).length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => (
          <div key={column.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`font-medium text-${column.color}-900 flex items-center`}>
                {column.id === 'TODO' && <ClockIcon className="w-4 h-4 mr-2 text-blue-600" />}
                {column.id === 'IN_PROGRESS' && <ArrowRightIcon className="w-4 h-4 mr-2 text-yellow-600" />}
                {column.id === 'COMPLETED' && <CheckCircleIcon className="w-4 h-4 mr-2 text-green-600" />}
                {column.title}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${column.color}-100 text-${column.color}-800`}>
                {column.tasks.length}
              </span>
            </div>

            <div
              className={`min-h-96 p-4 rounded-lg border-2 border-dashed border-${column.color}-200 bg-${column.color}-50/30`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {column.tasks.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-400">
                  <div className="text-center">
                    <ClockIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tasks</p>
                  </div>
                </div>
              ) : (
                column.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Task Dependencies */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-3">Task Dependencies</h3>
        <div className="text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>EX-001: Legal Review → Documentation → Client Review → Closing</span>
          </div>
          <div className="flex items-center space-x-4 mt-2">
            <span className="flex items-center">
              <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
              BLOCKED
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              READY
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
              WAITING
            </span>
          </div>
          <div className="mt-2 text-red-600 text-xs">
            🚨 Critical Path Alert: Legal Review delay affects 3 downstream tasks
          </div>
        </div>
      </div>
    </div>
  );
};

export default KanbanTaskBoard;