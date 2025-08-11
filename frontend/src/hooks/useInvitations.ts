import { useState, useCallback } from 'react';
import { apiService } from '../services/api';

export interface InvitationData {
  email: string;
  phone?: string;
  role: 'client' | 'third_party' | 'agency' | 'coordinator';
  method: 'email' | 'sms' | 'both';
  firstName?: string;
  lastName?: string;
}

export interface InvitationResult {
  email: string;
  status: 'invitation_sent' | 'added_existing_user' | 'already_participant' | 'error';
  message: string;
  expiresAt?: string;
}

export interface SendInvitationsResponse {
  success: boolean;
  results: InvitationResult[];
  exchangeId: string;
  totalSent: number;
  totalErrors: number;
}

export interface PendingInvitation {
  id: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  firstName?: string;
  lastName?: string;
  customMessage?: string;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

export interface InvitationDetails {
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  customMessage?: string;
  exchange: {
    id: string;
    name: string;
    exchangeNumber: string;
  };
  inviter: {
    name: string;
  };
  expiresAt: string;
}

export function useInvitations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendInvitations = useCallback(async (
    exchangeId: string, 
    invitations: InvitationData[], 
    message?: string
  ): Promise<SendInvitationsResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📤 Sending invitation request to:', `/invitations/${exchangeId}/send`);
      console.log('📋 Request payload:', { invitations, message });
      
      // Check token before making request
      const token = localStorage.getItem('token');
      console.log('🔑 Current token exists:', !!token);
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const exp = payload.exp * 1000; // Convert to milliseconds
          const now = Date.now();
          console.log('⏰ Token expiry check:', {
            expiresAt: new Date(exp).toISOString(),
            now: new Date(now).toISOString(),
            isExpired: exp < now,
            minutesUntilExpiry: Math.floor((exp - now) / 60000)
          });
        } catch (e) {
          console.error('Failed to parse token:', e);
        }
      }
      
      const response = await apiService.post(`/invitations/${exchangeId}/send`, {
        invitations,
        message
      });

      console.log('📥 Invitation response:', response);
      
      // Handle different response formats
      if (response && response.data) {
        return response.data;
      } else if (response) {
        return response;
      } else {
        throw new Error('No response data received');
      }
    } catch (err: any) {
      console.error('🚨 Invitation API error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to send invitations';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getPendingInvitations = useCallback(async (exchangeId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.get(`/invitations/${exchangeId}`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch invitations';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const resendInvitation = useCallback(async (invitationId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.post(`/invitations/${invitationId}/resend`, {});
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to resend invitation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelInvitation = useCallback(async (invitationId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.delete(`/invitations/${invitationId}`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to cancel invitation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getInvitationDetails = useCallback(async (token: string): Promise<InvitationDetails> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.get(`/invitations/details/${token}`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch invitation details';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptInvitation = useCallback(async (
    token: string,
    userData: {
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
    }
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.post(`/invitations/accept/${token}`, userData);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to accept invitation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    sendInvitations,
    getPendingInvitations,
    resendInvitation,
    cancelInvitation,
    getInvitationDetails,
    acceptInvitation,
    clearError: () => setError(null)
  };
}