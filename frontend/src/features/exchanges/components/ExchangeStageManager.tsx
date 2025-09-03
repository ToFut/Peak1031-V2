import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Exchange } from '../../../types';
import { apiService } from '../../../services/api';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  ArrowRight,
  AlertCircle,
  Zap,
  FileText,
  DollarSign,
  Home,
  Calendar,
  Shield,
  Archive,
  XCircle,
  PlayCircle,
  PauseCircle,
  SkipForward,
  Info,
  Bell,
  User,
  Building,
  Briefcase,
  Target,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Define all exchange stages
export enum ExchangeStage {
  EXCHANGE_CREATED = 'EXCHANGE_CREATED',
  ONBOARDING_PENDING = 'ONBOARDING_PENDING',
  SALES_CLOSED = 'SALES_CLOSED',
  FUNDS_RECEIVED = 'FUNDS_RECEIVED',
  IDENTIFICATION_OPEN = 'IDENTIFICATION_OPEN',
  PROPERTY_IDENTIFIED = 'PROPERTY_IDENTIFIED',
  UNDER_CONTRACT = 'UNDER_CONTRACT',
  EXCHANGE_COMPLETED = 'EXCHANGE_COMPLETED',
  CLOSEOUT_ARCHIVED = 'CLOSEOUT_ARCHIVED',
  EXCHANGE_CANCELLED = 'EXCHANGE_CANCELLED'
}

// Stage metadata
interface StageMetadata {
  stage: ExchangeStage;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  borderColor: string;
  autoAdvance: boolean;
  requiresApproval: boolean;
  daysToComplete?: number;
  requiredTasks: StageTask[];
  automaticActions: AutomaticAction[];
  notifications: NotificationConfig[];
}

interface StageTask {
  id: string;
  label: string;
  description: string;
  required: boolean;
  validator: (exchange: Exchange) => boolean;
  actionLabel?: string;
  action?: () => Promise<void>;
}

interface AutomaticAction {
  id: string;
  label: string;
  trigger: 'on_enter' | 'on_complete' | 'on_timer';
  delayMinutes?: number;
  action: (exchange: Exchange) => Promise<void>;
}

interface NotificationConfig {
  trigger: 'on_enter' | 'on_complete' | 'on_overdue';
  recipients: ('client' | 'coordinator' | 'admin' | 'all')[];
  template: string;
  urgent: boolean;
}

interface ExchangeStageManagerProps {
  exchange: Exchange;
  onRefresh: () => void;
  onStageChange?: (newStage: ExchangeStage) => void;
}

