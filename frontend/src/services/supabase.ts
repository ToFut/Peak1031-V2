import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://fozdhmlcjnjkwilmiiem.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvemRobWxjam5qa3dpbG1paWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzOTY3MzUsImV4cCI6MjA2OTk3MjczNX0.weNOabt19invzL5-WOcnGInClruQOUPEo1T20W-PISA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'client' | 'coordinator' | 'third_party' | 'agency';
  first_name: string;
  last_name: string;
  phone?: string;
  is_active: boolean;
  two_fa_enabled: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// Contact exchange link interface
export interface ContactExchangeLink {
  id: string;
  contact_id: string;
  exchange_id: string;
  created_at: string;
}

// Updated Contact interface to match new schema
export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string; // Generated column
  email: string; // Now required and unique
  phone?: string;
  company?: string;
  position?: string;
  contact_type?: 'Client' | 'Broker' | 'Attorney' | 'CPA' | 'Agent' | 'Other';
  notes?: string;
  
  // Legacy PracticePartner sync fields (kept for backward compatibility)
  pp_contact_id?: string;
  address?: string;
  pp_data?: any;
  last_sync_at?: string;
  
  created_at: string;
  updated_at: string;
  
  // Relations
  related_exchanges?: string[]; // Array of exchange IDs
  exchange_links?: ContactExchangeLink[];
}

// API-compatible Contact interface (camelCase)
export interface ContactAPI {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  contactType?: 'Client' | 'Broker' | 'Attorney' | 'CPA' | 'Agent' | 'Other';
  relatedExchanges?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// New replacement property interface
export interface ReplacementProperty {
  id: string;
  exchange_id: string;
  address: string;
  purchase_price?: number;
  closing_date?: string;
  created_at: string;
  updated_at: string;
}

// New exchange document interface
export interface ExchangeDocument {
  id: string;
  exchange_id: string;
  document_url: string;
  document_name?: string;
  document_type?: string;
  created_at: string;
  updated_at: string;
}

// Updated Exchange interface to match new schema
export interface Exchange {
  id: string;
  pp_matter_id?: string;
  // New detailed fields
  exchange_name: string;
  exchange_type?: 'Delayed' | 'Reverse' | 'Improvement' | 'Other';
  relinquished_property_address?: string;
  relinquished_sale_price?: number;
  relinquished_closing_date?: string;
  identification_date?: string;
  exchange_deadline?: string;
  exchange_coordinator?: string;
  attorney_or_cpa?: string;
  bank_account_escrow?: string;
  notes?: string;
  // Updated status
  status: 'In Progress' | 'Completed' | 'Cancelled' | 'Draft';
  
