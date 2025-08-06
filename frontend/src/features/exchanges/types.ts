export interface Exchange {
  id: string;
  exchange_id: string;
  client_id: string;
  client_name?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  relinquished_property: string;
  relinquished_property_value: number;
  relinquished_property_closing_date: string;
  relinquished_property_debt?: number;
  replacement_property?: string;
  replacement_property_value?: number;
  replacement_property_identification_deadline?: string;
  replacement_property_closing_deadline?: string;
  replacement_property_debt?: number;
  qualified_intermediary?: string;
  third_party_ids?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  progress?: number;
  documents?: any[];
  participants?: any[];
}

export interface ExchangeParticipant {
  id: string;
  exchange_id: string;
  user_id: string;
  role: 'client' | 'agent' | 'attorney' | 'intermediary' | 'other';
  name: string;
  email: string;
  phone?: string;
  company?: string;
  added_at: string;
  added_by: string;
  permissions?: string[];
}