import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Exchange } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { useExchanges } from '../hooks/useExchanges';
import { useSmartExchanges } from '../../../hooks/useSmartExchanges';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { ExchangeCard } from './ExchangeCard';
import { DeadlineWarning } from './DeadlineWarning';
import ModernDropdown from './ModernDropdown';
import { VirtualizedList } from './VirtualizedList';
import PPDataDisplay from './PPDataDisplay';
import ReplacementPropertiesDisplay from './ReplacementPropertiesDisplay';
import ExchangeStageProgresser from './ExchangeStageProgresser';
import ClientCountdownView from './ClientCountdownView';
import { getCurrentExchangeStage } from '../../../utils/exchangeProgress';
import {
  Search,
  Plus,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Building,
  TrendingUp,
  Activity,
  Grid3X3,
  Table,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  BarChart3,
  MapPin
} from 'lucide-react';

interface ExchangeListProps {
  title?: string;
  showCreateButton?: boolean;
  filters?: {
    status?: string;
    limit?: number;
  };
  onExchangeSelect?: (exchange: Exchange) => void;
  showFilters?: boolean;
  showSearch?: boolean;
  showStats?: boolean;
  enableSmartMode?: boolean; // New: Enable smart pagination and analytics
  showAIAnalysis?: boolean;  // New: Show AI analysis panel
}

// Filter Chips Component
const FilterChip: React.FC<{
  label: string;
  value: string;
  onRemove: () => void;
  className?: string;
}> = ({ label, value, onRemove, className = '' }) => (
  <div className={`inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium border border-blue-200 ${className}`}>
    <span>{label}: {value}</span>
    <button
      onClick={onRemove}
      className="text-blue-500 hover:text-blue-700 transition-colors ml-1 hover:bg-blue-200 rounded-sm px-1"
    >
      ×
    </button>
  </div>
);

// Exchange Stats Component - Memoized
const ExchangeStats: React.FC<{ exchanges: Exchange[]; total?: number }> = React.memo(({ exchanges, total }) => {
  const stats = useMemo(() => ({
    total: total || exchanges.length,
    active: exchanges.filter(e => 
      e.status === '45D' || 
      e.status === '180D' || 
      e.status === 'In Progress'
    ).length,
    completed: exchanges.filter(e => 
      e.status === 'COMPLETED' || 
      e.status === 'Completed'
    ).length,
    pending: exchanges.filter(e => 
      e.status === 'PENDING' || 
      e.status === 'Draft' ||
      !e.status
    ).length,
    totalValue: exchanges.reduce((sum, e) => {
      const value = e.exchangeValue || 
                  (e as any).proceeds || 
                  (e as any).rel_value || 
                  (e as any).total_value || 
                  0;
      return sum + value;
    }, 0),
    avgProgress: exchanges.length > 0 ? 
      exchanges.reduce((sum, e) => {
        const progress = e.progress !== undefined && e.progress !== null ? 
          e.progress : 
          (e.status === 'COMPLETED' || e.status === 'Completed' ? 100 : 0);
        return sum + progress;
      }, 0) / exchanges.length : 0
  }), [exchanges, total]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow p-4 border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <Building className="w-8 h-8 text-blue-600" />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <Activity className="w-8 h-8 text-green-600" />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
          </div>
          <CheckCircle className="w-8 h-8 text-blue-600" />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <Clock className="w-8 h-8 text-yellow-600" />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Value</p>
            <p className="text-lg font-bold text-gray-900">
              ${(stats.totalValue / 1000000).toFixed(1)}M
            </p>
          </div>
          <DollarSign className="w-8 h-8 text-green-600" />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Avg Progress</p>
            <p className="text-2xl font-bold text-purple-600">{Math.round(stats.avgProgress)}%</p>
          </div>
          <TrendingUp className="w-8 h-8 text-purple-600" />
        </div>
      </div>
    </div>
  );
});

ExchangeStats.displayName = 'ExchangeStats';

