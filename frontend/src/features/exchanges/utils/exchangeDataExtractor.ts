export interface EnhancedExchangeData {
  // Basic exchange properties
  status: string;
  exchangeNumber: string;
  exchangeType: string;
  completionPercentage: number;
  totalRelinquishedValue: number;
  totalReplacementValue: number;
  
  // Financial details
  proceeds: number;
  relinquishedValue: number;
  
  // Timeline
  day45Deadline: string | null;
  day180Deadline: string | null;
  
  // Risk and compliance
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  complianceStatus: string;
  onTrack: boolean;
  
  // Relinquished property details
  relinquishedAddress: string;
  relinquishedCity: string;
  relinquishedState: string;
  relinquishedZip: string;
  relinquishedAPN: string;
  relinquishedEscrowNumber: string;
  relinquishedContractDate: string | null;
  
  // Buyer/Seller info
  buyerName: string;
  sellerName: string;
  replacementSeller: string;
  
  // Replacement property
  identified: boolean;
  replacementAddress: string;
  replacementCity: string;
  replacementState: string;
  replacementZip: string;
  replacementAPN: string;
  replacementEscrowNumber: string;
  replacementContractDate: string | null;
  replacementValue: number;
  
  // Client info
  clientName: string;
  clientVesting: string;
  
  // Coordinator info
  coordinatorName: string;
  coordinatorEmail: string;
  
  // Additional details
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  bank: string;
  
  // Financial metrics
  financialMetrics: {
    totalValue: number;
    replacementValue: number;
    gain: number;
    taxDeferred: number;
  };
  
  // Timeline metrics
  timeline: {
    daysRemaining: number;
    stageProgress: number;
    nextMilestone: string;
  };
  
  // Compliance
  compliance: {
    status: string;
    checks: any[];
    issues: any[];
  };
}

export const extractRichExchangeData = (exchange: any): EnhancedExchangeData => {
  // Parse relinquished property data
  const relinquishedProp = exchange.relinquishedProperty || {};
  const replacementProps = exchange.replacementProperties || [];
  const firstReplacement = replacementProps[0] || {};
  
  // Calculate deadlines
  const closingDate = exchange.relinquishedClosingDate ? new Date(exchange.relinquishedClosingDate) : null;
  const day45Deadline = closingDate ? new Date(closingDate.getTime() + (45 * 24 * 60 * 60 * 1000)).toISOString() : null;
  const day180Deadline = closingDate ? new Date(closingDate.getTime() + (180 * 24 * 60 * 60 * 1000)).toISOString() : null;
  
  // Determine risk level
  const today = new Date();
  const daysUntil45 = day45Deadline ? Math.ceil((new Date(day45Deadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 999;
  const daysUntil180 = day180Deadline ? Math.ceil((new Date(day180Deadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 999;
  
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (daysUntil45 < 0 || daysUntil180 < 0) {
    riskLevel = 'HIGH';
  } else if (daysUntil45 < 7 || daysUntil180 < 14) {
    riskLevel = 'MEDIUM';
  }
  
  const relinquishedValue = exchange.relinquishedValue || exchange.relinquishedSalePrice || exchange.exchangeValue || 0;
  const replacementValue = exchange.replacementValue || firstReplacement.value || 0;
  
  // Extract client info
  const client = exchange.client || {};
  const clientName = client.firstName && client.lastName 
    ? `${client.firstName} ${client.lastName}`
    : exchange.clientName || '';
    
  // Extract coordinator info
  const coordinator = exchange.coordinator || {};
  const coordinatorName = coordinator.first_name && coordinator.last_name
    ? `${coordinator.first_name} ${coordinator.last_name}`
    : exchange.coordinatorName || '';
  
  return {
    // Basic exchange properties
    status: exchange.status || 'ACTIVE',
    exchangeNumber: exchange.exchangeNumber || exchange.id || 'N/A',
    exchangeType: exchange.exchangeType || 'DELAYED',
    completionPercentage: exchange.progress || exchange.completionPercentage || 0,
    totalRelinquishedValue: relinquishedValue,
    totalReplacementValue: replacementValue,
    
    // Financial details
    proceeds: relinquishedValue,
    relinquishedValue: relinquishedValue,
    
    // Timeline
    day45Deadline: exchange.identificationDeadline || exchange.deadline45 || day45Deadline,
    day180Deadline: exchange.completionDeadline || exchange.exchangeDeadline || exchange.deadline180 || day180Deadline,
    
    // Risk and compliance
    riskLevel: exchange.riskLevel || riskLevel,
    complianceStatus: exchange.complianceStatus || 'COMPLIANT',
    onTrack: daysUntil45 >= 0 && daysUntil180 >= 0,
    
    // Relinquished property details
    relinquishedAddress: relinquishedProp.address || exchange.relinquishedPropertyAddress || exchange.propertyAddress || '',
    relinquishedCity: relinquishedProp.city || '',
    relinquishedState: relinquishedProp.state || '',
    relinquishedZip: relinquishedProp.zip || '',
    relinquishedAPN: relinquishedProp.apn || '',
    relinquishedEscrowNumber: relinquishedProp.escrowNumber || exchange.bankAccountEscrow || '',
    relinquishedContractDate: relinquishedProp.contractDate || exchange.relinquishedClosingDate || null,
    
    // Buyer/Seller info
    buyerName: exchange.buyerName || relinquishedProp.buyerName || '',
    sellerName: exchange.sellerName || clientName,
    replacementSeller: firstReplacement.sellerName || '',
    
    // Replacement property
    identified: replacementProps.length > 0,
    replacementAddress: firstReplacement.address || '',
    replacementCity: firstReplacement.city || '',
    replacementState: firstReplacement.state || '',
    replacementZip: firstReplacement.zip || '',
    replacementAPN: firstReplacement.apn || '',
    replacementEscrowNumber: firstReplacement.escrowNumber || '',
    replacementContractDate: firstReplacement.contractDate || null,
    replacementValue: replacementValue,
    
    // Client info
    clientName: clientName,
    clientVesting: exchange.clientVesting || client.vesting || '',
    
    // Coordinator info
    coordinatorName: coordinatorName,
    coordinatorEmail: coordinator.email || exchange.coordinatorEmail || '',
    
    // Additional details
    priority: exchange.priority || 'MEDIUM',
    bank: exchange.bank || exchange.bankAccountEscrow || '',
    
    // Financial metrics
    financialMetrics: {
      totalValue: exchange.exchangeValue || relinquishedValue,
      replacementValue: replacementValue,
      gain: relinquishedValue - replacementValue,
      taxDeferred: (relinquishedValue - replacementValue) * 0.15
    },
    
    // Timeline metrics
    timeline: {
      daysRemaining: Math.min(daysUntil45, daysUntil180),
      stageProgress: exchange.stageProgress || exchange.progress || 0,
      nextMilestone: daysUntil45 < daysUntil180 ? '45-Day Identification' : '180-Day Completion'
    },
    
    // Compliance
    compliance: {
      status: exchange.complianceStatus || 'COMPLIANT',
      checks: exchange.complianceChecks || [],
      issues: exchange.complianceIssues || []
    }
  };
};