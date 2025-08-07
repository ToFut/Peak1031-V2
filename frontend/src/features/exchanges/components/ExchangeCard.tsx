import React, { useState } from 'react';
import { Exchange } from '../../../types';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  Building2,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  MoreVertical,
  MessageSquare,
  FileText,
  Zap,
  Shield,
  Target,
  Briefcase,
  MapPin,
  Activity,
  Star,
  AlertTriangle
} from 'lucide-react';

interface ExchangeCardProps {
  exchange: Exchange;
  onClick?: () => void;
  selected?: boolean;
}

export const ExchangeCard: React.FC<ExchangeCardProps> = ({ 
  exchange, 
  onClick,
  selected = false 
}) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  
  // Calculate days until closing
  const getDaysUntilClosing = () => {
    if (!exchange.completionDeadline) return null;
    const closing = new Date(exchange.completionDeadline);
    const today = new Date();
    const diffTime = closing.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const daysUntilClosing = getDaysUntilClosing();
  
  // Get status color and icon
  const getStatusConfig = () => {
    switch (exchange.status) {
      case 'In Progress':
      case '45D':
      case '180D':
        return {
          color: 'from-green-500 to-emerald-600',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          icon: Activity,
          pulse: true
        };
      case 'PENDING':
      case 'Draft':
        return {
          color: 'from-yellow-500 to-orange-600',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          icon: Clock,
          pulse: false
        };
      case 'COMPLETED':
      case 'Completed':
        return {
          color: 'from-blue-500 to-indigo-600',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          icon: CheckCircle,
          pulse: false
        };
      case '45D':
        return {
          color: 'from-orange-500 to-red-600',
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-700',
          icon: Target,
          pulse: true
        };
      case '180D':
        return {
          color: 'from-purple-500 to-pink-600',
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-700',
          icon: Briefcase,
          pulse: false
        };
      default:
        return {
          color: 'from-gray-500 to-gray-600',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          icon: Shield,
          pulse: false
        };
    }
  };
  
  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  
  // Quick actions
  const handleQuickAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    switch (action) {
      case 'view':
        navigate(`/exchanges/${exchange.id}`);
        break;
      case 'message':
        navigate(`/messages?exchangeId=${exchange.id}`);
        break;
      case 'documents':
        navigate(`/exchanges/${exchange.id}?tab=documents`);
        break;
      default:
        break;
    }
  };
  
  return (
    <div
      onClick={onClick}
      className={`
        relative group cursor-pointer transition-all duration-300
        ${selected 
          ? 'scale-[1.02] ring-2 ring-blue-500 ring-offset-2' 
          : 'hover:scale-[1.02] hover:shadow-2xl'
        }
      `}
    >
      {/* Card Container */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        {/* Status Bar */}
        <div className={`h-2 bg-gradient-to-r ${statusConfig.color}`}></div>
        
        {/* Card Header */}
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              {/* Exchange Number and Type */}
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xs font-medium text-gray-500">
                  #{exchange.exchangeNumber || 'N/A'}
                </span>
                {exchange.exchangeType && (
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {exchange.exchangeType}
                  </span>
                )}
              </div>
              
              {/* Exchange Name */}
              <h3 className="text-lg font-bold text-gray-900 truncate mb-1">
                {exchange.name || `Exchange ${exchange.exchangeNumber}`}
              </h3>
              
              {/* Client Info */}
              <div className="flex items-center text-sm text-gray-600">
                <User className="w-4 h-4 mr-1 text-gray-400" />
                <span className="truncate">
                  {exchange.client?.firstName} {exchange.client?.lastName}
                  {exchange.client?.company && (
                    <span className="text-gray-400 ml-1">• {exchange.client.company}</span>
                  )}
                </span>
              </div>
            </div>
            
            {/* Action Menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <button
                    onClick={(e) => handleQuickAction(e, 'view')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                  >
                    <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                    View Details
                  </button>
                  <button
                    onClick={(e) => handleQuickAction(e, 'message')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                  >
                    <MessageSquare className="w-4 h-4 mr-2 text-gray-400" />
                    Send Message
                  </button>
                  <button
                    onClick={(e) => handleQuickAction(e, 'documents')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-2 text-gray-400" />
                    View Documents
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="flex items-center justify-between mb-4">
            <div className={`
              inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium
              ${statusConfig.bgColor} ${statusConfig.textColor}
              ${statusConfig.pulse ? 'animate-pulse' : ''}
            `}>
              <StatusIcon className="w-4 h-4 mr-1.5" />
              {exchange.status}
            </div>
            
            {/* Days Remaining Badge */}
            {daysUntilClosing !== null && daysUntilClosing > 0 && (
              <div className={`
                inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium
                ${daysUntilClosing <= 45 
                  ? 'bg-red-100 text-red-700 animate-pulse' 
                  : daysUntilClosing <= 180 
                  ? 'bg-orange-100 text-orange-700' 
                  : 'bg-blue-100 text-blue-700'
                }
              `}>
                <Zap className="w-3 h-3 mr-1" />
                {daysUntilClosing}d left
              </div>
            )}
          </div>
        </div>
        
        {/* Key Metrics */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Exchange Value */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">Value</span>
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">
                ${exchange.exchangeValue ? (exchange.exchangeValue / 1000000).toFixed(1) + 'M' : 'N/A'}
              </p>
            </div>
            
            {/* Progress */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">Progress</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">
                {exchange.progress || 0}%
              </p>
            </div>
            
            {/* Deadline */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">Deadline</span>
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-sm font-bold text-gray-900">
                {exchange.completionDeadline 
                  ? new Date(exchange.completionDeadline).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })
                  : 'TBD'
                }
              </p>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="px-6 pb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 bg-gradient-to-r ${statusConfig.color}`}
              style={{ width: `${exchange.progress || 0}%` }}
            ></div>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              {/* Task count removed - not available in Exchange type */}
              {/* Document count removed - not available in Exchange type */}
            </div>
            
            <span className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              Updated {new Date(exchange.updatedAt || exchange.createdAt || '').toLocaleDateString()}
            </span>
          </div>
        </div>
        
        {/* Hover Effect Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-indigo-600/0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"></div>
      </div>
      
      {/* Click anywhere outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
          }}
        />
      )}
    </div>
  );
};

export default ExchangeCard;