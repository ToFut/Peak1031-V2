// Exchange stage progression system
export interface ExchangeStage {
  id: string;
  name: string;
  description: string;
  order: number;
  autoTrigger?: boolean;
  requirements?: string[];
  estimatedDuration?: number; // in days
  actions?: StageAction[];
}

export interface StageAction {
  id: string;
  label: string;
  type: 'manual' | 'auto' | 'suggested';
  description?: string;
  requiresApproval?: boolean;
  nextStage?: string;
}

export interface ExchangeStageProgress {
  exchangeId: string;
  currentStage: string;
  stageHistory: Array<{
    stageId: string;
    enteredAt: string;
    exitedAt?: string;
    triggeredBy?: 'system' | 'user';
    userId?: string;
    notes?: string;
  }>;
  nextPossibleStages: string[];
  blockers?: string[];
}

// Predefined exchange stages based on requirements
export const EXCHANGE_STAGES: ExchangeStage[] = [
  {
    id: 'EXCHANGE_CREATED',
    name: 'Exchange Created',
    description: 'New exchange record has been initialized',
    order: 1,
    autoTrigger: true,
    estimatedDuration: 1,
    actions: [
      {
        id: 'start_onboarding',
        label: 'Start Client Onboarding',
        type: 'suggested',
        description: 'Begin the client verification process',
        nextStage: 'ONBOARDING_PENDING'
      }
    ]
  },
  {
    id: 'ONBOARDING_PENDING',
    name: 'Onboarding Pending',
    description: 'Client is registered but not yet verified',
    order: 2,
    requirements: ['Client contact information', 'Initial documentation'],
    estimatedDuration: 3,
    actions: [
      {
        id: 'verify_client',
        label: 'Complete KYC Verification',
        type: 'manual',
        description: 'Verify client identity and documentation',
        nextStage: 'KYC_COMPLETED'
      }
    ]
  },
  {
    id: 'KYC_COMPLETED',
    name: 'KYC Completed',
    description: 'Client verification completed, awaiting approval',
    order: 3,
    requirements: ['KYC documentation verified'],
    estimatedDuration: 2,
    actions: [
      {
        id: 'approve_exchange',
        label: 'Approve Exchange',
        type: 'manual',
        requiresApproval: true,
        description: 'Admin/Staff approval required to proceed',
        nextStage: 'FUNDS_INSTRUCTED'
      }
    ]
  },
  {
    id: 'FUNDS_INSTRUCTED',
    name: 'Funds Instructed',
    description: 'Wire instructions have been sent to client',
    order: 4,
    requirements: ['Admin approval'],
    estimatedDuration: 5,
    actions: [
      {
        id: 'send_wire_instructions',
        label: 'Send Wire Instructions',
        type: 'suggested',
        description: 'Send wire transfer instructions to client'
      },
      {
        id: 'confirm_funds_received',
        label: 'Confirm Funds Received',
        type: 'manual',
        description: 'Confirm deposit into escrow/QI account',
        nextStage: 'FUNDS_RECEIVED'
      }
    ]
  },
  {
    id: 'FUNDS_RECEIVED',
    name: 'Funds Received',
    description: 'Funds confirmed in escrow/QI account',
    order: 5,
    requirements: ['Funds deposited and verified'],
    estimatedDuration: 1,
    autoTrigger: true,
    actions: [
      {
        id: 'start_identification_period',
        label: 'Start 45-Day Identification Period',
        type: 'auto',
        description: 'Automatically start the 45-day identification clock',
        nextStage: 'IDENTIFICATION_OPEN'
      }
    ]
  },
  {
    id: 'IDENTIFICATION_OPEN',
    name: 'Identification Period Open',
    description: '45-day identification period is active',
    order: 6,
    requirements: ['Funds received', '45-day clock started'],
    estimatedDuration: 45,
    actions: [
      {
        id: 'identify_properties',
        label: 'Identify Replacement Properties',
        type: 'manual',
        description: 'Client identifies potential replacement properties',
        nextStage: 'PROPERTY_IDENTIFIED'
      }
    ]
  },
  {
    id: 'PROPERTY_IDENTIFIED',
    name: 'Properties Identified',
    description: 'Replacement properties have been identified and documented',
    order: 7,
    requirements: ['Properties identified within 45 days'],
    estimatedDuration: 7,
    actions: [
      {
        id: 'review_properties',
        label: 'Review Identified Properties',
        type: 'suggested',
        description: 'Review and validate identified properties'
      },
      {
        id: 'execute_purchase_agreement',
        label: 'Execute Purchase Agreement',
        type: 'manual',
        description: 'Sign purchase agreement for replacement property',
        nextStage: 'UNDER_CONTRACT'
      }
    ]
  },
  {
    id: 'UNDER_CONTRACT',
    name: 'Under Contract',
    description: 'Purchase agreement executed and uploaded',
    order: 8,
    requirements: ['Purchase agreement signed and uploaded'],
    estimatedDuration: 30,
    actions: [
      {
        id: 'prepare_disbursement',
        label: 'Prepare Disbursement',
        type: 'suggested',
        description: 'Prepare wire transfer for closing'
      },
      {
        id: 'queue_disbursement',
        label: 'Queue Disbursement',
        type: 'manual',
        description: 'Queue wire for multi-party approval',
        nextStage: 'DISBURSEMENT_PENDING'
      }
    ]
  },
  {
    id: 'DISBURSEMENT_PENDING',
    name: 'Disbursement Pending',
    description: 'Wire transfer queued and awaiting approval',
    order: 9,
    requirements: ['Wire instructions prepared', 'Multi-party approval required'],
    estimatedDuration: 3,
    actions: [
      {
        id: 'approve_disbursement',
        label: 'Approve Disbursement',
        type: 'manual',
        requiresApproval: true,
        description: 'Final approval for wire transfer'
      },
      {
        id: 'send_wire',
        label: 'Send Wire Transfer',
        type: 'manual',
        description: 'Execute wire transfer for closing',
        nextStage: 'EXCHANGE_COMPLETED'
      }
    ]
  },
  {
    id: 'EXCHANGE_COMPLETED',
    name: 'Exchange Completed',
    description: 'Replacement property closed successfully',
    order: 10,
    requirements: ['Wire transfer completed', 'Closing confirmed'],
    estimatedDuration: 1,
    autoTrigger: true,
    actions: [
      {
        id: 'generate_closeout_package',
        label: 'Generate Closeout Package',
        type: 'auto',
        description: 'Generate CPA/tax documentation package',
        nextStage: 'CLOSEOUT_ARCHIVED'
      }
    ]
  },
  {
    id: 'CLOSEOUT_ARCHIVED',
    name: 'Closeout Archived',
    description: 'All documentation generated and distributed',
    order: 11,
    requirements: ['Closeout package generated'],
    estimatedDuration: 1,
    actions: [
      {
        id: 'archive_exchange',
        label: 'Archive Exchange',
        type: 'auto',
        description: 'Move exchange to archived status'
      }
    ]
  },
  {
    id: 'EXCHANGE_CANCELLED',
    name: 'Exchange Cancelled',
    description: 'Exchange failed, cancelled, or deadlines missed',
    order: 99,
    actions: [
      {
        id: 'process_cancellation',
        label: 'Process Cancellation',
        type: 'manual',
        description: 'Handle failed exchange procedures'
      }
    ]
  }
];

