// Basic types for the application
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  ppContactId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  ppData: any;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Exchange {
  id: string;
  ppMatterId?: string;
  name: string;
  status: string;
  clientId?: string;
  coordinatorId?: string;
  startDate?: string;
  completionDate?: string;
  ppData: any;
  metadata: any;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
  client?: Contact;
  coordinator?: User;
}

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
  ppData: any;
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
  templateData: any;
  createdAt: string;
  updatedAt: string;
  exchange?: Exchange;
  uploadedByUser?: User;
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
  details: any;
  createdAt: string;
  user?: User;
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
  details: any;
  triggeredBy?: string;
  user?: User;
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