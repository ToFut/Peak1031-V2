import React, { useState, useMemo, useCallback } from 'react';
import { Exchange } from '../../../types';
import { apiService } from '../../../services/api';
import { usePermissions } from '../../../hooks/usePermissions';
import { calculateExchangeProgress, getDaysUntilDeadline } from '../../../utils/exchangeProgress';
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
  Settings,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  DollarSign
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
  const [isExpanded, setIsExpanded] = useState(false);

  // Use unified progress calculation
  const progress = useMemo(() => {
    return calculateExchangeProgress(exchange);
  }, [exchange]);

  // Use unified deadline calculation
  const daysUntil45 = useMemo(() => {
    const exchangeData = exchange as any;
    const day45 = exchangeData.day_45 || exchange.identificationDeadline;
    return getDaysUntilDeadline(day45);
  }, [exchange]);
  
  const daysUntil180 = useMemo(() => {
    const exchangeData = exchange as any;
    const day180 = exchangeData.day_180 || exchange.completionDeadline || exchange.exchangeDeadline;
    return getDaysUntilDeadline(day180);
  }, [exchange]);
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

  const handleSendAccountStatement = useCallback(async () => {
    setIsLoading('account-statement');
    try {
      // Generate account statement PDF
      const response = await apiService.get(`/exchanges/${exchange.id}/generate-document?type=account-statement`);
      
      // Send to all participants
      await apiService.post(`/exchanges/${exchange.id}/notifications`, {
        type: 'account_statement',
        message: `Account statement for Exchange ${exchange.exchangeNumber || exchange.id} is now available.`,
        recipients: participants.map(p => p.user?.email || p.email).filter(Boolean),
        attachmentUrl: response.data?.url
      });
      
      alert('Account statement sent to all participants');
    } catch (error) {
      console.error('Failed to send account statement:', error);
      alert('Failed to send account statement');
    } finally {
      setIsLoading(null);
    }
  }, [exchange.id, exchange.exchangeNumber, participants]);

  const [showPartySelector, setShowPartySelector] = useState(false);
  const [selectedParties, setSelectedParties] = useState<string[]>([]);

  const handleSendProofOfFunds = useCallback(async () => {
    if (selectedParties.length === 0) {
      setShowPartySelector(true);
      return;
    }

    setIsLoading('proof-of-funds');
    try {
      // Generate proof of funds document
      const response = await apiService.get(`/exchanges/${exchange.id}/generate-document?type=proof-of-funds`);
      
      // Send to selected parties
      await apiService.post(`/exchanges/${exchange.id}/notifications`, {
        type: 'proof_of_funds',
        message: `Proof of funds for Exchange ${exchange.exchangeNumber || exchange.id} is attached.`,
        recipients: selectedParties,
        attachmentUrl: response.data?.url
      });
      
      alert(`Proof of funds sent to ${selectedParties.length} recipient(s)`);
      setSelectedParties([]);
      setShowPartySelector(false);
    } catch (error) {
      console.error('Failed to send proof of funds:', error);
      alert('Failed to send proof of funds');
    } finally {
      setIsLoading(null);
    }
  }, [exchange.id, exchange.exchangeNumber, selectedParties]);

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

      actions.push({
        id: 'account-statement',
        label: 'Send Account Statement',
        description: 'Generate and send account statement to all participants',
        icon: FileText,
        variant: 'primary',
        onClick: handleSendAccountStatement
      });

      actions.push({
        id: 'proof-of-funds',
        label: 'Send Proof of Funds',
        description: 'Generate and send proof of funds to selected parties',
        icon: DollarSign,
        variant: 'primary',
        onClick: handleSendProofOfFunds
      });
    }

    return actions.slice(0, 6); // Limit to 6 actions to avoid overwhelming UI
  }, [isOverdue, isCritical, isUrgent, exchange.status, progress, isAdmin, isCoordinator]);

  // Get the most urgent/important actions for compact view
  const compactActions = useMemo(() => {
    return quickActions.slice(0, 3); // Show top 3 most important actions
  }, [quickActions]);

  // Early return after all hooks have been called
  if (quickActions.length === 0) {
    return null;
  }

  // Elegant card styling functions
  const getElegantVariantClasses = (variant: string, urgent?: boolean) => {
    const base = urgent ? 'ring-2 ring-offset-2' : 'border-gray-200';
    
    switch (variant) {
      case 'primary':
        return `${base} bg-white hover:bg-blue-50 ${urgent ? 'ring-blue-300 border-blue-300' : 'hover:border-blue-300'}`;
      case 'secondary':
        return `${base} bg-white hover:bg-gray-50 ${urgent ? 'ring-gray-300 border-gray-300' : 'hover:border-gray-300'}`;
      case 'success':
        return `${base} bg-white hover:bg-green-50 ${urgent ? 'ring-green-300 border-green-300' : 'hover:border-green-300'}`;
      case 'warning':
        return `${base} bg-white hover:bg-orange-50 ${urgent ? 'ring-orange-300 border-orange-300' : 'hover:border-orange-300'}`;
      case 'danger':
        return `${base} bg-white hover:bg-red-50 ${urgent ? 'ring-red-300 border-red-300' : 'hover:border-red-300'}`;
      default:
        return `${base} bg-white hover:bg-gray-50`;
    }
  };

  const getIconBgClasses = (variant: string) => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-500';
      case 'secondary':
        return 'bg-gray-500';
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-orange-500';
      case 'danger':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Compact button styling for collapsed view
  const getCompactVariantClasses = (variant: string, urgent?: boolean) => {
    const base = urgent ? 'ring-2 ring-offset-1' : '';
    
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

  // Create status summary for compact view
  const statusSummary = (
    <div className="flex items-center space-x-3 text-sm">
      <div className="flex items-center">
        <div className={`w-2 h-2 rounded-full mr-2 ${
          isOverdue ? 'bg-red-500 animate-pulse' : 
          isCritical ? 'bg-orange-500 animate-pulse' : 
          isUrgent ? 'bg-yellow-500' : 'bg-green-500'
        }`}></div>
        <span className="text-gray-600">{progress}% complete</span>
      </div>
      {daysUntil180 !== null && (
        <span className={`flex items-center ${
          daysUntil180 < 0 ? 'text-red-600' : 
          daysUntil180 <= 30 ? 'text-orange-600' : 'text-gray-600'
        }`}>
          <Clock className="w-3 h-3 mr-1" />
          {daysUntil180 < 0 ? `${Math.abs(daysUntil180)}d overdue` : `${daysUntil180}d left`}
        </span>
      )}
    </div>
  );

  return (
    <>
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Clickable Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              isOverdue ? 'bg-red-600' :
              isCritical ? 'bg-orange-600' :
              isUrgent ? 'bg-yellow-600' : 'bg-indigo-600'
            }`}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              <div className="text-sm text-gray-600 mt-1">
                {statusSummary}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Priority indicator */}
            {(isOverdue || isCritical || isUrgent) && (
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                isOverdue ? 'bg-red-100 text-red-700 animate-pulse' :
                isCritical ? 'bg-orange-100 text-orange-700 animate-pulse' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {isOverdue ? 'OVERDUE' : isCritical ? 'CRITICAL' : 'URGENT'}
              </div>
            )}
            
            {/* Expand/Collapse Icon */}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Compact Actions Row (visible when collapsed) */}
        {!isExpanded && compactActions.length > 0 && (
          <div className="mt-3 flex items-center space-x-2">
            {compactActions.map((action) => {
              const IconComponent = action.icon;
              const isActionLoading = isLoading === action.id;
              
              return (
                <button
                  key={action.id}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent expanding when clicking action
                    if (action.urgent && !showConfirm) {
                      setShowConfirm(action.id);
                      return;
                    }
                    setShowConfirm(null);
                    action.onClick();
                  }}
                  disabled={isActionLoading || isLoading !== null}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${getCompactVariantClasses(action.variant, action.urgent)}
                    ${isActionLoading ? 'opacity-75 cursor-not-allowed' : 'hover:scale-105 transform'}
                  `}
                  title={action.description}
                >
                  <IconComponent className={`w-4 h-4 ${isActionLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isActionLoading ? 'Processing...' : action.label}</span>
                  {action.urgent && !isActionLoading && (
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                  )}
                </button>
              );
            })}
            
            {quickActions.length > 3 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span>+{quickActions.length - 3} more</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              const isActionLoading = isLoading === action.id;
              
              return (
                <div
                  key={action.id}
                  className="group relative"
                >
                  <button
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
                      relative w-full p-4 rounded-xl border-2 transition-all duration-300
                      flex flex-col items-start text-left space-y-3 group-hover:scale-102
                      ${getElegantVariantClasses(action.variant, action.urgent)}
                      ${isActionLoading ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-lg transform hover:-translate-y-1'}
                    `}
                  >
                    {/* Icon and urgency indicator */}
                    <div className="flex items-center justify-between w-full">
                      <div className={`p-2 rounded-lg ${getIconBgClasses(action.variant)}`}>
                        <IconComponent className={`w-4 h-4 text-white ${isActionLoading ? 'animate-spin' : ''}`} />
                      </div>
                      {action.urgent && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                          <span className="text-xs text-red-600 font-medium">URGENT</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="space-y-1 flex-1">
                      <p className="font-semibold text-sm text-gray-900 leading-tight">
                        {isActionLoading ? 'Processing...' : action.label}
                      </p>
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                        {action.description}
                      </p>
                    </div>

                    {/* Progress indicator for loading */}
                    {isActionLoading && (
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                      </div>
                    )}

                    {/* Elegant confirmation overlay */}
                    {showConfirm === action.id && (
                      <div className="absolute inset-0 bg-white bg-opacity-95 backdrop-blur-sm rounded-xl flex items-center justify-center p-4 border-2 border-orange-300">
                        <div className="text-center space-y-3">
                          <div className="w-12 h-12 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-orange-600" />
                          </div>
                          <p className="text-sm font-medium text-gray-900">Confirm this action?</p>
                          <p className="text-xs text-gray-600">This action cannot be undone</p>
                          <div className="flex space-x-2 justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                action.onClick();
                                setShowConfirm(null);
                              }}
                              className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 font-medium"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowConfirm(null);
                              }}
                              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Refresh button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={onRefresh}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
              title="Refresh exchange data"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Party Selector Modal */}
    {showPartySelector && (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-semibold mb-4">Select Recipients for Proof of Funds</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {participants.map((participant) => {
              const email = participant.user?.email || participant.email;
              const name = participant.user?.firstName ? 
                `${participant.user.firstName} ${participant.user.lastName}` : 
                participant.name || email;
              
              if (!email) return null;
              
              return (
                <label key={participant.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={email}
                    checked={selectedParties.includes(email)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedParties([...selectedParties, email]);
                      } else {
                        setSelectedParties(selectedParties.filter(p => p !== email));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">
                    {name} <span className="text-gray-500">({participant.role})</span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={() => {
                setShowPartySelector(false);
                setSelectedParties([]);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSendProofOfFunds}
              disabled={selectedParties.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send to {selectedParties.length} Recipient(s)
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
});

ExchangeQuickActions.displayName = 'ExchangeQuickActions';

export default ExchangeQuickActions;