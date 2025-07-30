import { User, Contact, Exchange, Task, Document, Message, AuditLog, SyncLog } from './supabase';

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@peak1031.com',
    role: 'admin',
    first_name: 'John',
    last_name: 'Admin',
    phone: '+1-555-0101',
    is_active: true,
    two_fa_enabled: true,
    last_login: '2024-01-28T10:30:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-28T10:30:00Z'
  },
  {
    id: '2',
    email: 'coordinator@peak1031.com',
    role: 'coordinator',
    first_name: 'Sarah',
    last_name: 'Johnson',
    phone: '+1-555-0102',
    is_active: true,
    two_fa_enabled: false,
    last_login: '2024-01-28T09:15:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-28T09:15:00Z'
  },
  {
    id: '3',
    email: 'client1@example.com',
    role: 'client',
    first_name: 'Michael',
    last_name: 'Smith',
    phone: '+1-555-0103',
    is_active: true,
    two_fa_enabled: false,
    last_login: '2024-01-27T14:20:00Z',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-27T14:20:00Z'
  },
  {
    id: '4',
    email: 'thirdparty@example.com',
    role: 'third_party',
    first_name: 'Lisa',
    last_name: 'Chen',
    phone: '+1-555-0104',
    is_active: true,
    two_fa_enabled: false,
    last_login: '2024-01-28T08:45:00Z',
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-28T08:45:00Z'
  },
  {
    id: '5',
    email: 'agency@example.com',
    role: 'agency',
    first_name: 'Robert',
    last_name: 'Davis',
    phone: '+1-555-0105',
    is_active: true,
    two_fa_enabled: true,
    last_login: '2024-01-28T11:00:00Z',
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-28T11:00:00Z'
  }
];

// Mock Contacts
export const mockContacts: Contact[] = [
  {
    id: 'c1',
    pp_contact_id: 'PP001',
    first_name: 'James',
    last_name: 'Wilson',
    full_name: 'James Wilson',
    email: 'james.wilson@email.com',
    phone: '+1-555-1001',
    company: 'Wilson Properties LLC',
    address: '123 Main St, New York, NY 10001',
    contact_type: 'Client',
    pp_data: { type: 'client', status: 'active' },
    last_sync_at: '2024-01-28T06:00:00Z',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-28T06:00:00Z'
  },
  {
    id: 'c2',
    pp_contact_id: 'PP002',
    first_name: 'Emily',
    last_name: 'Brown',
    full_name: 'Emily Brown',
    email: 'emily.brown@email.com',
    phone: '+1-555-1002',
    company: 'Brown Investment Group',
    address: '456 Oak Ave, Los Angeles, CA 90210',
    contact_type: 'Broker',
    pp_data: { type: 'intermediary', status: 'active' },
    last_sync_at: '2024-01-28T06:00:00Z',
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-28T06:00:00Z'
  },
  {
    id: 'c3',
    pp_contact_id: 'PP003',
    first_name: 'David',
    last_name: 'Martinez',
    full_name: 'David Martinez',
    email: 'david.martinez@email.com',
    phone: '+1-555-1003',
    company: 'Martinez Real Estate',
    address: '789 Pine St, Chicago, IL 60601',
    contact_type: 'Attorney',
    pp_data: { type: 'qualified_intermediary', status: 'active' },
    last_sync_at: '2024-01-28T06:00:00Z',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-28T06:00:00Z'
  }
];

