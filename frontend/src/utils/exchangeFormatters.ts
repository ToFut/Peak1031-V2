/**
 * Utility functions for formatting exchange data
 */

/**
 * Format exchange number to standard E-XXXX format
 * @param exchangeNumber - The exchange number or ID to format
 * @returns Formatted exchange number as E-XXXX
 */
export const formatExchangeNumber = (exchangeNumber: string | number | undefined | null): string => {
  if (!exchangeNumber && exchangeNumber !== 0) {
    return 'E-0000';
  }
  
  // Extract numeric part from the exchange number
  const numericPart = String(exchangeNumber).replace(/[^0-9]/g, '');
  
  if (!numericPart) {
    return 'E-0000';
  }
  
  // Pad with zeros to ensure at least 4 digits
  const paddedNumber = numericPart.padStart(4, '0');
  
  return `E-${paddedNumber}`;
};

/**
 * Get exchange display name with proper formatting
 * @param exchange - The exchange object
 * @returns Display name for the exchange
 */
export const getExchangeDisplayName = (exchange: any): string => {
  if (exchange.name) {
    return exchange.name;
  }
  
  const formattedNumber = formatExchangeNumber(exchange.exchangeNumber || exchange.exchange_number || exchange.id);
  return `Exchange ${formattedNumber}`;
};

/**
 * Format exchange value as currency
 * @param value - The numeric value to format
 * @returns Formatted currency string
 */
export const formatExchangeValue = (value: number | undefined | null): string => {
  if (!value && value !== 0) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Calculate days until deadline
 * @param deadline - The deadline date
 * @returns Number of days until deadline (negative if past)
 */
export const getDaysUntilDeadline = (deadline: string | Date | undefined | null): number | null => {
  if (!deadline) return null;
  
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Get deadline status and color based on days remaining
 * @param daysRemaining - Number of days until deadline
 * @returns Status object with label and color classes
 */
export const getDeadlineStatus = (daysRemaining: number | null) => {
  if (daysRemaining === null) {
    return {
      label: 'No deadline',
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      urgency: 'none'
    };
  }
  
  if (daysRemaining < 0) {
    return {
      label: `${Math.abs(daysRemaining)} days overdue`,
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      urgency: 'critical'
    };
  }
  
  if (daysRemaining === 0) {
    return {
      label: 'Due today',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      urgency: 'critical'
    };
  }
  
  if (daysRemaining <= 7) {
    return {
      label: `${daysRemaining} days remaining`,
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      urgency: 'high'
    };
  }
  
  if (daysRemaining <= 30) {
    return {
      label: `${daysRemaining} days remaining`,
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      urgency: 'medium'
    };
  }
  
  return {
    label: `${daysRemaining} days remaining`,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    urgency: 'low'
  };
};