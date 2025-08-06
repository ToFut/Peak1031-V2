import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { AuditLog } from '../types';

interface TimelineEntry {
  id: string;
  action: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  details?: any;
  type?: 'audit' | 'milestone' | 'system';
}

interface UseExchangeTimelineReturn {
  timeline: TimelineEntry[];
  auditLogs: AuditLog[];
  setTimeline: React.Dispatch<React.SetStateAction<TimelineEntry[]>>;
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
  refreshTimeline: () => Promise<void>;
}

export function useExchangeTimeline(
  exchangeId: string | undefined,
  initialTimeline: TimelineEntry[] = [],
  initialAuditLogs: AuditLog[] = []
): UseExchangeTimelineReturn {
  const [timeline, setTimeline] = useState<TimelineEntry[]>(initialTimeline);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);

  const refreshTimeline = useCallback(async () => {
    if (!exchangeId) return;

    try {
      const [timelineData, auditData] = await Promise.all([
        apiService.get(`/enterprise-exchanges/${exchangeId}/timeline`).catch(() => []),
        apiService.get(`/exchanges/${exchangeId}/audit-logs`)
      ]);

      setTimeline(timelineData || []);
      setAuditLogs(auditData?.auditLogs || auditData || []);
    } catch (err: any) {
      console.error('Error refreshing timeline:', err);
    }
  }, [exchangeId]);

  return {
    timeline,
    auditLogs,
    setTimeline,
    setAuditLogs,
    refreshTimeline
  };
}