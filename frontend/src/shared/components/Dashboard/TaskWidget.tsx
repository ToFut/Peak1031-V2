import React from 'react';
import { DashboardCard } from './DashboardCard';
import Badge from '../../ui/atoms/Badge';
import { useDashboard } from './DashboardProvider';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  ListBulletIcon,
  UserIcon 
} from '@heroicons/react/24/outline';

interface TaskWidgetProps {
  userRole: string;
  variant?: 'list' | 'board' | 'summary';
  maxItems?: number;
  showActions?: boolean;
}

export const TaskWidget: React.FC<TaskWidgetProps> = ({
  userRole,
  variant = 'list',
  maxItems = 5,
  showActions = true,
}) => {
  const { data, refetch } = useDashboard();
  const { tasks, loading, error } = data;

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'info';
      case 'PENDING':
        return 'warning';
      case 'OVERDUE':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
      case 'URGENT':
        return 'error';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  // Mock tasks for demonstration
  const mockTasks = [
    {
      id: '1',
      title: 'Review property documentation',
      description: 'Complete review of all property-related documents for Exchange #EX-2024-001',
      status: 'PENDING',
      priority: 'HIGH',
      dueDate: '2024-08-10',
      assignedTo: 'John Smith',
      exchangeId: 'EX-2024-001',
    },
    {
      id: '2',
      title: 'Submit financial verification',
      description: 'Gather and submit required financial verification documents',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      dueDate: '2024-08-12',
      assignedTo: 'Sarah Johnson',
      exchangeId: 'EX-2024-002',
    },
    {
      id: '3',
      title: 'Schedule property inspection',
      description: 'Coordinate with all parties to schedule property inspection',
      status: 'COMPLETED',
      priority: 'LOW',
      dueDate: '2024-08-05',
      assignedTo: 'Mike Davis',
      exchangeId: 'EX-2024-001',
    },
    {
      id: '4',
      title: 'Complete due diligence review',
      description: 'Comprehensive review of all due diligence materials',
      status: 'OVERDUE',
      priority: 'HIGH',
      dueDate: '2024-08-03',
      assignedTo: 'Emily Wilson',
      exchangeId: 'EX-2024-003',
    },
  ];

  const displayTasks = tasks.length > 0 ? tasks.slice(0, maxItems) : mockTasks.slice(0, maxItems);

  const getTasksForRole = () => {
    switch (userRole) {
      case 'admin':
        return displayTasks; // Admin sees all tasks
      case 'coordinator':
        return displayTasks; // Coordinator sees assigned tasks
      case 'client':
        return displayTasks.filter(task => task.assignedTo === 'Current User'); // Mock client filter
      default:
        return displayTasks;
    }
  };

  const roleSpecificTasks = getTasksForRole();

  const actions = showActions && (
    <div className="flex space-x-2">
      <button
        onClick={() => refetch()}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        Refresh
      </button>
      <button className="text-sm text-gray-600 hover:text-gray-800 font-medium">
        View All
      </button>
    </div>
  );

  const renderTaskList = () => (
    <div className="space-y-3">
      {roleSpecificTasks.map((task) => (
        <div
          key={task.id}
          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900 flex-1 pr-4">
              {task.title}
            </h4>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Badge variant={getStatusColor(task.status)} size="sm">
                {task.status}
              </Badge>
              {task.priority && (
                <Badge variant={getPriorityColor(task.priority)} size="sm">
                  {task.priority}
                </Badge>
              )}
            </div>
          </div>
          
          {task.description && (
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {task.description}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              {task.assignedTo && (
                <div className="flex items-center">
                  <UserIcon className="w-4 h-4 mr-1" />
                  {task.assignedTo}
                </div>
              )}
              {task.exchangeId && (
                <span>Exchange: {task.exchangeId}</span>
              )}
            </div>
            
            {task.dueDate && (
              <div className={`flex items-center ${isOverdue(task.dueDate) ? 'text-red-600' : ''}`}>
                <ClockIcon className="w-4 h-4 mr-1" />
                Due: {formatDate(task.dueDate)}
                {isOverdue(task.dueDate) && (
                  <ExclamationTriangleIcon className="w-4 h-4 ml-1" />
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      
      {roleSpecificTasks.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <CheckCircleIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No tasks found</p>
        </div>
      )}
    </div>
  );

  const renderTaskBoard = () => {
    const tasksByStatus = roleSpecificTasks.reduce((acc, task) => {
      const status = task.status || 'PENDING';
      if (!acc[status]) acc[status] = [];
      acc[status].push(task);
      return acc;
    }, {} as Record<string, typeof roleSpecificTasks>);

    const columns = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((status) => (
          <div key={status} className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-3 capitalize">
              {status.replace('_', ' ').toLowerCase()}
            </h5>
            <div className="space-y-2">
              {(tasksByStatus[status] || []).map((task: any) => (
                <div
                  key={task.id}
                  className="bg-white p-3 rounded border border-gray-200 shadow-sm"
                >
                  <h6 className="text-sm font-medium text-gray-900 mb-1">
                    {task.title}
                  </h6>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {task.description}
                  </p>
                  <div className="flex items-center justify-between">
                    {task.priority && (
                      <Badge variant={getPriorityColor(task.priority)} size="sm">
                        {task.priority}
                      </Badge>
                    )}
                    {task.dueDate && (
                      <span className={`text-xs ${isOverdue(task.dueDate) ? 'text-red-600' : 'text-gray-500'}`}>
                        {formatDate(task.dueDate)}
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

  const renderTaskSummary = () => {
    const statusCounts = roleSpecificTasks.reduce((acc, task) => {
      const status = task.status || 'PENDING';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const overdueTasks = roleSpecificTasks.filter(task => 
      task.dueDate && isOverdue(task.dueDate)
    ).length;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {roleSpecificTasks.length}
          </div>
          <div className="text-sm text-gray-600">Total Tasks</div>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {statusCounts['PENDING'] || 0}
          </div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {statusCounts['COMPLETED'] || 0}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {overdueTasks}
          </div>
          <div className="text-sm text-gray-600">Overdue</div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (variant) {
      case 'board':
        return renderTaskBoard();
      case 'summary':
        return renderTaskSummary();
      default:
        return renderTaskList();
    }
  };

  const getTitle = () => {
    switch (userRole) {
      case 'admin':
        return 'All Tasks';
      case 'coordinator':
        return 'My Assigned Tasks';
      case 'client':
        return 'My Tasks';
      default:
        return 'Tasks';
    }
  };

  return (
    <DashboardCard
      title={getTitle()}
      loading={loading}
      error={error}
      actions={actions}
      icon={<ListBulletIcon className="w-5 h-5" />}
    >
      {renderContent()}
    </DashboardCard>
  );
};