// Helper functions for stage management
export const getStageByOrder = (order: number): ExchangeStage | undefined => {
  return EXCHANGE_STAGES.find(stage => stage.order === order);
};

export const getNextStages = (currentStageId: string): ExchangeStage[] => {
  const currentStage = EXCHANGE_STAGES.find(stage => stage.id === currentStageId);
  if (!currentStage) return [];
  
  return EXCHANGE_STAGES.filter(stage => stage.order === currentStage.order + 1);
};

export const getPreviousStages = (currentStageId: string): ExchangeStage[] => {
  const currentStage = EXCHANGE_STAGES.find(stage => stage.id === currentStageId);
  if (!currentStage) return [];
  
  return EXCHANGE_STAGES.filter(stage => stage.order === currentStage.order - 1);
};

export const getStageProgress = (stageHistory: ExchangeStageProgress['stageHistory']): number => {
  const completedStages = stageHistory.filter(h => h.exitedAt).length;
  const totalStages = EXCHANGE_STAGES.filter(s => s.order < 99).length; // Exclude cancelled stage
  return Math.round((completedStages / totalStages) * 100);
};

export const getCurrentStage = (stageHistory: ExchangeStageProgress['stageHistory']): ExchangeStage | undefined => {
  const currentHistory = stageHistory.find(h => !h.exitedAt);
  if (!currentHistory) return undefined;
  
  return EXCHANGE_STAGES.find(stage => stage.id === currentHistory.stageId);
};

export const canTransitionToStage = (
  currentStageId: string, 
  targetStageId: string,
  exchangeData?: any
): boolean => {
  const currentStage = EXCHANGE_STAGES.find(stage => stage.id === currentStageId);
  const targetStage = EXCHANGE_STAGES.find(stage => stage.id === targetStageId);
  
  if (!currentStage || !targetStage) return false;
  
  // Allow moving to cancelled at any time
  if (targetStageId === 'EXCHANGE_CANCELLED') return true;
  
  // Check if target stage is the next logical step
  return targetStage.order === currentStage.order + 1;
};