// Mock Exchanges
export const mockExchanges: Exchange[] = [
  {
    id: 'e1',
    pp_matter_id: 'MAT001',
    name: '1031 Exchange - Wilson Commercial Property',
    exchange_name: '1031 Exchange - Wilson Commercial Property',
    status: 'In Progress',
    client_id: 'c1',
    coordinator_id: '2',
    start_date: '2024-01-15T00:00:00Z',
    exchange_value: 2500000,
    notes: 'Commercial property exchange with strict timeline requirements',
    pp_data: { matter_type: '1031_exchange', jurisdiction: 'NY' },
    last_sync_at: '2024-01-28T06:00:00Z',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-28T06:00:00Z'
  },
  {
    id: 'e2',
    pp_matter_id: 'MAT002',
    name: '1031 Exchange - Brown Investment Portfolio',
    exchange_name: '1031 Exchange - Brown Investment Portfolio',
    status: 'Draft',
    client_id: 'c2',
    coordinator_id: '2',
    start_date: '2024-01-20T00:00:00Z',
    exchange_value: 3200000,
    notes: 'Multi-property portfolio exchange requiring coordination',
    pp_data: { matter_type: '1031_exchange', jurisdiction: 'CA' },
    last_sync_at: '2024-01-28T06:00:00Z',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-28T06:00:00Z'
  },
  {
    id: 'e3',
    pp_matter_id: 'MAT003',
    name: '1031 Exchange - Martinez Retail Complex',
    exchange_name: '1031 Exchange - Martinez Retail Complex',
    status: 'In Progress',
    client_id: 'c3',
    coordinator_id: '2',
    start_date: '2024-01-10T00:00:00Z',
    exchange_value: 1800000,
    notes: 'Retail complex with tenant complications',
    pp_data: { matter_type: '1031_exchange', jurisdiction: 'IL' },
    last_sync_at: '2024-01-28T06:00:00Z',
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-28T06:00:00Z'
  },
  {
    id: 'e4',
    pp_matter_id: 'MAT004',
    name: '1031 Exchange - Downtown Office Building',
    exchange_name: '1031 Exchange - Downtown Office Building',
    status: 'Completed',
    client_id: 'c1',
    coordinator_id: '2',
    start_date: '2023-12-01T00:00:00Z',
    exchange_value: 4500000,
    notes: 'Successfully completed large commercial exchange',
    pp_data: { matter_type: '1031_exchange', jurisdiction: 'NY' },
    last_sync_at: '2024-01-28T06:00:00Z',
    created_at: '2023-12-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 'e5',
    pp_matter_id: 'MAT005',
    name: '1031 Exchange - Warehouse Distribution Center',
    exchange_name: '1031 Exchange - Warehouse Distribution Center',
    status: 'Draft',
    client_id: 'c2',
    coordinator_id: '2',
    start_date: '2024-01-25T00:00:00Z',
    exchange_value: 2100000,
    notes: 'Industrial property exchange in planning phase',
    pp_data: { matter_type: '1031_exchange', jurisdiction: 'CA' },
    last_sync_at: '2024-01-28T06:00:00Z',
    created_at: '2024-01-25T00:00:00Z',
    updated_at: '2024-01-28T06:00:00Z'
  }
];

// Mock Tasks
export const mockTasks: Task[] = [
  {
    id: 't1',
    pp_task_id: 'TSK001',
    title: 'Review Purchase Agreement',
    description: 'Review and analyze the purchase agreement for Wilson Commercial Property',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    exchange_id: 'e1',
    assigned_to: '2',
    due_date: '2024-01-30T17:00:00Z',
    pp_data: { task_type: 'document_review' },
    last_sync_at: '2024-01-28T06:00:00Z',
    created_at: '2024-01-28T09:00:00Z',
    updated_at: '2024-01-28T09:00:00Z'
  },
  {
    id: 't2',
    pp_task_id: 'TSK002',
    title: 'Property Identification Deadline Reminder',
    description: 'Send reminder to client about upcoming 45-day identification deadline',
    status: 'PENDING',
    priority: 'URGENT',
    exchange_id: 'e1',
    assigned_to: '2',
    due_date: '2024-01-29T12:00:00Z',
    pp_data: { task_type: 'client_communication' },
    last_sync_at: '2024-01-28T06:00:00Z',
    created_at: '2024-01-28T08:00:00Z',
    updated_at: '2024-01-28T08:00:00Z'
  },
  {
    id: 't3',
    pp_task_id: 'TSK003',
    title: 'Schedule Property Inspection',
    description: 'Coordinate property inspection for Brown Investment Portfolio replacement properties',
    status: 'PENDING',
    priority: 'MEDIUM',
    exchange_id: 'e2',
    assigned_to: '2',
    due_date: '2024-02-01T10:00:00Z',
    pp_data: { task_type: 'scheduling' },
    last_sync_at: '2024-01-28T06:00:00Z',
    created_at: '2024-01-27T14:00:00Z',
    updated_at: '2024-01-27T14:00:00Z'
  },
  {
    id: 't4',
    pp_task_id: 'TSK004',
    title: 'Prepare Closing Documents',
    description: 'Prepare all necessary closing documents for Martinez Retail Complex',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    exchange_id: 'e3',
    assigned_to: '2',
    due_date: '2024-02-05T17:00:00Z',
    pp_data: { task_type: 'document_preparation' },
    last_sync_at: '2024-01-28T06:00:00Z',
    created_at: '2024-01-26T11:00:00Z',
    updated_at: '2024-01-28T10:30:00Z'
  },
  {
    id: 't5',
    pp_task_id: 'TSK005',
    title: 'QI Coordination Meeting',
    description: 'Schedule and conduct coordination meeting with Qualified Intermediary',
    status: 'COMPLETED',
    priority: 'MEDIUM',
    exchange_id: 'e4',
    assigned_to: '2',
    due_date: '2024-01-24T15:00:00Z',
    completed_at: '2024-01-24T14:30:00Z',
    pp_data: { task_type: 'meeting' },
    last_sync_at: '2024-01-28T06:00:00Z',
    created_at: '2024-01-22T09:00:00Z',
    updated_at: '2024-01-24T14:30:00Z'
  }
];

