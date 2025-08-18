import React, { useState, useMemo } from 'react';
import { 
  PlusIcon,
  EllipsisHorizontalIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

import { Task, TaskStatus, TaskPriority } from '../../../types';
import { TaskCard } from './TaskCard';

interface KanbanColumn {
  id: string;
  title: string;
  status: string;
  color: string;
  limit?: number;
}

interface KanbanBoardViewProps {
  tasks: Task[];
  loading: boolean;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskCreate: (task: Task) => void;
  groupBy?: 'status' | 'priority' | 'assignee';
}

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  tasks,
  loading,
  onTaskUpdate,
  onTaskCreate,
  groupBy = 'status'
}) => {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedOver, setDraggedOver] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Define columns based on groupBy
  const columns: KanbanColumn[] = useMemo(() => {
    switch (groupBy) {
      case 'status':
        return [
          { id: 'PENDING', title: 'To Do', status: 'PENDING', color: 'bg-gray-100 border-gray-300' },
          { id: 'IN_PROGRESS', title: 'In Progress', status: 'IN_PROGRESS', color: 'bg-blue-100 border-blue-300', limit: 5 },
          { id: 'BLOCKED', title: 'Blocked', status: 'BLOCKED', color: 'bg-red-100 border-red-300' },
          { id: 'COMPLETED', title: 'Completed', status: 'COMPLETED', color: 'bg-green-100 border-green-300' }
        ];
      case 'priority':
        return [
          { id: 'HIGH', title: 'High Priority', status: 'HIGH', color: 'bg-red-100 border-red-300' },
          { id: 'MEDIUM', title: 'Medium Priority', status: 'MEDIUM', color: 'bg-yellow-100 border-yellow-300' },
          { id: 'LOW', title: 'Low Priority', status: 'LOW', color: 'bg-green-100 border-green-300' },
          { id: 'NONE', title: 'No Priority', status: '', color: 'bg-gray-100 border-gray-300' }
        ];
      default:
        return [
          { id: 'PENDING', title: 'To Do', status: 'PENDING', color: 'bg-gray-100 border-gray-300' },
          { id: 'IN_PROGRESS', title: 'In Progress', status: 'IN_PROGRESS', color: 'bg-blue-100 border-blue-300' },
          { id: 'COMPLETED', title: 'Completed', status: 'COMPLETED', color: 'bg-green-100 border-green-300' }
        ];
    }
  }, [groupBy]);

  // Group tasks by columns
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    
    columns.forEach(column => {
      groups[column.id] = [];
    });

    tasks.forEach(task => {
      let columnId = '';
      
      switch (groupBy) {
        case 'status':
          columnId = task.status || 'PENDING';
          break;
        case 'priority':
          columnId = task.priority || 'NONE';
          break;
        default:
          columnId = task.status || 'PENDING';
      }
      
      if (groups[columnId]) {
        groups[columnId].push(task);
      } else {
        // Fallback for unknown statuses
        groups[columns[0].id].push(task);
      }
    });

    return groups;
  }, [tasks, columns, groupBy]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOver(columnId);
  };

  const handleDragLeave = () => {
    setDraggedOver(null);
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDraggedOver(null);
    
    if (!draggedTask) return;

    const column = columns.find(c => c.id === columnId);
    if (!column) return;

    const updates: Partial<Task> = {};
    
    switch (groupBy) {
      case 'status':
        updates.status = column.status as TaskStatus;
        if (column.status === 'COMPLETED') {
          updates.completed_at = new Date().toISOString();
        } else if (updates.completed_at) {
          updates.completed_at = undefined;
        }
        break;
      case 'priority':
        updates.priority = (column.status || 'MEDIUM') as TaskPriority;
        break;
    }

    await onTaskUpdate(draggedTask.id, updates);
    setDraggedTask(null);
  };

  // Quick task creation
  const handleQuickCreate = async (columnId: string) => {
    if (!newTaskTitle.trim()) return;

    const column = columns.find(c => c.id === columnId);
    if (!column) return;

    const newTask: Partial<Task> = {
      title: newTaskTitle.trim(),
      description: '',
      priority: 'MEDIUM',
      exchange_id: '00000000-0000-0000-0000-000000000000', // Default exchange
    };

    switch (groupBy) {
      case 'status':
        newTask.status = column.status as TaskStatus;
        break;
      case 'priority':
        newTask.priority = (column.status || 'MEDIUM') as TaskPriority;
        newTask.status = 'PENDING';
        break;
    }

    try {
      // Note: This would need to be implemented with proper API call
      // onTaskCreate(newTask as Task);
      console.log('Creating task:', newTask);
      setNewTaskTitle('');
      setShowAddTask(null);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  // Get column statistics
  const getColumnStats = (columnTasks: Task[]) => {
    const total = columnTasks.length;
    const overdue = columnTasks.filter(t => {
      const dueDate = t.due_date || t.dueDate;
      return dueDate && new Date(dueDate) < new Date() && t.status !== 'COMPLETED';
    }).length;
    
    return { total, overdue };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-x-auto bg-gray-50 p-6">
      <div className="flex gap-6 min-w-max">
        {columns.map((column) => {
          const columnTasks = groupedTasks[column.id] || [];
          const stats = getColumnStats(columnTasks);
          const isOverLimit = column.limit && columnTasks.length > column.limit;
          const isDraggedOver = draggedOver === column.id;
          
          return (
            <div
              key={column.id}
              className={`flex-shrink-0 w-80 bg-white rounded-lg shadow-sm border-2 transition-all ${
                isDraggedOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className={`px-4 py-3 rounded-t-lg border-b ${column.color}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{column.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isOverLimit ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {stats.total}
                      {column.limit && ` / ${column.limit}`}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {stats.overdue > 0 && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {stats.overdue} overdue
                      </span>
                    )}
                    
                    <button
                      onClick={() => setShowAddTask(showAddTask === column.id ? null : column.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Create */}
                {showAddTask === column.id && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Enter task title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleQuickCreate(column.id);
                        } else if (e.key === 'Escape') {
                          setShowAddTask(null);
                          setNewTaskTitle('');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleQuickCreate(column.id)}
                        disabled={!newTaskTitle.trim()}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add Task
                      </button>
                      <button
                        onClick={() => {
                          setShowAddTask(null);
                          setNewTaskTitle('');
                        }}
                        className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Column Content */}
              <div className="p-4 space-y-3 min-h-[200px] max-h-[calc(100vh-200px)] overflow-y-auto">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <TaskCard
                      task={task}
                      selected={false}
                      onSelect={() => {}}
                      onUpdate={(updates) => onTaskUpdate(task.id, updates)}
                      onDelete={() => {}}
                      compact={true}
                      showExchange={false}
                    />
                  </div>
                ))}
                
                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-sm">
                      {isDraggedOver ? 'Drop task here' : 'No tasks'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};