export const ExchangeStageManager: React.FC<ExchangeStageManagerProps> = ({
  exchange,
  onRefresh,
  onStageChange
}) => {
  const { isAdmin, isCoordinator } = usePermissions();
  const [currentStage, setCurrentStage] = useState<ExchangeStage>(
    (exchange as any).stage || ExchangeStage.EXCHANGE_CREATED
  );
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [taskStatuses, setTaskStatuses] = useState<Record<string, boolean>>({});
  const [expandedStage, setExpandedStage] = useState<ExchangeStage | null>(null); // Don't auto-expand
  const [isExpanded, setIsExpanded] = useState(false); // Collapsible state

  // Define stage configurations
  const stageConfigs: StageMetadata[] = useMemo(() => [
    {
      stage: ExchangeStage.EXCHANGE_CREATED,
      label: 'Exchange Created',
      description: 'Initial exchange record created',
      icon: Briefcase,
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
      autoAdvance: true,
      requiresApproval: false,
      requiredTasks: [
        {
          id: 'client_assigned',
          label: 'Client Assigned',
          description: 'Exchange must have a client assigned',
          required: true,
          validator: (ex) => !!ex.client || !!ex.clientId
        },
        {
          id: 'coordinator_assigned',
          label: 'Coordinator Assigned',
          description: 'Exchange must have a coordinator',
          required: false,
          validator: (ex) => !!ex.coordinator || !!ex.coordinatorId
        }
      ],
      automaticActions: [
        {
          id: 'send_welcome',
          label: 'Send Welcome Email',
          trigger: 'on_enter',
          action: async (ex) => {
            await apiService.post(`/exchanges/${ex.id}/notifications`, {
              type: 'welcome',
              message: 'Welcome to your 1031 Exchange journey!'
            });
          }
        }
      ],
      notifications: [
        {
          trigger: 'on_enter',
          recipients: ['client', 'coordinator'],
          template: 'Exchange {{exchangeNumber}} has been created',
          urgent: false
        }
      ]
    },
    {
      stage: ExchangeStage.ONBOARDING_PENDING,
      label: 'Onboarding Pending',
      description: 'Client registration and initial documents',
      icon: User,
      color: 'text-blue-700',
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-300',
      autoAdvance: true,
      requiresApproval: false,
      daysToComplete: 3,
      requiredTasks: [
        {
          id: 'client_registered',
          label: 'Client Registration Complete',
          description: 'Client has completed registration form',
          required: true,
          validator: (ex) => !!(ex as any).clientRegistered
        },
        {
          id: 'agreement_signed',
          label: 'Exchange Agreement Signed',
          description: 'Client has signed the exchange agreement',
          required: true,
          validator: (ex) => !!(ex as any).agreementSigned
        },
        {
          id: 'initial_docs',
          label: 'Initial Documents Uploaded',
          description: 'Required onboarding documents uploaded',
          required: true,
          validator: (ex) => !!(ex as any).initialDocsUploaded
        }
      ],
      automaticActions: [
        {
          id: 'reminder_registration',
          label: 'Send Registration Reminder',
          trigger: 'on_timer',
          delayMinutes: 1440, // 24 hours
          action: async (ex) => {
            await apiService.post(`/exchanges/${ex.id}/notifications`, {
              type: 'reminder',
              message: 'Please complete your registration to proceed'
            });
          }
        }
      ],
      notifications: [
        {
          trigger: 'on_overdue',
          recipients: ['coordinator', 'admin'],
          template: 'Client onboarding overdue for {{exchangeNumber}}',
          urgent: true
        }
      ]
    },
    {
      stage: ExchangeStage.SALES_CLOSED,
      label: 'Sales Closed',
      description: 'Relinquished property sale has closed',
      icon: Home,
      color: 'text-green-700',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-300',
      autoAdvance: true,
      requiresApproval: false,
      daysToComplete: 1,
      requiredTasks: [
        {
          id: 'sale_completed',
          label: 'Sale Completed',
          description: 'Relinquished property sale has closed',
          required: true,
          validator: (ex) => !!(ex as any).saleCompleted
        },
        {
          id: 'proceeds_available',
          label: 'Proceeds Available',
          description: 'Sale proceeds are available for exchange',
          required: true,
          validator: (ex) => !!(ex as any).proceedsAvailable
        }
      ],
      automaticActions: [
        {
          id: 'notify_sale_complete',
          label: 'Notify Sale Complete',
          trigger: 'on_enter',
          action: async (ex) => {
            await apiService.post(`/exchanges/${ex.id}/notifications`, {
              type: 'sale_complete',
              message: 'Relinquished property sale completed'
            });
          }
        }
      ],
      notifications: [
        {
          trigger: 'on_enter',
          recipients: ['all'],
          template: 'Sale closed for {{exchangeNumber}} - exchange can proceed',
          urgent: false
        }
      ]
    },
    {
      stage: ExchangeStage.FUNDS_RECEIVED,
      label: 'Funds Received',
      description: 'Funds confirmed in QI account',
      icon: DollarSign,
      color: 'text-green-700',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-300',
      autoAdvance: true,
      requiresApproval: false,
      requiredTasks: [
        {
          id: 'funds_confirmed',
          label: 'Funds Confirmed',
          description: 'Funds received and confirmed in QI account',
          required: true,
          validator: (ex) => !!(ex as any).fundsReceived
        },
        {
          id: 'amount_verified',
          label: 'Amount Verified',
          description: 'Received amount matches expected proceeds',
          required: true,
          validator: (ex) => !!(ex as any).amountVerified
        }
      ],
      automaticActions: [
        {
          id: 'start_45_day_clock',
          label: 'Start 45-Day Clock',
          trigger: 'on_complete',
          action: async (ex) => {
            const identificationDeadline = new Date();
            identificationDeadline.setDate(identificationDeadline.getDate() + 45);
            await apiService.put(`/exchanges/${ex.id}`, {
              identificationDeadline: identificationDeadline.toISOString(),
              day45StartDate: new Date().toISOString()
            });
          }
        }
      ],
      notifications: [
        {
          trigger: 'on_complete',
          recipients: ['all'],
          template: 'Funds received! 45-day identification period has begun',
          urgent: true
        }
      ]
    },
    {
      stage: ExchangeStage.IDENTIFICATION_OPEN,
      label: '45-Day Identification',
      description: 'Client has 45 days to identify replacement properties',
      icon: Clock,
      color: 'text-orange-700',
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-300',
      autoAdvance: false,
      requiresApproval: false,
      daysToComplete: 45,
      requiredTasks: [
        {
          id: 'property_search',
          label: 'Property Search Active',
          description: 'Client is actively searching for properties',
          required: false,
          validator: (ex) => true
        },
        {
          id: 'identification_form',
          label: 'Identification Form Ready',
          description: 'Property identification form prepared',
          required: true,
          validator: (ex) => !!(ex as any).identificationFormReady
        }
      ],
      automaticActions: [
        {
          id: 'day_30_reminder',
          label: '30-Day Reminder',
          trigger: 'on_timer',
          delayMinutes: 21600, // 15 days
          action: async (ex) => {
            await apiService.post(`/exchanges/${ex.id}/notifications`, {
              type: 'deadline_reminder',
              message: '30 days remaining to identify replacement properties!'
            });
          }
        },
        {
          id: 'day_40_urgent',
          label: '40-Day Urgent Alert',
          trigger: 'on_timer',
          delayMinutes: 57600, // 40 days
          action: async (ex) => {
            await apiService.post(`/exchanges/${ex.id}/notifications`, {
              type: 'urgent_deadline',
              message: 'URGENT: Only 5 days left to identify properties!',
              urgent: true
            });
          }
        }
      ],
      notifications: [
        {
          trigger: 'on_enter',
          recipients: ['client'],
          template: '45-day identification period has started',
          urgent: false
        }
      ]
    },
    {
      stage: ExchangeStage.PROPERTY_IDENTIFIED,
      label: 'Property Identified',
      description: 'Replacement properties officially identified',
      icon: Home,
      color: 'text-teal-700',
      bgColor: 'bg-teal-100',
      borderColor: 'border-teal-300',
      autoAdvance: true,
      requiresApproval: false,
      requiredTasks: [
        {
          id: 'properties_documented',
          label: 'Properties Documented',
          description: 'All identified properties properly documented',
          required: true,
          validator: (ex) => !!(ex as any).propertiesIdentified
        },
        {
          id: 'identification_submitted',
          label: 'Identification Submitted',
          description: 'Formal identification submitted before deadline',
          required: true,
          validator: (ex) => !!(ex as any).identificationSubmitted
        }
      ],
      automaticActions: [
        {
          id: 'start_180_day_clock',
          label: 'Start 180-Day Clock',
          trigger: 'on_enter',
          action: async (ex) => {
            if (!(ex as any).day180StartDate) {
              const completionDeadline = new Date((ex as any).day45StartDate);
              completionDeadline.setDate(completionDeadline.getDate() + 180);
              await apiService.put(`/exchanges/${ex.id}`, {
                completionDeadline: completionDeadline.toISOString()
              });
            }
          }
        }
      ],
      notifications: [
        {
          trigger: 'on_complete',
          recipients: ['all'],
          template: 'Properties identified! 180-day exchange period continues',
          urgent: false
        }
      ]
    },
    {
      stage: ExchangeStage.UNDER_CONTRACT,
      label: 'Under Contract',
      description: 'Purchase agreement executed for replacement property',
      icon: FileText,
      color: 'text-blue-700',
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-300',
      autoAdvance: false,
      requiresApproval: false,
      requiredTasks: [
        {
          id: 'purchase_agreement',
          label: 'Purchase Agreement Executed',
          description: 'Signed purchase agreement for replacement property',
          required: true,
          validator: (ex) => !!(ex as any).purchaseAgreementSigned
        },
        {
          id: 'earnest_money',
          label: 'Earnest Money Deposited',
          description: 'Earnest money deposit made',
          required: true,
          validator: (ex) => !!(ex as any).earnestMoneyDeposited
        },
        {
          id: 'closing_scheduled',
          label: 'Closing Scheduled',
          description: 'Closing date scheduled with title company',
          required: true,
          validator: (ex) => !!(ex as any).closingScheduled
        }
      ],
      automaticActions: [],
      notifications: [
        {
          trigger: 'on_enter',
          recipients: ['coordinator'],
          template: 'Exchange {{exchangeNumber}} is under contract',
          urgent: false
        }
      ]
    },
    {
      stage: ExchangeStage.EXCHANGE_COMPLETED,
      label: 'Exchange Completed',
      description: 'Transaction finalized, replacement property closed',
      icon: CheckCircle,
      color: 'text-green-700',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-300',
      autoAdvance: true,
      requiresApproval: false,
      requiredTasks: [
        {
          id: 'closing_confirmed',
          label: 'Closing Confirmed',
          description: 'Replacement property closing confirmed',
          required: true,
          validator: (ex) => !!(ex as any).closingConfirmed
        },
        {
          id: 'final_docs',
          label: 'Final Documents Received',
          description: 'All closing documents received',
          required: true,
          validator: (ex) => !!(ex as any).finalDocsReceived
        }
      ],
      automaticActions: [
        {
          id: 'generate_completion_report',
          label: 'Generate Completion Report',
          trigger: 'on_enter',
          action: async (ex) => {
            await apiService.post(`/exchanges/${ex.id}/generate-report`, {});
          }
        }
      ],
      notifications: [
        {
          trigger: 'on_enter',
          recipients: ['all'],
          template: 'Congratulations! Exchange {{exchangeNumber}} completed successfully',
          urgent: false
        }
      ]
    },
    {
      stage: ExchangeStage.CLOSEOUT_ARCHIVED,
      label: 'Closeout & Archived',
      description: 'Tax documents generated and exchange archived',
      icon: Archive,
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
      autoAdvance: false,
      requiresApproval: false,
      requiredTasks: [
        {
          id: 'tax_packet',
          label: 'Tax Packet Generated',
          description: 'CPA tax packet created and distributed',
          required: true,
          validator: (ex) => !!(ex as any).taxPacketGenerated
        },
        {
          id: 'archived',
          label: 'Exchange Archived',
          description: 'All documents archived for compliance',
          required: true,
          validator: (ex) => !!(ex as any).archived
        }
      ],
      automaticActions: [],
      notifications: [
        {
          trigger: 'on_complete',
          recipients: ['client'],
          template: 'Tax documents ready for exchange {{exchangeNumber}}',
          urgent: false
        }
      ]
    },
    {
      stage: ExchangeStage.EXCHANGE_CANCELLED,
      label: 'Exchange Cancelled',
      description: 'Exchange failed or cancelled',
      icon: XCircle,
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-300',
      autoAdvance: false,
      requiresApproval: true,
      requiredTasks: [
        {
          id: 'cancellation_reason',
          label: 'Cancellation Documented',
          description: 'Reason for cancellation documented',
          required: true,
          validator: (ex) => !!(ex as any).cancellationReason
        },
        {
          id: 'funds_returned',
          label: 'Funds Returned',
          description: 'Any held funds returned to client',
          required: true,
          validator: (ex) => !!(ex as any).fundsReturned
        }
      ],
      automaticActions: [],
      notifications: [
        {
          trigger: 'on_enter',
          recipients: ['all'],
          template: 'Exchange {{exchangeNumber}} has been cancelled',
          urgent: true
        }
      ]
    }
  ], []);

  // Get current stage configuration
  const currentStageConfig = useMemo(() => 
    stageConfigs.find(s => s.stage === currentStage) || stageConfigs[0],
    [currentStage, stageConfigs]
  );

  // Get next stage
  const getNextStage = useCallback((current: ExchangeStage): ExchangeStage | null => {
    const currentIndex = stageConfigs.findIndex(s => s.stage === current);
    if (currentIndex === -1 || currentIndex === stageConfigs.length - 1) return null;
    
    // Skip cancelled stage in normal progression
    const nextStage = stageConfigs[currentIndex + 1];
    if (nextStage.stage === ExchangeStage.EXCHANGE_CANCELLED) {
      return currentIndex + 2 < stageConfigs.length ? stageConfigs[currentIndex + 2].stage : null;
    }
    return nextStage.stage;
  }, [stageConfigs]);

  // Check if all required tasks are complete
  const areRequiredTasksComplete = useCallback((stage: StageMetadata): boolean => {
    return stage.requiredTasks
      .filter(task => task.required)
      .every(task => task.validator(exchange) || taskStatuses[task.id]);
  }, [exchange, taskStatuses]);

  // Can advance to next stage
  const canAdvance = useMemo(() => {
    if (!isAdmin() && !isCoordinator()) return false;
    if (currentStageConfig.requiresApproval && !isAdmin()) return false;
    return areRequiredTasksComplete(currentStageConfig);
  }, [currentStageConfig, isAdmin, isCoordinator, areRequiredTasksComplete]);

  // Handle stage advancement
  const advanceStage = useCallback(async () => {
    if (!canAdvance) return;
    
    const nextStage = getNextStage(currentStage);
    if (!nextStage) return;

    setIsAdvancing(true);
    try {
      await apiService.put(`/exchanges/${exchange.id}`, {
        stage: nextStage,
        stageChangedAt: new Date().toISOString(),
        stageChangedBy: 'current_user' // Replace with actual user ID
      });

      // Trigger automatic actions for new stage
      const nextConfig = stageConfigs.find(s => s.stage === nextStage);
      if (nextConfig) {
        for (const action of nextConfig.automaticActions.filter(a => a.trigger === 'on_enter')) {
          await action.action(exchange);
        }
        
        // Send notifications
        for (const notification of nextConfig.notifications.filter(n => n.trigger === 'on_enter')) {
          await apiService.post(`/exchanges/${exchange.id}/notifications`, {
            type: 'stage_change',
            message: notification.template.replace('{{exchangeNumber}}', exchange.exchangeNumber || exchange.id),
            urgent: notification.urgent,
            recipients: notification.recipients
          });
        }
      }

      setCurrentStage(nextStage);
      if (onStageChange) onStageChange(nextStage);
      onRefresh();
    } catch (error) {
      console.error('Failed to advance stage:', error);
      alert('Failed to advance to next stage');
    } finally {
      setIsAdvancing(false);
    }
  }, [canAdvance, currentStage, exchange, stageConfigs, getNextStage, onRefresh, onStageChange]);

  // Get stage index for progress
  const getStageIndex = (stage: ExchangeStage): number => {
    return stageConfigs.findIndex(s => s.stage === stage);
  };

  const currentStageIndex = getStageIndex(currentStage);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Collapsible Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${currentStageConfig.bgColor}`}>
              <currentStageConfig.icon className={`w-5 h-5 ${currentStageConfig.color}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Stage Progress</h3>
              <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                <span>
                  Current: <span className="font-medium">{currentStageConfig.label}</span>
                </span>
                <span className="text-gray-400">•</span>
                <span>
                  Progress: <span className="font-medium">{Math.round(((currentStageIndex + 1) / (stageConfigs.length - 1)) * 100)}%</span>
                </span>
                {currentStageConfig.daysToComplete && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-orange-600">
                      {currentStageConfig.daysToComplete} days to complete
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Advance Button (visible when collapsed) */}
            {!isExpanded && (isAdmin() || isCoordinator()) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  advanceStage();
                }}
                disabled={!canAdvance || isAdvancing}
                className={`
                  flex items-center space-x-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all
                  ${canAdvance 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {isAdvancing ? (
                  <>
                    <Clock className="w-3 h-3 animate-spin" />
                    <span className="hidden sm:inline">Advancing...</span>
                  </>
                ) : canAdvance ? (
                  <>
                    <SkipForward className="w-3 h-3" />
                    <span className="hidden sm:inline">Advance</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" />
                    <span className="hidden sm:inline">Locked</span>
                  </>
                )}
              </button>
            )}
            
            {/* Expand/Collapse Icon */}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="relative">
          {/* Progress Bar */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${((currentStageIndex + 1) / (stageConfigs.length - 1)) * 100}%` }}
            />
          </div>

          {/* Stage Nodes */}
          <div className="relative flex justify-between">
            {stageConfigs.filter(s => s.stage !== ExchangeStage.EXCHANGE_CANCELLED).map((stage, index) => {
              const isCompleted = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const isPending = index > currentStageIndex;
              const StageIcon = stage.icon;

              return (
                <div 
                  key={stage.stage}
                  className="flex flex-col items-center cursor-pointer group"
                  onClick={() => setExpandedStage(expandedStage === stage.stage ? null : stage.stage)}
                >
                  {/* Node */}
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all
                    ${isCompleted ? 'bg-green-600 text-white' : 
                      isCurrent ? `${stage.bgColor} ${stage.borderColor} border-2` : 
                      'bg-gray-200 text-gray-400'}
                    ${isCurrent ? 'ring-4 ring-offset-2 ' + stage.borderColor.replace('border', 'ring') : ''}
                    group-hover:scale-110
                  `}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <StageIcon className={`w-5 h-5 ${isCurrent ? stage.color : ''}`} />
                    )}
                  </div>

                  {/* Label */}
                  <div className="mt-2 text-center">
                    <p className={`text-xs font-medium ${
                      isCurrent ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                      {stage.label}
                    </p>
                    {stage.autoAdvance && (
                      <p className="text-xs text-blue-600 mt-1">Auto</p>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {expandedStage === stage.stage && (
                    <div className="absolute top-20 z-10 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 mt-2">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">{stage.label}</h4>
                            <p className="text-sm text-gray-600 mt-1">{stage.description}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedStage(null);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Required Tasks */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Required Tasks:</h5>
                          <div className="space-y-2">
                            {stage.requiredTasks.map(task => {
                              const isComplete = task.validator(exchange) || taskStatuses[task.id];
                              
                              return (
                                <div key={task.id} className="flex items-start space-x-2">
                                  {isComplete ? (
                                    <CheckSquare className="w-4 h-4 text-green-600 mt-0.5" />
                                  ) : task.required ? (
                                    <Square className="w-4 h-4 text-red-600 mt-0.5" />
                                  ) : (
                                    <Square className="w-4 h-4 text-gray-400 mt-0.5" />
                                  )}
                                  <div className="flex-1">
                                    <p className={`text-sm ${isComplete ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                                      {task.label}
                                      {task.required && <span className="text-red-500 ml-1">*</span>}
                                    </p>
                                    <p className="text-xs text-gray-500">{task.description}</p>
                                    {task.action && !isComplete && (isAdmin() || isCoordinator()) && (
                                      <button
                                        onClick={async () => {
                                          if (task.action) {
                                            await task.action();
                                            setTaskStatuses(prev => ({ ...prev, [task.id]: true }));
                                            onRefresh();
                                          }
                                        }}
                                        className="mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                      >
                                        {task.actionLabel || 'Complete Task'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Automatic Actions */}
                        {stage.automaticActions.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Automatic Actions:</h5>
                            <div className="space-y-1">
                              {stage.automaticActions.map(action => (
                                <div key={action.id} className="flex items-center space-x-2">
                                  <Zap className="w-3 h-3 text-yellow-600" />
                                  <p className="text-xs text-gray-600">
                                    {action.label} ({action.trigger})
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notifications */}
                        {stage.notifications.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Notifications:</h5>
                            <div className="space-y-1">
                              {stage.notifications.map((notif, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <Bell className={`w-3 h-3 ${notif.urgent ? 'text-red-600' : 'text-blue-600'}`} />
                                  <p className="text-xs text-gray-600">
                                    {notif.recipients.join(', ')} on {notif.trigger}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Stage Details */}
        <div className={`mt-8 p-4 rounded-lg ${currentStageConfig.bgColor} ${currentStageConfig.borderColor} border`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={`font-semibold ${currentStageConfig.color}`}>
                Current Stage: {currentStageConfig.label}
              </h4>
              <p className="text-sm text-gray-700 mt-1">{currentStageConfig.description}</p>
              
              {/* Task Checklist */}
              <div className="mt-4 space-y-2">
                {currentStageConfig.requiredTasks.map(task => {
                  const isComplete = task.validator(exchange) || taskStatuses[task.id];
                  
                  return (
                    <div key={task.id} className="flex items-center space-x-2">
                      {isComplete ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                      )}
                      <span className={`text-sm ${isComplete ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                        {task.label}
                        {task.required && !isComplete && <span className="text-red-500 ml-1">*</span>}
                      </span>
                      {task.action && !isComplete && (isAdmin() || isCoordinator()) && (
                        <button
                          onClick={async () => {
                            if (task.action) {
                              await task.action();
                              setTaskStatuses(prev => ({ ...prev, [task.id]: true }));
                              onRefresh();
                            }
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium ml-auto"
                        >
                          {task.actionLabel || 'Complete'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Stage Actions */}
              {currentStageConfig.requiresApproval && !canAdvance && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <p className="text-sm text-yellow-800">
                      This stage requires admin approval to proceed
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Stage Metadata */}
            <div className="ml-6 space-y-2 text-sm">
              {currentStageConfig.autoAdvance && (
                <div className="flex items-center space-x-2">
                  <PlayCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">Auto-advances when complete</span>
                </div>
              )}
              {currentStageConfig.requiresApproval && (
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-orange-600" />
                  <span className="text-gray-600">Requires approval</span>
                </div>
              )}
              {currentStageConfig.daysToComplete && (
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-600">{currentStageConfig.daysToComplete} days to complete</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default ExchangeStageManager;