  // Legacy fields (during transition)
  name?: string; // Will be deprecated
  client_id?: string;
  coordinator_id?: string;
  start_date?: string;
  completion_date?: string;
  exchange_value?: number;
  identification_deadline?: string;
  completion_deadline?: string;
  pp_data?: any;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  client?: Contact;
  coordinator?: User;
  participants?: ExchangeParticipant[];
  tasks?: Task[];
  documents?: Document[];
  messages?: Message[];
  replacement_properties?: ReplacementProperty[];
  exchange_documents?: ExchangeDocument[];
}

// API-compatible Exchange interface (camelCase)
export interface ExchangeAPI {
  id: string;
  exchangeName: string;
  clientId?: string;
  exchangeType?: 'Delayed' | 'Reverse' | 'Improvement' | 'Other';
  relinquishedPropertyAddress?: string;
  relinquishedSalePrice?: number;
  relinquishedClosingDate?: string;
  replacementProperties?: {
    address: string;
    purchasePrice?: number;
    closingDate?: string;
  }[];
  identificationDate?: string;
  exchangeDeadline?: string;
  exchangeCoordinator?: string;
  attorneyOrCPA?: string;
  bankAccountEscrow?: string;
  notes?: string;
  status: 'In Progress' | 'Completed' | 'Cancelled' | 'Draft';
  documents?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeParticipant {
  id: string;
  exchange_id: string;
  contact_id?: string;
  user_id?: string;
  role: string;
  permissions: any;
  created_at: string;
  contact?: Contact;
  user?: User;
}

export interface Task {
  id: string;
  pp_task_id?: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  exchange_id?: string;
  assigned_to?: string;
  due_date?: string;
  completed_at?: string;
  pp_data?: any;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
  exchange?: Exchange;
  assignee?: User;
}

export interface Document {
  id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  exchange_id?: string;
  uploaded_by: string;
  category?: string;
  tags?: string[];
  pin_required: boolean;
  pin_hash?: string;
  is_template: boolean;
  template_data?: any;
  created_at: string;
  updated_at: string;
  exchange?: Exchange;
  uploader?: User;
}

export interface Message {
  id: string;
  content: string;
  exchange_id: string;
  sender_id: string;
  attachment_id?: string;
  message_type: 'text' | 'file' | 'system';
  read_by: string[];
  created_at: string;
  exchange?: Exchange;
  sender?: User;
  attachment?: Document;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  user_id: string;
  ip_address?: string;
  user_agent?: string;
  details?: any;
  created_at: string;
  user?: User;
}

export interface SyncLog {
  id: string;
  sync_type: string;
  status: 'running' | 'success' | 'error' | 'partial';
  started_at: string;
  completed_at?: string;
  records_processed: number;
  records_updated: number;
  records_created: number;
  error_message?: string;
  details?: any;
  triggered_by?: string;
  triggeredByUser?: User;
}

// Utility functions for data transformation
export const transformExchangeToAPI = (exchange: Exchange): ExchangeAPI => {
  return {
    id: exchange.id,
    exchangeName: exchange.exchange_name || exchange.name || '',
    clientId: exchange.client_id,
    exchangeType: exchange.exchange_type,
    relinquishedPropertyAddress: exchange.relinquished_property_address,
    relinquishedSalePrice: exchange.relinquished_sale_price,
    relinquishedClosingDate: exchange.relinquished_closing_date,
    replacementProperties: exchange.replacement_properties?.map(rp => ({
      address: rp.address,
      purchasePrice: rp.purchase_price,
      closingDate: rp.closing_date
    })),
    identificationDate: exchange.identification_date,
    exchangeDeadline: exchange.exchange_deadline,
    exchangeCoordinator: exchange.exchange_coordinator,
    attorneyOrCPA: exchange.attorney_or_cpa,
    bankAccountEscrow: exchange.bank_account_escrow,
    notes: exchange.notes,
    status: exchange.status,
    documents: exchange.exchange_documents?.map(ed => ed.document_url) || [],
    createdAt: exchange.created_at,
    updatedAt: exchange.updated_at
  };
};

export const transformAPIToExchange = (apiExchange: ExchangeAPI): Partial<Exchange> => {
  return {
    exchange_name: apiExchange.exchangeName,
    client_id: apiExchange.clientId,
    exchange_type: apiExchange.exchangeType,
    relinquished_property_address: apiExchange.relinquishedPropertyAddress,
    relinquished_sale_price: apiExchange.relinquishedSalePrice,
    relinquished_closing_date: apiExchange.relinquishedClosingDate,
    identification_date: apiExchange.identificationDate,
    exchange_deadline: apiExchange.exchangeDeadline,
    exchange_coordinator: apiExchange.exchangeCoordinator,
    attorney_or_cpa: apiExchange.attorneyOrCPA,
    bank_account_escrow: apiExchange.bankAccountEscrow,
    notes: apiExchange.notes,
    status: apiExchange.status
  };
};

// Contact transformation utilities
export const transformContactToAPI = (contact: Contact): ContactAPI => {
  return {
    id: contact.id,
    firstName: contact.first_name,
    lastName: contact.last_name,
    fullName: contact.full_name,
    email: contact.email,
    phone: contact.phone,
    company: contact.company,
    position: contact.position,
    contactType: contact.contact_type,
    relatedExchanges: contact.related_exchanges || [],
    notes: contact.notes,
    createdAt: contact.created_at,
    updatedAt: contact.updated_at
  };
};

export const transformAPIToContact = (apiContact: ContactAPI): Partial<Contact> => {
  return {
    first_name: apiContact.firstName,
    last_name: apiContact.lastName,
    email: apiContact.email,
    phone: apiContact.phone,
    company: apiContact.company,
    position: apiContact.position,
    contact_type: apiContact.contactType,
    notes: apiContact.notes
    // full_name is generated automatically by the database
    // related_exchanges will be handled via contact_exchange_links table
  };
};