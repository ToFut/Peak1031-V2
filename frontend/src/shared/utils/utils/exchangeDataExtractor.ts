// Helper function to filter out placeholder emails
function filterPlaceholderEmail(email: string): string {
  console.log('🔍 Filtering email:', email);
  if (!email || email.includes('@imported.com') || email.includes('@example.com') || email.includes('@placeholder.com')) {
    console.log('❌ Filtered out placeholder email:', email);
    return '';
  }
  console.log('✅ Valid email:', email);
  return email;
}

// Enhanced Exchange Data Extractor - leverages all PP data
export interface EnhancedExchangeData {
  // Basic Info
  exchangeNumber: string;
  exchangeName: string;
  status: string;
  priority: string;
  exchangeType: string;
  
  // Client Information
  clientVesting: string;
  clientName: string;
  
  // Property Details - Relinquished
  relinquishedAddress: string;
  relinquishedCity: string;
  relinquishedState: string;
  relinquishedZip: string;
  relinquishedAPN: string;
  relinquishedValue: number;
  relinquishedEscrowNumber: string;
  relinquishedContractTitle: string;
  relinquishedContractDate: string;
  closeOfEscrowDate: string;
  
  // Property Details - Replacement  
  replacementAddress: string;
  replacementCity: string;
  replacementState: string;
  replacementZip: string;
  replacementAPN: string;
  replacementValue: number;
  replacementEscrowNumber: string;
  replacementContractTitle: string;
  replacementContractDate: string;
  replacementSeller: string;
  
  // Financial Details
  proceeds: number;
  totalRelinquishedValue: number;
  totalReplacementValue: number;
  
  // Critical Dates
  day45Deadline: string;
  day180Deadline: string;
  startDate: string;
  completionDate: string;
  
  // Team & Assignment
  assignedUsers: any[];
  coordinatorName: string;
  coordinatorEmail: string;
  
  // Transaction Details
  buyerName: string;
  bank: string;
  identified: boolean;
  
  // Status & Progress
  lifecycleStage: string;
  workflowStage: string;
  stageProgress: number;
  daysInCurrentStage: number;
  complianceStatus: string;
  riskLevel: string;
  onTrack: boolean;
  completionPercentage: number;
}

export function extractRichExchangeData(exchange: any): EnhancedExchangeData {
  const ppData = exchange.pp_data || {};
  const customFields = ppData.custom_field_values || [];
  
  console.log('📊 Exchange data extraction for:', exchange.exchange_name);
  console.log('📧 Assigned users:', ppData.assigned_to_users);
  
  // Helper to get custom field value
  const getCustomField = (label: string) => {
    const field = customFields.find((cf: any) => cf.custom_field_ref?.label === label);
    return field?.value_string || field?.value_number || field?.value_date_time || field?.value_boolean || null;
  };
  
  return {
    // Basic Info
    exchangeNumber: exchange.exchange_number || '',
    exchangeName: exchange.exchange_name || exchange.name || '',
    status: exchange.status || '',
    priority: exchange.priority || 'MEDIUM',
    exchangeType: getCustomField('Type of Exchange') || exchange.exchange_type || '',
    
    // Client Information
    clientVesting: getCustomField('Client Vesting') || '',
    clientName: ppData.account_ref?.display_name || '',
    
    // Property Details - Relinquished
    relinquishedAddress: getCustomField('Rel Property Address') || '',
    relinquishedCity: getCustomField('Rel Property City') || '',
    relinquishedState: getCustomField('Rel Property State') || '',
    relinquishedZip: getCustomField('Rel Property Zip') || '',
    relinquishedAPN: getCustomField('Rel APN') || '',
    relinquishedValue: getCustomField('Rel Value') || 0,
    relinquishedEscrowNumber: getCustomField('Rel Escrow Number') || '',
    relinquishedContractTitle: getCustomField('Rel Purchase Contract Title') || '',
    relinquishedContractDate: getCustomField('Rel Contract Date') || '',
    closeOfEscrowDate: getCustomField('Close of Escrow Date') || '',
    
    // Property Details - Replacement  
    replacementAddress: getCustomField('Rep 1 Property Address') || '',
    replacementCity: getCustomField('Rep 1 City') || '',
    replacementState: getCustomField('Rep 1 State') || '',
    replacementZip: getCustomField('Rep 1 Zip') || '',
    replacementAPN: getCustomField('Rep 1 APN') || '',
    replacementValue: getCustomField('Rep 1 Value') || 0,
    replacementEscrowNumber: getCustomField('Rep 1 Escrow Number') || '',
    replacementContractTitle: getCustomField('Rep 1 Purchase Contract Title') || '',
    replacementContractDate: getCustomField('Rep 1 Purchase Contract Date') || '',
    replacementSeller: getCustomField('Rep 1 Seller 1 Name') || '',
    
    // Financial Details
    proceeds: getCustomField('Proceeds') || 0,
    totalRelinquishedValue: getCustomField('Rel Value') || 0,
    totalReplacementValue: getCustomField('Rep 1 Value') || 0,
    
    // Critical Dates
    day45Deadline: getCustomField('Day 45') || '',
    day180Deadline: getCustomField('Day 180') || '',
    startDate: exchange.start_date || '',
    completionDate: exchange.completion_date || '',
    
    // Team & Assignment
    assignedUsers: ppData.assigned_to_users || [],
    coordinatorName: ppData.assigned_to_users?.[0]?.display_name || '',
    coordinatorEmail: filterPlaceholderEmail(ppData.assigned_to_users?.[0]?.email_address || ''),
    
    // Transaction Details
    buyerName: getCustomField('Buyer 1 Name') || '',
    bank: getCustomField('Bank') || '',
    identified: getCustomField('Identified?') || false,
    
    // Status & Progress
    lifecycleStage: exchange.lifecycle_stage || '',
    workflowStage: exchange.workflow_stage || '',
    stageProgress: exchange.stage_progress || 0,
    daysInCurrentStage: exchange.days_in_current_stage || 0,
    complianceStatus: exchange.compliance_status || '',
    riskLevel: exchange.risk_level || 'LOW',
    onTrack: exchange.on_track !== false,
    completionPercentage: exchange.completion_percentage || 0
  };
}