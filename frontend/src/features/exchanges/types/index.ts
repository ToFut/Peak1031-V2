export interface Exchange {
  id: string;
  name: string;
  address: string;
  status?: string;
  client_id: string;
  created_at: string;
  updated_at: string;
}

export interface ExchangeParticipant {
  id: string;
  exchange_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface EnterpriseExchange extends Exchange {
  participants: ExchangeParticipant[];
  documents: Document[];
  tasks: Task[];
  lifecycle_stage?: string;
  stage?: string;
  status?: string;
  value?: number;
  deadline?: string;
  identificationDeadline?: string;
  exchangeDeadline?: string;
  compliance_status?: string;
  risk_level?: string;
  progress?: number;
  exchangeType?: string;
  startDate?: string;
  exchangeValue?: number;
  total_replacement_value?: number;
}

export interface Document {
  id: string;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  exchange_id: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string;
  exchange_id?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
} 