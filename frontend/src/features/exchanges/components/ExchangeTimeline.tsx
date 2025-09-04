import React from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle, XCircle, MapPin, DollarSign } from 'lucide-react';

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
  closeOfEscrowDate?: string | Date;
  dateProceedsReceived?: string | Date;
  propertiesIdentified?: boolean;
}

export const ExchangeTimeline: React.FC<ExchangeTimelineProps> = ({
  startDate,
  identificationDeadline,
  completionDeadline,
  status,
  compact = false,
  showToday = false,
  closeOfEscrowDate,
  dateProceedsReceived,
  propertiesIdentified = false
}) => {
  // Get fresh today date every render
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Format today's date for display
  const todayFormatted = today.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });

  // Parse dates - Use Close of Escrow as the KEY date
  const escrowClose = closeOfEscrowDate ? new Date(closeOfEscrowDate) : null;
  const proceedsDate = dateProceedsReceived ? new Date(dateProceedsReceived) : null;
  
  
  // Check if proceeds and escrow dates are close (within 3 days)
  const areDatesClose = (date1: Date | null, date2: Date | null): boolean => {
    if (!date1 || !date2) return false;
    const diff = Math.abs(date1.getTime() - date2.getTime());
    return diff <= (3 * 24 * 60 * 60 * 1000); // 3 days in milliseconds
  };
  
  const proceedsAndEscrowClose = areDatesClose(proceedsDate, escrowClose);
  
  // Calculate Day 45 and Day 180 from either Proceeds Received or Close of Escrow (whichever exists)
  const referenceDate = proceedsDate || escrowClose;
  const deadline45 = referenceDate ? new Date(referenceDate.getTime() + (45 * 24 * 60 * 60 * 1000)) : 
                      (identificationDeadline ? new Date(identificationDeadline) : null);
  const deadline180 = referenceDate ? new Date(referenceDate.getTime() + (180 * 24 * 60 * 60 * 1000)) :
                       (completionDeadline ? new Date(completionDeadline) : null);
  
  // For backwards compatibility with old data
  const start = startDate ? new Date(startDate) : (proceedsDate || escrowClose);

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

  // Calculate today's position on timeline (visual positioning between timeline nodes)
  const calculateTodayPosition = () => {
    if (!start || !deadline45 || !deadline180) return null;
    
    const elapsedDays = calculateDays(start, today) || 0;
    const days45 = calculateDays(start, deadline45) || 45;
    const days180 = calculateDays(start, deadline180) || 180;
    
    // Position relative to visual timeline segments
    if (elapsedDays <= days45) {
      // In first segment (0% to 50% of visual timeline)
      const progress = elapsedDays / days45;
      return progress * 50; // Scale to first half of visual timeline
    } else {
      // In second segment (50% to 100% of visual timeline)  
      const remainingDays = elapsedDays - days45;
      const secondSegmentDays = days180 - days45;
      const progress = Math.min(1, remainingDays / secondSegmentDays);
      return 50 + (progress * 50); // Scale to second half of visual timeline
    }
  };
  
  const todayPosition = calculateTodayPosition();

  // Full view for detail pages - Enhanced Design
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-6 shadow-sm">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <Calendar className="w-5 h-5 mr-3 text-indigo-600" />
          Exchange Timeline
        </h3>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm ${
            currentPhase === 'overdue' ? 'bg-red-500 text-white' :
            currentPhase === 'completed' ? 'bg-green-500 text-white' :
            currentPhase === 'closing' ? 'bg-purple-500 text-white' :
            'bg-indigo-500 text-white'
          }`}>
            {currentPhase === 'identification' && '45-Day Period'}
            {currentPhase === 'closing' && '180-Day Period'}
            {currentPhase === 'overdue' && 'Overdue'}
            {currentPhase === 'completed' && 'Complete'}
            {currentPhase === 'setup' && 'Setup'}
          </span>
          {/* Timeline legend */}
          {showToday && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>Today</span>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Horizontal Timeline */}
      <div className="relative bg-white rounded-lg p-4 shadow-inner">
        {/* Main Timeline Line */}
        <div className="absolute left-0 right-0 top-8 h-1 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full shadow-sm"></div>
        
        {/* Progress Line */}
        <div className="absolute left-0 top-8 h-1 flex rounded-full overflow-hidden">
          {/* Phase 1: Start to Day 45 */}
          <div 
            className={`h-full transition-all duration-700 ease-out rounded-l-full ${
              propertiesIdentified ? 'bg-gradient-to-r from-green-400 to-green-600 shadow-lg' :
              is45Overdue ? 'bg-gradient-to-r from-red-400 to-red-600 shadow-lg' : 'bg-gradient-to-r from-indigo-400 to-blue-600 shadow-lg'
            }`}
            style={{ 
              width: `${Math.min(50, escrowClose && today >= escrowClose ? phase1Progress * 0.5 : 0)}%`
            }}
          />
          {/* Phase 2: Day 45 to Day 180 */}
          <div 
            className={`h-full transition-all duration-700 ease-out ${
              status === 'COMPLETED' || status === 'Completed' ? 'bg-gradient-to-r from-green-400 to-green-600 shadow-lg rounded-r-full' :
              is180Overdue ? 'bg-gradient-to-r from-red-400 to-red-600 shadow-lg' : 'bg-gradient-to-r from-purple-400 to-purple-600 shadow-lg'
            }`}
            style={{ 
              width: `${deadline45 && today >= deadline45 ? phase2Progress * 0.5 : 0}%`
            }}
          />
        </div>
        
        {/* Enhanced Timeline Nodes */}
        <div className="relative flex justify-between items-start py-4">
          
          {/* Escrow Close Node */}
          <div className="flex flex-col items-center transform hover:scale-105 transition-transform">
            <div className={`w-10 h-10 rounded-full border-3 flex items-center justify-center shadow-md ${
              escrowClose ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-500' : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'
            }`}>
              <Calendar className={`w-5 h-5 ${escrowClose ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div className="mt-2 text-center">
              <p className="text-xs font-semibold text-gray-700">Escrow Close</p>
              <p className={`text-sm font-bold ${escrowClose ? 'text-gray-900' : 'text-gray-400'}`}>
                {escrowClose ? escrowClose.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Pending'}
              </p>
            </div>
          </div>

          {/* Proceeds Node (only if different from escrow) */}
          {proceedsDate && !proceedsAndEscrowClose && (
            <div className="flex flex-col items-center transform hover:scale-105 transition-transform">
              <div className="w-8 h-8 rounded-full border-3 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-500 flex items-center justify-center shadow-md">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 text-center">
                <p className="text-xs font-semibold text-gray-700">Proceeds</p>
                <p className="text-sm font-bold text-gray-900">
                  {proceedsDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          )}

          {/* Day 45 Node - Central and prominent */}
          <div className="flex flex-col items-center transform hover:scale-105 transition-transform">
            <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center shadow-lg animate-fadeIn ${
              is45Overdue ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-500' :
              propertiesIdentified ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-500' :
              deadline45 ? 'bg-gradient-to-br from-indigo-50 to-blue-100 border-indigo-500' :
              'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'
            }`}>
              {propertiesIdentified ? (
                <CheckCircle className="w-7 h-7 text-green-600" />
              ) : is45Overdue ? (
                <AlertCircle className="w-7 h-7 text-red-600 animate-pulse" />
              ) : (
                <MapPin className="w-7 h-7 text-indigo-600" />
              )}
            </div>
            <div className="mt-3 text-center">
              <p className="text-sm font-bold text-gray-900 tracking-wide">DAY 45</p>
              <p className={`text-sm font-bold ${is45Overdue ? 'text-red-600' : 'text-gray-900'}`}>
                {deadline45 ? deadline45.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
              </p>
              {daysTo45 !== null && (
                <span className={`inline-block mt-2 px-3 py-1 text-xs font-bold rounded-full shadow-sm ${
                  is45Overdue ? 'bg-red-500 text-white animate-pulse' :
                  daysTo45 <= 7 ? 'bg-orange-500 text-white' :
                  'bg-indigo-500 text-white'
                }`}>
                  {daysTo45 >= 0 ? `${daysTo45} days left` : `${Math.abs(daysTo45)} days over`}
                </span>
              )}
            </div>
          </div>

          {/* Day 180 Node */}
          <div className="flex flex-col items-center transform hover:scale-105 transition-transform">
            <div className={`w-10 h-10 rounded-full border-3 flex items-center justify-center shadow-md ${
              status === 'COMPLETED' || status === 'Completed' ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-500' :
              is180Overdue ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-500' :
              deadline180 ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-500' :
              'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'
            }`}>
              {status === 'COMPLETED' || status === 'Completed' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : is180Overdue ? (
                <XCircle className="w-5 h-5 text-red-600 animate-pulse" />
              ) : (
                <Clock className="w-5 h-5 text-purple-600" />
              )}
            </div>
            <div className="mt-2 text-center">
              <p className="text-xs font-semibold text-gray-700">Day 180</p>
              <p className={`text-sm font-bold ${is180Overdue && status !== 'COMPLETED' ? 'text-red-600' : 'text-gray-900'}`}>
                {deadline180 ? deadline180.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
              </p>
              {daysTo180 !== null && status !== 'COMPLETED' && status !== 'Completed' && (
                <span className={`inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-full shadow-sm ${
                  is180Overdue ? 'bg-red-500 text-white animate-pulse' :
                  daysTo180 <= 30 ? 'bg-orange-500 text-white' :
                  'bg-purple-500 text-white'
                }`}>
                  {daysTo180 >= 0 ? `${daysTo180} days left` : `${Math.abs(daysTo180)} days over`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Combined Proceeds indicator when close to escrow */}
        {proceedsAndEscrowClose && proceedsDate && (
          <div className="absolute -top-1 left-2 bg-blue-500 text-white px-1 py-0.5 rounded text-xs">
            Proceeds: {proceedsDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}

        {/* Today Pin - Enhanced Visual indicator for current date */}
        {showToday && todayPosition !== null && (
          <div 
            className="absolute top-2 transform -translate-x-1/2 z-20"
            style={{ left: `${todayPosition}%` }}
          >
            {/* Today Pin Line */}
            <div className="w-1 h-12 bg-gradient-to-b from-red-400 to-red-600 rounded-full shadow-lg"></div>
            
            {/* Today Pin Marker */}
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <div className="w-4 h-4 bg-gradient-to-br from-red-400 to-red-600 rounded-full border-3 border-white shadow-lg animate-pulse"></div>
            </div>
            
            {/* Today Label */}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg border border-red-400">
                Today ({todayFormatted})
              </div>
              {/* Arrow pointing down */}
              <div className="absolute left-1/2 transform -translate-x-1/2 top-full">
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-500"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Summary Row */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{daysFromStart || 0}</div>
            <div className="text-xs text-gray-500 font-medium">Days Elapsed</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${is45Overdue ? 'text-red-600' : 'text-indigo-600'}`}>
              {daysTo45 !== null ? Math.abs(daysTo45) : 0}
            </div>
            <div className="text-xs text-gray-500 font-medium">
              Days {is45Overdue ? 'Past' : 'to'} 45-Day Deadline
            </div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              status === 'COMPLETED' || status === 'Completed' ? 'text-green-600' :
              is180Overdue ? 'text-red-600' : 'text-purple-600'
            }`}>
              {status === 'COMPLETED' || status === 'Completed' ? '✓' :
               daysTo180 !== null ? Math.abs(daysTo180) : '0'}
            </div>
            <div className="text-xs text-gray-500 font-medium">
              {status === 'COMPLETED' || status === 'Completed' ? 'Exchange Complete' :
               `Days ${is180Overdue ? 'Over' : 'to'} 180-Day Deadline`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangeTimeline;