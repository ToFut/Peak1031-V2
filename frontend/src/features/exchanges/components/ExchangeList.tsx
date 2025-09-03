import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
      e.status === '180D'
    ).length,
    completed: exchanges.filter(e => 
      e.status === 'COMPLETED' || 
      e.status === 'Completed'
    ).length,
    pending: exchanges.filter(e => 
      e.status === 'PENDING' || 
      e.status === 'Draft' ||
      e.status === 'In Progress' || 
      e.status === 'ON_HOLD' ||
      !e.status
    ).length,
    totalFundsOnDeposit: exchanges.reduce((sum, e) => {
      // Calculate funds on deposit (proceeds holding)
      const proceeds = (e as any).proceeds || 
                      ((e as any).date_proceeds_received ? e.exchangeValue : 0);
      const value = proceeds || 
                  e.relinquishedValue || 
                  (e as any).rel_value || 
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
            <p className="text-sm font-medium text-gray-600">Total Funds on Deposit</p>
            <p className="text-lg font-bold text-gray-900">
              ${(stats.totalFundsOnDeposit / 1000000).toFixed(1)}M
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

// Component for clickable user names in ExchangeList
const ClickableUserName: React.FC<{
  userName: string;
  email?: string;
  className?: string;
}> = ({ userName, email, className = "" }) => {
  if (!userName || userName === 'Not assigned') return <span className={className}>{userName || 'Not assigned'}</span>;
  
  // Create search params to filter user management by name
  const searchParams = new URLSearchParams();
  if (email) {
    searchParams.set('search', email);
  } else {
    // Extract first name from full name for better search results
    const firstName = userName.split(' ')[0];
    searchParams.set('search', firstName);
  }
  searchParams.set('type', 'all'); // Search both users and contacts
  
  return (
    <Link
      to={`/users?${searchParams.toString()}`}
      className={`text-blue-600 hover:text-blue-800 hover:underline transition-colors ${className}`}
      title={`View user profile for ${userName}${email ? ` (${email})` : ''}`}
    >
      {userName}
    </Link>
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
    totalFundsOnDeposit: 0,
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
          totalFundsOnDeposit: 214490000,
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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<'instant' | 'manual'>('manual'); // Default to manual search
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  
  // New filters for specific fields
  const [ppMatterNumberFilter, setPpMatterNumberFilter] = useState('');
  const [exchangeIdFilter, setExchangeIdFilter] = useState('');
  const [apnFilter, setApnFilter] = useState('');
  const [escrowNumberFilter, setEscrowNumberFilter] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');
  const [settlementAgentFilter, setSettlementAgentFilter] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    if (setSortBy) {
      setSortBy(`${field}:${sortDirection === 'asc' ? 'desc' : 'asc'}`);
    }
  };

  // Debounce search term for instant mode only
  useEffect(() => {
    if (searchMode === 'instant') {
      const timer = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
        setIsSearching(false);
      }, 500); // Wait 500ms after user stops typing

      if (searchTerm !== debouncedSearchTerm) {
        setIsSearching(true);
      }

      return () => clearTimeout(timer);
    }
    // In manual mode, don't update debouncedSearchTerm automatically
  }, [searchTerm, searchMode, debouncedSearchTerm]);

  // Handle manual search - only update debounced term when user explicitly searches
  const handleManualSearch = useCallback(() => {
    console.log('Manual search triggered with:', searchTerm);
    setDebouncedSearchTerm(searchTerm);
    setIsSearching(false);
  }, [searchTerm]);

  // Handle search clear
  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setIsSearching(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Handle Enter key for manual search
  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchMode === 'manual') {
      handleManualSearch();
    }
  }, [searchMode, handleManualSearch]);

  // Sync local filters with server-side filtering
  useEffect(() => {
    const filterOptions: any = {};
    
    // Only use debouncedSearchTerm for API calls to prevent calls on every keystroke
    if (debouncedSearchTerm.trim()) {
      filterOptions.searchTerm = debouncedSearchTerm.trim();
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
    
    // Add advanced filters
    if (clientFilter.trim()) {
      filterOptions.client = clientFilter.trim();
    }
    
    if (coordinatorFilter.trim()) {
      filterOptions.coordinator = coordinatorFilter.trim();
    }
    
    if (attorneyFilter.trim()) {
      filterOptions.attorney = attorneyFilter.trim();
    }
    
    if (progressMinFilter) {
      filterOptions.progressMin = parseFloat(progressMinFilter);
    }
    
    if (progressMaxFilter) {
      filterOptions.progressMax = parseFloat(progressMaxFilter);
    }
    
    // New specific field filters
    if (ppMatterNumberFilter.trim()) {
      filterOptions.ppMatterNumber = ppMatterNumberFilter.trim();
    }
    
    if (exchangeIdFilter.trim()) {
      filterOptions.exchangeId = exchangeIdFilter.trim();
    }
    
    if (apnFilter.trim()) {
      filterOptions.apn = apnFilter.trim();
    }
    
    if (escrowNumberFilter.trim()) {
      filterOptions.escrowNumber = escrowNumberFilter.trim();
    }
    
    if (propertyTypeFilter.trim()) {
      filterOptions.propertyType = propertyTypeFilter.trim();
    }
    
    if (buyerFilter.trim()) {
      filterOptions.buyer = buyerFilter.trim();
    }
    
    if (settlementAgentFilter.trim()) {
      filterOptions.settlementAgent = settlementAgentFilter.trim();
    }
    
    // Update server-side filters
    console.log('🔄 Syncing filters with backend:', filterOptions);
    console.log('🔄 statusFilter value:', statusFilter);
    console.log('🔄 Current exchanges length before filter sync:', exchanges?.length || 0);
    setSmartFilters(filterOptions);
    console.log('🔄 Called setSmartFilters with:', filterOptions);
  }, [debouncedSearchTerm, statusFilter, typeFilter, valueMinFilter, valueMaxFilter, dateFilter, propertyAddressFilter, 
      clientFilter, coordinatorFilter, attorneyFilter, progressMinFilter, progressMaxFilter, 
      ppMatterNumberFilter, exchangeIdFilter, apnFilter, escrowNumberFilter, propertyTypeFilter, buyerFilter, settlementAgentFilter, setSmartFilters]);

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
    { key: 'ppMatterNumber', label: 'PP Matter Number', default: false },
    { key: 'exchangeId', label: 'Exchange ID', default: false },
    { key: 'apn', label: 'APN', default: false },
    { key: 'escrowNumber', label: 'Escrow Number', default: false },
    { key: 'propertyType', label: 'Property Type', default: false },
    { key: 'buyer', label: 'Buyer Names', default: false },
    { key: 'settlementAgent', label: 'Settlement Agent', default: false },
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
            link.download = `Exchange_${exchange.exchangeNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
          }
        }
      } catch (apiError) {
        console.warn('API PDF generation failed, using client-side generation:', apiError);
      }

      // Fallback: Generate client-side HTML report (downloads automatically, no print dialog)
      const blob = new Blob([pdfContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Exchange_${exchange.exchangeNumber}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
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
      <title>Exchange ${exchange.exchangeNumber} Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          color: #1f2937; 
          line-height: 1.6; 
          background: #f9fafb;
          padding: 30px;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          padding: 40px;
          text-align: center;
        }
        .logo { 
          font-size: 32px; 
          font-weight: bold; 
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .title { 
          font-size: 24px; 
          font-weight: 500; 
          margin: 10px 0; 
          opacity: 0.95;
        }
        .exchange-number {
          display: inline-block;
          background: rgba(255, 255, 255, 0.2);
          padding: 8px 20px;
          border-radius: 20px;
          font-size: 18px;
          font-weight: bold;
          margin-top: 10px;
        }
        .content { padding: 40px; }
        .section { 
          margin: 0 0 35px 0; 
          padding: 25px; 
          background: #f9fafb;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
        }
        .section-title { 
          font-size: 18px; 
          font-weight: 600; 
          color: #111827; 
          border-bottom: 2px solid #e5e7eb; 
          padding-bottom: 12px; 
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .icon { font-size: 20px; }
        .info-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 25px; 
          margin: 20px 0; 
        }
        .info-item { 
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .label { 
          font-weight: 600; 
          color: #6b7280; 
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .value { 
          color: #111827; 
          font-size: 15px;
          font-weight: 500;
        }
        .value-large {
          font-size: 18px;
          font-weight: 600;
          color: #1d4ed8;
        }
        .status-badge { 
          display: inline-block;
          padding: 8px 16px; 
          border-radius: 25px; 
          font-size: 13px; 
          font-weight: 600; 
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .status-active { 
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
          color: #92400e; 
          box-shadow: 0 2px 4px rgba(251, 191, 36, 0.2);
        }
        .status-completed { 
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); 
          color: #166534;
          box-shadow: 0 2px 4px rgba(34, 197, 94, 0.2);
        }
        .status-pending { 
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); 
          color: #374151;
          box-shadow: 0 2px 4px rgba(107, 114, 128, 0.2);
        }
        .deadline-urgent { 
          color: #dc2626; 
          font-weight: 600;
          background: #fee2e2;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .deadline-warning { 
          color: #d97706; 
          font-weight: 600;
          background: #fef3c7;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .deadline-normal { 
          color: #059669;
          background: #d1fae5;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .progress-container {
          margin: 15px 0;
        }
        .progress-bar { 
          width: 100%; 
          height: 24px; 
          background: #e5e7eb; 
          border-radius: 12px; 
          overflow: hidden;
          position: relative;
        }
        .progress-fill { 
          height: 100%; 
          background: linear-gradient(90deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 13px;
        }
        .financial-highlight {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 2px solid #3b82f6;
          border-radius: 8px;
          padding: 15px;
          margin: 10px 0;
        }
        .footer { 
          background: #f9fafb;
          padding: 30px 40px;
          text-align: center; 
          color: #6b7280; 
          font-size: 13px;
          border-top: 2px solid #e5e7eb;
        }
        .footer-logo {
          font-weight: 600;
          color: #2563eb;
          margin-bottom: 10px;
        }
        .notes-box {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          border-radius: 6px;
          margin-top: 15px;
          font-style: italic;
        }
        @media print {
          body { 
            margin: 0; 
            padding: 0;
            background: white;
          }
          .container {
            box-shadow: none;
            border-radius: 0;
          }
          .section { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">
            <span>🏢</span>
            <span>Peak 1031 Exchange</span>
          </div>
          <div class="title">Exchange Summary Report</div>
          <div class="exchange-number">Exchange #${exchange.exchangeNumber}</div>
        </div>
        
        <div class="content">

          <div class="section">
            <div class="section-title">
              <span class="icon">📊</span>
              <span>Exchange Overview</span>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Exchange Name</span>
                <span class="value">${exchange.name || 'Unnamed Exchange'}</span>
              </div>
              <div class="info-item">
                <span class="label">Exchange Type</span>
                <span class="value">${exchange.exchangeType || 'Like-Kind Exchange'}</span>
              </div>
              <div class="info-item">
                <span class="label">Current Status</span>
                <span class="status-badge ${exchange.status === 'COMPLETED' ? 'status-completed' : 
                                            (exchange.status === '45D' || exchange.status === '180D') ? 'status-active' : 
                                            'status-pending'}">
                  ${exchange.status || 'Pending'}
                </span>
              </div>
              <div class="info-item">
                <span class="label">Exchange Value</span>
                <span class="value value-large">${formatCurrency(exchange.exchangeValue)}</span>
              </div>
            </div>
            <div class="progress-container">
              <span class="label">Overall Progress</span>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${exchange.progress || 0}%">
                  ${Math.round(exchange.progress || 0)}%
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">
              <span class="icon">👤</span>
              <span>Client Information</span>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Client Name</span>
                <span class="value">${exchange.client?.firstName || ''} ${exchange.client?.lastName || 'Not specified'}</span>
              </div>
              <div class="info-item">
                <span class="label">Email Address</span>
                <span class="value">${exchange.client?.email || 'Not provided'}</span>
              </div>
              <div class="info-item">
                <span class="label">Phone Number</span>
                <span class="value">${exchange.client?.phone || 'Not provided'}</span>
              </div>
              <div class="info-item">
                <span class="label">Exchange Created</span>
                <span class="value">${formatDate(exchange.createdAt)}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">
              <span class="icon">⏰</span>
              <span>Critical Deadlines</span>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">45-Day Identification Deadline</span>
                <div>
                  <span class="value">${formatDate(exchange.identificationDeadline)}</span>
                  <div style="margin-top: 5px;">
                    <span class="${exchange.identificationDeadline && new Date(exchange.identificationDeadline) < today ? 'deadline-urgent' : 
                                    exchange.identificationDeadline && (new Date(exchange.identificationDeadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 7 ? 'deadline-warning' : 'deadline-normal'}">
                      ${calculateDaysRemaining(exchange.identificationDeadline)}
                    </span>
                  </div>
                </div>
              </div>
              <div class="info-item">
                <span class="label">180-Day Completion Deadline</span>
                <div>
                  <span class="value">${formatDate(exchange.completionDeadline)}</span>
                  <div style="margin-top: 5px;">
                    <span class="${exchange.completionDeadline && new Date(exchange.completionDeadline) < today ? 'deadline-urgent' : 
                                    exchange.completionDeadline && (new Date(exchange.completionDeadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 30 ? 'deadline-warning' : 'deadline-normal'}">
                      ${calculateDaysRemaining(exchange.completionDeadline)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">
              <span class="icon">💰</span>
              <span>Financial Summary</span>
            </div>
            <div class="financial-highlight">
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Total Exchange Value</span>
                  <span class="value value-large">${formatCurrency(exchange.exchangeValue)}</span>
                </div>
                <div class="info-item">
                  <span class="label">Relinquished Property Value</span>
                  <span class="value value-large">${formatCurrency(exchange.relinquishedValue)}</span>
                </div>
              </div>
            </div>
            <div class="info-grid" style="margin-top: 20px;">
              <div class="info-item">
                <span class="label">Boot Received (Escrow)</span>
                <span class="value">${formatCurrency((exchange as any).bootReceivedEscrow || (exchange as any).bootReceived || 0)}</span>
              </div>
              <div class="info-item">
                <span class="label">Boot Paid (Escrow)</span>
                <span class="value">${formatCurrency((exchange as any).bootPaidEscrow || (exchange as any).bootPaid || 0)}</span>
              </div>
              <div class="info-item">
                <span class="label">Replacement Property Value</span>
                <span class="value">${formatCurrency(exchange.replacementValue || 0)}</span>
              </div>
              <div class="info-item">
                <span class="label">Net Exchange Amount</span>
                <span class="value">${formatCurrency((exchange.exchangeValue || 0) - ((exchange as any).bootReceivedEscrow || (exchange as any).bootReceived || 0) + ((exchange as any).bootPaidEscrow || (exchange as any).bootPaid || 0))}</span>
              </div>
            </div>
          </div>

          ${exchange.notes || exchange.clientNotes ? `
          <div class="section">
            <div class="section-title">
              <span class="icon">📝</span>
              <span>Exchange Notes</span>
            </div>
            <div class="notes-box">
              ${exchange.clientNotes || exchange.notes || 'No notes available'}
            </div>
          </div>
          ` : ''}
          
          ${exchange.relinquishedPropertyAddress || (exchange as any).rel_property_address ? `
          <div class="section">
            <div class="section-title">
              <span class="icon">🏠</span>
              <span>Property Information</span>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Relinquished Property Address</span>
                <span class="value">${exchange.relinquishedPropertyAddress || (exchange as any).rel_property_address || 'Not specified'}</span>
              </div>
              <div class="info-item">
                <span class="label">Sale Price</span>
                <span class="value">${formatCurrency(exchange.relinquishedSalePrice || (exchange as any).rel_value || 0)}</span>
              </div>
              ${exchange.relinquishedClosingDate || (exchange as any).close_of_escrow_date ? `
              <div class="info-item">
                <span class="label">Closing Date</span>
                <span class="value">${formatDate(exchange.relinquishedClosingDate || (exchange as any).close_of_escrow_date)}</span>
              </div>
              ` : ''}
              ${(exchange as any).rel_escrow_number ? `
              <div class="info-item">
                <span class="label">Escrow Number</span>
                <span class="value">${(exchange as any).rel_escrow_number}</span>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <div class="footer-logo">🏢 Peak 1031 Exchange Management System</div>
          <p>Report Generated: ${today.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p style="margin-top: 15px; color: #9ca3af;">
            This document contains confidential information and is intended solely for the use of the addressee.<br>
            Please handle according to your organization's data protection and privacy policies.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  };

  const clearAllFilters = useCallback(() => {
    // Clear local filter states
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setIsSearching(false);
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
    setSortField('');
    setSortDirection('desc');
    
    // Clear server-side filters
    if (clearFilters) {
      clearFilters();
    }
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

  // Client-side filtering logic - enhanced to work with both client and server filtering
  const filteredExchanges = useMemo(() => {
    const exchangeList = exchanges || [];
    console.log('Starting filter with', exchangeList.length, 'exchanges');
    console.log('Current statusFilter:', statusFilter);
    console.log('First 5 exchange statuses:', exchangeList.slice(0, 5).map(e => ({ id: e.id, status: e.status })));
    
    let filtered = [...exchangeList];

    // Enhanced search term filter - use debouncedSearchTerm for filtering
    if (debouncedSearchTerm.trim()) {
      const search = debouncedSearchTerm.toLowerCase();
      
      // Search by Exchange ID, name, number, or PP matter number
      filtered = filtered.filter(exchange => 
        exchange.id?.toLowerCase().includes(search) ||
        exchange.exchangeNumber?.toString().toLowerCase().includes(search) ||
        exchange.name?.toLowerCase().includes(search) ||
        exchange.pp_matter_number?.toString().toLowerCase().includes(search) ||
        exchange.client?.firstName?.toLowerCase().includes(search) ||
        exchange.client?.lastName?.toLowerCase().includes(search)
      );
      console.log('Applying enhanced search filter:', search);
      const initialLength = filtered.length;
      filtered = filtered.filter(exchange => {
        // Cast to access additional fields
        const ex = exchange as any;
        
        // Enhanced searchable fields including exchange number and contact names
        const searchableFields = [
          exchange.name,
          exchange.exchangeNumber?.toString(),
          `#${exchange.exchangeNumber}`, // Allow searching with # prefix
          exchange.id?.toString(),
          ex.exchangeId?.toString(),
          ex.exchange_number?.toString(), // Legacy field
          ex.pp_display_name,
          ex.pp_matter_number,
          ex.client_name,
          `${ex.client?.firstName || ''} ${ex.client?.lastName || ''}`.trim(),
          `${ex.client?.first_name || ''} ${ex.client?.last_name || ''}`.trim(),
          ex.client?.email,
          ex.client?.phone,
          ex.client?.company,
          ex.coordinator?.name,
          `${ex.coordinator?.first_name || ''} ${ex.coordinator?.last_name || ''}`.trim(),
          ex.coordinator?.email,
          ex.escrowOfficer?.name,
          ex.attorney?.name,
          ex.realtor?.name,
          ex.rel_property_address,
          ex.rep_1_property_address,
          ex.relinquished_property_address,
          ex.replacement_property_address,
          ex.pp_responsible_attorney,
          ex.buyer_1_name,
          ex.buyer_2_name,
          ex.rep_1_seller_name,
          ex.seller_name,
          ex.buyer_name
        ].filter(field => field && field.toString().trim());
        
        // Check if search matches any field
        const matches = searchableFields.some(field => 
          field.toString().toLowerCase().includes(search)
        );
        
        // Special handling for exchange number search
        if (!matches) {
          // Try partial exchange number match (allows typing partial numbers)
          if (/^\d+$/.test(search)) {
            const exchangeNum = exchange.exchangeNumber?.toString() || 
                              ex.exchange_number?.toString() || '';
            return exchangeNum.includes(search);
          }
          
          // Try searching with page number format
          if (search.startsWith('page ')) {
            const pageNum = search.replace('page ', '');
            return exchange.exchangeNumber?.toString().includes(pageNum);
          }
        }
        
        return matches;
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

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        switch (sortField) {
          case 'name':
            aValue = a.name || a.exchangeNumber || '';
            bValue = b.name || b.exchangeNumber || '';
            break;
          case 'exchangeNumber':
            aValue = parseInt(a.exchangeNumber || '0');
            bValue = parseInt(b.exchangeNumber || '0');
            break;
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          case 'client':
            aValue = `${(a as any).client?.firstName || ''} ${(a as any).client?.lastName || ''}`;
            bValue = `${(b as any).client?.firstName || ''} ${(b as any).client?.lastName || ''}`;
            break;
          case 'value':
            aValue = a.exchangeValue || 0;
            bValue = b.exchangeValue || 0;
            break;
          case 'created':
            aValue = new Date(a.createdAt || 0).getTime();
            bValue = new Date(b.createdAt || 0).getTime();
            break;
          case 'progress':
            aValue = a.progress || 0;
            bValue = b.progress || 0;
            break;
          case 'deadline45':
            aValue = a.identificationDeadline ? new Date(a.identificationDeadline).getTime() : 0;
            bValue = b.identificationDeadline ? new Date(b.identificationDeadline).getTime() : 0;
            break;
          case 'deadline180':
            aValue = a.completionDeadline ? new Date(a.completionDeadline).getTime() : 0;
            bValue = b.completionDeadline ? new Date(b.completionDeadline).getTime() : 0;
            break;
          default:
            aValue = (a as any)[sortField] || '';
            bValue = (b as any)[sortField] || '';
        }
        
        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }

    console.log(`Final filtered result: ${exchanges.length} → ${filtered.length}`);
    return filtered;
  }, [exchanges, debouncedSearchTerm, statusFilter, typeFilter, stageFilter, valueMinFilter, valueMaxFilter, 
      progressMinFilter, progressMaxFilter, proceedsMinFilter, proceedsMaxFilter, clientFilter, 
      attorneyFilter, realtorFilter, propertyAddressFilter, tagsFilter, deadline45Filter, 
      deadline180Filter, dateFilter, sortField, sortDirection, coordinatorFilter, escrowOfficerFilter, 
      priorityFilter, daysActiveFilter, lastActivityFilter, equityMinFilter, equityMaxFilter, 
      bootReceivedFilter, bootPaidFilter]);

  // Memoize active filters check
  const hasActiveFilters = useMemo(() => {
    return debouncedSearchTerm || statusFilter || typeFilter || valueMinFilter || valueMaxFilter || 
           dateFilter || propertyAddressFilter || progressMinFilter || progressMaxFilter ||
           proceedsMinFilter || proceedsMaxFilter || clientFilter || attorneyFilter || 
           realtorFilter || tagsFilter || deadline45Filter || deadline180Filter || stageFilter;
  }, [debouncedSearchTerm, statusFilter, typeFilter, valueMinFilter, valueMaxFilter, dateFilter, 
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
                {statsLoading ? '...' : `$${(overallStats.totalFundsOnDeposit / 1000000).toFixed(1)}M`}
              </div>
              <div className="text-xs text-gray-600">Total Funds on Deposit</div>
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
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      placeholder={searchMode === 'manual' ? "Type and press Enter or click Search..." : "Search as you type..."}
                      className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                        isSearching ? 'border-yellow-300 bg-yellow-50/30' : 
                        hasActiveFilters ? 'border-blue-300 bg-blue-50/30' : 'border-gray-300'
                      }`}
                    />
                    {/* Clear button */}
                    {searchTerm && (
                      <button
                        onClick={handleClearSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title="Clear search"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    {/* Loading indicator */}
                    {isSearching && (
                      <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Search button for manual mode */}
                  {searchMode === 'manual' && (
                    <button
                      onClick={handleManualSearch}
                      disabled={!searchTerm.trim()}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        searchTerm.trim() 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Search
                    </button>
                  )}
                  
                  {/* Search mode toggle */}
                  <button
                    onClick={() => {
                      const newMode = searchMode === 'instant' ? 'manual' : 'instant';
                      setSearchMode(newMode);
                      if (newMode === 'manual') {
                        // Clear debounced search when switching to manual
                        setDebouncedSearchTerm('');
                      } else {
                        // Apply current search when switching to instant
                        setDebouncedSearchTerm(searchTerm);
                      }
                    }}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-1"
                    title={`Switch to ${searchMode === 'instant' ? 'manual' : 'instant'} search`}
                  >
                    {searchMode === 'instant' ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="hidden sm:inline">Instant</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="hidden sm:inline">Manual</span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* Search info */}
                {(searchTerm || debouncedSearchTerm) && (
                  <div className="mt-1 text-xs text-gray-500">
                    {searchMode === 'instant' ? (
                      isSearching ? 'Searching...' : 
                      debouncedSearchTerm ? `Showing results for "${debouncedSearchTerm}"` : 'Type to search'
                    ) : (
                      debouncedSearchTerm ? `Showing results for "${debouncedSearchTerm}"` : 
                      searchTerm ? 'Press Enter or click Search to apply' : ''
                    )}
                  </div>
                )}
              </div>
            )}

            <ModernDropdown
              options={statusOptions}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                console.log('Status filter changed to:', value);
              }}
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
              
              {debouncedSearchTerm && (
                <FilterChip label="Search" value={debouncedSearchTerm} onRemove={() => {
                  setSearchTerm('');
                  setDebouncedSearchTerm('');
                }} />
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
        // Enhanced Table view with customizable columns and sorting
        <div className="bg-white rounded-lg shadow border">
          <div className="overflow-x-auto" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {selectedFields.includes('name') && (
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10"
                    onClick={() => handleSort('name')}
                  >
                      <div className="flex items-center gap-1">
                        Exchange Name
                        {sortField === 'name' && (
                          <span className="text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                  </th>
                  )}
                  {selectedFields.includes('status') && (
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10"
                    onClick={() => handleSort('status')}
                  >
                      <div className="flex items-center gap-1">
                        Status/Stage
                        {sortField === 'status' && (
                          <span className="text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                  </th>
                  )}
                  {selectedFields.includes('client') && (
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10"
                    onClick={() => handleSort('client')}
                  >
                    <div className="flex items-center gap-1">
                      Client
                      {sortField === 'client' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  )}
                  {selectedFields.includes('value') && (
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10"
                    onClick={() => handleSort('value')}
                  >
                      <div className="flex items-center gap-1">
                        Amount
                        {sortField === 'value' && (
                          <span className="text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                  </th>
                  )}
                  {selectedFields.includes('deadline45') && (
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10"
                    onClick={() => handleSort('deadline45')}
                  >
                      <div className="flex items-center gap-1">
                        45-Day Countdown
                        {sortField === 'deadline45' && (
                          <span className="text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                  </th>
                  )}
                  {selectedFields.includes('deadline180') && (
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10"
                    onClick={() => handleSort('deadline180')}
                  >
                      <div className="flex items-center gap-1">
                        180-Day Countdown
                        {sortField === 'deadline180' && (
                          <span className="text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                  </th>
                  )}
                  {selectedFields.includes('tags') && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                      Tags
                  </th>
                  )}
                  {selectedFields.includes('tasks') && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                      Tasks
                  </th>
                  )}
                  {selectedFields.includes('proceeds') && (
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10"
                    onClick={() => handleSort('proceeds')}
                  >
                      <div className="flex items-center gap-1">
                        Proceeds
                        {sortField === 'proceeds' && (
                          <span className="text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                  </th>
                  )}
                  {selectedFields.includes('created') && (
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10"
                      onClick={() => handleSort('created')}
                    >
                      <div className="flex items-center gap-1">
                        Created
                        {sortField === 'created' && (
                          <span className="text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  )}
                  {selectedFields.includes('notes') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                      Comments
                    </th>
                  )}
                  {selectedFields.includes('exchangeStage') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                      Stage
                    </th>
                  )}
                  {selectedFields.includes('ppData') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                      PP Details
                    </th>
                  )}
                  {selectedFields.includes('replacementProps') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                      Rep Properties
                    </th>
                  )}
                  {selectedFields.includes('exchangeType') && (
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10"
                      onClick={() => handleSort('exchangeType')}
                    >
                      <div className="flex items-center gap-1">
                        Type
                        {sortField === 'exchangeType' && (
                          <span className="text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  )}
                  {selectedFields.includes('progress') && (
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10"
                    onClick={() => handleSort('progress')}
                  >
                    <div className="flex items-center gap-1">
                      Progress
                      {sortField === 'progress' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  )}
                  {selectedFields.includes('daysActive') && (
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10"
                    onClick={() => handleSort('daysActive')}
                  >
                      <div className="flex items-center gap-1">
                        Days Active
                        {sortField === 'daysActive' && (
                          <span className="text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                  </th>
                  )}
                  {selectedFields.includes('lastActivity') && (
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10"
                    onClick={() => handleSort('lastActivity')}
                  >
                      <div className="flex items-center gap-1">
                        Last Activity
                        {sortField === 'lastActivity' && (
                          <span className="text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                  </th>
                  )}
                  {selectedFields.includes('documents') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                      Documents
                    </th>
                  )}
                  {selectedFields.includes('messages') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                      Messages
                    </th>
                  )}
                  {selectedFields.includes('equity') && (
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 sticky top-0 bg-gray-50 z-10"
                      onClick={() => handleSort('equity')}
                    >
                      <div className="flex items-center gap-1">
                        Equity
                        {sortField === 'equity' && (
                          <span className="text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  )}
                  {selectedFields.includes('bootReceived') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                      Boot Received
                    </th>
                  )}
                  {selectedFields.includes('bootPaid') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                      Boot Paid
                    </th>
                  )}
                  {selectedFields.includes('attorney') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                      Attorney
                    </th>
                  )}
                  {selectedFields.includes('realtor') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                      Realtor
                    </th>
                  )}
                  <th scope="col" className="relative px-6 py-3 sticky top-0 bg-gray-50 z-10">
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
                          <ClickableUserName 
                            userName={`${exchange.client?.firstName || ''} ${exchange.client?.lastName || ''}`.trim() || 'Not assigned'}
                            email={exchange.client?.email}
                          />
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
                            <ClickableUserName 
                              userName={(exchange as any).professionals?.attorney?.name || (exchange as any).attorneyName || 'Not assigned'}
                              email={(exchange as any).professionals?.attorney?.email || (exchange as any).attorneyEmail}
                            />
                          </div>
                        </td>
                      )}
                      {selectedFields.includes('realtor') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="max-w-32 truncate">
                            <ClickableUserName 
                              userName={(exchange as any).professionals?.realtor?.name || (exchange as any).realtorName || 'Not assigned'}
                              email={(exchange as any).professionals?.realtor?.email || (exchange as any).realtorEmail}
                            />
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