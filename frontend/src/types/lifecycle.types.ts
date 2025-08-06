export const LIFECYCLE_STAGES = {
  'INITIATION': { label: 'Initiation', color: 'bg-gray-500', textColor: 'text-gray-700', progress: 10 },
  'QUALIFICATION': { label: 'Qualification', color: 'bg-blue-500', textColor: 'text-blue-700', progress: 25 },
  'DOCUMENTATION': { label: 'Documentation', color: 'bg-purple-500', textColor: 'text-purple-700', progress: 40 },
  'RELINQUISHED_SALE': { label: 'Sale Complete', color: 'bg-orange-500', textColor: 'text-orange-700', progress: 55 },
  'IDENTIFICATION_PERIOD': { label: '45-Day Period', color: 'bg-yellow-500', textColor: 'text-yellow-700', progress: 70 },
  'REPLACEMENT_ACQUISITION': { label: '180-Day Period', color: 'bg-amber-500', textColor: 'text-amber-700', progress: 85 },
  'COMPLETION': { label: 'Completion', color: 'bg-green-500', textColor: 'text-green-700', progress: 100 }
} as const;

export const RISK_COLORS = {
  'LOW': 'text-green-700 bg-green-50 border-green-200',
  'MEDIUM': 'text-yellow-700 bg-yellow-50 border-yellow-200',  
  'HIGH': 'text-orange-700 bg-orange-50 border-orange-200',
  'CRITICAL': 'text-red-700 bg-red-50 border-red-200'
} as const;

export const COMPLIANCE_COLORS = {
  'COMPLIANT': 'text-green-700 bg-green-50 border-green-200',
  'AT_RISK': 'text-yellow-700 bg-yellow-50 border-yellow-200',
  'NON_COMPLIANT': 'text-red-700 bg-red-50 border-red-200',
  'PENDING': 'text-gray-700 bg-gray-50 border-gray-200'
} as const;

export type LifecycleStage = keyof typeof LIFECYCLE_STAGES;
export type RiskLevel = keyof typeof RISK_COLORS;
export type ComplianceStatus = keyof typeof COMPLIANCE_COLORS;