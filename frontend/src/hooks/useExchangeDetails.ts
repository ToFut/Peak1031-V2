import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { EnterpriseExchange, ExchangeParticipant } from '../types/exchange-details.types';
import { Task, Document, AuditLog } from '../types';

interface UseExchangeDetailsReturn {
  exchange: EnterpriseExchange | null;
  participants: ExchangeParticipant[];
  tasks: Task[];
  documents: Document[];
  auditLogs: AuditLog[];
  timeline: any[];
  compliance: any;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useExchangeDetails(exchangeId: string | undefined): UseExchangeDetailsReturn {
  const [exchange, setExchange] = useState<EnterpriseExchange | null>(null);
  const [participants, setParticipants] = useState<ExchangeParticipant[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExchangeData = useCallback(async () => {
    if (!exchangeId) {
      setError('No exchange ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      

      // Try enterprise endpoints first, fallback to regular endpoints
      let exchangeData, participantsData, tasksData, documentsData, auditData, timelineData, complianceData;
      
      try {
        // Try enterprise endpoints
        [exchangeData, participantsData, tasksData, documentsData, auditData, timelineData, complianceData] = await Promise.all([
          apiService.get(`/enterprise-exchanges/${exchangeId}`).catch(() => apiService.get(`/exchanges/${exchangeId}`)),
          apiService.get(`/exchanges/${exchangeId}/participants`),
          apiService.get(`/exchanges/${exchangeId}/tasks`),
          apiService.get(`/documents/exchange/${exchangeId}`),
          apiService.get(`/exchanges/${exchangeId}/audit-logs`),
          apiService.get(`/enterprise-exchanges/${exchangeId}/timeline`).catch(() => []),
          apiService.get(`/enterprise-exchanges/${exchangeId}/compliance`).catch(() => null)
        ]);
      } catch (error) {
        // Fallback to regular endpoints
        [exchangeData, participantsData, tasksData, documentsData, auditData] = await Promise.all([
          apiService.get(`/exchanges/${exchangeId}`),
          apiService.get(`/exchanges/${exchangeId}/participants`),
          apiService.get(`/exchanges/${exchangeId}/tasks`),
          apiService.get(`/documents/exchange/${exchangeId}`),
          apiService.get(`/exchanges/${exchangeId}/audit-logs`)
        ]);
        timelineData = [];
        complianceData = null;
      }

      

      setExchange(exchangeData);
      setParticipants(participantsData?.participants || participantsData || []);
      setTasks(tasksData?.tasks || tasksData || []);
      setDocuments(documentsData?.documents || documentsData || []);
      setAuditLogs(auditData?.auditLogs || auditData || []);
      setTimeline(timelineData || []);
      setCompliance(complianceData);

    } catch (err: any) {
      console.error('Error loading exchange details:', err);
      setError(err.message || 'Failed to load exchange details');
    } finally {
      setLoading(false);
    }
  }, [exchangeId]);

  useEffect(() => {
    loadExchangeData();
  }, [loadExchangeData]);

  return {
    exchange,
    participants,
    tasks,
    documents,
    auditLogs,
    timeline,
    compliance,
    loading,
    error,
    reload: loadExchangeData
  };
}