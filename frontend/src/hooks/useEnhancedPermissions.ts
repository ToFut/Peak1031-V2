import { useAuth } from './useAuth';
import { usePermissions } from './usePermissions';
import { useCallback, useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface ExchangePermissions {
  can_edit: boolean;
  can_delete: boolean;
  can_add_participants: boolean;
  can_upload_documents: boolean;
  can_send_messages: boolean;
}

interface ParticipantInfo {
  id: string;
  role: string;
  permissions: ExchangePermissions;
  userId?: string;
  contactId?: string;
}

/**
 * Enhanced permission system that combines:
 * 1. System-wide role-based permissions (admin, coordinator, client, etc.)
 * 2. Exchange-specific participant permissions (can_edit, can_upload, etc.)
 */
export const useEnhancedPermissions = (exchangeId?: string) => {
  const { user } = useAuth();
  const rolePermissions = usePermissions();
  const [exchangePermissions, setExchangePermissions] = useState<ExchangePermissions | null>(null);
  const [participantInfo, setParticipantInfo] = useState<ParticipantInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Load exchange-specific permissions when exchangeId changes
  useEffect(() => {
    if (exchangeId && user) {
      loadExchangePermissions();
    } else {
      setExchangePermissions(null);
      setParticipantInfo(null);
    }
  }, [exchangeId, user?.id]);

  const loadExchangePermissions = async () => {
    if (!exchangeId || !user) return;
    
    setLoading(true);
    try {
      // Get current user's participant info for this exchange
      const response = await apiService.get(`/invitations/exchange/${exchangeId}/users-and-invitations`);
      
      if (response?.success && response?.participants) {
        // Find current user in participants list
        const userParticipant = response.participants.find((p: any) => 
          p.userId === user.id || p.email === user.email
        );
        
        if (userParticipant) {
          setParticipantInfo(userParticipant);
          setExchangePermissions(userParticipant.permissions || {});
        } else {
          // User is not a participant, use default permissions based on role
          setExchangePermissions(getDefaultPermissionsForRole(user.role));
          setParticipantInfo(null);
        }
      }
    } catch (error) {
      console.error('Failed to load exchange permissions:', error);
      // Fallback to role-based permissions
      setExchangePermissions(getDefaultPermissionsForRole(user.role));
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPermissionsForRole = (role: string): ExchangePermissions => {
    const defaults = {
      admin: {
        can_edit: true,
        can_delete: true,
        can_add_participants: true,
        can_upload_documents: true,
        can_send_messages: true
      },
      coordinator: {
        can_edit: true,
        can_delete: false,
        can_add_participants: true,
        can_upload_documents: true,
        can_send_messages: true
      },
      client: {
        can_edit: false,
        can_delete: false,
        can_add_participants: false,
        can_upload_documents: true,
        can_send_messages: true
      },
      third_party: {
        can_edit: false,
        can_delete: false,
        can_add_participants: false,
        can_upload_documents: true,
        can_send_messages: false
      },
      agency: {
        can_edit: false,
        can_delete: false,
        can_add_participants: false,
        can_upload_documents: true,
        can_send_messages: true
      }
    };

    return defaults[role as keyof typeof defaults] || {
      can_edit: false,
      can_delete: false,
      can_add_participants: false,
      can_upload_documents: false,
      can_send_messages: false
    };
  };

  /**
   * Enhanced permission check that combines role-based and exchange-specific permissions
   * Priority: System Role > Exchange Participant Permissions
   */
  const canInExchange = useCallback((action: string): boolean => {
    if (!user) return false;

    // Admin always has all permissions
    if (user.role === 'admin') return true;

    // Check system-wide role permissions first
    const hasSystemPermission = rolePermissions.can('exchanges', action);
    
    // If no exchange-specific permissions are loaded, use system permissions
    if (!exchangePermissions || !exchangeId) {
      return hasSystemPermission;
    }

    // Map actions to exchange permission keys
    const actionToPermissionMap: Record<string, keyof ExchangePermissions> = {
      'write': 'can_edit',
      'edit': 'can_edit',
      'delete': 'can_delete',
      'upload': 'can_upload_documents',
      'message': 'can_send_messages',
      'invite': 'can_add_participants',
      'add_participants': 'can_add_participants'
    };

    const permissionKey = actionToPermissionMap[action];
    if (!permissionKey) {
      // If action is not mapped, fall back to system permissions
      return hasSystemPermission;
    }

    // Combine system and exchange permissions (both must be true for restrictive actions)
    const hasExchangePermission = exchangePermissions[permissionKey];
    
    // For write operations, user needs both system permission AND exchange permission
    if (['write', 'edit', 'delete', 'invite', 'add_participants'].includes(action)) {
      return hasSystemPermission && hasExchangePermission;
    }

    // For read/upload/message operations, either permission is sufficient
    return hasSystemPermission || hasExchangePermission;
  }, [user, rolePermissions, exchangePermissions, exchangeId]);

  /**
   * Check if user can perform action on documents in this exchange
   */
  const canDocument = useCallback((action: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    const hasSystemPermission = rolePermissions.can('documents', action);
    
    if (action === 'upload') {
      return hasSystemPermission && (exchangePermissions?.can_upload_documents ?? false);
    }
    
    return hasSystemPermission;
  }, [user, rolePermissions, exchangePermissions]);

  /**
   * Check if user can perform action on messages in this exchange
   */
  const canMessage = useCallback((action: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    const hasSystemPermission = rolePermissions.can('messages', action);
    
    if (action === 'write') {
      return hasSystemPermission && (exchangePermissions?.can_send_messages ?? false);
    }
    
    return hasSystemPermission;
  }, [user, rolePermissions, exchangePermissions]);

  /**
   * Get human-readable permission summary
   */
  const getPermissionSummary = useCallback((): string[] => {
    if (!exchangePermissions) return [];

    const summary: string[] = [];
    
    if (exchangePermissions.can_edit) summary.push('Edit Exchange');
    if (exchangePermissions.can_delete) summary.push('Delete Items');
    if (exchangePermissions.can_add_participants) summary.push('Add Participants');
    if (exchangePermissions.can_upload_documents) summary.push('Upload Documents');
    if (exchangePermissions.can_send_messages) summary.push('Send Messages');

    return summary;
  }, [exchangePermissions]);

  return {
    // Original role-based permissions
    ...rolePermissions,
    
    // Exchange-specific permissions
    exchangePermissions,
    participantInfo,
    loading,
    
    // Enhanced permission checks
    canInExchange,
    canDocument,
    canMessage,
    
    // Convenience methods
    canEditExchange: () => canInExchange('edit'),
    canDeleteInExchange: () => canInExchange('delete'),
    canUploadDocuments: () => canDocument('upload'),
    canSendMessages: () => canMessage('write'),
    canInviteParticipants: () => canInExchange('invite'),
    
    // Utilities
    getPermissionSummary,
    refreshExchangePermissions: loadExchangePermissions,
    hasExchangePermissions: !!exchangePermissions,
    
    // Role shortcuts (enhanced)
    isExchangeAdmin: user?.role === 'admin',
    isExchangeCoordinator: user?.role === 'coordinator' || user?.role === 'admin',
    isExchangeParticipant: !!participantInfo,
  };
};