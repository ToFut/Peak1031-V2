import { User } from '../types';

export const canManageExchange = (user: User | null, exchange?: any): boolean => {
  if (!user) return false;
  
  // Admin can manage all exchanges
  if (user.role === 'admin') return true;
  
  // Coordinator can manage all exchanges
  if (user.role === 'coordinator') return true;
  
  // Agency can manage exchanges they're involved with
  if (user.role === 'agency') {
    return exchange?.participants?.some((p: any) => p.user_id === user.id) || false;
  }
  
  // Client can only manage their own exchanges
  if (user.role === 'client') {
    return exchange?.client_id === user.id;
  }
  
  return false;
};

export const canAdvanceStage = (user: User | null, exchange?: any): boolean => {
  if (!user) return false;
  
  // Admin and coordinator can advance any exchange
  if (user.role === 'admin' || user.role === 'coordinator') return true;
  
  // Agency can advance exchanges they're involved with
  if (user.role === 'agency') {
    return exchange?.participants?.some((p: any) => p.user_id === user.id) || false;
  }
  
  return false;
};

export const canViewExchange = (user: User | null, exchange?: any): boolean => {
  if (!user) return false;
  
  // Admin and coordinator can view all exchanges
  if (user.role === 'admin' || user.role === 'coordinator') return true;
  
  // Agency can view exchanges they're involved with
  if (user.role === 'agency') {
    return exchange?.participants?.some((p: any) => p.user_id === user.id) || false;
  }
  
  // Client can view their own exchanges
  if (user.role === 'client') {
    return exchange?.client_id === user.id;
  }
  
  return false;
};

export const canEditDocuments = (user: User | null, exchange?: any): boolean => {
  if (!user) return false;
  
  // Admin and coordinator can edit all documents
  if (user.role === 'admin' || user.role === 'coordinator') return true;
  
  // Agency can edit documents in exchanges they're involved with
  if (user.role === 'agency') {
    return exchange?.participants?.some((p: any) => p.user_id === user.id) || false;
  }
  
  return false;
};

export const canAssignTasks = (user: User | null, exchange?: any): boolean => {
  if (!user) return false;
  
  // Admin and coordinator can assign tasks
  if (user.role === 'admin' || user.role === 'coordinator') return true;
  
  // Agency can assign tasks in exchanges they're involved with
  if (user.role === 'agency') {
    return exchange?.participants?.some((p: any) => p.user_id === user.id) || false;
  }
  
  return false;
};