// Supabase client and types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
}

export interface Exchange {
  id: string;
  name: string;
  status: string;
  exchangeValue?: number;
  replacementValue?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  timestamp: string;
}

export interface SyncLog {
  id: string;
  type: string;
  status: string;
  timestamp: string;
}

// Mock Supabase client
export const supabase = {
  from: (table: string) => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null })
  }),
  auth: {
    signIn: () => Promise.resolve({ data: null, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    getSession: () => Promise.resolve({ data: null, error: null })
  }
}; 