// Mock Documents
export const mockDocuments: Document[] = [
  {
    id: 'd1',
    filename: 'purchase_agreement_wilson_001.pdf',
    original_filename: 'Purchase Agreement - Wilson Commercial.pdf',
    file_path: '/documents/e1/purchase_agreement_wilson_001.pdf',
    file_size: 2048576,
    mime_type: 'application/pdf',
    exchange_id: 'e1',
    uploaded_by: '2',
    category: 'legal',
    tags: ['purchase_agreement', 'legal', 'contract'],
    pin_required: true,
    is_template: false,
    created_at: '2024-01-28T09:30:00Z',
    updated_at: '2024-01-28T09:30:00Z'
  },
  {
    id: 'd2',
    filename: 'property_deed_martinez_001.pdf',
    original_filename: 'Property Deed - Martinez Retail.pdf',
    file_path: '/documents/e3/property_deed_martinez_001.pdf',
    file_size: 1536000,
    mime_type: 'application/pdf',
    exchange_id: 'e3',
    uploaded_by: '2',
    category: 'legal',
    tags: ['deed', 'property', 'title'],
    pin_required: true,
    is_template: false,
    created_at: '2024-01-27T11:15:00Z',
    updated_at: '2024-01-27T11:15:00Z'
  },
  {
    id: 'd3',
    filename: 'identification_form_brown_001.pdf',
    original_filename: 'Property Identification Form.pdf',
    file_path: '/documents/e2/identification_form_brown_001.pdf',
    file_size: 512000,
    mime_type: 'application/pdf',
    exchange_id: 'e2',
    uploaded_by: '2',
    category: 'forms',
    tags: ['identification', 'form', '45_day'],
    pin_required: false,
    is_template: true,
    template_data: { form_type: 'identification', version: '2024.1' },
    created_at: '2024-01-26T16:20:00Z',
    updated_at: '2024-01-26T16:20:00Z'
  },
  {
    id: 'd4',
    filename: 'closing_statement_completed_001.pdf',
    original_filename: 'Final Closing Statement.pdf',
    file_path: '/documents/e4/closing_statement_completed_001.pdf',
    file_size: 768000,
    mime_type: 'application/pdf',
    exchange_id: 'e4',
    uploaded_by: '2',
    category: 'financial',
    tags: ['closing', 'financial', 'completed'],
    pin_required: true,
    is_template: false,
    created_at: '2024-01-25T17:45:00Z',
    updated_at: '2024-01-25T17:45:00Z'
  }
];

// Mock Messages
export const mockMessages: Message[] = [
  {
    id: 'm1',
    content: 'Hi team, I\'ve uploaded the purchase agreement for review. Please let me know if you have any questions.',
    exchange_id: 'e1',
    sender_id: '2',
    message_type: 'text',
    read_by: ['2', '3'],
    created_at: '2024-01-28T09:35:00Z'
  },
  {
    id: 'm2',
    content: 'Thanks Sarah! I\'ll review this today and get back to you with any questions.',
    exchange_id: 'e1',
    sender_id: '3',
    message_type: 'text',
    read_by: ['2', '3'],
    created_at: '2024-01-28T10:15:00Z'
  },
  {
    id: 'm3',
    content: 'Reminder: Property identification deadline is coming up on March 1st. We need to finalize the replacement property list.',
    exchange_id: 'e1',
    sender_id: '2',
    message_type: 'text',
    read_by: ['2'],
    created_at: '2024-01-28T11:00:00Z'
  },
  {
    id: 'm4',
    content: 'Property deed has been uploaded and is ready for final review.',
    exchange_id: 'e3',
    sender_id: '2',
    message_type: 'text',
    read_by: ['2'],
    created_at: '2024-01-27T11:20:00Z'
  },
  {
    id: 'm5',
    content: 'Congratulations! The Downtown Office Building exchange has been successfully completed.',
    exchange_id: 'e4',
    sender_id: '2',
    message_type: 'system',
    read_by: ['2', '3'],
    created_at: '2024-01-25T18:00:00Z'
  }
];

