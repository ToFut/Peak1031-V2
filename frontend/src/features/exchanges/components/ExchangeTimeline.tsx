import React from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle, XCircle, MapPin } from 'lucide-react';

// Custom animation styles
const customStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-6px); }
  }
  
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  
  .animate-fadeIn { animation: fadeIn 0.8s ease-out; }
  .animate-float { animation: float 3s ease-in-out infinite; }
  .animate-shimmer { 
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.getElementById('timeline-custom-styles');
  if (!styleElement) {
    const style = document.createElement('style');
    style.id = 'timeline-custom-styles';
    style.textContent = customStyles;
    document.head.appendChild(style);
  }
}

interface ExchangeTimelineProps {
  startDate?: string | Date;
  identificationDeadline?: string | Date;
  completionDeadline?: string | Date;
  status?: string;
  compact?: boolean;
  showToday?: boolean;
}

export const ExchangeTimeline: React.FC<ExchangeTimelineProps> = ({
  startDate,
  identificationDeadline,
  completionDeadline,
  status,
  compact = false,
  showToday = false
}) => {
  // Get fresh today date every render
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Format today's date for display
  const todayFormatted = today.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });

  // Parse dates
  const start = startDate ? new Date(startDate) : null;
  const deadline45 = identificationDeadline ? new Date(identificationDeadline) : null;
  const deadline180 = completionDeadline ? new Date(completionDeadline) : null;

  // Calculate days for each phase
  const calculateDays = (fromDate: Date | null, toDate: Date | null) => {
    if (!fromDate || !toDate) return null;
    const diff = toDate.getTime() - fromDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Calculate progress for each phase
  const calculatePhaseProgress = (startDate: Date, endDate: Date): number => {
    const total = endDate.getTime() - startDate.getTime();
    const elapsed = Math.min(today.getTime() - startDate.getTime(), total);
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  };

  // Days from start to now
  const daysFromStart = start ? calculateDays(start, today) : null;
  
  // Days to/from 45-day deadline
  const daysTo45 = deadline45 ? calculateDays(today, deadline45) : null;
  const is45Overdue = daysTo45 !== null && daysTo45 < 0;
  
  // Days to/from 180-day deadline
  const daysTo180 = deadline180 ? calculateDays(today, deadline180) : null;
  const is180Overdue = daysTo180 !== null && daysTo180 < 0;

  // Calculate phase progress
  const phase1Progress = start && deadline45 ? calculatePhaseProgress(start, deadline45) : 0;
  const phase2Progress = deadline45 && deadline180 ? calculatePhaseProgress(deadline45, deadline180) : 0;

  // Determine current phase
  const getCurrentPhase = () => {
    if (status === 'COMPLETED' || status === 'Completed') return 'completed';
    if (!deadline45 || !deadline180) return 'setup';
    if (today < deadline45) return 'identification';
    if (today < deadline180) return 'closing';
    return 'overdue';
  };

  const currentPhase = getCurrentPhase();

  // Phase colors
  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'identification':
        return 'bg-blue-500';
      case 'closing':
        return 'bg-green-500';
      case 'overdue':
        return 'bg-red-500';
      case 'completed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getPhaseTextColor = (phase: string) => {
    switch (phase) {
      case 'identification':
        return 'text-blue-600';
      case 'closing':
        return 'text-green-600';
      case 'overdue':
        return 'text-red-600';
      case 'completed':
        return 'text-gray-600';
      default:
        return 'text-gray-500';
    }
  };

  if (compact) {
    // Compact view for cards
    return (
      <div className="space-y-2">
        {/* Timeline Bar */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Exchange Timeline</span>
            <span className={`text-xs font-medium ${getPhaseTextColor(currentPhase)}`}>
              {currentPhase === 'identification' && '45-Day Period'}
              {currentPhase === 'closing' && '180-Day Period'}
              {currentPhase === 'overdue' && 'Overdue'}
              {currentPhase === 'completed' && 'Completed'}
            </span>
          </div>
          
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            {/* 45-day phase */}
            <div 
              className={`absolute left-0 top-0 h-full ${is45Overdue ? 'bg-red-400' : 'bg-blue-400'} transition-all duration-300`}
              style={{ width: `${Math.min(33, phase1Progress * 0.33)}%` }}
            />
            
            {/* 180-day phase */}
            {deadline45 && today > deadline45 && (
              <div 
                className={`absolute top-0 h-full ${is180Overdue ? 'bg-red-400' : 'bg-green-400'} transition-all duration-300`}
                style={{ 
                  left: '33%',
                  width: `${Math.min(67, phase2Progress * 0.67)}%` 
                }}
              />
            )}
            
            {/* Markers */}
            <div className="absolute top-1/2 transform -translate-y-1/2 left-[33%] w-0.5 h-4 bg-gray-600" />
            <div className="absolute top-1/2 transform -translate-y-1/2 right-0 w-0.5 h-4 bg-gray-600" />
          </div>
        </div>
        
        {/* Key Dates */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Start</span>
            <div className="font-medium">
              {start ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
            </div>
          </div>
          <div className={is45Overdue ? 'text-red-600' : ''}>
            <span className="text-gray-500">45-Day</span>
            <div className="font-medium">
              {deadline45 ? deadline45.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
              {daysTo45 !== null && (
                <span className="ml-1">
                  ({daysTo45 >= 0 ? `${daysTo45}d` : `${Math.abs(daysTo45)}d ago`})
                </span>
              )}
            </div>
          </div>
          <div className={is180Overdue ? 'text-red-600' : ''}>
            <span className="text-gray-500">180-Day</span>
            <div className="font-medium">
              {deadline180 ? deadline180.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
              {daysTo180 !== null && (
                <span className="ml-1">
                  ({daysTo180 >= 0 ? `${daysTo180}d` : `${Math.abs(daysTo180)}d ago`})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate today's position on timeline
  const calculateTodayPosition = () => {
    if (!start || !deadline180) return null;
    const totalDays = calculateDays(start, deadline180) || 180;
    const elapsedDays = calculateDays(start, today) || 0;
    return Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  };
  
  const todayPosition = calculateTodayPosition();

  // Full view for detail pages
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-gray-600" />
            Exchange Timeline
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Today: <span className="font-medium">{today.toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}</span>
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          currentPhase === 'overdue' ? 'bg-red-100 text-red-700 animate-pulse' :
          currentPhase === 'completed' ? 'bg-green-100 text-green-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {currentPhase === 'identification' && '45-Day Identification Period'}
          {currentPhase === 'closing' && '180-Day Closing Period'}
          {currentPhase === 'overdue' && 'Exchange Overdue'}
          {currentPhase === 'completed' && 'Exchange Completed'}
          {currentPhase === 'setup' && 'Timeline Not Set'}
        </span>
      </div>

      {/* Timeline Visualization */}
      <div className="relative mb-8">
        <div className="absolute left-0 top-6 w-full h-1 bg-gray-200"></div>
        
        {/* Elegant Small Today Marker */}
        {showToday && todayPosition !== null && status !== 'COMPLETED' && status !== 'Completed' && (
          <div 
            className="absolute top-2 z-20 group cursor-pointer"
            style={{ left: `${todayPosition}%`, transform: 'translateX(-50%)' }}
          >
            {/* Compact Badge */}
            <div className="relative">
              {/* Subtle glow */}
              <div className="absolute inset-0 bg-blue-400 rounded-full blur-sm opacity-40 animate-pulse"></div>
              
              {/* Main badge */}
              <div className="relative px-2 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg text-xs font-medium">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  <span className="whitespace-nowrap">{todayFormatted}</span>
                </div>
              </div>
              
              {/* Small indicator line */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0.5 h-3 bg-blue-500 opacity-80"></div>
              
              {/* Timeline dot */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 translate-y-2 w-2 h-2 bg-blue-500 border-2 border-white rounded-full shadow-sm">
                <div className="w-full h-full bg-blue-400 rounded-full animate-ping opacity-75"></div>
              </div>
            </div>

            {/* Compact hover tooltip */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-30">
              <div className="px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap">
                Today: {today.toLocaleDateString('en-US', { 
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric'
                })}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-l-transparent border-r-2 border-r-transparent border-b-2 border-b-gray-800"></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Timeline Nodes */}
        <div className="relative flex justify-between">
          {/* Start Node */}
          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center z-10 ${
              start ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              <Calendar className="w-6 h-6" />
            </div>
            <div className="mt-2 text-center">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Start Date</p>
              <p className="text-lg font-black text-gray-900">
                {start ? start.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                }) : 'Not Set'}
              </p>
              {daysFromStart !== null && (
                <p className="text-xs text-gray-600 font-medium mt-1">
                  {daysFromStart} days ago
                </p>
              )}
            </div>
          </div>

          {/* 45-Day Node */}
          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center z-10 ${
              is45Overdue ? 'bg-red-500 text-white animate-pulse' :
              deadline45 && today >= deadline45 ? 'bg-green-500 text-white' :
              deadline45 ? 'bg-blue-500 text-white' :
              'bg-gray-300 text-gray-600'
            }`}>
              {is45Overdue ? <AlertCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
            </div>
            <div className="mt-2 text-center">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">45-Day Deadline</p>
              <p className={`text-lg font-black ${is45Overdue ? 'text-red-600' : 'text-gray-900'}`}>
                {deadline45 ? deadline45.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                }) : 'Not Set'}
              </p>
              {daysTo45 !== null && (
                <div className={`mt-2 px-3 py-1.5 rounded-lg ${
                  is45Overdue ? 'bg-red-600 text-white animate-pulse' : 
                  daysTo45 <= 7 ? 'bg-orange-500 text-white' :
                  'bg-blue-600 text-white'
                }`}>
                  <p className="text-sm font-extrabold">
                    {daysTo45 >= 0 ? `${daysTo45} DAYS LEFT` : `${Math.abs(daysTo45)} DAYS OVERDUE`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 180-Day Node */}
          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center z-10 ${
              status === 'COMPLETED' || status === 'Completed' ? 'bg-green-500 text-white' :
              is180Overdue ? 'bg-red-500 text-white animate-pulse' :
              deadline180 ? 'bg-purple-500 text-white' :
              'bg-gray-300 text-gray-600'
            }`}>
              {status === 'COMPLETED' || status === 'Completed' ? <CheckCircle className="w-6 h-6" /> :
               is180Overdue ? <XCircle className="w-6 h-6" /> : 
               <Clock className="w-6 h-6" />}
            </div>
            <div className="mt-2 text-center">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">180-Day Deadline</p>
              <p className={`text-lg font-black ${is180Overdue && status !== 'COMPLETED' ? 'text-red-600' : 'text-gray-900'}`}>
                {deadline180 ? deadline180.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                }) : 'Not Set'}
              </p>
              {daysTo180 !== null && status !== 'COMPLETED' && status !== 'Completed' && (
                <div className={`mt-2 px-3 py-1.5 rounded-lg ${
                  is180Overdue ? 'bg-red-600 text-white animate-pulse' : 
                  daysTo180 <= 30 ? 'bg-orange-500 text-white' :
                  'bg-purple-600 text-white'
                }`}>
                  <p className="text-sm font-extrabold">
                    {daysTo180 >= 0 ? `${daysTo180} DAYS LEFT` : `${Math.abs(daysTo180)} DAYS OVERDUE`}
                  </p>
                </div>
              )}
              {(status === 'COMPLETED' || status === 'Completed') && (
                <div className="mt-2 px-3 py-1.5 bg-green-600 text-white rounded-lg">
                  <p className="text-sm font-extrabold">COMPLETED</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="absolute left-6 right-6 top-6 flex">
          {/* 45-Day Progress */}
          <div className="w-1/2 pr-6">
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  is45Overdue ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${phase1Progress}%` }}
              />
            </div>
          </div>
          
          {/* 180-Day Progress */}
          <div className="w-1/2 pl-6">
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  status === 'COMPLETED' || status === 'Completed' ? 'bg-green-500' :
                  is180Overdue ? 'bg-red-500' : 
                  'bg-purple-500'
                }`}
                style={{ width: `${phase2Progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {daysFromStart || 0}
          </p>
          <p className="text-xs text-gray-600">Days Since Start</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold ${
            is45Overdue ? 'text-red-600' : 'text-blue-600'
          }`}>
            {daysTo45 !== null ? Math.abs(daysTo45) : 0}
          </p>
          <p className="text-xs text-gray-600">
            Days {is45Overdue ? 'Past' : 'Until'} 45-Day
          </p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold ${
            status === 'COMPLETED' || status === 'Completed' ? 'text-green-600' :
            is180Overdue ? 'text-red-600' : 
            'text-purple-600'
          }`}>
            {status === 'COMPLETED' || status === 'Completed' ? '✓' :
             daysTo180 !== null ? Math.abs(daysTo180) : 0}
          </p>
          <p className="text-xs text-gray-600">
            {status === 'COMPLETED' || status === 'Completed' ? 'Completed' :
             is180Overdue ? 'Days Past 180-Day' : 'Days Until 180-Day'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExchangeTimeline;