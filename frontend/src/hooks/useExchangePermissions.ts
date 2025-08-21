import { useAuth } from './useAuth';
import { useCallback, useState, useEffect } from 'react';
import { apiService } from '../services/api';

// Permission types for exchange actions
export interface ExchangePermissions {
  // Core permissions
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  
  // Feature permissions
  can_upload_documents: boolean;
  can_download_documents: boolean;
  can_send_messages: boolean;
  can_add_tasks: boolean;
  can_edit_tasks: boolean;
  can_add_participants: boolean;
  can_view_audit: boolean;
  can_view_financial: boolean;
  can_view_compliance: boolean;
  
  // Document specific
  can_use_pin: boolean;
  can_delete_documents: boolean;
  
  // Tab visibility
  tabs_visible: {
    overview: boolean;
    members: boolean;
    tasks: boolean;
    documents: boolean;
    financial: boolean;
    compliance: boolean;
    chat: boolean;
    timeline: boolean;
    audit: boolean;
  };
}

// Default permissions by role
const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, ExchangePermissions> = {
  admin: {
    can_view: true,
    can_edit: true,
    can_delete: true,
    can_upload_documents: true,
    can_download_documents: true,
    can_send_messages: true,
    can_add_tasks: true,
    can_edit_tasks: true,
    can_add_participants: true,
    can_view_audit: true,
    can_view_financial: true,
    can_view_compliance: true,
    can_use_pin: true,
    can_delete_documents: true,
    tabs_visible: {
      overview: true,
      members: true,
      tasks: true,
      documents: true,
      financial: true,
      compliance: true,
      chat: true,
      timeline: true,
      audit: true,
    }
  },
  coordinator: {
    can_view: true,
    can_edit: true,
    can_delete: false,
    can_upload_documents: true,
    can_download_documents: true,
    can_send_messages: true,
    can_add_tasks: true,
    can_edit_tasks: true,
    can_add_participants: true,
    can_view_audit: true,
    can_view_financial: true,
    can_view_compliance: true,
    can_use_pin: true,
    can_delete_documents: true,
    tabs_visible: {
      overview: true,
      members: true,
      tasks: true,
      documents: true,
      financial: true,
      compliance: true,
      chat: true,
      timeline: true,
      audit: true,
    }
  },
  client: {
    can_view: true,
    can_edit: false,
    can_delete: false,
    can_upload_documents: true,
    can_download_documents: true,
    can_send_messages: true,
    can_add_tasks: true,
    can_edit_tasks: false,
    can_add_participants: false,
    can_view_audit: false,
    can_view_financial: true,
    can_view_compliance: true,
    can_use_pin: true,
    can_delete_documents: false,
    tabs_visible: {
      overview: true,
      members: true,
      tasks: true,
      documents: true,
      financial: true,
      compliance: true,
      chat: true,
      timeline: true,
      audit: false,
    }
  },
  third_party: {
    can_view: true,
    can_edit: false,
    can_delete: false,
    can_upload_documents: false, // View only by default
    can_download_documents: true,
    can_send_messages: false, // View only by default
    can_add_tasks: false, // View only by default
    can_edit_tasks: false,
    can_add_participants: false,
    can_view_audit: false,
    can_view_financial: false,
    can_view_compliance: false,
    can_use_pin: false,
    can_delete_documents: false,
    tabs_visible: {
      overview: true,
      members: false,
      tasks: false, // Hidden unless granted permission
      documents: false, // Hidden unless granted permission
      financial: false,
      compliance: false,
      chat: false, // Hidden unless granted permission
      timeline: false,
      audit: false,
    }
  },
  agency: {
    can_view: true,
    can_edit: false,
    can_delete: false,
    can_upload_documents: false, // View only by default
    can_download_documents: true,
    can_send_messages: false, // View only by default
    can_add_tasks: false, // View only by default
    can_edit_tasks: false,
    can_add_participants: false,
    can_view_audit: false,
    can_view_financial: false,
    can_view_compliance: false,
    can_use_pin: false,
    can_delete_documents: false,
    tabs_visible: {
      overview: true,
      members: false,
      tasks: false, // Hidden unless granted permission
      documents: false, // Hidden unless granted permission
      financial: false,
      compliance: false,
      chat: false, // Hidden unless granted permission
      timeline: false,
      audit: false,
    }
  }
};

