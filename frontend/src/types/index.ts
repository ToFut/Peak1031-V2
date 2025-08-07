// Basic types for the application
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  firstName?: string; // Frontend compatibility
  lastName?: string; // Frontend compatibility
  role: 'admin' | 'client' | 'coordinator' | 'third_party' | 'agency';
  phone?: string;
  avatar?: string;
  company?: string; // Company name for agency users
  is_active: boolean;
  two_fa_enabled: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// Import types explicitly to avoid circular dependencies
import { Exchange } from './exchange';
import { Contact } from './contact';

// Re-export Contact types from the dedicated file
export * from './contact';

// Re-export Exchange types from the dedicated file
export * from './exchange';

export interface Task {
  id: string;
  ppTaskId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  exchangeId: string;
  assignedTo?: string;
  dueDate?: string;
  completedAt?: string;
  ppData: PracticePantherTaskData;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
  exchange?: Exchange;
  assignedUser?: User;
}

export interface Document {
  id: string;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  exchangeId: string;
  uploadedBy: string;
  category?: string;
  tags: string[];
  pinRequired: boolean;
  pinHash?: string;
  isTemplate: boolean;
  templateData: DocumentTemplateData;
  createdAt: string;
  updatedAt: string;
  exchange?: Exchange;
  uploadedByUser?: User;
  // Additional properties for document types and templates
  document_type?: string;
  name?: string;
  template_name?: string;
  file_url?: string;
}

export interface Message {
  id: string;
  content: string;
  exchangeId: string;
  senderId: string;
  attachmentId?: string;
  messageType: MessageType;
  readBy: string[];
  createdAt: string;
  sender?: User;
  attachment?: Document;
  exchange?: Exchange;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, unknown>;
  createdAt: string;
  user?: User;
  // Additional properties used in the frontend
  timestamp?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  userName?: string;
  ip?: string;
  exchangeId?: string;
  documentId?: string;
  // Properties expected by AuditLogSystem component
  user_id?: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
}

export interface SyncLog {
  id: string;
  syncType: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  recordsProcessed: number;
  recordsUpdated: number;
  recordsCreated: number;
  errorMessage?: string;
  details: SyncDetails;
  triggeredBy?: string;
  user?: User;
}

// Type definitions for previously 'any' types
export interface PracticePantherTaskData {
  id?: string;
  matter_id?: string;
  description?: string;
  due_date?: string;
  completed?: boolean;
  assigned_to?: string;
  priority?: string;
  [key: string]: unknown;
}

export interface DocumentTemplateData {
  fields?: Record<string, string | number | boolean>;
  variables?: Record<string, unknown>;
  template_id?: string;
  version?: string;
}

export interface SyncDetails {
  service?: string;
  records_synced?: number;
  errors?: Array<{
    message: string;
    code?: string;
    record_id?: string;
  }>;
  duration_ms?: number;
  [key: string]: unknown;
}

// Enums
export type UserRole = 'admin' | 'coordinator' | 'client' | 'third_party' | 'agency';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type MessageType = 'text' | 'file' | 'system';

// API types
export interface LoginCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken?: string;
  requiresTwoFactor?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  status?: string;
  priority?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export interface DashboardStats {
  exchanges: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  tasks: {
    total: number;
    pending: number;
    overdue: number;
    completed: number;
  };
  documents: {
    total: number;
    totalSize: number;
    withPin: number;
  };
  messages: {
    total: number;
    unread: number;
  };
} 