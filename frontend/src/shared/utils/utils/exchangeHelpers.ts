import { Exchange } from '@/shared/types/exchange';

export interface ExchangeDeadlines {
  identificationDeadline: Date;
  replacementDeadline: Date;
  daysUntilIdentification: number;
  daysUntilReplacement: number;
  identificationStatus: 'upcoming' | 'imminent' | 'passed';
  replacementStatus: 'upcoming' | 'imminent' | 'passed';
}

export interface ComplianceStatus {
  isCompliant: boolean;
  warnings: string[];
  errors: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

// Federal holidays that might affect deadlines
const federalHolidays = [
  '2025-01-01', // New Year's Day
  '2025-01-20', // MLK Day
  '2025-02-17', // Presidents Day
  '2025-05-26', // Memorial Day
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-10-13', // Columbus Day
  '2025-11-11', // Veterans Day
  '2025-11-27', // Thanksgiving
  '2025-12-25', // Christmas
];

export const calculateDeadlines = (exchange: Exchange): ExchangeDeadlines => {
  const closingDate = exchange.relinquishedClosingDate 
    ? new Date(exchange.relinquishedClosingDate) 
    : new Date();
  
  // Calculate 45-day identification deadline
  const identificationDeadline = exchange.identificationDeadline 
    ? new Date(exchange.identificationDeadline)
    : addBusinessDays(closingDate, 45);
  
  // Calculate 180-day replacement deadline
  const replacementDeadline = exchange.completionDeadline
    ? new Date(exchange.completionDeadline)
    : addBusinessDays(closingDate, 180);
  
  const now = new Date();
  const daysUntilIdentification = Math.ceil((identificationDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilReplacement = Math.ceil((replacementDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Determine status
  let identificationStatus: 'upcoming' | 'imminent' | 'passed';
  if (daysUntilIdentification < 0) {
    identificationStatus = 'passed';
  } else if (daysUntilIdentification <= 7) {
    identificationStatus = 'imminent';
  } else {
    identificationStatus = 'upcoming';
  }
  
  let replacementStatus: 'upcoming' | 'imminent' | 'passed';
  if (daysUntilReplacement < 0) {
    replacementStatus = 'passed';
  } else if (daysUntilReplacement <= 14) {
    replacementStatus = 'imminent';
  } else {
    replacementStatus = 'upcoming';
  }
  
  return {
    identificationDeadline,
    replacementDeadline,
    daysUntilIdentification,
    daysUntilReplacement,
    identificationStatus,
    replacementStatus
  };
};

export const getComplianceStatus = (exchange: Exchange): ComplianceStatus => {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check if exchange is properly set up
  if (!exchange.qiCompany) {
    errors.push('No Qualified Intermediary assigned');
  }
  
  // Check deadlines
  const deadlines = calculateDeadlines(exchange);
  
  if (deadlines.identificationStatus === 'passed' && (!exchange.replacementProperties || exchange.replacementProperties.length === 0)) {
    errors.push('Identification deadline passed without identifying replacement property');
  }
  
  if (deadlines.identificationStatus === 'imminent' && (!exchange.replacementProperties || exchange.replacementProperties.length === 0)) {
    warnings.push(`Only ${deadlines.daysUntilIdentification} days left to identify replacement property`);
  }
  
  if (deadlines.replacementStatus === 'imminent' && exchange.status !== 'COMPLETED') {
    warnings.push(`Only ${deadlines.daysUntilReplacement} days left to complete exchange`);
  }
  
  // Check value requirements
  const relinquishedValue = exchange.relinquishedValue || exchange.relinquishedSalePrice || exchange.exchangeValue || 0;
  const replacementValue = exchange.replacementValue || 
    (exchange.replacementProperties && exchange.replacementProperties[0]?.value) || 0;
  
  if (replacementValue && relinquishedValue) {
    if (replacementValue < relinquishedValue) {
      warnings.push('Replacement property value is less than relinquished property - may trigger taxable boot');
    }
    
    const percentDiff = ((relinquishedValue - replacementValue) / relinquishedValue) * 100;
    if (percentDiff > 20) {
      warnings.push(`Replacement property value is ${percentDiff.toFixed(1)}% less than relinquished property`);
    }
  }
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  if (errors.length > 0) {
    riskLevel = 'high';
  } else if (warnings.length > 2) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }
  
  return {
    isCompliant: errors.length === 0,
    warnings,
    errors,
    riskLevel
  };
};

export const addBusinessDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  let daysAdded = 0;
  
  while (daysAdded < days) {
    result.setDate(result.getDate() + 1);
    
    // Skip weekends
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      // Skip federal holidays
      const dateStr = result.toISOString().split('T')[0];
      if (!federalHolidays.includes(dateStr)) {
        daysAdded++;
      }
    }
  }
  
  return result;
};

export const getExchangeProgress = (exchange: Exchange): number => {
  let progress = 0;
  const steps = 10;
  
  if (exchange.clientId) progress += 1;
  if (exchange.qiCompany) progress += 1;
  if (exchange.relinquishedPropertyAddress || exchange.relinquishedProperty) progress += 1;
  if (exchange.relinquishedValue || exchange.relinquishedSalePrice || exchange.exchangeValue) progress += 1;
  if (exchange.relinquishedClosingDate) progress += 1;
  if (exchange.replacementProperties && exchange.replacementProperties.length > 0) progress += 1;
  if (exchange.replacementValue) progress += 1;
  if (exchange.identificationDeadline) progress += 1;
  if (exchange.completionDeadline) progress += 1;
  if (exchange.status === 'COMPLETED') progress += 1;
  
  return (progress / steps) * 100;
};

export const getExchangeTimeline = (exchange: Exchange): Array<{
  date: Date;
  event: string;
  status: 'completed' | 'current' | 'upcoming';
}> => {
  const timeline = [];
  const now = new Date();
  
  if (exchange.createdAt) {
    timeline.push({
      date: new Date(exchange.createdAt),
      event: 'Exchange initiated',
      status: 'completed' as const
    });
  }
  
  if (exchange.relinquishedClosingDate) {
    const closingDate = new Date(exchange.relinquishedClosingDate);
    timeline.push({
      date: closingDate,
      event: 'Relinquished property closing',
      status: closingDate < now ? 'completed' as const : 'upcoming' as const
    });
  }
  
  const deadlines = calculateDeadlines(exchange);
  
  timeline.push({
    date: deadlines.identificationDeadline,
    event: '45-day identification deadline',
    status: deadlines.identificationDeadline < now ? 'completed' as const : 
            deadlines.daysUntilIdentification <= 7 ? 'current' as const : 'upcoming' as const
  });
  
  timeline.push({
    date: deadlines.replacementDeadline,
    event: '180-day replacement deadline',
    status: deadlines.replacementDeadline < now ? 'completed' as const : 
            deadlines.daysUntilReplacement <= 14 ? 'current' as const : 'upcoming' as const
  });
  
  return timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const calculateBoot = (exchange: Exchange): {
  cashBoot: number;
  mortgageBoot: number;
  totalBoot: number;
} => {
  let cashBoot = 0;
  let mortgageBoot = 0;
  
  // Calculate cash boot
  const relinquishedValue = exchange.relinquishedValue || exchange.relinquishedSalePrice || exchange.exchangeValue || 0;
  const replacementValue = exchange.replacementValue || 
    (exchange.replacementProperties && exchange.replacementProperties[0]?.value) || 0;
  
  if (relinquishedValue && replacementValue) {
    const valueDiff = relinquishedValue - replacementValue;
    if (valueDiff > 0) {
      cashBoot = valueDiff;
    }
  }
  
  // Note: mortgage boot calculation would require debt information
  // which isn't in the current Exchange interface
  
  return {
    cashBoot,
    mortgageBoot,
    totalBoot: cashBoot + mortgageBoot
  };
};