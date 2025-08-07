// Exchange TypeScript Interface matching the backend model
export interface Exchange {
  id: string; // UUID
  ppMatterId?: string; // PracticePanther Matter ID
  exchangeNumber: string; // Unique exchange number
  name: string; // Exchange name/title
  exchangeName: string; // Display name for the exchange
  status: 'PENDING' | '45D' | '180D' | 'COMPLETED' | 'TERMINATED' | 'ON_HOLD' | 'In Progress' | 'Completed' | 'Cancelled' | 'Draft' | 'ACTIVE';
  
  // Relationships
  clientId: string; // UUID
  coordinatorId?: string; // UUID
  
  // Timeline Management
  startDate?: string; // ISO date string
  identificationDeadline?: string; // ISO date string
  completionDeadline?: string; // ISO date string
  completionDate?: string; // ISO date string
  expectedClosingDate?: string; // ISO date string for expected closing
  
  // Financial Information
  exchangeValue?: number;
  relinquishedValue?: number;
  replacementValue?: number;
  
  // Properties
  relinquishedProperty?: any; // JSONB
  relinquishedPropertyAddress?: string;
  relinquishedSalePrice?: number;
  relinquishedClosingDate?: string; // ISO date string
  replacementProperties?: ReplacementProperty[];
  
  // Exchange Type and Rules
  exchangeType: 'SIMULTANEOUS' | 'DELAYED' | 'REVERSE' | 'IMPROVEMENT' | 'Delayed' | 'Reverse' | 'Improvement' | 'Other';
  
  // Compliance Tracking
  complianceStatus?: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT' | 'PENDING_REVIEW';
  
  // Additional fields
  qiCompany?: string;
  qiContact?: any; // JSONB
  clientNotes?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  riskFactors?: any[]; // JSONB
  ppData?: any; // JSONB
  lastSyncAt?: string; // ISO date string
  metadata?: any; // JSONB
  tags?: string[];
  lastActivityAt?: string; // ISO date string
  isActive?: boolean;
  
  // Additional properties used in frontend components
  clientName?: string;
  propertyAddress?: string;
  sellerName?: string;
  buyerName?: string;
  deadline45?: string;
  deadline180?: string;
  
  // Count properties for UI display
  taskCount?: number;
  documentCount?: number;
  
  // Timestamps
  createdAt: string; // ISO date-time string
  updatedAt: string; // ISO date-time string
  
  // Legacy fields for backward compatibility
  exchangeCoordinator?: string;
  attorneyOrCPA?: string;
  bankAccountEscrow?: string;
  notes?: string;
  documents?: string[]; // Array of URIs
  identificationDate?: string; // ISO date string
  exchangeDeadline?: string; // ISO date string
  
  // Relationship fields (populated by API)
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
    phone?: string;
  };
  coordinator?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  
  // Computed fields from backend
  progress?: number;
  deadlines?: any;
  urgencyLevel?: string;
  isOverdue?: boolean;
  participantCount?: number;
  
  // Exchange participants
  exchangeParticipants?: Array<{
    id: string;
    role: string;
    user?: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    } | null;
    contact?: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    } | null;
    permissions?: {
      sendMessages?: boolean;
      viewMessages?: boolean;
      viewDocuments?: boolean;
      uploadDocuments?: boolean;
      viewExchange?: boolean;
    };
  }>;
}

export interface ReplacementProperty {
  address: string;
  purchasePrice: number;
  closingDate: string; // ISO date string
}

// Extended Exchange interface for internal use (includes additional fields)
export interface ExchangeExtended extends Omit<Exchange, 'exchangeNumber'> {
  // Make exchangeNumber optional in extended interface
  exchangeNumber?: string;
  
  // Additional fields from your current schema
  coordinatorId?: string; // UUID
  identificationDeadline?: string; // ISO date string
  completionDeadline?: string; // ISO date string
  completionDate?: string; // ISO date string
  exchangeValue?: number;
  relinquishedValue?: number;
  replacementValue?: number;
  relinquishedProperty?: any; // JSONB
  replacementProperties?: any; // JSONB (extended)
  complianceStatus?: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT' | 'PENDING_REVIEW';
  qiCompany?: string;
  qiContact?: any; // JSONB
  clientNotes?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  riskFactors?: any[]; // JSONB
  ppData?: any; // JSONB
  lastSyncAt?: string; // ISO date string
  metadata?: any; // JSONB
  tags?: string[];
  lastActivityAt?: string; // ISO date string
  isActive?: boolean;
}

// Exchange creation/update DTOs
export interface CreateExchangeRequest {
  exchangeName: string;
  clientId: string;
  exchangeType: 'Delayed' | 'Reverse' | 'Improvement' | 'Other';
  relinquishedPropertyAddress?: string;
  relinquishedSalePrice?: number;
  relinquishedClosingDate?: string;
  replacementProperties?: ReplacementProperty[];
  identificationDate?: string;
  exchangeDeadline?: string;
  exchangeCoordinator?: string;
  attorneyOrCPA?: string;
  bankAccountEscrow?: string;
  notes?: string;
  status?: 'In Progress' | 'Completed' | 'Cancelled' | 'Draft';
  documents?: string[];
}

export interface UpdateExchangeRequest extends Partial<CreateExchangeRequest> {
  id: string;
}

// Exchange search/filter interfaces
export interface ExchangeFilters {
  status?: string[];
  exchangeType?: string[];
  clientId?: string;
  coordinatorId?: string;
  priority?: string[];
  riskLevel?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface ExchangeSearchParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: ExchangeFilters;
}

// Exchange statistics
export interface ExchangeStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  byRiskLevel: Record<string, number>;
  upcomingDeadlines: number;
  overdue: number;
  completedThisMonth: number;
  totalValue: number;
}

// Exchange timeline/deadline tracking
export interface ExchangeDeadline {
  type: 'identification' | 'completion';
  date: string;
  daysRemaining: number;
  passed: boolean;
  critical: boolean;
}

export interface ExchangeProgress {
  percentage: number;
  stage: string;
  stageNumber: number;
  totalStages: number;
  isCompleted: boolean;
} 