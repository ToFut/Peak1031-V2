import { Exchange } from './exchange';

export interface ExchangeParticipant {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: 'active' | 'pending' | 'inactive';
  permissions: {
    canView: boolean;
    canMessage: boolean;
    canUpload: boolean;
    canViewDocuments: boolean;
    canManage: boolean;
  };
  lastActive?: string;
  exchangeId: string;
}

export interface EnterpriseExchange extends Exchange {
  lifecycle_stage?: string;
  stage_progress?: number;
  compliance_status?: string;
  risk_level?: string;
  total_replacement_value?: number;
  financial_transactions?: any[];
  compliance_checks?: any[];
  exchange_milestones?: any[];
  exchange_analytics?: any[];
  days_in_current_stage?: number;
  on_track?: boolean;
}

export interface ExchangeDetailsPageProps {}