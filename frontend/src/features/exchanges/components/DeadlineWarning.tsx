import React from 'react';
import { ExclamationTriangleIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface DeadlineWarningProps {
  identificationDeadline?: string | null;
  exchangeDeadline?: string | null;
  status?: string;
  compact?: boolean;
}

export const DeadlineWarning: React.FC<DeadlineWarningProps> = ({ 
  identificationDeadline, 
  exchangeDeadline, 
  status,
  compact = false 
}) => {
  const calculateDaysRemaining = (deadline: string | null | undefined): number | null => {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getWarningLevel = (daysRemaining: number | null, is180Day: boolean = false) => {
    if (daysRemaining === null) return null;
    
    if (daysRemaining < 0) {
      return { level: 'overdue', color: 'red', icon: ExclamationTriangleIcon };
    }
    
    // Different thresholds for 45-day vs 180-day
    const criticalThreshold = is180Day ? 14 : 7;
    const warningThreshold = is180Day ? 30 : 14;
    
    if (daysRemaining <= criticalThreshold) {
      return { level: 'critical', color: 'red', icon: ExclamationTriangleIcon };
    }
    if (daysRemaining <= warningThreshold) {
      return { level: 'warning', color: 'yellow', icon: ClockIcon };
    }
    return { level: 'safe', color: 'green', icon: CheckCircleIcon };
  };

  // Don't show warnings for completed exchanges
  if (status === 'COMPLETED' || status === 'completed' || status === 'TERMINATED' || status === 'terminated') {
    return null;
  }

  const days45 = calculateDaysRemaining(identificationDeadline);
  const days180 = calculateDaysRemaining(exchangeDeadline);
  
  const warning45 = getWarningLevel(days45, false);
  const warning180 = getWarningLevel(days180, true);
  
  // Determine which warning to show (prioritize most urgent)
  let primaryWarning = null;
  let warningMessage = '';
  
  if (warning45?.level === 'overdue') {
    primaryWarning = warning45;
    warningMessage = `45-day deadline passed ${Math.abs(days45!)} days ago`;
  } else if (warning180?.level === 'overdue') {
    primaryWarning = warning180;
    warningMessage = `180-day deadline passed ${Math.abs(days180!)} days ago`;
  } else if (warning45?.level === 'critical') {
    primaryWarning = warning45;
    warningMessage = `45-day deadline in ${days45} days`;
  } else if (warning180?.level === 'critical') {
    primaryWarning = warning180;
    warningMessage = `180-day deadline in ${days180} days`;
  } else if (warning45?.level === 'warning') {
    primaryWarning = warning45;
    warningMessage = `45-day deadline in ${days45} days`;
  } else if (warning180?.level === 'warning') {
    primaryWarning = warning180;
    warningMessage = `180-day deadline in ${days180} days`;
  }
  
  if (!primaryWarning || primaryWarning.level === 'safe') {
    return null;
  }
  
  const Icon = primaryWarning.icon;
  const colorClasses = {
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    green: 'bg-green-50 text-green-700 border-green-200'
  };
  
  if (compact) {
    // Compact version for list views
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClasses[primaryWarning.color as keyof typeof colorClasses]}`}>
        <Icon className="w-3 h-3" />
        <span>{warningMessage}</span>
      </div>
    );
  }
  
  // Full version for detail views
  return (
    <div className={`border rounded-lg p-4 ${colorClasses[primaryWarning.color as keyof typeof colorClasses]}`}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">
            {primaryWarning.level === 'overdue' ? 'Deadline Overdue' : 
             primaryWarning.level === 'critical' ? 'Urgent Action Required' : 
             'Deadline Approaching'}
          </h4>
          <p className="text-sm">{warningMessage}</p>
          
          {/* Show both deadlines */}
          <div className="mt-2 space-y-1">
            {identificationDeadline && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">45-Day:</span>
                <span>{new Date(identificationDeadline).toLocaleDateString()}</span>
                {days45 !== null && (
                  <span className={`ml-auto ${days45 < 0 ? 'text-red-600' : ''}`}>
                    {days45 < 0 ? `${Math.abs(days45)} days overdue` : `${days45} days remaining`}
                  </span>
                )}
              </div>
            )}
            {exchangeDeadline && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">180-Day:</span>
                <span>{new Date(exchangeDeadline).toLocaleDateString()}</span>
                {days180 !== null && (
                  <span className={`ml-auto ${days180 < 0 ? 'text-red-600' : ''}`}>
                    {days180 < 0 ? `${Math.abs(days180)} days overdue` : `${days180} days remaining`}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeadlineWarning;