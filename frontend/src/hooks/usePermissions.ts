import { useAuth } from './useAuth';
import { useCallback } from 'react';

export const usePermissions = () => {
  const { user } = useAuth();

  const can = useCallback((resource: string, action: string): boolean => {
    if (!user) return false;

    const permissions: Record<string, string[]> = {
      admin: ['*'],
      coordinator: [
        'exchanges:read', 'exchanges:write', 
        'documents:read', 'documents:write',
        'tasks:read', 'tasks:write',
        'messages:read', 'messages:write',
        'contacts:read'
      ],
      client: [
        'exchanges:read',
        'documents:read',
        'messages:read', 'messages:write',
        'tasks:read'
      ],
      third_party: [
        'exchanges:read',
        'documents:read',
        'messages:read'
      ],
      agency: [
        'exchanges:read',
        'documents:read',
        'messages:read', 'messages:write'
      ]
    };

    const userPerms = permissions[user.role] || [];
    const requiredPermission = `${resource}:${action}`;

    return userPerms.includes('*') || userPerms.includes(requiredPermission);
  }, [user]);

  const hasRole = useCallback((roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const isAdmin = useCallback((): boolean => hasRole(['admin']), [hasRole]);
  const isCoordinator = useCallback((): boolean => hasRole(['coordinator', 'admin']), [hasRole]);
  const isClient = useCallback((): boolean => hasRole(['client']), [hasRole]);
  const isThirdParty = useCallback((): boolean => hasRole(['third_party']), [hasRole]);
  const isAgency = useCallback((): boolean => hasRole(['agency']), [hasRole]);

  return {
    can,
    hasRole,
    isAdmin,
    isCoordinator,
    isClient,
    isThirdParty,
    isAgency,
    userRole: user?.role
  };
}; 