export const useExchangePermissions = (exchangeId?: string) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ExchangePermissions | null>(null);
  const [customPermissions, setCustomPermissions] = useState<Partial<ExchangePermissions> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load exchange-specific permissions
  useEffect(() => {
    if (exchangeId && user) {
      loadExchangePermissions();
    } else if (user) {
      // Set default permissions based on role
      setPermissions(DEFAULT_PERMISSIONS_BY_ROLE[user.role] || DEFAULT_PERMISSIONS_BY_ROLE.third_party);
    }
  }, [exchangeId, user?.id, user?.role]);

  const loadExchangePermissions = async () => {
    if (!exchangeId || !user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // First get default permissions for user role
      const defaultPerms = DEFAULT_PERMISSIONS_BY_ROLE[user.role] || DEFAULT_PERMISSIONS_BY_ROLE.third_party;
      
      // Try to get custom permissions for this user on this exchange
      const response = await apiService.get(`/exchanges/${exchangeId}/permissions/${user.id}`);
      
      if (response?.permissions) {
        // Merge custom permissions with defaults
        const mergedPermissions = {
          ...defaultPerms,
          ...response.permissions,
          tabs_visible: {
            ...defaultPerms.tabs_visible,
            ...(response.permissions.tabs_visible || {})
          }
        };
        
        setCustomPermissions(response.permissions);
        setPermissions(mergedPermissions);
      } else {
        // Use default permissions
        setPermissions(defaultPerms);
      }
      
      // Update tab visibility based on permissions
      updateTabVisibility(permissions);
      
    } catch (error) {
      console.error('Failed to load exchange permissions:', error);
      // Fallback to default role permissions
      const defaultPerms = DEFAULT_PERMISSIONS_BY_ROLE[user.role] || DEFAULT_PERMISSIONS_BY_ROLE.third_party;
      setPermissions(defaultPerms);
      setError('Using default role permissions');
    } finally {
      setLoading(false);
    }
  };

  // Update tab visibility based on permissions
  const updateTabVisibility = (perms: ExchangePermissions | null) => {
    if (!perms) return;
    
    // For third party and agency users, show tabs only if they have specific permissions
    if (user?.role === 'third_party' || user?.role === 'agency') {
      const updatedTabs = { ...perms.tabs_visible };
      
      // Show chat tab if user can send messages
      updatedTabs.chat = perms.can_send_messages || updatedTabs.chat;
      
      // Show documents tab if user can upload or has explicit permission
      updatedTabs.documents = perms.can_upload_documents || updatedTabs.documents;
      
      // Show tasks tab if user can add tasks
      updatedTabs.tasks = perms.can_add_tasks || updatedTabs.tasks;
      
      // Show members tab if user has any collaboration permission
      updatedTabs.members = (perms.can_send_messages || perms.can_add_tasks) || updatedTabs.members;
      
      setPermissions(prev => prev ? { ...prev, tabs_visible: updatedTabs } : null);
    }
  };

  // Permission check functions
  const can = useCallback((action: string): boolean => {
    if (!user || !permissions) return false;
    
    // Admin always has all permissions
    if (user.role === 'admin') return true;
    
    // Map action to permission property
    const actionMap: Record<string, keyof ExchangePermissions> = {
      'view': 'can_view',
      'edit': 'can_edit',
      'delete': 'can_delete',
      'upload_documents': 'can_upload_documents',
      'download_documents': 'can_download_documents',
      'send_messages': 'can_send_messages',
      'add_tasks': 'can_add_tasks',
      'edit_tasks': 'can_edit_tasks',
      'add_participants': 'can_add_participants',
      'view_audit': 'can_view_audit',
      'view_financial': 'can_view_financial',
      'view_compliance': 'can_view_compliance',
      'use_pin': 'can_use_pin',
      'delete_documents': 'can_delete_documents',
    };
    
    const permissionKey = actionMap[action];
    if (!permissionKey) return false;
    
    return permissions[permissionKey] as boolean || false;
  }, [user, permissions]);

  // Tab visibility check
  const isTabVisible = useCallback((tab: keyof ExchangePermissions['tabs_visible']): boolean => {
    if (!user || !permissions) return false;
    
    // Admin and coordinator always see all tabs
    if (user.role === 'admin' || user.role === 'coordinator') return true;
    
    // Client sees most tabs by default
    if (user.role === 'client') {
      return permissions.tabs_visible[tab] ?? true;
    }
    
    // Third party and agency only see tabs they have permission for
    return permissions.tabs_visible[tab] ?? false;
  }, [user, permissions]);

  // Get visible tabs for the current user
  const getVisibleTabs = useCallback(() => {
    if (!permissions) return [];
    
    const allTabs = [
      { id: 'overview', label: 'Overview', visible: isTabVisible('overview') },
      { id: 'members', label: 'Members', visible: isTabVisible('members') },
      { id: 'tasks', label: 'Tasks', visible: isTabVisible('tasks') },
      { id: 'documents', label: 'Documents', visible: isTabVisible('documents') },
      { id: 'financial', label: 'Financial', visible: isTabVisible('financial') },
      { id: 'compliance', label: 'Compliance', visible: isTabVisible('compliance') },
      { id: 'chat', label: 'Chat', visible: isTabVisible('chat') },
      { id: 'timeline', label: 'Timeline', visible: isTabVisible('timeline') },
      { id: 'audit', label: 'Audit Log', visible: isTabVisible('audit') },
    ];
    
    return allTabs.filter(tab => tab.visible);
  }, [permissions, isTabVisible]);

  // Check if user has any action permissions (not just view)
  const hasActionPermissions = useCallback((): boolean => {
    if (!permissions) return false;
    
    return (
      permissions.can_upload_documents ||
      permissions.can_send_messages ||
      permissions.can_add_tasks ||
      permissions.can_edit ||
      permissions.can_add_participants
    );
  }, [permissions]);

  // Get permission summary for UI display
  const getPermissionSummary = useCallback((): string[] => {
    if (!permissions) return [];
    
    const summary: string[] = [];
    
    if (permissions.can_edit) summary.push('Edit Exchange');
    if (permissions.can_upload_documents) summary.push('Upload Documents');
    if (permissions.can_send_messages) summary.push('Send Messages');
    if (permissions.can_add_tasks) summary.push('Add Tasks');
    if (permissions.can_add_participants) summary.push('Manage Participants');
    if (permissions.can_use_pin) summary.push('Use PIN Protection');
    
    if (summary.length === 0 && permissions.can_view) {
      summary.push('View Only');
    }
    
    return summary;
  }, [permissions]);

  return {
    // Permission state
    permissions,
    customPermissions,
    loading,
    error,
    
    // Permission checks
    can,
    isTabVisible,
    getVisibleTabs,
    hasActionPermissions,
    
    // Specific permission checks
    canView: () => can('view'),
    canEdit: () => can('edit'),
    canDelete: () => can('delete'),
    canUploadDocuments: () => can('upload_documents'),
    canDownloadDocuments: () => can('download_documents'),
    canSendMessages: () => can('send_messages'),
    canAddTasks: () => can('add_tasks'),
    canEditTasks: () => can('edit_tasks'),
    canAddParticipants: () => can('add_participants'),
    canViewAudit: () => can('view_audit'),
    canUsePin: () => can('use_pin'),
    canDeleteDocuments: () => can('delete_documents'),
    
    // Utilities
    getPermissionSummary,
    refreshPermissions: loadExchangePermissions,
    
    // Role info
    userRole: user?.role,
    isAdmin: user?.role === 'admin',
    isCoordinator: user?.role === 'coordinator',
    isClient: user?.role === 'client',
    isThirdParty: user?.role === 'third_party',
    isAgency: user?.role === 'agency',
  };
};