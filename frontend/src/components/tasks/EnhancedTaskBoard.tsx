/**
 * Enhanced Task Board with Drag-Drop, AI Suggestions, and Smart Features
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  PlusIcon,
  SparklesIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserIcon,
  DocumentTextIcon,
  LightBulbIcon,
  EyeIcon,
  FunnelIcon as FilterIcon
} from '@heroicons/react/24/outline';
import { useEnhancedTasks } from '../../hooks/useEnhancedTasks';
import { SmartTaskCreationModal } from './SmartTaskCreationModal';
import { TaskDetailModal } from './TaskDetailModal';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  assigned_to?: string;
  assignee_name?: string;
  due_date?: string;
  created_at: string;
  metadata?: any;
}

interface TaskColumn {
  id: string;
  title: string;
  color: string;
  icon: React.ComponentType<any>;
  tasks: Task[];
}

interface EnhancedTaskBoardProps {
  exchangeId?: string;
  showCompact?: boolean;
  allowCreation?: boolean;
}

const TaskCard: React.FC<{ 
  task: Task; 
  isDragging?: boolean;
  onQuickAction?: (task: Task, action: string) => void;
  compact?: boolean;
}> = ({ task, isDragging, onQuickAction, compact = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || sortableIsDragging ? 0.5 : 1
  };

  const priorityColors = {
    critical: 'border-l-red-500 bg-gradient-to-r from-red-50 to-white',
    high: 'border-l-orange-400 bg-gradient-to-r from-orange-50 to-white',
    medium: 'border-l-yellow-400 bg-gradient-to-r from-yellow-50 to-white',
    low: 'border-l-green-400 bg-gradient-to-r from-green-50 to-white'
  };

  const categoryIcons: Record<string, React.ComponentType<any>> = {
    document: DocumentTextIcon,
    communication: UserIcon,
    deadline: ClockIcon,
    review: CheckCircleIcon,
    property: LightBulbIcon,
    coordination: UserIcon,
    general: ExclamationTriangleIcon
  };

  const CategoryIcon = categoryIcons[task.category] || ExclamationTriangleIcon;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const hasAutoActions = task.metadata?.auto_actions?.length > 0;

  // Truncate long titles for compact view
  const displayTitle = compact && task.title?.length > 50 
    ? `${task.title.substring(0, 50)}...` 
    : task.title;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg border-l-4 shadow-sm hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing group ${
        priorityColors[task.priority] || 'border-l-gray-300 bg-gray-50'
      } ${isOverdue ? 'ring-2 ring-red-400 ring-opacity-50' : ''} ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      {/* Header - more compact */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <CategoryIcon className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-gray-500 flex-shrink-0`} />
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
            task.priority === 'critical' ? 'bg-red-100 text-red-800' :
            task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {compact ? task.priority[0].toUpperCase() : task.priority}
          </span>
        </div>
        
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {hasAutoActions && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction?.(task, 'auto_complete');
              }}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Auto-complete actions available"
            >
              <SparklesIcon className="h-3 w-3" />
            </button>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickAction?.(task, 'view');
            }}
            className="p-1 text-gray-500 hover:bg-gray-100 rounded transition-colors"
            title="View details"
          >
            <EyeIcon className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className={`font-medium text-gray-900 mb-2 ${compact ? 'text-sm' : 'text-base'} line-clamp-2 leading-tight`} title={task.title}>
        {displayTitle}
      </h3>

      {/* Description - only show if not compact or if compact but short */}
      {task.description && (!compact || task.description.length < 100) && (
        <p className={`text-gray-600 mb-3 line-clamp-2 ${compact ? 'text-xs' : 'text-sm'}`}>
          {compact && task.description.length > 80 
            ? `${task.description.substring(0, 80)}...`
            : task.description}
        </p>
      )}

      {/* Footer Info */}
      <div className={`flex items-center justify-between text-gray-500 ${compact ? 'text-xs' : 'text-xs'}`}>
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {task.assignee_name && !compact && (
            <div className="flex items-center space-x-1">
              <UserIcon className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{task.assignee_name}</span>
            </div>
          )}
          
          {task.due_date && (
            <div className={`flex items-center space-x-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
              <ClockIcon className="h-3 w-3 flex-shrink-0" />
              <span>
                {compact 
                  ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : new Date(task.due_date).toLocaleDateString()
                }
                {isOverdue && !compact && ' (Overdue)'}
              </span>
            </div>
          )}
        </div>

        {/* AI indicator */}
        {task.metadata?.confidence_score && (
          <div className="flex items-center space-x-1 flex-shrink-0">
            <SparklesIcon className="h-3 w-3 text-blue-500" />
            <span className="text-xs text-blue-600">
              {Math.round(task.metadata.confidence_score * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Quick Complete Button - only visible on hover */}
      {task.status !== 'completed' && (
        <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickAction?.(task, 'complete');
            }}
            className="w-full py-1.5 px-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors flex items-center justify-center space-x-1 border border-green-200"
          >
            <CheckCircleIcon className="h-3 w-3" />
            <span>Mark Complete</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const EnhancedTaskBoard: React.FC<EnhancedTaskBoardProps> = ({
  exchangeId,
  showCompact = false,
  allowCreation = true
}) => {
  const {
    tasks,
    loading,
    error,
    suggestions,
    updateTask,
    loadTasks,
    getAutoCompleteActions,
    executeAutoCompleteAction
  } = useEnhancedTasks(exchangeId);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Define columns
  const columns: TaskColumn[] = useMemo(() => [
    {
      id: 'pending',
      title: 'Pending',
      color: 'bg-gray-100 border-gray-300',
      icon: ClockIcon,
      tasks: []
    },
    {
      id: 'in_progress',
      title: 'In Progress', 
      color: 'bg-blue-100 border-blue-300',
      icon: SparklesIcon,
      tasks: []
    },
    {
      id: 'completed',
      title: 'Completed',
      color: 'bg-green-100 border-green-300',
      icon: CheckCircleIcon,
      tasks: []
    }
  ], []);

  // Filter and organize tasks by column
  const organizedTasks = useMemo(() => {
    let filteredTasks = tasks;

    // Apply filters
    if (filterPriority) {
      filteredTasks = filteredTasks.filter(task => task.priority === filterPriority);
    }
    if (filterAssignee) {
      filteredTasks = filteredTasks.filter(task => task.assigned_to === filterAssignee);
    }

    // Organize by status
    const organized = columns.map(column => ({
      ...column,
      tasks: filteredTasks.filter(task => {
        const status = task.status === 'PENDING' ? 'pending' :
                     task.status === 'IN_PROGRESS' ? 'in_progress' :
                     task.status === 'COMPLETED' ? 'completed' :
                     task.status;
        return status === column.id;
      })
    }));

    return organized;
  }, [tasks, columns, filterPriority, filterAssignee]);

  // Task statistics
  const taskStats = useMemo(() => {
    const pending = tasks.filter(t => t.status === 'pending' || t.status === 'PENDING').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress' || t.status === 'IN_PROGRESS').length;
    const completed = tasks.filter(t => t.status === 'completed' || t.status === 'COMPLETED').length;
    const overdue = tasks.filter(t => 
      t.due_date && 
      new Date(t.due_date) < new Date() && 
      (t.status === 'pending' || t.status === 'in_progress' || t.status === 'PENDING' || t.status === 'IN_PROGRESS')
    ).length;

    return { pending, inProgress, completed, overdue, total: tasks.length };
  }, [tasks]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task as Task;
    setActiveTask(task);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTask(null);

    if (!over) return;

    const task = active.data.current?.task as Task;
    const newStatus = over.id as string;

    if (task.status !== newStatus) {
      try {
        await updateTask(task.id, { 
          status: newStatus.toUpperCase(),
          ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {})
        });
      } catch (err) {
        console.error('Failed to update task status:', err);
      }
    }
  };

  // Handle quick actions
  const handleQuickAction = async (task: Task, action: string) => {
    switch (action) {
      case 'complete':
        try {
          await updateTask(task.id, { 
            status: 'COMPLETED',
            completed_at: new Date().toISOString()
          });
        } catch (error) {
          console.error('Failed to complete task:', error);
        }
        break;
      case 'view':
        setSelectedTask(task);
        setShowTaskDetail(true);
        break;
      case 'auto_complete':
        try {
          const autoActions = await getAutoCompleteActions(task.id);
          if (autoActions?.autoActions?.length > 0) {
            executeAutoCompleteAction(autoActions.autoActions[0]);
          }
        } catch (error) {
          console.error('Failed to execute auto-complete action:', error);
        }
        break;
    }
  };

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <SparklesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Loading smart tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h2 className="text-2xl font-bold text-gray-900">Smart Task Board</h2>
          
          {/* Task Stats */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span>{taskStats.pending} Pending</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>{taskStats.inProgress} In Progress</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>{taskStats.completed} Completed</span>
            </div>
            {taskStats.overdue > 0 && (
              <div className="flex items-center space-x-1 text-red-600">
                <ExclamationTriangleIcon className="w-3 h-3" />
                <span>{taskStats.overdue} Overdue</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Filters */}
          <div className="flex items-center space-x-2">
            <FilterIcon className="h-4 w-4 text-gray-500" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="flex items-center space-x-2 px-3 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <LightBulbIcon className="h-4 w-4" />
              <span>{suggestions.length} Suggestions</span>
            </button>
          )}

          {/* Create Task */}
          {allowCreation && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Smart Task</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Suggestions Panel */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-900 mb-3 flex items-center">
            <LightBulbIcon className="h-5 w-5 mr-2" />
            AI Suggested Tasks
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.slice(0, 6).map((suggestion, index) => (
              <div
                key={index}
                className="bg-white p-3 border border-yellow-200 rounded-lg cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => {
                  setShowCreateModal(true);
                  // Pass suggestion data to modal
                }}
              >
                <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                  suggestion.priority === 'critical' ? 'bg-red-100 text-red-800' :
                  suggestion.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {suggestion.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Task Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {organizedTasks.map((column) => (
            <div
              key={column.id}
              className={`rounded-lg border-2 ${column.color} ${showCompact ? 'p-3' : 'p-4'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <column.icon className="h-5 w-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">{column.title}</h3>
                  <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded-full">
                    {column.tasks.length}
                  </span>
                </div>
              </div>

              <SortableContext
                items={column.tasks.map(task => task.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className={`space-y-3 min-h-[200px] ${showCompact ? 'space-y-2' : ''}`}>
                  {column.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onQuickAction={handleQuickAction}
                      compact={showCompact}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          ))}

          <DragOverlay>
            {activeTask ? (
              <TaskCard task={activeTask} isDragging onQuickAction={handleQuickAction} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Smart Task Creation Modal */}
      <SmartTaskCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        exchangeId={exchangeId}
        onTaskCreated={(task) => {
          console.log('Task created:', task);
          loadTasks(); // Refresh the board
        }}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={showTaskDetail}
        onClose={() => {
          setShowTaskDetail(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onTaskUpdated={(updatedTask) => {
          console.log('Task updated:', updatedTask);
          loadTasks(); // Refresh the board
        }}
        onTaskDeleted={(taskId) => {
          console.log('Task deleted:', taskId);
          loadTasks(); // Refresh the board
        }}
      />
    </div>
  );
};