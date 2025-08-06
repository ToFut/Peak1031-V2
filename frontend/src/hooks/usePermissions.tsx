import { useAuth } from './useAuth';

export const usePermissions = () => {
  const { user } = useAuth();

  return {
    isAdmin: () => user?.role === 'admin',
    isCoordinator: () => user?.role === 'coordinator',
    isClient: () => user?.role === 'client',
    isThirdParty: () => user?.role === 'third_party',
    isAgency: () => user?.role === 'agency',
    hasRole: (role: string) => user?.role === role,
    canManageUsers: () => user?.role === 'admin' || user?.role === 'coordinator',
    canManageExchanges: () => user?.role === 'admin' || user?.role === 'coordinator',
    canViewAuditLogs: () => user?.role === 'admin' || user?.role === 'coordinator'
  };
}; 