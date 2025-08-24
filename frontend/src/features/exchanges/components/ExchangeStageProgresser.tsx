import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  EXCHANGE_STAGES, 
  ExchangeStage, 
  ExchangeStageProgress,
  getCurrentStage,
  getNextStages,
  getStageProgress,
  canTransitionToStage 
} from '../../../types/exchangeStages';
import { Exchange } from '../../../types';
import { 
  calculateExchangeProgress, 
  getCurrentExchangeStage, 
  getDaysUntilDeadline,
  getStageName 
} from '../../../utils/exchangeProgress';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  ArrowRight, 
  AlertTriangle, 
  User, 
  Zap, 
  ChevronRight,
  PlayCircle,
  PauseCircle
} from 'lucide-react';

interface ExchangeStageProgresserProps {
  exchange: Exchange;
  stageProgress?: ExchangeStageProgress;
  onStageTransition?: (targetStageId: string, notes?: string) => void;
  readOnly?: boolean;
  variant?: 'compact' | 'detailed';
}

export const ExchangeStageProgresser: React.FC<ExchangeStageProgresserProps> = ({
  exchange,
  stageProgress,
  onStageTransition,
  readOnly = false,
  variant = 'detailed'
}) => {
  const [showActions, setShowActions] = useState(false);
  const [transitionNotes, setTransitionNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  // Calculate real stage progress based on exchange dates
  const calculateStageProgress = (): ExchangeStageProgress => {
    const today = new Date();
    
    // Extract real dates from exchange (with proper typing)
    const exchangeData = exchange as any;
    const closeOfEscrowDate = exchangeData.close_of_escrow_date || exchange.startDate || exchange.createdAt;
    const proceedsReceivedDate = exchangeData.proceeds_received_date || closeOfEscrowDate;
    const day45 = exchangeData.day_45 || exchange.identificationDeadline;
    const day180 = exchangeData.day_180 || exchange.completionDeadline;
    
    // Calculate 45 and 180 day dates from close of escrow if not provided
    const escrowDate = closeOfEscrowDate ? new Date(closeOfEscrowDate) : new Date();
    const calculated45Day = day45 ? new Date(day45) : new Date(escrowDate.getTime() + (45 * 24 * 60 * 60 * 1000));
    const calculated180Day = day180 ? new Date(day180) : new Date(escrowDate.getTime() + (180 * 24 * 60 * 60 * 1000));
    
    // Determine current stage based on real dates and status
    let currentStage = 'EXCHANGE_CREATED';
    let stageHistory: any[] = [];
    
    if (exchange.status === 'COMPLETED' || exchange.status === 'Completed') {
      currentStage = 'EXCHANGE_COMPLETED';
      stageHistory = [
        { stageId: 'EXCHANGE_CREATED', enteredAt: exchange.createdAt, exitedAt: closeOfEscrowDate, triggeredBy: 'system' },
        { stageId: 'FUNDS_RECEIVED', enteredAt: closeOfEscrowDate, exitedAt: proceedsReceivedDate, triggeredBy: 'system' },
        { stageId: 'IDENTIFICATION_OPEN', enteredAt: proceedsReceivedDate, exitedAt: calculated45Day, triggeredBy: 'system' },
        { stageId: 'CLOSING_PERIOD', enteredAt: calculated45Day, exitedAt: calculated180Day, triggeredBy: 'system' },
        { stageId: 'EXCHANGE_COMPLETED', enteredAt: calculated180Day, triggeredBy: 'system' }
      ];
    } else if (today > calculated180Day) {
      currentStage = 'EXCHANGE_OVERDUE';
      stageHistory = [
        { stageId: 'EXCHANGE_CREATED', enteredAt: exchange.createdAt, exitedAt: closeOfEscrowDate, triggeredBy: 'system' },
        { stageId: 'FUNDS_RECEIVED', enteredAt: closeOfEscrowDate, exitedAt: proceedsReceivedDate, triggeredBy: 'system' },
        { stageId: 'IDENTIFICATION_OPEN', enteredAt: proceedsReceivedDate, exitedAt: calculated45Day, triggeredBy: 'system' },
        { stageId: 'CLOSING_PERIOD', enteredAt: calculated45Day, exitedAt: calculated180Day, triggeredBy: 'system' },
        { stageId: 'EXCHANGE_OVERDUE', enteredAt: calculated180Day, triggeredBy: 'system' }
      ];
    } else if (today > calculated45Day) {
      currentStage = 'CLOSING_PERIOD';
      stageHistory = [
        { stageId: 'EXCHANGE_CREATED', enteredAt: exchange.createdAt, exitedAt: closeOfEscrowDate, triggeredBy: 'system' },
        { stageId: 'FUNDS_RECEIVED', enteredAt: closeOfEscrowDate, exitedAt: proceedsReceivedDate, triggeredBy: 'system' },
        { stageId: 'IDENTIFICATION_OPEN', enteredAt: proceedsReceivedDate, exitedAt: calculated45Day, triggeredBy: 'system' },
        { stageId: 'CLOSING_PERIOD', enteredAt: calculated45Day, triggeredBy: 'system' }
      ];
    } else if (proceedsReceivedDate && today >= new Date(proceedsReceivedDate)) {
      currentStage = 'IDENTIFICATION_OPEN';
      stageHistory = [
        { stageId: 'EXCHANGE_CREATED', enteredAt: exchange.createdAt, exitedAt: closeOfEscrowDate, triggeredBy: 'system' },
        { stageId: 'FUNDS_RECEIVED', enteredAt: closeOfEscrowDate, exitedAt: proceedsReceivedDate, triggeredBy: 'system' },
        { stageId: 'IDENTIFICATION_OPEN', enteredAt: proceedsReceivedDate, triggeredBy: 'system' }
      ];
    } else if (closeOfEscrowDate && today >= new Date(closeOfEscrowDate)) {
      currentStage = 'FUNDS_RECEIVED';
      stageHistory = [
        { stageId: 'EXCHANGE_CREATED', enteredAt: exchange.createdAt, exitedAt: closeOfEscrowDate, triggeredBy: 'system' },
        { stageId: 'FUNDS_RECEIVED', enteredAt: closeOfEscrowDate, triggeredBy: 'system' }
      ];
    }
    
    // Determine next possible stages
    const nextPossibleStages = [];
    if (currentStage === 'IDENTIFICATION_OPEN') {
      nextPossibleStages.push('PROPERTY_IDENTIFIED', 'CLOSING_PERIOD');
    } else if (currentStage === 'CLOSING_PERIOD') {
      nextPossibleStages.push('EXCHANGE_COMPLETED');
    }
    
    return {
      exchangeId: exchange.id,
      currentStage,
      stageHistory,
      nextPossibleStages,
      blockers: []
    };
  };

  const realStageProgress = stageProgress || calculateStageProgress();

  // Use unified progress calculation
  const progress = calculateExchangeProgress(exchange);
  const currentExchangeStage = getCurrentExchangeStage(exchange);
  const currentStageName = getStageName(currentExchangeStage);
  
  // Try to map to existing stage system, fallback to finding current stage
  const currentStage = getCurrentStage(realStageProgress.stageHistory);
  const nextStages = getNextStages(realStageProgress.currentStage);

  const getStageIcon = (stage: ExchangeStage, isCompleted: boolean, isCurrent: boolean) => {
    if (isCompleted) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    if (isCurrent) {
      return <Clock className="w-5 h-5 text-blue-600" />;
    }
    return <Circle className="w-5 h-5 text-gray-300" />;
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'auto':
        return <Zap className="w-4 h-4 text-green-600" />;
      case 'manual':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'suggested':
        return <PlayCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleStageTransition = (targetStageId: string) => {
    if (!canTransitionToStage(realStageProgress.currentStage, targetStageId)) {
      alert('Cannot transition to this stage from current stage');
      return;
    }
    
    onStageTransition?.(targetStageId, transitionNotes);
    setTransitionNotes('');
    setSelectedAction(null);
    setShowActions(false);
    setButtonRect(null);
  };

  const isStageCompleted = (stageId: string): boolean => {
    return realStageProgress.stageHistory.some(h => h.stageId === stageId && h.exitedAt);
  };

  const isCurrentStage = (stageId: string): boolean => {
    return realStageProgress.currentStage === stageId;
  };

  if (variant === 'compact') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 relative z-[9999]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Exchange Progress</h3>
          <span className="text-sm text-gray-500">{progress}% Complete</span>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {currentStage && getStageIcon(currentStage, false, true)}
            <span className="font-medium text-gray-900">
              {currentStageName}
            </span>
          </div>
          
          {!readOnly && nextStages.length > 0 && (
            <button
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setButtonRect(rect);
                setShowActions(!showActions);
              }}
              className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:text-blue-700 rounded"
            >
              <ChevronRight className="w-4 h-4" />
              Next
            </button>
          )}
        </div>

        {showActions && nextStages.length > 0 && buttonRect && createPortal(
          <>
            {/* Backdrop to close popup */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setShowActions(false)}
            />
            {/* Popup */}
            <div 
              className="fixed w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-[9999] p-3"
              style={{
                top: buttonRect.bottom + window.scrollY + 4,
                left: Math.max(8, buttonRect.left + window.scrollX - 200), // Ensure it doesn't go off-screen
              }}
            >
              <p className="text-xs text-gray-600 mb-2">Available Actions:</p>
              {currentStage?.actions?.map(action => (
                <button
                  key={action.id}
                  onClick={() => action.nextStage && handleStageTransition(action.nextStage)}
                  className="block w-full text-left px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  {getActionIcon(action.type)}
                  <span className="ml-2">{action.label}</span>
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Exchange Stage Progress</h3>
            <p className="text-sm text-gray-600 mt-1">
              Current: {currentStageName} • {progress}% Complete
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{progress}%</div>
            <div className="text-xs text-gray-500">Progress</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stage Timeline */}
      <div className="p-6">
        <div className="space-y-4">
          {EXCHANGE_STAGES.filter(stage => stage.order < 99).map((stage, index) => {
            const isCompleted = isStageCompleted(stage.id);
            const isCurrent = isCurrentStage(stage.id);
            const isNext = nextStages.some(s => s.id === stage.id);

            return (
              <div 
                key={stage.id}
                className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
                  isCurrent ? 'bg-blue-50 border border-blue-200' :
                  isCompleted ? 'bg-green-50' :
                  isNext ? 'bg-yellow-50' :
                  'bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  {getStageIcon(stage, isCompleted, isCurrent)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-semibold ${
                      isCurrent ? 'text-blue-900' :
                      isCompleted ? 'text-green-900' :
                      'text-gray-900'
                    }`}>
                      {stage.name}
                      {isCurrent && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Current
                        </span>
                      )}
                    </h4>
                    
                    {stage.estimatedDuration && (
                      <span className="text-xs text-gray-500">
                        ~{stage.estimatedDuration} day{stage.estimatedDuration !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mt-1">{stage.description}</p>

                  {stage.requirements && stage.requirements.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700">Requirements:</p>
                      <ul className="text-xs text-gray-600 mt-1 space-y-1">
                        {stage.requirements.map((req, idx) => (
                          <li key={idx} className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions for current stage */}
                  {isCurrent && stage.actions && stage.actions.length > 0 && !readOnly && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Available Actions:</p>
                      <div className="space-y-2">
                        {stage.actions.map(action => (
                          <div key={action.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getActionIcon(action.type)}
                              <div>
                                <p className="text-sm font-medium text-gray-900">{action.label}</p>
                                {action.description && (
                                  <p className="text-xs text-gray-600">{action.description}</p>
                                )}
                              </div>
                            </div>
                            
                            {action.nextStage && (
                              <button
                                onClick={() => handleStageTransition(action.nextStage!)}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                                  action.type === 'auto' ? 'bg-green-600 text-white hover:bg-green-700' :
                                  action.type === 'manual' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                                  'bg-yellow-600 text-white hover:bg-yellow-700'
                                }`}
                                disabled={action.requiresApproval}
                              >
                                {action.type === 'auto' ? 'Auto' : 'Execute'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions Footer */}
      {!readOnly && nextStages.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {nextStages.length} next stage{nextStages.length !== 1 ? 's' : ''} available
            </p>
            <div className="flex items-center gap-2">
              {realStageProgress.blockers && realStageProgress.blockers.length > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs">{realStageProgress.blockers.length} blocker(s)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExchangeStageProgresser;