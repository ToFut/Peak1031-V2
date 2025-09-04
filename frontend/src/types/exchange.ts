// Exchange TypeScript Interface matching the backend model
export interface Exchange {
  id: string; // UUID
  ppMatterId?: string; // PracticePanther Matter ID
  exchangeNumber: string; // Unique exchange number
  name: string; // Exchange name/title
  exchangeName: string; // Display name for the exchange
  status: 'PENDING' | '45D' | '180D' | 'COMPLETED' | 'TERMINATED' | 'ON_HOLD' | 'In Progress' | 'Completed' | 'Cancelled' | 'Draft';
  
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
  // relinquishedProperty is defined below with proper typing
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
  
  // PP Data fields from API response
  pp_custom_field_values?: any[];
  practicePartnerData?: {
    customFields?: any[];
    matterId?: string;
    matterNumber?: string;
    rawData?: any;
  };
  
  // PracticePanther custom fields - both snake_case and camelCase versions
  pp_display_name?: string;
  ppDisplayName?: string;
  pp_matter_number?: string; // PP Matter Number: 7981
  ppMatterNumber?: string;
  bank?: string;
  rel_property_city?: string;
  rel_property_state?: string;
  rel_property_zip?: string;
  rel_property_address?: string;
  rel_apn?: string; // APN: 4363-007-106
  rel_escrow_number?: string; // Escrow Number: CA-25-26225
  relEscrowNumber?: string;
  rel_value?: number; // Value: $588,000
  relValue?: number;
  rel_contract_date?: string;
  rel_property_type?: string; // Property Type: Residential
  relPropertyType?: string;
  close_of_escrow_date?: string;
  closeOfEscrowDate?: string;
  date_proceeds_received?: string;
  dateProceedsReceived?: string;
  day_45?: string;
  day45?: string;
  day_180?: string;
  day180?: string;
  proceeds?: number;
  client_vesting?: string; // Client Vesting: Ofer Butt
  clientVesting?: string;
  type_of_exchange?: string; // Type of Exchange: Delayed
  typeOfExchange?: string;
  contract_type?: string; // Contract Type: Residential Purchase Agreement
  expected_closing?: string; // Expected Closing: September 17, 2025
  exchange_agreement_drafted?: string; // August 29, 2025
  exchangeAgreementDrafted?: string;
  settlement_agent?: string; // Settlement Agent: Bryan Spoltore
  settlementAgent?: string;
  buyer_vesting?: string; // Buyer Vesting: Sanjeev Subherwal and Aarush Subherwal
  buyer_1_name?: string; // Buyer 1: Sanjeev Subherwal
  buyer1Name?: string;
  buyer_2_name?: string; // Buyer 2: Aarush Subherwal
  buyer2Name?: string;
  rep_1_address?: string;
  rep_1_city?: string;
  rep_1_state?: string;
  rep_1_zip?: string;
  property_type?: string; // Main property type field
  propertyType?: string;
  client_signatory_title?: string; // Client Signatory Title
  clientSignatoryTitle?: string;
  referral_source?: string;
  referralSource?: string;
  referral_source_email?: string;
  referralSourceEmail?: string;
  internal_credit_to?: string;
  internalCreditTo?: string;
  assigned_to?: string;
  assignedTo?: string;
  rel_settlement_agent?: string;
  relSettlementAgent?: string;
  rep_1_settlement_agent?: string;
  rep1SettlementAgent?: string;
  rep_1_escrow_number?: string;
  rep1EscrowNumber?: string;
  rep_1_seller_1_name?: string;
  rep1Seller1Name?: string;
  rep_1_seller_2_name?: string;
  rep1Seller2Name?: string;
  interest_check_sent?: boolean | string;
  bank_referral?: boolean | string;
  bankReferral?: boolean | string;
  identified?: boolean | string;
  failed_exchange?: boolean | string;
  failedExchange?: boolean | string;
  rep_1_sale_price?: number;
  rep_1_apn?: string;
  rep_1_close_date?: string;
  
  // Timestamps
  createdAt: string; // ISO date-time string
  updatedAt: string; // ISO date-time string
  
  // Legacy snake_case properties for backward compatibility
  exchange_number?: string;
  exchange_value?: number;
  relinquished_property_value?: number;
  created_at?: string;
  updated_at?: string;
  
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
  progressPercentage?: number; // For UI progress bars
  deadlines?: any;
  urgencyLevel?: string;
  isOverdue?: boolean;
  participantCount?: number;
  
  // Backend structured data
  keyDates?: {
    day45?: string;
    day180?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  
  relinquishedProperty?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    propertyType?: string;
    apn?: string;
    escrowNumber?: string;
    value?: number;
    contractDate?: string;
    contractType?: string;
    closeDate?: string;
    expectedClosing?: string;
    clientVesting?: string;
    buyerVesting?: string;
    buyer1Name?: string;
    buyer2Name?: string;
    settlementAgent?: string;
    exchangeAgreementDrafted?: string;
  };
  
  // Timeline and status tracking
  timelineStatus?: string; // For timeline badges
  days_remaining?: number; // Days remaining for deadlines
  projectedCompletion?: string; // Projected completion date
  
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
  
  // Exchange contacts (all people involved in the exchange)
  exchangeContacts?: ExchangeContact[];
}

export interface ReplacementProperty {
  address: string;
  purchasePrice: number;
  closingDate: string; // ISO date string
}

// Contact interface for exchange participants
export interface ExchangeContact {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  role: 'client' | 'assigned_user' | 'internal_credit' | 'referral_source' | 'settlement_agent' | 'buyer';
  pp_id?: string; // PracticePanther ID if synced
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
  // relinquishedProperty inherited from base Exchange interface
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
  // New searchable fields
  pp_matter_number?: string;
  exchangeId?: string;
  address?: string;
  rel_property_type?: string;
  client_name?: string;
  apn?: string;
  escrow_number?: string;
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