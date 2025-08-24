import React, { useState, useEffect } from 'react';
import { Exchange } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { Calendar, Clock, AlertTriangle, CheckCircle, MessageCircle, FileText, Building2 } from 'lucide-react';

interface ClientCountdownViewProps {
  exchange: Exchange;
  variant?: 'banner' | 'card' | 'widget';
}

export const ClientCountdownView: React.FC<ClientCountdownViewProps> = ({
  exchange,
  variant = 'banner'
}) => {
  const { user } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    deadline: '45' | '180' | null;
    isOverdue: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    deadline: null,
    isOverdue: false
  });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const day45 = exchange.identificationDeadline;
      const day180 = exchange.completionDeadline;
      
      let targetDate: Date | null = null;
      let deadline: '45' | '180' | null = null;
      
      // Determine which deadline is most relevant
      if (day45 && new Date(day45) > now) {
        targetDate = new Date(day45);
        deadline = '45';
      } else if (day180 && new Date(day180) > now) {
        targetDate = new Date(day180);
        deadline = '180';
      } else if (day45) {
        targetDate = new Date(day45);
        deadline = '45';
      } else if (day180) {
        targetDate = new Date(day180);
        deadline = '180';
      }
      
      if (targetDate) {
        const diff = targetDate.getTime() - now.getTime();
        const isOverdue = diff < 0;
        const absDiff = Math.abs(diff);
        
        const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeRemaining({ days, hours, minutes, deadline, isOverdue });
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [exchange]);

  const getGreeting = () => {
    const firstName = user?.first_name || user?.firstName || 'Client';
    const hour = new Date().getHours();
    
    if (hour < 12) return `Good morning, ${firstName}`;
    if (hour < 17) return `Good afternoon, ${firstName}`;
    return `Good evening, ${firstName}`;
  };

  const getDeadlineMessage = () => {
    const { days, hours, deadline, isOverdue } = timeRemaining;
    
    if (!deadline) return null;
    
    const deadlineType = deadline === '45' ? '45-Day Identification' : '180-Day Exchange Completion';
    
    if (isOverdue) {
      return {
        title: `${deadlineType} Deadline Passed`,
        message: `The ${deadlineType.toLowerCase()} deadline was ${days} day${days !== 1 ? 's' : ''} ago. Please contact your coordinator immediately.`,
        urgency: 'critical' as const,
        action: 'Contact coordinator immediately'
      };
    }
    
    if (deadline === '45') {
      if (days === 0) {
        return {
          title: 'Final Hours to Identify Properties!',
          message: `You have only ${hours} hour${hours !== 1 ? 's' : ''} left to identify your replacement properties. This deadline cannot be extended.`,
          urgency: 'critical' as const,
          action: 'Identify properties now'
        };
      } else if (days <= 3) {
        return {
          title: 'Urgent: Property Identification Required',
          message: `You have ${days} day${days !== 1 ? 's' : ''} left to identify your replacement properties. This is a critical deadline that cannot be extended.`,
          urgency: 'critical' as const,
          action: 'Identify properties ASAP'
        };
      } else if (days <= 10) {
        return {
          title: 'Important: Identify Your Replacement Properties',
          message: `You have ${days} days to identify your replacement properties. Start your property search now to avoid missing this critical deadline.`,
          urgency: 'warning' as const,
          action: 'Start property search'
        };
      } else {
        return {
          title: '45-Day Identification Period Active',
          message: `You have ${days} days to identify your replacement properties. Use this time to research and select suitable properties.`,
          urgency: 'info' as const,
          action: 'Begin property research'
        };
      }
    } else {
      if (days === 0) {
        return {
          title: 'Final Hours to Complete Exchange!',
          message: `You have only ${hours} hour${hours !== 1 ? 's' : ''} left to complete your exchange. Contact your coordinator immediately.`,
          urgency: 'critical' as const,
          action: 'Complete exchange now'
        };
      } else if (days <= 7) {
        return {
          title: 'Urgent: Exchange Completion Required',
          message: `You have ${days} day${days !== 1 ? 's' : ''} left to complete your exchange. Ensure all closing documents are ready.`,
          urgency: 'critical' as const,
          action: 'Finalize closing'
        };
      } else if (days <= 30) {
        return {
          title: 'Exchange Completion Approaching',
          message: `You have ${days} days to complete your exchange. Work with your coordinator to prepare for closing.`,
          urgency: 'warning' as const,
          action: 'Prepare for closing'
        };
      } else {
        return {
          title: '180-Day Exchange Period Active',
          message: `You have ${days} days to complete your exchange. Stay in regular contact with your coordinator.`,
          urgency: 'info' as const,
          action: 'Stay in contact'
        };
      }
    }
  };

  const deadlineInfo = getDeadlineMessage();

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-900',
          accent: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-900',
          accent: 'text-yellow-600',
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-900',
          accent: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
    }
  };

  if (variant === 'widget') {
    return (
      <div className="bg-white rounded-lg shadow border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Exchange Countdown</h3>
        </div>
        
        {deadlineInfo ? (
          <div className="space-y-2">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getUrgencyStyles(deadlineInfo.urgency).accent}`}>
                {timeRemaining.isOverdue ? '-' : ''}{timeRemaining.days}
              </div>
              <div className="text-sm text-gray-600">
                {timeRemaining.days === 1 ? 'day' : 'days'} {timeRemaining.isOverdue ? 'overdue' : 'remaining'}
              </div>
            </div>
            <div className="text-xs text-center text-gray-500">
              {timeRemaining.deadline === '45' ? '45-Day Deadline' : '180-Day Deadline'}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm">
            No active deadlines
          </div>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return deadlineInfo ? (
      <div className={`rounded-lg border p-6 ${getUrgencyStyles(deadlineInfo.urgency).bg}`}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {deadlineInfo.urgency === 'critical' ? (
              <AlertTriangle className={`w-8 h-8 ${getUrgencyStyles(deadlineInfo.urgency).accent}`} />
            ) : (
              <Clock className={`w-8 h-8 ${getUrgencyStyles(deadlineInfo.urgency).accent}`} />
            )}
          </div>
          
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${getUrgencyStyles(deadlineInfo.urgency).text}`}>
              {deadlineInfo.title}
            </h3>
            <p className={`mt-2 ${getUrgencyStyles(deadlineInfo.urgency).text}`}>
              {deadlineInfo.message}
            </p>
            
            <div className="mt-4 flex items-center gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getUrgencyStyles(deadlineInfo.urgency).accent}`}>
                  {timeRemaining.isOverdue ? '-' : ''}{timeRemaining.days}
                </div>
                <div className="text-sm text-gray-600">Days</div>
              </div>
              
              <div className="text-center">
                <div className={`text-2xl font-bold ${getUrgencyStyles(deadlineInfo.urgency).accent}`}>
                  {timeRemaining.hours}
                </div>
                <div className="text-sm text-gray-600">Hours</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : null;
  }

  // Banner variant (default)
  return deadlineInfo ? (
    <div className={`rounded-lg border p-4 mb-6 ${getUrgencyStyles(deadlineInfo.urgency).bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            {deadlineInfo.urgency === 'critical' ? (
              <AlertTriangle className={`w-6 h-6 ${getUrgencyStyles(deadlineInfo.urgency).accent}`} />
            ) : (
              <Clock className={`w-6 h-6 ${getUrgencyStyles(deadlineInfo.urgency).accent}`} />
            )}
          </div>
          
          <div>
            <p className={`text-sm ${getUrgencyStyles(deadlineInfo.urgency).text}`}>
              {getGreeting()}! {deadlineInfo.message}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className={`text-xl font-bold ${getUrgencyStyles(deadlineInfo.urgency).accent}`}>
              {timeRemaining.isOverdue ? '-' : ''}{timeRemaining.days}
            </div>
            <div className="text-xs text-gray-600">
              {timeRemaining.days === 1 ? 'day' : 'days'} {timeRemaining.isOverdue ? 'overdue' : 'left'}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${getUrgencyStyles(deadlineInfo.urgency).button}`}>
              <MessageCircle className="w-4 h-4 inline mr-1" />
              Contact Coordinator
            </button>
            
            <button className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <FileText className="w-4 h-4 inline mr-1" />
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;
};

export default ClientCountdownView;