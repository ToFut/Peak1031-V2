import { EnterpriseExchange } from '../types/exchange-details.types';
import { LIFECYCLE_STAGES, RISK_COLORS, COMPLIANCE_COLORS } from '../types/lifecycle.types';

export interface ExchangeStageInfo {
  stage: string;
  color: string;
  borderColor: string;
  progress: number;
}

export function getExchangeStage(exchange: EnterpriseExchange | null): ExchangeStageInfo | null {
  if (!exchange) return null;

  const today = new Date();
  const startDate = new Date(exchange.startDate || exchange.createdAt || '');
  const deadline45 = new Date(exchange.identificationDeadline || '');
  const deadline180 = new Date(exchange.exchangeDeadline || '');
  
  if (today < startDate) {
    return {
      stage: 'Before Initial',
      color: 'bg-gray-100 text-gray-800',
      borderColor: 'border-gray-300',
      progress: 0
    };
  } else if (today >= startDate && today <= deadline45) {
    const totalDays = (deadline45.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysElapsed = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const progress = Math.min((daysElapsed / totalDays) * 100, 100);
    return {
      stage: '45 Days',
      color: 'bg-yellow-100 text-yellow-800',
      borderColor: 'border-yellow-300',
      progress: Math.round(progress)
    };
  } else if (today > deadline45 && today <= deadline180) {
    const totalDays = (deadline180.getTime() - deadline45.getTime()) / (1000 * 60 * 60 * 24);
    const daysElapsed = (today.getTime() - deadline45.getTime()) / (1000 * 60 * 60 * 24);
    const progress = Math.min((daysElapsed / totalDays) * 100, 100);
    return {
      stage: '180 Days',
      color: 'bg-orange-100 text-orange-800',
      borderColor: 'border-orange-300',
      progress: Math.round(progress)
    };
  } else {
    return {
      stage: 'Closeup',
      color: 'bg-green-100 text-green-800',
      borderColor: 'border-green-300',
      progress: 100
    };
  }
}

export function getLifecycleStageInfo(stage?: string) {
  if (!stage || !LIFECYCLE_STAGES[stage as keyof typeof LIFECYCLE_STAGES]) {
    return LIFECYCLE_STAGES.INITIATION;
  }
  return LIFECYCLE_STAGES[stage as keyof typeof LIFECYCLE_STAGES];
}

export function getRiskColorClass(riskLevel?: string): string {
  if (!riskLevel || !RISK_COLORS[riskLevel as keyof typeof RISK_COLORS]) {
    return RISK_COLORS.LOW;
  }
  return RISK_COLORS[riskLevel as keyof typeof RISK_COLORS];
}

export function getComplianceColorClass(status?: string): string {
  if (!status || !COMPLIANCE_COLORS[status as keyof typeof COMPLIANCE_COLORS]) {
    return COMPLIANCE_COLORS.PENDING;
  }
  return COMPLIANCE_COLORS[status as keyof typeof COMPLIANCE_COLORS];
}

export function formatExchangeValue(value?: number): string {
  if (!value) return '$0';
  return `$${value.toLocaleString()}`;
}

export function getExchangeProgress(exchange: EnterpriseExchange): number {
  // If enterprise exchange has stage_progress, use it
  if (exchange.stage_progress !== undefined) {
    return exchange.stage_progress;
  }
  
  // Otherwise calculate based on dates
  const stageInfo = getExchangeStage(exchange);
  return stageInfo?.progress || 0;
}