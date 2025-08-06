import { useMemo } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { ROLE_CONFIGS, UserRole, RoleConfig } from '@/shared/types/roles';

export interface UseRolePermissionsReturn {
  permissions: RoleConfig['permissions'];
  ui: RoleConfig['ui'];
  canView: (resource: string, scope?: string) => boolean;
  canEdit: (resource: string) => boolean;
  canCreate: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  hasAccess: (feature: string) => boolean;
  getPageTitle: (page: string) => string;
  getActionButtons: (page: string) => string[];
  getSidebarItems: () => string[];
  getDashboardWidgets: () => string[];
}

export const useRolePermissions = (): UseRolePermissionsReturn => {
  const { user } = useAuth();
  
  const roleConfig = useMemo(() => {
    if (!user?.role) {
      return ROLE_CONFIGS.client; // Default fallback
    }
    return ROLE_CONFIGS[user.role as UserRole] || ROLE_CONFIGS.client;
  }, [user?.role]);

  const canView = (resource: string, scope?: string): boolean => {
    const permission = roleConfig.permissions[resource as keyof typeof roleConfig.permissions];
    if (!permission || typeof permission !== 'object' || !('view' in permission)) {
      return false;
    }
    
    const viewPermission = permission.view;
    if (typeof viewPermission === 'boolean') {
      return viewPermission;
    }
    
    // If scope is provided, check against specific scope
    if (scope) {
      return viewPermission === scope || viewPermission === 'all';
    }
    
    // Default: can view if not 'none'
    return viewPermission !== 'none';
  };

  const canEdit = (resource: string): boolean => {
    const permission = roleConfig.permissions[resource as keyof typeof roleConfig.permissions];
    return permission && typeof permission === 'object' && 'edit' in permission 
      ? Boolean(permission.edit) 
      : false;
  };

  const canCreate = (resource: string): boolean => {
    const permission = roleConfig.permissions[resource as keyof typeof roleConfig.permissions];
    return permission && typeof permission === 'object' && 'create' in permission 
      ? Boolean(permission.create) 
      : false;
  };

  const canDelete = (resource: string): boolean => {
    const permission = roleConfig.permissions[resource as keyof typeof roleConfig.permissions];
    return permission && typeof permission === 'object' && 'delete' in permission 
      ? Boolean(permission.delete) 
      : false;
  };

  const hasAccess = (feature: string): boolean => {
    // Check if user has access to specific features
    switch (feature) {
      case 'user_management':
        return roleConfig.permissions.users.view;
      case 'system_settings':
        return roleConfig.permissions.system.manage_settings;
      case 'audit_logs':
        return roleConfig.permissions.system.view_audit;
      case 'analytics':
        return roleConfig.permissions.system.view_analytics;
      case 'pp_sync':
        return roleConfig.permissions.system.sync_pp;
      default:
        return false;
    }
  };

  const getPageTitle = (page: string): string => {
    return roleConfig.ui.page_titles[page] || page;
  };

  const getActionButtons = (page: string): string[] => {
    return roleConfig.ui.action_buttons[page] || [];
  };

  const getSidebarItems = (): string[] => {
    return roleConfig.ui.sidebar_items;
  };

  const getDashboardWidgets = (): string[] => {
    return roleConfig.ui.dashboard_widgets;
  };

  return {
    permissions: roleConfig.permissions,
    ui: roleConfig.ui,
    canView,
    canEdit,
    canCreate,
    canDelete,
    hasAccess,
    getPageTitle,
    getActionButtons,
    getSidebarItems,
    getDashboardWidgets
  };
};