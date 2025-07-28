import { useAuth } from './useAuth';

export const usePermissions = () => {
  const { user } = useAuth();

  const can = (resource: string, action: string): boolean => {
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
  };

  const hasRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isAdmin = (): boolean => hasRole(['admin']);
  const isCoordinator = (): boolean => hasRole(['coordinator', 'admin']);
  const isClient = (): boolean => hasRole(['client']);
  const isThirdParty = (): boolean => hasRole(['third_party']);
  const isAgency = (): boolean => hasRole(['agency']);

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