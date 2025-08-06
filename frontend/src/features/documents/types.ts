export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  exchange_id?: string;
  uploaded_by: string;
  created_at: string;
  updated_at?: string;
  category?: string;
  status?: 'pending' | 'approved' | 'rejected';
  tags?: string[];
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  variables: TemplateVariable[];
  content: string;
  file_url?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_active: boolean;
}

export interface TemplateVariable {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  default_value?: any;
  options?: string[];
}