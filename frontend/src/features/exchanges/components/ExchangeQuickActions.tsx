import React, { useState, useMemo, useCallback } from 'react';
import { Exchange } from '../../../types';
import { apiService } from '../../../services/api';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Upload,
  FileText,
  Users,
  Bell,
  Calendar,
  Target,
  TrendingUp,
  RefreshCw,
  Mail,
  Phone,
  MessageCircle,
  Zap,
  Timer,
  Flag,
  AlertCircle,
  CheckSquare,
  PlusCircle,
  Eye,
  Download,
  Share,
  Settings
} from 'lucide-react';

interface QuickActionsProps {
  exchange: Exchange;
  participants: any[];
  onRefresh: () => void;
  onShowUpload: () => void;
  onCreateTask: () => void;
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  urgent?: boolean;
  onClick: () => void | Promise<void>;
}

export const ExchangeQuickActions: React.FC<QuickActionsProps> = React.memo(({
  exchange,
  participants,
  onRefresh,
  onShowUpload,
  onCreateTask
}) => {
  const { isAdmin, isCoordinator } = usePermissions();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  // Memoize expensive calculations
  const progress = useMemo(() => {
    if (exchange.status === 'COMPLETED' || exchange.status === 'Completed') return 100;
    if (exchange.progress !== undefined && exchange.progress !== null) return exchange.progress;
    
    const today = new Date();
    const startDate = new Date(exchange.startDate || exchange.createdAt || '');
    const deadline = new Date(exchange.completionDeadline || exchange.exchangeDeadline || '');
    
    if (!exchange.completionDeadline && !exchange.exchangeDeadline) return 0;
    
    const totalDays = Math.abs(deadline.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysElapsed = Math.abs(today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return Math.min(Math.round((daysElapsed / totalDays) * 100), 99);
  }, [exchange.status, exchange.progress, exchange.startDate, exchange.createdAt, exchange.completionDeadline, exchange.exchangeDeadline]);

  const getDaysUntil = useCallback((dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  const daysUntil45 = useMemo(() => getDaysUntil(exchange.identificationDeadline), [exchange.identificationDeadline, getDaysUntil]);
  const daysUntil180 = useMemo(() => getDaysUntil(exchange.completionDeadline || exchange.exchangeDeadline), [exchange.completionDeadline, exchange.exchangeDeadline, getDaysUntil]);
  const isOverdue = useMemo(() => (daysUntil180 !== null && daysUntil180 < 0) && exchange.status !== 'COMPLETED', [daysUntil180, exchange.status]);
  const isCritical = useMemo(() => daysUntil45 !== null && daysUntil45 <= 7 && daysUntil45 > 0, [daysUntil45]);
  const isUrgent = useMemo(() => daysUntil180 !== null && daysUntil180 <= 30 && daysUntil180 > 0, [daysUntil180]);

  // Memoized action handlers
  const handleMarkCompleted = useCallback(async () => {
    if (!isAdmin() && !isCoordinator()) return;
    
    setIsLoading('complete');
    try {
      await apiService.put(`/exchanges/${exchange.id}`, {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date().toISOString()
      });
      
      // Send completion notification to all participants
      await apiService.post(`/exchanges/${exchange.id}/notifications`, {
        type: 'exchange_completed',
        message: `Exchange ${exchange.exchangeNumber || exchange.id} has been marked as completed.`,
        recipients: participants.map(p => p.user?.email || p.email).filter(Boolean)
      });
      
      onRefresh();
    } catch (error) {
      console.error('Failed to mark exchange as completed:', error);
      alert('Failed to mark exchange as completed');
    } finally {
      setIsLoading(null);
    }
  }, [isAdmin, isCoordinator, exchange.id, exchange.exchangeNumber, participants, onRefresh]);

  const handleSendReminder = useCallback(async () => {
    setIsLoading('reminder');
    try {
      const message = isOverdue 
        ? `URGENT: Exchange ${exchange.exchangeNumber || exchange.id} is overdue. Please take immediate action.`
        : isCritical
        ? `CRITICAL: Exchange ${exchange.exchangeNumber || exchange.id} has ${Math.abs(daysUntil45!)} days until 45-day deadline.`
        : `Reminder: Exchange ${exchange.exchangeNumber || exchange.id} requires attention.`;

      await apiService.post(`/exchanges/${exchange.id}/notifications`, {
        type: 'reminder',
        message,
        recipients: participants.map(p => p.user?.email || p.email).filter(Boolean),
        urgent: isOverdue || isCritical
      });
      
      alert('Reminder sent to all participants');
    } catch (error) {
      console.error('Failed to send reminder:', error);
      alert('Failed to send reminder');
    } finally {
      setIsLoading(null);
    }
  }, [isOverdue, isCritical, exchange.exchangeNumber, exchange.id, participants]);

  const handleRequestDocuments = useCallback(async () => {
    setIsLoading('documents');
    try {
      await apiService.post(`/exchanges/${exchange.id}/notifications`, {
        type: 'document_request',
        message: `Please upload required documents for exchange ${exchange.exchangeNumber || exchange.id}.`,
        recipients: participants.filter(p => p.role === 'client').map(p => p.user?.email || p.email).filter(Boolean)
      });
      
      alert('Document request sent to clients');
    } catch (error) {
      console.error('Failed to request documents:', error);
      alert('Failed to request documents');
    } finally {
      setIsLoading(null);
    }
  }, [exchange.id, exchange.exchangeNumber, participants]);

  const handleScheduleCall = useCallback(async () => {
    setIsLoading('call');
    try {
      const clientEmails = participants.filter(p => p.role === 'client').map(p => p.user?.email || p.email).filter(Boolean);
      
      if (clientEmails.length === 0) {
        alert('No client email addresses found');
        return;
      }

      // Generate calendar invite link
      const subject = `Exchange ${exchange.exchangeNumber || exchange.id} - Status Call`;
      const details = `Discussion about the current status and next steps for exchange ${exchange.exchangeNumber || exchange.id}.`;
      const startTime = new Date();
      startTime.setDate(startTime.getDate() + 1); // Tomorrow
      startTime.setHours(10, 0, 0, 0); // 10 AM
      
      const endTime = new Date(startTime);
      endTime.setHours(11, 0, 0, 0); // 1 hour duration

      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(subject)}&dates=${startTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${endTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}&details=${encodeURIComponent(details)}&add=${clientEmails.join(',')}`;
      
      window.open(googleCalendarUrl, '_blank');
    } catch (error) {
      console.error('Failed to schedule call:', error);
      alert('Failed to schedule call');
    } finally {
      setIsLoading(null);
    }
  }, [exchange.exchangeNumber, exchange.id, participants]);

  const handleCreateUrgentTask = useCallback(async () => {
    setIsLoading('urgent-task');
    try {
      const taskTitle = isOverdue 
        ? `OVERDUE: Complete Exchange ${exchange.exchangeNumber || exchange.id}`
        : isCritical
        ? `URGENT: 45-Day Deadline Action Required`
        : `Follow up on Exchange ${exchange.exchangeNumber || exchange.id}`;

      await apiService.post(`/exchanges/${exchange.id}/tasks`, {
        title: taskTitle,
        description: isOverdue 
          ? 'This exchange is overdue. Immediate action is required to complete the transaction.'
          : isCritical
          ? 'Critical: Less than 7 days until 45-day identification deadline. Properties must be identified immediately.'
          : 'Follow up on exchange progress and next steps.',
        priority: 'high',
        dueDate: isOverdue || isCritical ? new Date().toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        assigneeIds: participants.filter(p => p.role === 'coordinator' || p.role === 'admin').map(p => p.user?.id || p.id).filter(Boolean)
      });
      
      alert('Urgent task created successfully');
      onRefresh();
    } catch (error) {
      console.error('Failed to create urgent task:', error);
      alert('Failed to create urgent task');
    } finally {
      setIsLoading(null);
    }
  }, [isOverdue, isCritical, exchange.exchangeNumber, exchange.id, participants, onRefresh]);

  // Memoize quick actions to prevent recalculation
  const quickActions = useMemo((): QuickAction[] => {
    const actions: QuickAction[] = [];

    // OVERDUE EXCHANGE ACTIONS
    if (isOverdue) {
      if (isAdmin() || isCoordinator()) {
        actions.push({
          id: 'mark-complete',
          label: 'Mark as Completed',
          description: 'Mark this overdue exchange as completed and notify all participants',
          icon: CheckCircle2,
          variant: 'success',
          urgent: true,
          onClick: handleMarkCompleted
        });
      }

      actions.push({
        id: 'urgent-reminder',
        label: 'Send Urgent Reminder',
        description: 'Send urgent overdue notification to all participants',
        icon: AlertTriangle,
        variant: 'danger',
        urgent: true,
        onClick: handleSendReminder
      });

      actions.push({
        id: 'urgent-task',
        label: 'Create Urgent Task',
        description: 'Create high-priority task for overdue exchange',
        icon: Zap,
        variant: 'warning',
        urgent: true,
        onClick: handleCreateUrgentTask
      });

      actions.push({
        id: 'schedule-call',
        label: 'Schedule Emergency Call',
        description: 'Schedule urgent call with client to resolve issues',
        icon: Phone,
        variant: 'warning',
        onClick: handleScheduleCall
      });
    }
    
    // CRITICAL DEADLINE ACTIONS (45-day deadline approaching)
    else if (isCritical) {
      actions.push({
        id: 'critical-reminder',
        label: 'Critical Deadline Alert',
        description: `Only ${Math.abs(daysUntil45!)} days until 45-day deadline!`,
        icon: Target,
        variant: 'danger',
        urgent: true,
        onClick: handleSendReminder
      });

      actions.push({
        id: 'request-identification',
        label: 'Request Property IDs',
        description: 'Request property identifications from client',
        icon: FileText,
        variant: 'warning',
        urgent: true,
        onClick: handleRequestDocuments
      });

      actions.push({
        id: 'urgent-task',
        label: 'Create Critical Task',
        description: 'Create critical task for 45-day deadline',
        icon: Timer,
        variant: 'warning',
        urgent: true,
        onClick: handleCreateUrgentTask
      });
    }
    
    // URGENT DEADLINE ACTIONS (180-day deadline approaching)
    else if (isUrgent) {
      actions.push({
        id: 'urgent-reminder',
        label: 'Deadline Reminder',
        description: `${Math.abs(daysUntil180!)} days until completion deadline`,
        icon: Clock,
        variant: 'warning',
        onClick: handleSendReminder
      });

      actions.push({
        id: 'schedule-call',
        label: 'Schedule Status Call',
        description: 'Schedule call to review progress and next steps',
        icon: Calendar,
        variant: 'secondary',
        onClick: handleScheduleCall
      });
    }

    // STANDARD ACTIONS BASED ON STATUS
    switch (exchange.status) {
      case 'PENDING':
        actions.push({
          id: 'request-documents',
          label: 'Request Documents',
          description: 'Request required documents from client to begin exchange',
          icon: Upload,
          variant: 'primary',
          onClick: handleRequestDocuments
        });

        actions.push({
          id: 'schedule-kickoff',
          label: 'Schedule Kickoff Call',
          description: 'Schedule initial call with client to discuss process',
          icon: Users,
          variant: 'secondary',
          onClick: handleScheduleCall
        });
        break;

      case 'In Progress':
      case '45D':
      case '180D':
        if (progress < 50) {
          actions.push({
            id: 'progress-reminder',
            label: 'Progress Check-in',
            description: 'Send progress check-in to all participants',
            icon: TrendingUp,
            variant: 'secondary',
            onClick: handleSendReminder
          });
        }

        actions.push({
          id: 'create-task',
          label: 'Create Task',
          description: 'Create new task for this exchange',
          icon: PlusCircle,
          variant: 'secondary',
          onClick: onCreateTask
        });

        actions.push({
          id: 'upload-document',
          label: 'Upload Document',
          description: 'Upload new document to this exchange',
          icon: Upload,
          variant: 'secondary',
          onClick: onShowUpload
        });
        break;

      case 'COMPLETED':
        actions.push({
          id: 'generate-report',
          label: 'Generate Report',
          description: 'Generate completion report for this exchange',
          icon: FileText,
          variant: 'secondary',
          onClick: async () => {
            window.open(`/exchanges/${exchange.id}/report`, '_blank');
          }
        });

        actions.push({
          id: 'send-completion',
          label: 'Send Completion Notice',
          description: 'Send completion confirmation to all participants',
          icon: Mail,
          variant: 'success',
          onClick: async () => {
            await apiService.post(`/exchanges/${exchange.id}/notifications`, {
              type: 'completion_notice',
              message: `Exchange ${exchange.exchangeNumber || exchange.id} has been successfully completed.`,
              recipients: participants.map(p => p.user?.email || p.email).filter(Boolean)
            });
            alert('Completion notice sent');
          }
        });
        break;
    }

    // ALWAYS AVAILABLE ACTIONS
    if (!isOverdue && exchange.status !== 'COMPLETED') {
      actions.push({
        id: 'send-update',
        label: 'Send Status Update',
        description: 'Send current status update to all participants',
        icon: MessageCircle,
        variant: 'secondary',
        onClick: handleSendReminder
      });
    }

    return actions.slice(0, 6); // Limit to 6 actions to avoid overwhelming UI
  }, [isOverdue, isCritical, isUrgent, exchange.status, progress, isAdmin, isCoordinator]);

  if (quickActions.length === 0) {
    return null;
  }

  const getVariantClasses = (variant: string, urgent?: boolean) => {
    const base = urgent ? 'animate-pulse ring-2 ring-offset-1' : '';
    
    switch (variant) {
      case 'primary':
        return `${base} bg-blue-600 hover:bg-blue-700 text-white ${urgent ? 'ring-blue-300' : ''}`;
      case 'secondary':
        return `${base} bg-gray-600 hover:bg-gray-700 text-white ${urgent ? 'ring-gray-300' : ''}`;
      case 'success':
        return `${base} bg-green-600 hover:bg-green-700 text-white ${urgent ? 'ring-green-300' : ''}`;
      case 'warning':
        return `${base} bg-orange-600 hover:bg-orange-700 text-white ${urgent ? 'ring-orange-300' : ''}`;
      case 'danger':
        return `${base} bg-red-600 hover:bg-red-700 text-white ${urgent ? 'ring-red-300' : ''}`;
      default:
        return `${base} bg-gray-600 hover:bg-gray-700 text-white`;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-600" />
          Quick Actions
          {(isOverdue || isCritical) && (
            <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full animate-pulse">
              {isOverdue ? 'OVERDUE' : 'CRITICAL'}
            </span>
          )}
        </h3>
        
        {(isOverdue || isCritical || isUrgent) && (
          <div className="text-sm text-gray-600 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
            <AlertTriangle className="w-4 h-4 inline mr-1 text-yellow-600" />
            Action Required
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {quickActions.map((action) => {
          const IconComponent = action.icon;
          const isActionLoading = isLoading === action.id;
          
          return (
            <button
              key={action.id}
              onClick={() => {
                if (action.urgent && !showConfirm) {
                  setShowConfirm(action.id);
                  return;
                }
                setShowConfirm(null);
                action.onClick();
              }}
              disabled={isActionLoading || isLoading !== null}
              className={`
                relative p-4 rounded-lg border border-transparent transition-all duration-200
                flex flex-col items-start text-left space-y-2 group
                ${getVariantClasses(action.variant, action.urgent)}
                ${isActionLoading ? 'opacity-75 cursor-not-allowed' : 'transform hover:scale-105 shadow-sm hover:shadow-md'}
                ${action.urgent ? 'border-yellow-300 shadow-lg' : ''}
              `}
            >
              <div className="flex items-center justify-between w-full">
                <IconComponent className={`w-5 h-5 ${isActionLoading ? 'animate-spin' : ''}`} />
                {action.urgent && (
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  {isActionLoading ? 'Processing...' : action.label}
                </p>
                <p className="text-xs opacity-90 line-clamp-2">
                  {action.description}
                </p>
              </div>

              {/* Urgent action confirmation */}
              {showConfirm === action.id && (
                <div className="absolute inset-0 bg-black bg-opacity-75 rounded-lg flex items-center justify-center p-2">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-900 mb-3">Confirm this action?</p>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick();
                          setShowConfirm(null);
                        }}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        Yes
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowConfirm(null);
                        }}
                        className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Status summary for context */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Status: <span className="font-medium">{exchange.status}</span></span>
            <span>Progress: <span className="font-medium">{progress}%</span></span>
            {daysUntil180 !== null && (
              <span>
                180-Day: <span className={`font-medium ${daysUntil180 < 0 ? 'text-red-600' : daysUntil180 <= 30 ? 'text-orange-600' : 'text-gray-600'}`}>
                  {daysUntil180 < 0 ? `${Math.abs(daysUntil180)} days overdue` : `${daysUntil180} days left`}
                </span>
              </span>
            )}
          </div>
          
          <button
            onClick={onRefresh}
            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
            title="Refresh exchange data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

ExchangeQuickActions.displayName = 'ExchangeQuickActions';

export default ExchangeQuickActions;