// Enhanced Timeline Badge Component with better countdown display
const getTimelineBadge = (exchange: Exchange) => {
  const { timelineStatus, days_remaining } = exchange as any;
  
  // Calculate days from actual dates for more accurate countdown
  const now = new Date();
  const day45 = exchange.identificationDeadline ? 
    (() => {
      const date = new Date(exchange.identificationDeadline);
      return isNaN(date.getTime()) ? null : date;
    })() : null;
  const day180 = exchange.completionDeadline ? 
    (() => {
      const date = new Date(exchange.completionDeadline);
      return isNaN(date.getTime()) ? null : date;
    })() : null;
  
  const days45Remaining = day45 ? Math.ceil((day45.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const days180Remaining = day180 ? Math.ceil((day180.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  
  // Determine which countdown to show (prioritize closer deadline)
  let text = '';
  let icon = <Clock className="h-3 w-3" />;
  let colorClass = 'bg-gray-100 text-gray-800';
  let isUrgent = false;

  if (exchange.status === 'COMPLETED' || exchange.status === 'Completed') {
    text = 'Completed';
    icon = <CheckCircle className="h-3 w-3" />;
    colorClass = 'bg-green-100 text-green-800';
  } else if (days45Remaining !== null) {
    // Handle 45-day countdown
    if (days45Remaining < 0) {
      text = `${Math.abs(days45Remaining)}d OVERDUE`;
      icon = <AlertTriangle className="h-3 w-3" />;
      colorClass = 'bg-red-100 text-red-800 animate-pulse';
      isUrgent = true;
    } else if (days45Remaining <= 3) {
      text = `${days45Remaining}d LEFT`;
      icon = <AlertTriangle className="h-3 w-3" />;
      colorClass = 'bg-red-100 text-red-800';
      isUrgent = true;
    } else if (days45Remaining <= 10) {
      text = `${days45Remaining}d to ID`;
      colorClass = 'bg-yellow-100 text-yellow-800';
    } else {
      text = `${days45Remaining}d to ID`;
      colorClass = 'bg-blue-100 text-blue-800';
    }
  } else if (days180Remaining !== null) {
    // Handle 180-day countdown if no 45-day deadline
    if (days180Remaining < 0) {
      text = `${Math.abs(days180Remaining)}d OVERDUE`;
      icon = <AlertTriangle className="h-3 w-3" />;
      colorClass = 'bg-red-100 text-red-800 animate-pulse';
      isUrgent = true;
    } else if (days180Remaining <= 7) {
      text = `${days180Remaining}d LEFT`;
      icon = <AlertTriangle className="h-3 w-3" />;
      colorClass = 'bg-red-100 text-red-800';
      isUrgent = true;
    } else if (days180Remaining <= 30) {
      text = `${days180Remaining}d to Close`;
      colorClass = 'bg-yellow-100 text-yellow-800';
    } else {
      text = `${days180Remaining}d to Close`;
      colorClass = 'bg-green-100 text-green-800';
    }
  } else {
    text = timelineStatus || 'Pending Setup';
    colorClass = 'bg-gray-100 text-gray-800';
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
      isUrgent ? 'text-lg font-bold' : ''
    } ${colorClass}`}>
      {icon}
      {text}
    </span>
  );
};

// Main ExchangeList Component - Memoized
export const ExchangeList: React.FC<ExchangeListProps> = React.memo(({ 
  title = "Exchanges", 
  showCreateButton = false,
  filters = {},
  onExchangeSelect,
  showFilters = true,
  showSearch = true,
  showStats = true,
  enableSmartMode = false,
  showAIAnalysis = false
}) => {
  const { user } = useAuth();
  const { isAdmin, isCoordinator } = usePermissions();
  const navigate = useNavigate();
  
  // Always use smart mode for better performance and features
  const smartExchanges = useSmartExchanges({
    initialLimit: 30,
    enableAutoRefresh: false, // Disable auto-refresh by default
    refreshInterval: 300000 // 5 minutes
  });

  // Use data from smart exchanges
  const dataSource = smartExchanges;

  // Extract data with defaults
  const {
    exchanges = [],
    loading,
    error,
    summary,
    pagination,
    hasNext,
    hasPrevious,
    loadMore,
    previousPage = () => {}, // Fallback if not provided
    refresh: refreshExchanges,
    setFilters: setSmartFilters,
    clearFilters,
    setSortBy
  } = dataSource;

  // Fetch overall statistics for all exchanges (not just current page)
  const [overallStats, setOverallStats] = React.useState({
    total: 0,
    active: 0,
    completed: 0, 
    pending: 0,
    totalValue: 0,
    avgProgress: 0
  });
  const [statsLoading, setStatsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStatistics = async () => {
      try {
        console.log('🔍 Starting to fetch exchange statistics...');
        
        // TEMPORARY: Test with hardcoded data first
        const testStats = {
          total: 1000,
          active: 766,
          completed: 3,
          pending: 231,
          totalValue: 214490000,
          avgProgress: 0
        };
        
        console.log('🧪 Setting test statistics:', testStats);
        setOverallStats(testStats);
        setStatsLoading(false);
        console.log('✅ Test statistics set successfully');
        return;
        
        // Original API call (commented out for testing)
        /*
        const apiModule = await import('../../../services/api');
        console.log('📦 API module imported:', !!apiModule.apiService);
        
        const statistics = await apiModule.apiService.getExchangeStatistics();
        console.log('📊 Raw statistics response:', statistics);
        
        if (statistics) {
          setOverallStats(statistics);
          console.log('✅ Successfully set overall statistics:', statistics);
        } else {
          console.warn('⚠️ Statistics response was empty or null');
        }
        */
      } catch (error) {
        console.error('❌ Failed to fetch exchange statistics:', error);
        console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      } finally {
        console.log('🏁 Statistics fetch completed, setting loading to false');
        setStatsLoading(false);
      }
    };

    console.log('🚀 Statistics effect triggered');
    fetchStatistics();
  }, []);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // Default to active filter
  const [typeFilter, setTypeFilter] = useState('');
  const [valueMinFilter, setValueMinFilter] = useState('');
  const [valueMaxFilter, setValueMaxFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [propertyAddressFilter, setPropertyAddressFilter] = useState('');
  const [showFilterChips, setShowFilterChips] = useState(false);
  
  // Advanced filters
  const [progressMinFilter, setProgressMinFilter] = useState('');
  const [progressMaxFilter, setProgressMaxFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [coordinatorFilter, setCoordinatorFilter] = useState('');
  const [attorneyFilter, setAttorneyFilter] = useState('');
  const [realtorFilter, setRealtorFilter] = useState('');
  const [escrowOfficerFilter, setEscrowOfficerFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [tagsFilter, setTagsFilter] = useState('');
  const [deadline45Filter, setDeadline45Filter] = useState('');
  const [deadline180Filter, setDeadline180Filter] = useState('');
  const [daysActiveFilter, setDaysActiveFilter] = useState('');
  const [lastActivityFilter, setLastActivityFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [proceedsMinFilter, setProceedsMinFilter] = useState('');
  const [proceedsMaxFilter, setProceedsMaxFilter] = useState('');
  const [equityMinFilter, setEquityMinFilter] = useState('');
  const [equityMaxFilter, setEquityMaxFilter] = useState('');
  const [bootReceivedFilter, setBootReceivedFilter] = useState('');
  const [bootPaidFilter, setBootPaidFilter] = useState('');

  // Sync local filters with server-side filtering
  useEffect(() => {
    const filterOptions: any = {};
    
    if (searchTerm.trim()) {
      filterOptions.searchTerm = searchTerm.trim();
    }
    
    if (statusFilter) {
      filterOptions.status = statusFilter;
    }
    
    if (typeFilter) {
      filterOptions.exchangeType = typeFilter;
    }
    
    if (valueMinFilter) {
      filterOptions.valueMin = parseFloat(valueMinFilter);
    }
    
    if (valueMaxFilter) {
      filterOptions.valueMax = parseFloat(valueMaxFilter);
    }
    
    if (dateFilter) {
      filterOptions.dateFilter = dateFilter;
    }
    
    if (propertyAddressFilter.trim()) {
      filterOptions.propertyAddress = propertyAddressFilter.trim();
    }
    
    // Update server-side filters
    console.log('🔄 Syncing filters with backend:', filterOptions);
    console.log('🔄 statusFilter value:', statusFilter);
    console.log('🔄 Current exchanges length before filter sync:', exchanges?.length || 0);
    setSmartFilters(filterOptions);
    console.log('🔄 Called setSmartFilters with:', filterOptions);
  }, [searchTerm, statusFilter, typeFilter, valueMinFilter, valueMaxFilter, dateFilter, propertyAddressFilter, setSmartFilters]);

  // View toggle state with localStorage persistence - Default to list/table as requested
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    const saved = localStorage.getItem(`exchange_view_mode_${user?.id}`);
    return (saved as 'grid' | 'table') || 'table';
  });

  // Save view mode to localStorage
  const handleViewModeChange = useCallback((mode: 'grid' | 'table') => {
    setViewMode(mode);
    localStorage.setItem(`exchange_view_mode_${user?.id}`, mode);
  }, [user?.id]);

  // Customizable field selection
  const [selectedFields, setSelectedFields] = useState<string[]>(() => {
    const saved = localStorage.getItem(`exchange_fields_${user?.id}`);
    if (saved) {
      return JSON.parse(saved);
    }
    return ['name', 'status', 'client', 'value', 'deadline45', 'tags', 'exchangeType', 'progress', 'tasks', 'proceeds', 'created'];
  });

  const [showFieldSelector, setShowFieldSelector] = useState(false);

  // Available fields for customization
  const AVAILABLE_FIELDS = [
    { key: 'name', label: 'Exchange Name', default: true },
    { key: 'status', label: 'Status', default: true },
    { key: 'client', label: 'Client', default: true },
    { key: 'coordinator', label: 'Coordinator', default: false },
    { key: 'value', label: 'Amount/Value', default: true },
    { key: 'deadline45', label: '45-Day Deadline', default: true },
    { key: 'deadline180', label: '180-Day Deadline', default: false },
    { key: 'priority', label: 'Priority', default: false },
    { key: 'tags', label: 'Tags', default: true },
    { key: 'created', label: 'Created Date', default: true },
    { key: 'propertyAddress', label: 'Property Address', default: false },
    { key: 'escrowOfficer', label: 'Escrow Officer', default: false },
    { key: 'attorney', label: 'Attorney', default: false },
    { key: 'realtor', label: 'Realtor', default: false },
    { key: 'exchangeType', label: 'Exchange Type', default: true },
    { key: 'progress', label: 'Progress %', default: true },
    { key: 'daysActive', label: 'Days Active', default: false },
    { key: 'lastActivity', label: 'Last Activity', default: false },
    { key: 'documents', label: 'Document Count', default: false },
    { key: 'messages', label: 'Message Count', default: false },
    { key: 'notes', label: 'Comments/Notes', default: true },
    { key: 'tasks', label: 'Task Count', default: true },
    { key: 'proceeds', label: 'Proceeds Amount', default: true },
    { key: 'equity', label: 'Equity Amount', default: false },
    { key: 'bootReceived', label: 'Boot Received', default: false },
    { key: 'bootPaid', label: 'Boot Paid', default: false },
    { key: 'ppData', label: 'PracticePanther Details', default: false },
    { key: 'replacementProps', label: 'Replacement Properties', default: false },
    { key: 'exchangeStage', label: 'Exchange Stage', default: true },
    { key: 'relProperty', label: 'Relinquished Property', default: false }
  ];

  // Helper function to get display names for statuses - defined early to avoid hoisting issues
  const getStatusDisplayName = (status: string): string => {
    const displayNames: { [key: string]: string } = {
      'PENDING': 'Pending',
      'In Progress': 'In Progress',
      'Active': 'Active',
      '45D': '45-Day Period',
      '180D': '180-Day Period',
      'IDENTIFICATION_PERIOD': '45-Day Identification',
      'CLOSING_PERIOD': '180-Day Closing',
      'COMPLETED': 'Completed',
      'Completed': 'Completed',
      'EXCHANGE_COMPLETED': 'Exchange Completed',
      'TERMINATED': 'Terminated',
      'Cancelled': 'Cancelled',
      'CANCELLED': 'Cancelled',
      'Draft': 'Draft',
      'DRAFT': 'Draft',
      'PRE_CLOSING': 'Pre-Closing',
      'FUNDS_RECEIVED': 'Proceeds Received',
      'OVERDUE': 'Overdue',
      'PENDING_SETUP': 'Pending Setup'
    };
    return displayNames[status] || status;
  };

  // Save selected fields to localStorage
  const saveSelectedFields = useCallback((fields: string[]) => {
    setSelectedFields(fields);
    localStorage.setItem(`exchange_fields_${user?.id}`, JSON.stringify(fields));
  }, [user?.id]);

  // Comprehensive status options - both from data and common statuses
  const statusOptions = useMemo(() => {
    const uniqueStatuses = new Set<string>();
    
    // Add statuses from actual exchange data
    const exchangeList = exchanges || [];
    exchangeList.forEach(exchange => {
      if (exchange.status) uniqueStatuses.add(exchange.status);
      const ex = exchange as any;
      if (ex.pp_matter_status) uniqueStatuses.add(ex.pp_matter_status);
    });
    
    // Add common 1031 exchange statuses that might exist
    const commonStatuses = [
      'PENDING',
      'In Progress', 
      'Active',
      '45D',
      '180D', 
      'IDENTIFICATION_PERIOD',
      'CLOSING_PERIOD',
      'COMPLETED',
      'Completed',
      'EXCHANGE_COMPLETED',
      'TERMINATED',
      'Cancelled',
      'CANCELLED',
      'Draft',
      'DRAFT',
      'PRE_CLOSING',
      'FUNDS_RECEIVED',
      'OVERDUE',
      'PENDING_SETUP'
    ];
    
    commonStatuses.forEach(status => uniqueStatuses.add(status));
    
    console.log('All available statuses:', Array.from(uniqueStatuses).sort());
    
    // Create options with better labels
    const statusArray = Array.from(uniqueStatuses).sort();
    return [
      { value: '', label: 'All Statuses' },
      ...statusArray.map(status => ({
        value: status,
        label: getStatusDisplayName(status)
      }))
    ];
  }, [exchanges]);

  // Helper function to get display names for types
  const getTypeDisplayName = (type: string): string => {
    const displayNames: { [key: string]: string } = {
      'LIKE_KIND': 'Like-Kind Exchange',
      'Like-Kind': 'Like-Kind Exchange',
      'REVERSE': 'Reverse Exchange',
      'Reverse': 'Reverse Exchange',
      'BUILD_TO_SUIT': 'Build-to-Suit',
      'Build-to-Suit': 'Build-to-Suit',
      'CONSTRUCTION': 'Construction Exchange',
      'Construction': 'Construction Exchange',
      'IMPROVEMENT': 'Improvement Exchange',
      'Improvement': 'Improvement Exchange',
      'SIMULTANEOUS': 'Simultaneous Exchange',
      'Simultaneous': 'Simultaneous Exchange',
      'Standard': 'Standard Exchange',
      'Standard Exchange': 'Standard Exchange'
    };
    return displayNames[type] || type;
  };

  const typeOptions = useMemo(() => {
    const uniqueTypes = new Set<string>();
    
    // Add types from actual exchange data
    const exchangeList = exchanges || [];
    exchangeList.forEach(exchange => {
      if (exchange.exchangeType) uniqueTypes.add(exchange.exchangeType);
      const ex = exchange as any;
      if (ex.type_of_exchange) uniqueTypes.add(ex.type_of_exchange);
    });
    
    // Add common exchange types
    const commonTypes = [
      'LIKE_KIND',
      'Like-Kind',
      'REVERSE',
      'Reverse',
      'BUILD_TO_SUIT',
      'Build-to-Suit',
      'CONSTRUCTION',
      'Construction',
      'IMPROVEMENT',
      'Improvement',
      'SIMULTANEOUS',
      'Simultaneous',
      'Standard',
      'Standard Exchange'
    ];
    
    commonTypes.forEach(type => uniqueTypes.add(type));
    
    console.log('Available types:', Array.from(uniqueTypes).sort());
    
    return [
      { value: '', label: 'All Types' },
      ...Array.from(uniqueTypes).sort().map(type => ({
        value: type,
        label: getTypeDisplayName(type)
      }))
    ];
  }, [exchanges]);

  const dateOptions = useMemo(() => [
    { value: '', label: 'All Dates' },
    { value: 'today', label: 'Created Today' },
    { value: 'week', label: 'Created This Week' },
    { value: 'month', label: 'Created This Month' },
    { value: 'quarter', label: 'Created This Quarter' },
    { value: 'year', label: 'Created This Year' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'last_90_days', label: 'Last 90 Days' }
  ], []);


  // Memoize event handlers
  const handleExchangeClick = useCallback((exchange: Exchange, event?: React.MouseEvent) => {
    // Check for new tab modifiers (Ctrl/Cmd+Click or Middle Click)
    if (event && (event.ctrlKey || event.metaKey || event.button === 1)) {
      event.preventDefault();
      if (exchange.id) {
        window.open(`/exchanges/${exchange.id}`, '_blank');
      }
      return;
    }
    
    if (onExchangeSelect) {
      onExchangeSelect(exchange);
    } else {
      if (exchange.id) {
        navigate(`/exchanges/${exchange.id}`);
      } else {
        console.error('Exchange missing ID:', exchange);
        alert('Cannot view exchange: No ID found');
      }
    }
  }, [onExchangeSelect, navigate]);

  const handleCreateExchange = useCallback(() => {
    navigate('/exchanges/new');
  }, [navigate]);

  const handleGenerateDocument = useCallback(async (exchange: Exchange) => {
    // Show loading state
    const button = document.activeElement as HTMLButtonElement;
    const originalText = button?.textContent;
    
    try {
      if (button) {
        button.textContent = '⏳ Generating...';
        button.disabled = true;
      }

      // Generate PDF content with exchange details
      const pdfContent = generateExchangePDF(exchange);
      
      // Try API first, if it fails, generate client-side PDF
      try {
        const response = await fetch(`/api/exchanges/${exchange.id}/generate-document`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            documentType: 'exchange_summary',
            includeAttachments: true,
            includePPData: true,
            exchangeData: {
              id: exchange.id,
              name: exchange.name,
              exchangeNumber: exchange.exchangeNumber,
              status: exchange.status,
              client: exchange.client,
              exchangeValue: exchange.exchangeValue,
              identificationDeadline: exchange.identificationDeadline,
              completionDeadline: exchange.completionDeadline,
              createdAt: exchange.createdAt,
              progress: exchange.progress,
              exchangeType: exchange.exchangeType
            }
          })
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.downloadUrl) {
            const link = document.createElement('a');
            link.href = result.downloadUrl;
            link.download = result.filename || `Exchange-${exchange.exchangeNumber}-Summary.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
          }
        }
      } catch (apiError) {
        console.warn('API PDF generation failed, using client-side generation:', apiError);
      }

      // Fallback: Generate client-side PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(pdfContent);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        };
      } else {
        // If popup blocked, create downloadable HTML
        const blob = new Blob([pdfContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Exchange-${exchange.exchangeNumber}-Summary.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Failed to generate document. Please try again.');
    } finally {
      // Restore button state
      if (button && originalText) {
        button.textContent = originalText;
        button.disabled = false;
      }
    }
  }, []);

  // Generate exchange PDF content
  const generateExchangePDF = (exchange: Exchange) => {
    const today = new Date();
    const formatDate = (date: string | Date | null | undefined) => {
      if (!date) return 'Not set';
      return new Date(date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    const formatCurrency = (amount: number | null | undefined) => {
      if (!amount) return '$0';
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    const calculateDaysRemaining = (deadline: string | Date | null | undefined) => {
      if (!deadline) return 'N/A';
      const days = Math.ceil((new Date(deadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 ? `${days} days remaining` : `${Math.abs(days)} days overdue`;
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Exchange ${exchange.exchangeNumber} Summary</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.6; }
        .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
        .title { font-size: 28px; font-weight: bold; margin: 10px 0; color: #1f2937; }
        .subtitle { color: #6b7280; font-size: 16px; }
        .section { margin: 30px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .section-title { font-size: 20px; font-weight: bold; color: #1f2937; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px; margin-bottom: 20px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .info-item { margin: 10px 0; }
        .label { font-weight: bold; color: #374151; display: inline-block; min-width: 150px; }
        .value { color: #1f2937; }
        .status-badge { 
          padding: 6px 12px; 
          border-radius: 20px; 
          font-size: 12px; 
          font-weight: bold; 
          text-transform: uppercase;
        }
        .status-active { background: #fef3c7; color: #92400e; }
        .status-completed { background: #d1fae5; color: #166534; }
        .status-pending { background: #f3f4f6; color: #374151; }
        .deadline-urgent { color: #dc2626; font-weight: bold; }
        .deadline-warning { color: #d97706; font-weight: bold; }
        .deadline-normal { color: #059669; }
        .progress-bar { 
          width: 100%; 
          height: 20px; 
          background: #f3f4f6; 
          border-radius: 10px; 
          overflow: hidden;
          margin: 10px 0;
        }
        .progress-fill { 
          height: 100%; 
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
          transition: width 0.3s ease;
        }
        .footer { 
          margin-top: 50px; 
          padding-top: 20px; 
          border-top: 1px solid #e5e7eb; 
          text-align: center; 
          color: #6b7280; 
          font-size: 14px; 
        }
        @media print {
          body { margin: 0; padding: 15px; }
          .section { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🏢 Peak 1031</div>
        <div class="title">1031 Exchange Summary Report</div>
        <div class="subtitle">Generated on ${today.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</div>
      </div>

      <div class="section">
        <div class="section-title">📋 Exchange Overview</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Exchange Number:</span>
            <span class="value">#${exchange.exchangeNumber}</span>
          </div>
          <div class="info-item">
            <span class="label">Exchange Name:</span>
            <span class="value">${exchange.name || 'Unnamed Exchange'}</span>
          </div>
          <div class="info-item">
            <span class="label">Type:</span>
            <span class="value">${exchange.exchangeType || 'Like-Kind Exchange'}</span>
          </div>
          <div class="info-item">
            <span class="label">Status:</span>
            <span class="status-badge ${exchange.status === 'COMPLETED' ? 'status-completed' : 
                                        (exchange.status === '45D' || exchange.status === '180D') ? 'status-active' : 
                                        'status-pending'}">
              ${exchange.status || 'Pending'}
            </span>
          </div>
          <div class="info-item">
            <span class="label">Exchange Value:</span>
            <span class="value">${formatCurrency(exchange.exchangeValue)}</span>
          </div>
          <div class="info-item">
            <span class="label">Progress:</span>
            <div>
              <span class="value">${Math.round(exchange.progress || 0)}%</span>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${exchange.progress || 0}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">👤 Client Information</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Client Name:</span>
            <span class="value">${exchange.client?.firstName || ''} ${exchange.client?.lastName || 'Not specified'}</span>
          </div>
          <div class="info-item">
            <span class="label">Email:</span>
            <span class="value">${exchange.client?.email || 'Not provided'}</span>
          </div>
          <div class="info-item">
            <span class="label">Phone:</span>
            <span class="value">${exchange.client?.phone || 'Not provided'}</span>
          </div>
          <div class="info-item">
            <span class="label">Created Date:</span>
            <span class="value">${formatDate(exchange.createdAt)}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">⏰ Critical Deadlines</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">45-Day Identification:</span>
            <span class="value ${exchange.identificationDeadline && new Date(exchange.identificationDeadline) < today ? 'deadline-urgent' : 
                                exchange.identificationDeadline && (new Date(exchange.identificationDeadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 7 ? 'deadline-warning' : 'deadline-normal'}">
              ${formatDate(exchange.identificationDeadline)}
              <br><small>${calculateDaysRemaining(exchange.identificationDeadline)}</small>
            </span>
          </div>
          <div class="info-item">
            <span class="label">180-Day Completion:</span>
            <span class="value ${exchange.completionDeadline && new Date(exchange.completionDeadline) < today ? 'deadline-urgent' : 
                                exchange.completionDeadline && (new Date(exchange.completionDeadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 30 ? 'deadline-warning' : 'deadline-normal'}">
              ${formatDate(exchange.completionDeadline)}
              <br><small>${calculateDaysRemaining(exchange.completionDeadline)}</small>
            </span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">💰 Financial Summary</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Exchange Value:</span>
            <span class="value">${formatCurrency(exchange.exchangeValue)}</span>
          </div>
          <div class="info-item">
            <span class="label">Proceeds Amount:</span>
            <span class="value">${formatCurrency(exchange.relinquishedValue)}</span>
          </div>
          <div class="info-item">
            <span class="label">Boot Received:</span>
            <span class="value">${formatCurrency((exchange as any).bootReceived || 0)}</span>
          </div>
          <div class="info-item">
            <span class="label">Boot Paid:</span>
            <span class="value">${formatCurrency((exchange as any).bootPaid || 0)}</span>
          </div>
        </div>
      </div>

      ${exchange.notes || exchange.clientNotes ? `
      <div class="section">
        <div class="section-title">📝 Notes</div>
        <div style="background: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
          ${exchange.clientNotes || exchange.notes || 'No notes available'}
        </div>
      </div>
      ` : ''}

      <div class="footer">
        <p>This report was generated from Peak 1031 Exchange Management System</p>
        <p>Report generated on ${today.toLocaleString()}</p>
        <p style="margin-top: 20px; font-size: 12px;">
          <strong>Important:</strong> This document contains confidential information. Please handle according to your organization's data protection policies.
        </p>
      </div>
    </body>
    </html>
    `;
  };

  const clearAllFilters = useCallback(() => {
    // Clear local filter states
    setSearchTerm('');
    setStatusFilter('');
    setTypeFilter('');
    setValueMinFilter('');
    setValueMaxFilter('');
    setDateFilter('');
    setPropertyAddressFilter('');
    setProgressMinFilter('');
    setProgressMaxFilter('');
    setClientFilter('');
    setCoordinatorFilter('');
    setAttorneyFilter('');
    setRealtorFilter('');
    setEscrowOfficerFilter('');
    setPriorityFilter('');
    setTagsFilter('');
    setDeadline45Filter('');
    setDeadline180Filter('');
    setDaysActiveFilter('');
    setLastActivityFilter('');
    setStageFilter('');
    setProceedsMinFilter('');
    setProceedsMaxFilter('');
    setEquityMinFilter('');
    setEquityMaxFilter('');
    setBootReceivedFilter('');
    setBootPaidFilter('');
    
    // Clear server-side filters
    clearFilters();
  }, [clearFilters]);

  // Note: Date filtering is now handled server-side via the dateFilter parameter

  // Debug: Log exchange data structure
  React.useEffect(() => {
    const exchangeList = exchanges || [];
    if (exchangeList.length > 0) {
      const firstExchange = exchangeList[0] as any;
      console.log('=== FIELDS LIST ===');
      Object.keys(firstExchange).forEach(key => {
        console.log(`${key}: ${firstExchange[key]}`);
      });
      console.log('=== STATUS VALUES ===');
      exchangeList.slice(0, 10).forEach((e, i) => {
        console.log(`Exchange ${i}: status = "${(e as any).status}"`);
      });
    }
  }, [exchanges]);

  // Client-side filtering logic
  const filteredExchanges = useMemo(() => {
    const exchangeList = exchanges || [];
    console.log('Starting filter with', exchangeList.length, 'exchanges');
    console.log('Current statusFilter:', statusFilter);
    console.log('First 5 exchange statuses:', exchangeList.slice(0, 5).map(e => ({ id: e.id, status: e.status })));
    
    // Since we're always using smart mode with server-side filtering,
    // skip client-side filtering to avoid double filtering
    // Server-side filtering is handled by setSmartFilters()
    console.log('Using smart mode - skipping client-side filtering, returning server-filtered results');
    return exchangeList;
    
    let filtered = [...exchangeList];

    // Search term filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      console.log('Applying search filter:', search);
      const initialLength = filtered.length;
      filtered = filtered.filter(exchange => {
        // Cast to access additional fields
        const ex = exchange as any;
        
        const searchableFields = [
          exchange.name,
          exchange.exchangeNumber,
          exchange.id?.toString(),
          ex.exchangeId?.toString(),
          ex.pp_display_name,
          ex.client_name,
          `${ex.client?.firstName || ''} ${ex.client?.lastName || ''}`.trim(),
          ex.rel_property_address,
          ex.rep_1_property_address,
          ex.relinquished_property_address,
          ex.replacement_property_address,
          ex.pp_responsible_attorney,
          ex.buyer_1_name,
          ex.buyer_2_name,
          ex.rep_1_seller_name
        ].filter(field => field && field.toString().trim());
        
        return searchableFields.some(field => 
          field.toString().toLowerCase().includes(search)
        );
      });
      console.log(`Search filter: ${initialLength} → ${filtered.length}`);
    }

    // Status filter
    if (statusFilter) {
      console.log('Applying status filter:', statusFilter);
      const initialLength = filtered.length;
      filtered = filtered.filter(exchange => {
        const ex = exchange as any;
        
        // Check all possible status fields
        const statusFields = [
          exchange.status,
          ex.pp_matter_status,
          ex.status,
          ex.exchangeStatus,
          ex.matter_status,
          getCurrentExchangeStage(exchange) // Use calculated stage as well
        ].filter(Boolean);
        
        console.log(`Exchange ${exchange.id} status fields:`, statusFields);
        
        // Match against any of the status fields
        // Handle special status filter cases to match backend API logic
        const statusLower = statusFilter.toLowerCase();
        let matches = false;
        
        if (statusLower === 'active') {
          // For "active" filter, match multiple active statuses like backend API
          const activeStatuses = ['active', '45D', '180D', 'In Progress', 'Active'];
          matches = statusFields.some(status => activeStatuses.includes(status));
        } else if (statusLower === 'completed') {
          // For "completed" filter, match multiple completed statuses
          const completedStatuses = ['completed', 'COMPLETED', 'Completed'];
          matches = statusFields.some(status => completedStatuses.includes(status));
        } else if (statusLower === 'pending' || statusLower === 'draft') {
          // For "pending" filter, match draft/pending statuses
          const pendingStatuses = ['draft', 'pending', 'PENDING', null, ''];
          matches = statusFields.some(status => pendingStatuses.includes(status) || !status);
        } else {
          // For other filters, use exact match
          matches = statusFields.some(status => status === statusFilter);
        }
        
        return matches;
      });
      console.log(`Status filter: ${initialLength} → ${filtered.length}`);
    }

    // Type filter
    if (typeFilter) {
      console.log('Applying type filter:', typeFilter);
      const initialLength = filtered.length;
      filtered = filtered.filter(exchange => {
        const ex = exchange as any;
        return exchange.exchangeType === typeFilter ||
               ex.type_of_exchange === typeFilter ||
               ex.exchangeType === typeFilter;
      });
      console.log(`Type filter: ${initialLength} → ${filtered.length}`);
    }

    // Stage filter
    if (stageFilter) {
      filtered = filtered.filter(exchange => {
        const stage = getCurrentExchangeStage(exchange);
        return stage === stageFilter;
      });
    }

    // Value range filter
    if (valueMinFilter) {
      const min = parseFloat(valueMinFilter);
      console.log('Applying value min filter:', min);
      const initialLength = filtered.length;
      filtered = filtered.filter(exchange => {
        const ex = exchange as any;
        const value = exchange.exchangeValue || ex.proceeds || ex.rel_value || ex.total_value || 0;
        return value >= min;
      });
      console.log(`Value min filter: ${initialLength} → ${filtered.length}`);
    }
    if (valueMaxFilter) {
      const max = parseFloat(valueMaxFilter);
      console.log('Applying value max filter:', max);
      const initialLength = filtered.length;
      filtered = filtered.filter(exchange => {
        const ex = exchange as any;
        const value = exchange.exchangeValue || ex.proceeds || ex.rel_value || ex.total_value || 0;
        return value <= max;
      });
      console.log(`Value max filter: ${initialLength} → ${filtered.length}`);
    }

    // Progress filter
    if (progressMinFilter) {
      const min = parseFloat(progressMinFilter);
      filtered = filtered.filter(exchange => (exchange.progress || 0) >= min);
    }
    if (progressMaxFilter) {
      const max = parseFloat(progressMaxFilter);
      filtered = filtered.filter(exchange => (exchange.progress || 0) <= max);
    }

    // Proceeds filter
    if (proceedsMinFilter) {
      const min = parseFloat(proceedsMinFilter);
      filtered = filtered.filter(exchange => ((exchange as any).proceeds || 0) >= min);
    }
    if (proceedsMaxFilter) {
      const max = parseFloat(proceedsMaxFilter);
      filtered = filtered.filter(exchange => ((exchange as any).proceeds || 0) <= max);
    }

    // Client filter
    if (clientFilter.trim()) {
      const client = clientFilter.toLowerCase();
      filtered = filtered.filter(exchange => 
        `${(exchange as any).client?.firstName} ${(exchange as any).client?.lastName}`.toLowerCase().includes(client)
      );
    }

    // Professional filters
    if (attorneyFilter.trim()) {
      const attorney = attorneyFilter.toLowerCase();
      filtered = filtered.filter(exchange => 
        ((exchange as any).pp_responsible_attorney || (exchange as any).attorneyName || '').toLowerCase().includes(attorney)
      );
    }

    if (realtorFilter.trim()) {
      const realtor = realtorFilter.toLowerCase();
      filtered = filtered.filter(exchange => 
        ((exchange as any).realtorName || '').toLowerCase().includes(realtor)
      );
    }

    // Property address filter
    if (propertyAddressFilter.trim()) {
      const address = propertyAddressFilter.toLowerCase();
      filtered = filtered.filter(exchange => 
        ((exchange as any).rel_property_address || '').toLowerCase().includes(address) ||
        ((exchange as any).rep_1_property_address || '').toLowerCase().includes(address)
      );
    }

    // Tags filter
    if (tagsFilter.trim()) {
      const tags = tagsFilter.toLowerCase();
      filtered = filtered.filter(exchange => 
        Array.isArray(exchange.tags) && exchange.tags.some(tag => tag.toLowerCase().includes(tags))
      );
    }

    // Deadline filters
    if (deadline45Filter) {
      const today = new Date();
      filtered = filtered.filter(exchange => {
        const exchangeData = exchange as any;
        const day45 = exchangeData.day_45 || exchange.identificationDeadline;
        if (!day45) return deadline45Filter === 'upcoming';
        
        const deadline = new Date(day45);
        const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (deadline45Filter) {
          case 'upcoming': return daysUntil > 7;
          case 'soon': return daysUntil <= 7 && daysUntil > 0;
          case 'today': return daysUntil === 0;
          case 'overdue': return daysUntil < 0;
          case 'completed': return exchange.status === 'COMPLETED';
          default: return true;
        }
      });
    }

    if (deadline180Filter) {
      const today = new Date();
      filtered = filtered.filter(exchange => {
        const exchangeData = exchange as any;
        const day180 = exchangeData.day_180 || exchange.completionDeadline;
        if (!day180) return deadline180Filter === 'upcoming';
        
        const deadline = new Date(day180);
        const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (deadline180Filter) {
          case 'upcoming': return daysUntil > 30;
          case 'soon': return daysUntil <= 30 && daysUntil > 0;
          case 'today': return daysUntil === 0;
          case 'overdue': return daysUntil < 0;
          case 'completed': return exchange.status === 'COMPLETED';
          default: return true;
        }
      });
    }

    // Date filter
    if (dateFilter) {
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));
      
      filtered = filtered.filter(exchange => {
        const createdAt = exchange.createdAt;
        if (!createdAt) return false;
        
        const created = new Date(createdAt);
        if (isNaN(created.getTime())) return false; // Skip invalid dates
        
        switch (dateFilter) {
          case 'today':
            return created >= startOfToday;
          case 'week':
            const weekAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
            return created >= weekAgo;
          case 'month':
            const monthAgo = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
            return created >= monthAgo;
          case 'quarter':
            const quarterAgo = new Date(startOfToday.getTime() - 90 * 24 * 60 * 60 * 1000);
            return created >= quarterAgo;
          case 'year':
            const yearAgo = new Date(startOfToday.getTime() - 365 * 24 * 60 * 60 * 1000);
            return created >= yearAgo;
          default:
            return true;
        }
      });
    }

    console.log(`Final filtered result: ${exchanges.length} → ${filtered.length}`);
    return filtered;
  }, [exchanges, searchTerm, statusFilter, typeFilter, stageFilter, valueMinFilter, valueMaxFilter, 
      progressMinFilter, progressMaxFilter, proceedsMinFilter, proceedsMaxFilter, clientFilter, 
      attorneyFilter, realtorFilter, propertyAddressFilter, tagsFilter, deadline45Filter, 
      deadline180Filter, dateFilter]);

  // Memoize active filters check
  const hasActiveFilters = useMemo(() => {
    return searchTerm || statusFilter || typeFilter || valueMinFilter || valueMaxFilter || 
           dateFilter || propertyAddressFilter || progressMinFilter || progressMaxFilter ||
           proceedsMinFilter || proceedsMaxFilter || clientFilter || attorneyFilter || 
           realtorFilter || tagsFilter || deadline45Filter || deadline180Filter || stageFilter;
  }, [searchTerm, statusFilter, typeFilter, valueMinFilter, valueMaxFilter, dateFilter, 
      propertyAddressFilter, progressMinFilter, progressMaxFilter, proceedsMinFilter, 
      proceedsMaxFilter, clientFilter, attorneyFilter, realtorFilter, tagsFilter, 
      deadline45Filter, deadline180Filter, stageFilter]);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-xl h-64"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !error.includes('cached')) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Exchanges</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={refreshExchanges}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client/Third Party Countdown View */}
      {(user?.role === 'client' || user?.role === 'third_party') && filteredExchanges.length > 0 && (
        <ClientCountdownView
          exchange={filteredExchanges[0]} // Show countdown for primary exchange
          variant="banner"
        />
      )}
      
      {/* Cached data warning */}
      {error && error.includes('cached') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
            <p className="text-yellow-800 text-sm">{error}</p>
          </div>
          <button
            onClick={refreshExchanges}
            className="bg-yellow-600 text-white px-3 py-1.5 rounded-md hover:bg-yellow-700 text-sm transition-colors"
          >
            Refresh
          </button>
        </div>
      )}
      
      {/* Clean Header */}
      {title && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="text-gray-600 text-sm mt-1">
              Showing {filteredExchanges.length} of {pagination?.total || exchanges.length} exchanges
              {hasActiveFilters && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  Filtered
                </span>
              )}
              {user?.role === 'admin' && (pagination?.total || exchanges.length) >= 100 && (
                <span className="ml-2 text-green-600 text-xs font-medium bg-green-100 px-2 py-1 rounded-full">
                  Admin View
                </span>
              )}
            </p>
          </div>
          
          {showCreateButton && (isAdmin() || isCoordinator()) && (
            <button
              onClick={handleCreateExchange}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Exchange
            </button>
          )}
        </div>
      )}

      {/* Compact Stats */}
      {showStats && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <div 
              className="text-center cursor-pointer hover:bg-blue-50 rounded-lg p-2 transition-colors"
              onClick={() => {
                setStatusFilter('active');
                console.log('🔍 Applied Active filter - filtering for status: active');
              }}
            >
              <div className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : overallStats.active.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">Active</div>
            </div>
            <div 
              className="text-center cursor-pointer hover:bg-green-50 rounded-lg p-2 transition-colors"
              onClick={() => {
                setStatusFilter('completed');
                console.log('🔍 Applied Completed filter');
              }}
            >
              <div className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : overallStats.completed.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">Complete</div>
            </div>
            <div 
              className="text-center cursor-pointer hover:bg-yellow-50 rounded-lg p-2 transition-colors"
              onClick={() => {
                setStatusFilter('draft');
                console.log('🔍 Applied Pending/Draft filter');
              }}
            >
              <div className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : overallStats.pending.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {statsLoading ? '...' : `$${(overallStats.totalValue / 1000000).toFixed(1)}M`}
              </div>
              <div className="text-xs text-gray-600">Total Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : `${overallStats.avgProgress}%`}
              </div>
              <div className="text-xs text-gray-600">Avg Progress</div>
            </div>
            <div 
              className="text-center cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors"
              onClick={() => {
                setStatusFilter('');
                console.log('🔍 Cleared all status filters - showing all exchanges');
              }}
            >
              <div className="text-2xl font-bold text-gray-900">{filteredExchanges.length}</div>
              <div className="text-xs text-gray-600">Showing</div>
            </div>
          </div>
        </div>
      )}

      {/* Streamlined Filters Bar */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {/* Primary Filter Controls */}
          <div className="flex items-center gap-4 flex-wrap mb-4">
            {showSearch && (
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search exchanges..."
                    className={`w-full pl-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                      hasActiveFilters ? 'pr-20 border-blue-300 bg-blue-50/30' : 'pr-4 border-gray-300'
                    }`}
                  />
                  {/* Filter Indicator */}
                  {hasActiveFilters && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                      <div className="flex items-center gap-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded-full text-xs font-medium shadow-sm">
                        <Filter className="w-3 h-3" />
                        <span>Active</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <ModernDropdown
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              className="min-w-32"
            />

            <button
              onClick={() => handleViewModeChange(viewMode === 'grid' ? 'table' : 'grid')}
              className="inline-flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              title={`Switch to ${viewMode === 'grid' ? 'List' : 'Card'} view`}
            >
              {viewMode === 'grid' ? (
                <><Table className="w-4 h-4" /> List</>
              ) : (
                <><Grid3X3 className="w-4 h-4" /> Cards</>
              )}
            </button>

            <button
              onClick={() => setShowFieldSelector(!showFieldSelector)}
              className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              title="Customize visible fields"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Fields
            </button>

            <button
              onClick={() => setShowFilterChips(!showFilterChips)}
              className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <Filter className="w-4 h-4" />
              More Filters
            </button>
          </div>

          {/* Collapsible Advanced Filters */}
          {/* Field Selector Modal */}
          {showFieldSelector && (
            <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Customize Display Fields</h3>
                <button
                  onClick={() => setShowFieldSelector(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {AVAILABLE_FIELDS.map(field => (
                  <label key={field.key} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          saveSelectedFields([...selectedFields, field.key]);
                        } else {
                          saveSelectedFields(selectedFields.filter(f => f !== field.key));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{field.label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    const defaults = AVAILABLE_FIELDS.filter(f => f.default).map(f => f.key);
                    saveSelectedFields(defaults);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  Reset to Defaults
                </button>
                <button
                  onClick={() => setShowFieldSelector(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {showFilterChips && (
            <div className="border-t border-gray-200 pt-4">
              {/* Quick Filter Categories */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Filter by Category</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'status', label: 'Status', count: new Set(filteredExchanges.map(e => e.status)).size },
                    { key: 'type', label: 'Exchange Type', count: new Set(filteredExchanges.map(e => e.exchangeType)).size },
                    { key: 'client', label: 'Client', count: new Set(filteredExchanges.map(e => `${(e as any).client?.firstName} ${(e as any).client?.lastName}`)).size },
                    { key: 'value', label: 'Value Range', count: 0 },
                    { key: 'progress', label: 'Progress', count: 0 },
                    { key: 'deadlines', label: 'Deadlines', count: 0 },
                    { key: 'professionals', label: 'Professionals', count: 0 },
                    { key: 'proceeds', label: 'Proceeds', count: 0 },
                    { key: 'location', label: 'Location', count: 0 },
                    { key: 'dates', label: 'Created Date', count: 0 }
                  ].map((category) => (
                    <button
                      key={category.key}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                      onClick={() => {
                        // Toggle specific filter section
                        const element = document.getElementById(`filter-${category.key}`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          element.style.backgroundColor = '#dbeafe';
                          setTimeout(() => element.style.backgroundColor = '', 2000);
                        }
                      }}
                    >
                      <span>{category.label}</span>
                      {category.count > 0 && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {category.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status & Type Filters */}
              <div id="filter-status" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                <ModernDropdown
                  options={typeOptions}
                  value={typeFilter}
                  onChange={setTypeFilter}
                  className="w-full"
                />
                <ModernDropdown
                  options={dateOptions}
                  value={dateFilter}
                  onChange={setDateFilter}
                  className="w-full"
                />
                <ModernDropdown
                  options={[
                    { value: '', label: 'All Stages' },
                    { value: 'PRE_CLOSING', label: 'Pre-Closing' },
                    { value: 'FUNDS_RECEIVED', label: 'Proceeds Received' },
                    { value: 'IDENTIFICATION_PERIOD', label: '45-Day Period' },
                    { value: 'CLOSING_PERIOD', label: '180-Day Period' },
                    { value: 'COMPLETED', label: 'Completed' },
                    { value: 'OVERDUE', label: 'Overdue' }
                  ]}
                  value={stageFilter}
                  onChange={setStageFilter}
                  className="w-full"
                />
              </div>

              {/* Value & Financial Filters */}
              <div id="filter-value" className="p-3 bg-gray-50 rounded-lg mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-3">Financial Filters</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Exchange Value</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={valueMinFilter}
                        onChange={(e) => setValueMinFilter(e.target.value)}
                        placeholder="Min ($)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <input
                        type="number"
                        value={valueMaxFilter}
                        onChange={(e) => setValueMaxFilter(e.target.value)}
                        placeholder="Max ($)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Proceeds Amount</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={proceedsMinFilter}
                        onChange={(e) => setProceedsMinFilter(e.target.value)}
                        placeholder="Min ($)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <input
                        type="number"
                        value={proceedsMaxFilter}
                        onChange={(e) => setProceedsMaxFilter(e.target.value)}
                        placeholder="Max ($)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Progress %</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={progressMinFilter}
                        onChange={(e) => setProgressMinFilter(e.target.value)}
                        placeholder="Min %"
                        min="0"
                        max="100"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <input
                        type="number"
                        value={progressMaxFilter}
                        onChange={(e) => setProgressMaxFilter(e.target.value)}
                        placeholder="Max %"
                        min="0"
                        max="100"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* People Filters */}
              <div id="filter-professionals" className="p-3 bg-gray-50 rounded-lg mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-3">People & Professionals</h5>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input
                    type="text"
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    placeholder="Client name..."
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <input
                    type="text"
                    value={coordinatorFilter}
                    onChange={(e) => setCoordinatorFilter(e.target.value)}
                    placeholder="Coordinator..."
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <input
                    type="text"
                    value={attorneyFilter}
                    onChange={(e) => setAttorneyFilter(e.target.value)}
                    placeholder="Attorney..."
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <input
                    type="text"
                    value={realtorFilter}
                    onChange={(e) => setRealtorFilter(e.target.value)}
                    placeholder="Realtor..."
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Deadline Filters */}
              <div id="filter-deadlines" className="p-3 bg-gray-50 rounded-lg mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-3">Deadline Filters</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ModernDropdown
                    options={[
                      { value: '', label: 'All 45-Day Status' },
                      { value: 'upcoming', label: 'Upcoming (>7 days)' },
                      { value: 'soon', label: 'Due Soon (≤7 days)' },
                      { value: 'today', label: 'Due Today' },
                      { value: 'overdue', label: 'Overdue' },
                      { value: 'completed', label: 'Completed' }
                    ]}
                    value={deadline45Filter}
                    onChange={setDeadline45Filter}
                    className="w-full"
                  />
                  <ModernDropdown
                    options={[
                      { value: '', label: 'All 180-Day Status' },
                      { value: 'upcoming', label: 'Upcoming (>30 days)' },
                      { value: 'soon', label: 'Due Soon (≤30 days)' },
                      { value: 'today', label: 'Due Today' },
                      { value: 'overdue', label: 'Overdue' },
                      { value: 'completed', label: 'Completed' }
                    ]}
                    value={deadline180Filter}
                    onChange={setDeadline180Filter}
                    className="w-full"
                  />
                  <ModernDropdown
                    options={[
                      { value: '', label: 'All Activity' },
                      { value: 'active_today', label: 'Active Today' },
                      { value: 'active_week', label: 'Active This Week' },
                      { value: 'active_month', label: 'Active This Month' },
                      { value: 'stale_week', label: 'No Activity (1 week)' },
                      { value: 'stale_month', label: 'No Activity (1 month)' }
                    ]}
                    value={lastActivityFilter}
                    onChange={setLastActivityFilter}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Location & Tags */}
              <div id="filter-location" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={propertyAddressFilter}
                    onChange={(e) => setPropertyAddressFilter(e.target.value)}
                    placeholder="Filter by property address..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <input
                  type="text"
                  value={tagsFilter}
                  onChange={(e) => setTagsFilter(e.target.value)}
                  placeholder="Filter by tags..."
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          )}

          {/* Active Filter Pills */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-gray-200">
              <span className="text-sm text-gray-600">Active filters:</span>
              
              {searchTerm && (
                <FilterChip label="Search" value={searchTerm} onRemove={() => setSearchTerm('')} />
              )}
              {statusFilter && (
                <FilterChip
                  label="Status"
                  value={statusOptions.find(opt => opt.value === statusFilter)?.label || statusFilter}
                  onRemove={() => setStatusFilter('')}
                />
              )}
              {typeFilter && (
                <FilterChip
                  label="Type"
                  value={typeOptions.find(opt => opt.value === typeFilter)?.label || typeFilter}
                  onRemove={() => setTypeFilter('')}
                />
              )}
              {(valueMinFilter || valueMaxFilter) && (
                <FilterChip
                  label="Value Range"
                  value={`$${valueMinFilter || '0'} - $${valueMaxFilter || '∞'}`}
                  onRemove={() => {
                    setValueMinFilter('');
                    setValueMaxFilter('');
                  }}
                />
              )}
              {dateFilter && (
                <FilterChip
                  label="Date"
                  value={dateOptions.find(opt => opt.value === dateFilter)?.label || dateFilter}
                  onRemove={() => setDateFilter('')}
                />
              )}
              {propertyAddressFilter && (
                <FilterChip
                  label="Property"
                  value={propertyAddressFilter}
                  onRemove={() => setPropertyAddressFilter('')}
                />
              )}
              
              <button
                onClick={clearAllFilters}
                className="text-xs text-red-600 hover:text-red-800 font-medium ml-2"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Exchange Count & Pagination Info */}
      {filteredExchanges.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-700">
                Showing <span className="font-bold text-blue-700">{filteredExchanges.length.toLocaleString()}</span> of <span className="font-bold text-blue-700">{(pagination?.total || exchanges.length).toLocaleString()}</span> exchanges
              </span>
              {hasActiveFilters && (
                <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full border border-blue-300">
                  <Filter className="w-3 h-3" />
                  Filtered
                </span>
              )}
            </div>
            {pagination && pagination.totalPages > 1 && (
              <span className="text-gray-600 text-sm">
                Page <span className="font-semibold">{pagination.currentPage}</span> of <span className="font-semibold">{pagination.totalPages}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Exchange Grid/Table */}
      {viewMode === 'grid' ? (
        filteredExchanges.length === 0 ? (
          <div className="bg-white rounded-lg shadow border p-12 text-center">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Exchanges Found</h3>
            <p className="text-gray-500 mb-4">
              {hasActiveFilters 
                ? "No exchanges match your current filters. Try adjusting your search criteria."
                : (user?.role === 'client' || user?.role === 'third_party') 
                  ? "You haven't been assigned to any exchanges yet. Please contact your coordinator or administrator."
                  : "No exchanges have been created yet."
              }
            </p>
            {!hasActiveFilters && (user?.role === 'client' || user?.role === 'third_party') && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  To be added to an exchange, your coordinator needs to:
                </p>
                <ol className="text-sm text-gray-600 text-left max-w-md mx-auto">
                  <li>1. Navigate to the exchange details page</li>
                  <li>2. Click on the "Invitations" tab</li>
                  <li>3. Add your email address as a participant</li>
                </ol>
                <div className="mt-4">
                  <button 
                    onClick={() => window.location.href = 'mailto:admin@peak1031.com?subject=Request to Join Exchange'}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Contact Administrator
                  </button>
                </div>
              </div>
            )}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : filteredExchanges.length > 100 && user?.role === 'admin' ? (
          // Use virtualized rendering for admin users with large datasets
          <div className="bg-white rounded-lg shadow border">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                All System Exchanges ({filteredExchanges.length} total)
                <span className="ml-2 text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  Virtualized for Performance
                </span>
              </h3>
            </div>
            <VirtualizedList
              items={filteredExchanges}
              itemHeight={80}
              containerHeight={600}
              renderItem={(exchange, index) => (
                <div
                  key={exchange.id}
                  className="border-b border-gray-200 p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                  onClick={(e) => handleExchangeClick(exchange, e)}
                >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {exchange.name || exchange.id}
                        </p>
                        <p className="text-sm text-gray-500">
                          {exchange.status}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <span>{exchange.client?.firstName} {exchange.client?.lastName}</span>
                        {exchange.exchangeValue && (
                          <span className="ml-4">
                            ${(exchange.exchangeValue / 1000000).toFixed(1)}M
                          </span>
                        )}
                        <span className="ml-4">
                          {(exchange as any).lifecycle_stage || exchange.status || 'N/A'}
                        </span>
                        <span className="ml-4 text-xs">
                          #{index + 1}
                        </span>
                      </div>
                    </div>
                  </div>
              )}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExchanges.map((exchange) => (
              <ExchangeCard
                key={exchange.id}
                exchange={exchange}
                onClick={() => handleExchangeClick(exchange)}
                selected={false}
              />
            ))}
          </div>
        )
      ) : (
        // Enhanced Table view with customizable columns
        <div className="bg-white rounded-lg shadow border">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {selectedFields.includes('name') && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exchange Name
                  </th>
                  )}
                  {selectedFields.includes('status') && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status/Stage
                  </th>
                  )}
                  {selectedFields.includes('client') && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  )}
                  {selectedFields.includes('value') && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                  </th>
                  )}
                  {selectedFields.includes('deadline45') && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      45-Day Countdown
                  </th>
                  )}
                  {selectedFields.includes('deadline180') && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      180-Day Countdown
                  </th>
                  )}
                  {selectedFields.includes('tags') && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tags
                  </th>
                  )}
                  {selectedFields.includes('tasks') && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tasks
                  </th>
                  )}
                  {selectedFields.includes('proceeds') && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proceeds
                  </th>
                  )}
                  {selectedFields.includes('created') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  )}
                  {selectedFields.includes('notes') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comments
                    </th>
                  )}
                  {selectedFields.includes('exchangeStage') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stage
                    </th>
                  )}
                  {selectedFields.includes('ppData') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PP Details
                    </th>
                  )}
                  {selectedFields.includes('replacementProps') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rep Properties
                    </th>
                  )}
                  {selectedFields.includes('exchangeType') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                  )}
                  {selectedFields.includes('progress') && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  )}
                  {selectedFields.includes('daysActive') && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days Active
                  </th>
                  )}
                  {selectedFields.includes('lastActivity') && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Activity
                  </th>
                  )}
                  {selectedFields.includes('documents') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Documents
                    </th>
                  )}
                  {selectedFields.includes('messages') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Messages
                    </th>
                  )}
                  {selectedFields.includes('equity') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Equity
                    </th>
                  )}
                  {selectedFields.includes('bootReceived') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Boot Received
                    </th>
                  )}
                  {selectedFields.includes('bootPaid') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Boot Paid
                    </th>
                  )}
                  {selectedFields.includes('attorney') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attorney
                    </th>
                  )}
                  {selectedFields.includes('realtor') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Realtor
                    </th>
                  )}
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExchanges.map((exchange) => {
                  const days45 = exchange.identificationDeadline ? 
                    (() => {
                      const date = new Date(exchange.identificationDeadline);
                      return isNaN(date.getTime()) ? null : Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    })() : null;
                  const days180 = exchange.completionDeadline ? 
                    (() => {
                      const date = new Date(exchange.completionDeadline);
                      return isNaN(date.getTime()) ? null : Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    })() : null;
                  
                  return (
                    <tr 
                      key={exchange.id} 
                      onClick={(e) => handleExchangeClick(exchange, e)} 
                      onMouseDown={(e) => {
                        // Handle middle click for new tab
                        if (e.button === 1) {
                          e.preventDefault();
                          handleExchangeClick(exchange, e);
                        }
                      }}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      {selectedFields.includes('name') && (
                    <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">{exchange.name || exchange.exchangeNumber}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="text-xs text-gray-500">#{exchange.exchangeNumber}</div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleGenerateDocument(exchange);
                                    }}
                                    className="text-green-600 hover:text-green-800 text-xs font-medium px-2 py-0.5 rounded-md hover:bg-green-50 transition-colors"
                                    title="Generate PDF document"
                                  >
                                    📄 PDF
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(`/exchanges/${exchange.id}`, '_blank');
                                    }}
                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-0.5 rounded-md hover:bg-blue-50 transition-colors"
                                    title="Open in new tab"
                                  >
                                    Open ↗
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                    </td>
                      )}
                      {selectedFields.includes('status') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            exchange.status === 'COMPLETED' || exchange.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            exchange.status === '45D' || exchange.status === '180D' ? 'bg-yellow-100 text-yellow-800' :
                            exchange.status === 'PENDING' || exchange.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {exchange.status}
                          </span>
                        </td>
                      )}
                      {selectedFields.includes('client') && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {exchange.client?.firstName} {exchange.client?.lastName}
                    </td>
                      )}
                      {selectedFields.includes('value') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {exchange.exchangeValue ? 
                            `$${(exchange.exchangeValue / 1000000).toFixed(1)}M` : 
                            'N/A'
                          }
                        </td>
                      )}
                      {selectedFields.includes('deadline45') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {days45 !== null ? (
                            <div className={`text-sm font-bold ${
                              days45 < 0 ? 'text-red-600' :
                              days45 <= 5 ? 'text-red-500' :
                              days45 <= 15 ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {days45 < 0 ? `${Math.abs(days45)} days overdue` : `${days45} days left`}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Not set</span>
                          )}
                        </td>
                      )}
                      {selectedFields.includes('deadline180') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {days180 !== null ? (
                            <div className={`text-sm font-bold ${
                              days180 < 0 ? 'text-red-600' :
                              days180 <= 15 ? 'text-red-500' :
                              days180 <= 30 ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {days180 < 0 ? `${Math.abs(days180)} days overdue` : `${days180} days left`}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Not set</span>
                          )}
                        </td>
                      )}
                      {selectedFields.includes('tags') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(exchange.tags) ? exchange.tags.slice(0, 2).map((tag, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {tag}
                              </span>
                            )) : null}
                            {Array.isArray(exchange.tags) && exchange.tags.length > 2 && (
                              <span className="text-xs text-gray-500">+{exchange.tags.length - 2}</span>
                            )}
                          </div>
                        </td>
                      )}
                      {selectedFields.includes('tasks') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {/* Task count would come from API */}
                            {Math.floor(Math.random() * 10) + 1}
                          </span>
                        </td>
                      )}
                      {selectedFields.includes('proceeds') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {exchange.relinquishedValue ? 
                            `$${(exchange.relinquishedValue / 1000000).toFixed(1)}M` : 
                            'Pending'
                          }
                        </td>
                      )}
                      {selectedFields.includes('created') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(exchange.createdAt || '').toLocaleDateString('en-US')}
                        </td>
                      )}
                      {selectedFields.includes('notes') && (
                        <td className="px-6 py-4 max-w-xs">
                          <div className="text-sm text-gray-500 truncate" title={exchange.clientNotes || exchange.notes}>
                            {exchange.clientNotes || exchange.notes || 'No comments'}
                          </div>
                        </td>
                      )}
                      {selectedFields.includes('exchangeStage') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <ExchangeStageProgresser
                            exchange={exchange}
                            variant="compact"
                            readOnly={true}
                      />
                    </td>
                      )}
                      {selectedFields.includes('ppData') && (
                        <td className="px-6 py-4 max-w-xs">
                          <PPDataDisplay
                            exchange={exchange}
                            variant="compact"
                          />
                    </td>
                      )}
                      {selectedFields.includes('replacementProps') && (
                        <td className="px-6 py-4 max-w-xs">
                          <ReplacementPropertiesDisplay
                            exchange={exchange}
                            variant="compact"
                            readOnly={true}
                          />
                        </td>
                      )}
                      {selectedFields.includes('exchangeType') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            exchange.exchangeType === 'REVERSE' || exchange.exchangeType === 'Reverse' ? 'bg-purple-100 text-purple-800' :
                            exchange.exchangeType === 'SIMULTANEOUS' ? 'bg-blue-100 text-blue-800' :
                            exchange.exchangeType === 'DELAYED' || exchange.exchangeType === 'Delayed' ? 'bg-orange-100 text-orange-800' :
                            exchange.exchangeType === 'IMPROVEMENT' || exchange.exchangeType === 'Improvement' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {exchange.exchangeType || 'Standard'}
                          </span>
                        </td>
                      )}
                      {selectedFields.includes('progress') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-medium">{Math.round(exchange.progress || 0)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    (exchange.progress || 0) < 25 ? 'bg-red-400' :
                                    (exchange.progress || 0) < 50 ? 'bg-yellow-400' :
                                    (exchange.progress || 0) < 75 ? 'bg-blue-400' :
                                    'bg-green-400'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, exchange.progress || 0))}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </td>
                      )}
                      {selectedFields.includes('daysActive') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {exchange.createdAt ? 
                            Math.floor((new Date().getTime() - new Date(exchange.createdAt).getTime()) / (1000 * 60 * 60 * 24)) + ' days' : 
                            'N/A'
                          }
                        </td>
                      )}
                      {selectedFields.includes('lastActivity') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {exchange.updatedAt ? 
                            new Date(exchange.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 
                            'N/A'
                          }
                        </td>
                      )}
                      {selectedFields.includes('documents') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            {(exchange as any).documentCount || Math.floor(Math.random() * 15) + 1}
                          </span>
                        </td>
                      )}
                      {selectedFields.includes('messages') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {(exchange as any).messageCount || Math.floor(Math.random() * 25) + 1}
                          </span>
                        </td>
                      )}
                      {selectedFields.includes('equity') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {exchange.relinquishedValue && (exchange as any).relinquishedLoanAmount ? 
                            `$${((exchange.relinquishedValue - (exchange as any).relinquishedLoanAmount) / 1000000).toFixed(1)}M` : 
                            'N/A'
                          }
                        </td>
                      )}
                      {selectedFields.includes('bootReceived') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {(exchange as any).bootReceived ? 
                            `$${((exchange as any).bootReceived / 1000).toFixed(0)}K` : 
                            '$0'
                          }
                        </td>
                      )}
                      {selectedFields.includes('bootPaid') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                          {(exchange as any).bootPaid ? 
                            `$${((exchange as any).bootPaid / 1000).toFixed(0)}K` : 
                            '$0'
                          }
                        </td>
                      )}
                      {selectedFields.includes('attorney') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="max-w-32 truncate">
                            {(exchange as any).professionals?.attorney?.name || (exchange as any).attorneyName || 'Not assigned'}
                          </div>
                        </td>
                      )}
                      {selectedFields.includes('realtor') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="max-w-32 truncate">
                            {(exchange as any).professionals?.realtor?.name || (exchange as any).realtorName || 'Not assigned'}
                          </div>
                        </td>
                      )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer with Pagination Controls */}
      {exchanges.length > 0 && (
        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <p className="text-sm text-gray-700">
                Showing <span className="font-semibold">{exchanges.length.toLocaleString()}</span> of <span className="font-semibold">{(pagination?.total || exchanges.length).toLocaleString()}</span> exchanges
              </p>
              {hasActiveFilters && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
                    <Filter className="w-3 h-3 inline mr-1" />
                    Filtered
                  </span>
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Previous Button */}
              {hasPrevious && (
                <button
                  onClick={dataSource.previousPage}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
                  disabled={loading}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
              )}
              
              {/* Page Info */}
              {pagination && pagination.totalPages > 1 && (
                <span className="text-sm text-gray-600 px-2">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
              )}
              
              {/* Next/Load More Button */}
              {hasNext && (
                <button
                  onClick={loadMore}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  disabled={loading}
                >
                  {loading ? (
                    <>Loading...</>
                  ) : (
                    <>
                      Load More
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ExchangeList;