// Mock Audit Logs
export const mockAuditLogs: AuditLog[] = [
  {
    id: 'a1',
    action: 'LOGIN_SUCCESS',
    entity_type: 'user',
    entity_id: '1',
    user_id: '1',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    details: { login_method: 'email_password' },
    created_at: '2024-01-28T10:30:00Z'
  },
  {
    id: 'a2',
    action: 'DOCUMENT_UPLOAD',
    entity_type: 'document',
    entity_id: 'd1',
    user_id: '2',
    ip_address: '192.168.1.101',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    details: { filename: 'purchase_agreement_wilson_001.pdf', exchange_id: 'e1' },
    created_at: '2024-01-28T09:30:00Z'
  },
  {
    id: 'a3',
    action: 'EXCHANGE_STATUS_UPDATE',
    entity_type: 'exchange',
    entity_id: 'e4',
    user_id: '2',
    ip_address: '192.168.1.101',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    details: { old_status: '180D', new_status: 'COMPLETED' },
    created_at: '2024-01-25T17:50:00Z'
  },
  {
    id: 'a4',
    action: 'MESSAGE_SENT',
    entity_type: 'message',
    entity_id: 'm3',
    user_id: '2',
    ip_address: '192.168.1.101',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    details: { exchange_id: 'e1', message_type: 'text' },
    created_at: '2024-01-28T11:00:00Z'
  },
  {
    id: 'a5',
    action: 'TASK_STATUS_UPDATE',
    entity_type: 'task',
    entity_id: 't5',
    user_id: '2',
    ip_address: '192.168.1.101',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    details: { old_status: 'IN_PROGRESS', new_status: 'COMPLETED' },
    created_at: '2024-01-24T14:30:00Z'
  }
];

// Mock Sync Logs
export const mockSyncLogs: SyncLog[] = [
  {
    id: 's1',
    sync_type: 'full',
    status: 'success',
    started_at: '2024-01-28T06:00:00Z',
    completed_at: '2024-01-28T06:15:30Z',
    records_processed: 150,
    records_updated: 45,
    records_created: 12,
    details: { contacts: 50, matters: 25, tasks: 75 },
    triggered_by: '1'
  },
  {
    id: 's2',
    sync_type: 'contacts',
    status: 'success',
    started_at: '2024-01-27T18:00:00Z',
    completed_at: '2024-01-27T18:05:20Z',
    records_processed: 50,
    records_updated: 15,
    records_created: 3,
    details: { contacts: 50 },
    triggered_by: '2'
  },
  {
    id: 's3',
    sync_type: 'matters',
    status: 'error',
    started_at: '2024-01-27T12:00:00Z',
    completed_at: '2024-01-27T12:02:15Z',
    records_processed: 0,
    records_updated: 0,
    records_created: 0,
    error_message: 'PracticePanther API rate limit exceeded',
    details: { error: 'Rate limit exceeded', retry_after: 3600 },
    triggered_by: '1'
  },
  {
    id: 's4',
    sync_type: 'tasks',
    status: 'success',
    started_at: '2024-01-26T14:30:00Z',
    completed_at: '2024-01-26T14:40:45Z',
    records_processed: 75,
    records_updated: 25,
    records_created: 8,
    details: { tasks: 75 },
    triggered_by: '2'
  },
  {
    id: 's5',
    sync_type: 'full',
    status: 'partial',
    started_at: '2024-01-25T06:00:00Z',
    completed_at: '2024-01-25T06:18:22Z',
    records_processed: 140,
    records_updated: 38,
    records_created: 10,
    error_message: 'Some records failed validation',
    details: { contacts: 48, matters: 22, tasks: 70, errors: 10 },
    triggered_by: '1'
  }
];

// Helper function to get current user (mock)
export const getCurrentUser = (): User => {
  // This would normally come from authentication context
  return mockUsers[0]; // Return admin user for demo
};

// Helper function to get user's exchanges
export const getUserExchanges = (userId: string, userRole: string): Exchange[] => {
  if (userRole === 'admin' || userRole === 'coordinator') {
    return mockExchanges;
  }
  if (userRole === 'client') {
    return mockExchanges.filter(e => e.client_id && mockContacts.find(c => c.id === e.client_id));
  }
  if (userRole === 'third_party' || userRole === 'agency') {
    return mockExchanges.slice(0, 3); // Limited access
  }
  return [];
};

// Helper function to get exchange statistics
export const getExchangeStats = () => {
  const total = mockExchanges.length;
  const pending = mockExchanges.filter(e => e.status === 'Draft').length;
  const active = mockExchanges.filter(e => e.status === 'In Progress').length;
  const completed = mockExchanges.filter(e => e.status === 'Completed').length;
  const totalValue = mockExchanges.reduce((sum, e) => sum + (e.exchange_value || 0), 0);
  
  return {
    total,
    pending,
    active,
    completed,
    totalValue
  };
};

// Helper function to get task statistics
export const getTaskStats = () => {
  const total = mockTasks.length;
  const pending = mockTasks.filter(t => t.status === 'PENDING').length;
  const inProgress = mockTasks.filter(t => t.status === 'IN_PROGRESS').length;
  const completed = mockTasks.filter(t => t.status === 'COMPLETED').length;
  const overdue = mockTasks.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && t.status !== 'COMPLETED'
  ).length;
  
  return {
    total,
    pending,
    inProgress,
    completed,
    overdue
  };
};