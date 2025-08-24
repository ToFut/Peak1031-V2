import { Exchange } from '../types';

/**
 * Unified progress calculation for all exchange components
 * Based on real exchange dates and timeline
 */
export const calculateExchangeProgress = (exchange: Exchange): number => {
  if (exchange.status === 'COMPLETED' || exchange.status === 'Completed') {
    return 100;
  }

  // Use exchange.progress if it's manually set and valid
  if (exchange.progress !== undefined && exchange.progress !== null && exchange.progress >= 0) {
    return Math.min(100, exchange.progress);
  }

  // Extract real dates
  const closeOfEscrowDate = (exchange as any).close_of_escrow_date || exchange.startDate || exchange.createdAt;
  const proceedsReceivedDate = (exchange as any).proceeds_received_date || closeOfEscrowDate;
  const day45 = (exchange as any).day_45 || exchange.identificationDeadline;
  const day180 = (exchange as any).day_180 || exchange.completionDeadline || exchange.exchangeDeadline;

  if (!closeOfEscrowDate) {
    return 0;
  }

  const today = new Date();
  const escrowDate = new Date(closeOfEscrowDate);
  
  // Calculate 45 and 180 day dates from close of escrow if not provided
  const calculated45Day = day45 ? new Date(day45) : new Date(escrowDate.getTime() + (45 * 24 * 60 * 60 * 1000));
  const calculated180Day = day180 ? new Date(day180) : new Date(escrowDate.getTime() + (180 * 24 * 60 * 60 * 1000));

  // Calculate progress based on timeline
  const totalPeriod = calculated180Day.getTime() - escrowDate.getTime();
  const elapsed = Math.max(0, today.getTime() - escrowDate.getTime());
  
  const calculatedProgress = Math.min(99, Math.max(0, (elapsed / totalPeriod) * 100));
  
  return Math.round(calculatedProgress);
};

/**
 * Calculate days remaining until deadline
 */
export const getDaysUntilDeadline = (deadlineDate?: string | Date): number | null => {
  if (!deadlineDate) return null;
  
  const deadline = new Date(deadlineDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  
  const diffTime = deadline.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get exchange stage based on current date and deadlines
 */
export const getCurrentExchangeStage = (exchange: Exchange): string => {
  const today = new Date();
  
  // Extract dates
  const closeOfEscrowDate = (exchange as any).close_of_escrow_date || exchange.startDate || exchange.createdAt;
  const proceedsReceivedDate = (exchange as any).proceeds_received_date || closeOfEscrowDate;
  const day45 = (exchange as any).day_45 || exchange.identificationDeadline;
  const day180 = (exchange as any).day_180 || exchange.completionDeadline || exchange.exchangeDeadline;

  if (exchange.status === 'COMPLETED' || exchange.status === 'Completed') {
    return 'COMPLETED';
  }

  if (!closeOfEscrowDate) {
    return 'PENDING_SETUP';
  }

  const escrowDate = new Date(closeOfEscrowDate);
  const calculated45Day = day45 ? new Date(day45) : new Date(escrowDate.getTime() + (45 * 24 * 60 * 60 * 1000));
  const calculated180Day = day180 ? new Date(day180) : new Date(escrowDate.getTime() + (180 * 24 * 60 * 60 * 1000));

  if (today > calculated180Day) {
    return 'OVERDUE';
  } else if (today > calculated45Day) {
    return 'CLOSING_PERIOD';
  } else if (proceedsReceivedDate && today >= new Date(proceedsReceivedDate)) {
    return 'IDENTIFICATION_PERIOD';
  } else if (today >= escrowDate) {
    return 'FUNDS_RECEIVED';
  } else {
    return 'PRE_CLOSING';
  }
};

/**
 * Get stage color based on current stage and urgency
 */
export const getStageColor = (stage: string): string => {
  switch (stage) {
    case 'COMPLETED':
      return 'text-green-600';
    case 'OVERDUE':
      return 'text-red-600';
    case 'CLOSING_PERIOD':
      return 'text-orange-600';
    case 'IDENTIFICATION_PERIOD':
      return 'text-blue-600';
    case 'FUNDS_RECEIVED':
      return 'text-purple-600';
    case 'PRE_CLOSING':
      return 'text-gray-600';
    default:
      return 'text-gray-500';
  }
};

/**
 * Get human-readable stage name
 */
export const getStageName = (stage: string): string => {
  switch (stage) {
    case 'COMPLETED':
      return 'Exchange Completed';
    case 'OVERDUE':
      return 'Exchange Overdue';
    case 'CLOSING_PERIOD':
      return '180-Day Period';
    case 'IDENTIFICATION_PERIOD':
      return '45-Day Period';
    case 'FUNDS_RECEIVED':
      return 'Proceeds Received';
    case 'PRE_CLOSING':
      return 'Pre-Closing';
    case 'PENDING_SETUP':
      return 'Pending Setup';
    default:
      return 'Unknown Stage';
  }
};