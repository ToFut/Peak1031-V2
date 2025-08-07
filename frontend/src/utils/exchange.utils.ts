import { EnterpriseExchange } from '../types/exchange-details.types';
import { LIFECYCLE_STAGES, RISK_COLORS, COMPLIANCE_COLORS } from '../types/lifecycle.types';

export interface ExchangeStageInfo {
  stage: string;
  color: string;
  borderColor: string;
  progress: number;
}

export const formatExchangeValue = (value: number | undefined): string => {
  if (!value) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const getExchangeStage = (exchange: any): string => {
  return exchange?.lifecycle_stage || exchange?.stage || 'Unknown';
};



export const getStageColorClass = (stage: string | undefined): string => {
  switch (stage?.toLowerCase()) {
    case 'initiation':
      return 'text-blue-600 bg-blue-100';
    case 'identification':
      return 'text-purple-600 bg-purple-100';
    case 'exchange':
      return 'text-green-600 bg-green-100';
    case 'completion':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const getDaysUntilDeadline = (deadline: string | undefined): number => {
  if (!deadline) return 0;
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffTime = deadlineDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const isDeadlineApproaching = (deadline: string | undefined, daysThreshold: number = 30): boolean => {
  const daysUntil = getDaysUntilDeadline(deadline);
  return daysUntil > 0 && daysUntil <= daysThreshold;
};

export const isDeadlineOverdue = (deadline: string | undefined): boolean => {
  return getDaysUntilDeadline(deadline) < 0;
};

export function getLifecycleStageInfo(stage?: string) {
  if (!stage || !LIFECYCLE_STAGES[stage as keyof typeof LIFECYCLE_STAGES]) {
    return LIFECYCLE_STAGES.INITIATION;
  }
  return LIFECYCLE_STAGES[stage as keyof typeof LIFECYCLE_STAGES];
}

export const getRiskColorClass = (riskLevel?: string): string => {
  switch (riskLevel?.toLowerCase()) {
    case 'low':
      return 'text-green-600 bg-green-100';
    case 'medium':
      return 'text-yellow-600 bg-yellow-100';
    case 'high':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const getComplianceColorClass = (complianceStatus?: string): string => {
  switch (complianceStatus?.toLowerCase()) {
    case 'compliant':
      return 'text-green-600 bg-green-100';
    case 'pending':
      return 'text-yellow-600 bg-yellow-100';
    case 'non-compliant':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};


export function getExchangeProgress(exchange: EnterpriseExchange): number {
  // If enterprise exchange has stage_progress, use it
  if (exchange.stage_progress !== undefined) {
    return exchange.stage_progress;
  }
  
  // Otherwise return 0 as fallback
  return 0;
}