// Contact TypeScript Interface matching the JSON schema
export interface Contact {
  id: string; // UUID
  userId: string; // UUID
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  contactType?: ContactType;
  address?: ContactAddress;
  source?: ContactSource;
  tags?: string[];
  preferredContactMethod?: PreferredContactMethod;
  isPrimary: boolean;
  notes?: string;
  relatedExchanges?: string[]; // Array of UUIDs
  createdAt: string; // ISO date-time string
  updatedAt: string; // ISO date-time string
  
  // Legacy fields for backward compatibility
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressZipCode?: string;
}

export interface ContactAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export type ContactType = 
  | 'Client' 
  | 'Broker' 
  | 'Attorney' 
  | 'CPA' 
  | 'Agent'
  | 'Escrow Officer' 
  | 'Title Company' 
  | 'Notary' 
  | 'Lender' 
  | 'Other';

export type ContactSource = 
  | 'Referral' 
  | 'Website' 
  | 'Social Media' 
  | 'Event' 
  | 'Cold Call' 
  | 'Other';

export type PreferredContactMethod = 'Email' | 'Phone' | 'Text';

// Extended Contact interface for internal use (includes additional fields)
export interface ContactExtended extends Contact {
  // Additional fields from your current schema
  ppContactId?: string;
  ppData?: any; // JSONB
  lastSyncAt?: string; // ISO date string
  // Legacy fields for backward compatibility
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
}

// Contact creation/update DTOs
export interface CreateContactRequest {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  contactType?: ContactType;
  address?: ContactAddress;
  source?: ContactSource;
  tags?: string[];
  preferredContactMethod?: PreferredContactMethod;
  isPrimary?: boolean;
  notes?: string;
  relatedExchanges?: string[];
}

export interface UpdateContactRequest extends Partial<CreateContactRequest> {
  id: string;
}

// Contact search/filter interfaces
export interface ContactFilters {
  contactType?: ContactType[];
  source?: ContactSource[];
  userId?: string;
  isPrimary?: boolean;
  tags?: string[];
  search?: string;
  company?: string;
}

export interface ContactSearchParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: ContactFilters;
}

// Contact statistics
export interface ContactStats {
  total: number;
  byType: Record<ContactType, number>;
  bySource: Record<ContactSource, number>;
  primaryContacts: number;
  recentContacts: number; // Last 30 days
  withExchanges: number;
}

// Contact import/export interfaces
export interface ContactImportData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  contactType?: ContactType;
  address?: ContactAddress;
  source?: ContactSource;
  tags?: string[];
  preferredContactMethod?: PreferredContactMethod;
  isPrimary?: boolean;
  notes?: string;
}

export interface ContactExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  includeFields: (keyof Contact)[];
  filters?: ContactFilters;
}

// Contact validation
export interface ContactValidationError {
  field: keyof Contact;
  message: string;
  value?: any;
}

export interface ContactValidationResult {
  isValid: boolean;
  errors: ContactValidationError[];
}

// Contact bulk operations
export interface ContactBulkOperation {
  operation: 'update' | 'delete' | 'tag' | 'export';
  contactIds: string[];
  data?: Partial<Contact>;
  tags?: string[];
  exportOptions?: ContactExportOptions;
}

// Contact relationships
export interface ContactWithRelations extends Contact {
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  exchanges?: {
    id: string;
    name: string;
    status: string;
    exchangeType: string;
  }[];
}

// Contact templates
export interface ContactTemplate {
  id: string;
  name: string;
  description?: string;
  fields: Partial<Contact>;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Contact activity tracking
export interface ContactActivity {
  id: string;
  contactId: string;
  type: 'created' | 'updated' | 'contacted' | 'tagged' | 'exchanged';
  description: string;
  metadata?: any;
  createdAt: string;
  createdBy: string;
}

// Contact notes
export interface ContactNote {
  id: string;
  contactId: string;
  content: string;
  type: 'general' | 'call' | 'email' | 'meeting' | 'follow_up';
  isPrivate: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
} 