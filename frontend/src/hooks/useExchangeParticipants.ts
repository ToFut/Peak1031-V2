import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { ExchangeParticipant } from '../types/exchange-details.types';

interface UseExchangeParticipantsReturn {
  participants: ExchangeParticipant[];
  setParticipants: React.Dispatch<React.SetStateAction<ExchangeParticipant[]>>;
  addParticipant: (email: string, role: string) => Promise<boolean>;
  removeParticipant: (participantId: string) => Promise<boolean>;
  showAddMemberModal: boolean;
  setShowAddMemberModal: (show: boolean) => void;
  newMemberEmail: string;
  setNewMemberEmail: (email: string) => void;
  newMemberRole: string;
  setNewMemberRole: (role: string) => void;
}

export function useExchangeParticipants(
  exchangeId: string | undefined,
  initialParticipants: ExchangeParticipant[] = []
): UseExchangeParticipantsReturn {
  const [participants, setParticipants] = useState<ExchangeParticipant[]>(initialParticipants);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Client');

  const addParticipant = useCallback(async (email: string, role: string): Promise<boolean> => {
    if (!email || !role || !exchangeId) return false;

    try {
      const response = await apiService.post(`/exchanges/${exchangeId}/participants`, {
        email,
        role
      });

      if (response.success) {
        setParticipants(prev => [...prev, response.participant]);
        setNewMemberEmail('');
        setNewMemberRole('Client');
        setShowAddMemberModal(false);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Error adding member:', err);
      alert('Failed to add member: ' + err.message);
      return false;
    }
  }, [exchangeId]);

  const removeParticipant = useCallback(async (participantId: string): Promise<boolean> => {
    if (!exchangeId) return false;

    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        await apiService.delete(`/exchanges/${exchangeId}/participants/${participantId}`);
        setParticipants(prev => prev.filter(p => p.id !== participantId));
        return true;
      } catch (err: any) {
        console.error('Error removing member:', err);
        alert('Failed to remove member: ' + err.message);
        return false;
      }
    }
    return false;
  }, [exchangeId]);

  return {
    participants,
    setParticipants,
    addParticipant,
    removeParticipant,
    showAddMemberModal,
    setShowAddMemberModal,
    newMemberEmail,
    setNewMemberEmail,
    newMemberRole,
    setNewMemberRole
  };
}