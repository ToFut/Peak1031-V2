// Fallback data when backend is unavailable
export const fallbackData = {
  contacts: [
    {
      id: 'fb-1',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com',
      phone: '(555) 123-4567',
      company: 'Smith Properties LLC',
      contactType: 'client',
      role: 'Exchanger',
      practicePartnerContactId: 'pp-12345',
      createdAt: new Date().toISOString(),
      _isFallback: true
    },
    {
      id: 'fb-2',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@lawfirm.com',
      phone: '(555) 234-5678',
      company: 'Johnson & Associates',
      contactType: 'attorney',
      role: 'Attorney',
      practicePartnerContactId: 'pp-12346',
      createdAt: new Date().toISOString(),
      _isFallback: true
    },
    {
      id: 'fb-3',
      firstName: 'Michael',
      lastName: 'Davis',
      email: 'michael.davis@realty.com',
      phone: '(555) 345-6789',
      company: 'Davis Realty Group',
      contactType: 'intermediary',
      role: 'QI',
      practicePartnerContactId: 'pp-12347',
      createdAt: new Date().toISOString(),
      _isFallback: true
    }
  ],
  
  exchanges: [
    {
      id: 'fb-ex-1',
      exchangeNumber: '2024-001',
      name: 'Smith 1031 Exchange',
      status: '45D',
      exchangeType: 'LIKE_KIND',
      exchangeValue: 750000,
      client: {
        id: 'fb-1',
        firstName: 'John',
        lastName: 'Smith'
      },
      identificationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      closingDeadline: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 25,
      assignedCoordinator: 'coordinator@peak1031.com',
      assignedAttorney: 'attorney@peak1031.com',
      createdAt: new Date().toISOString(),
      _isFallback: true
    },
    {
      id: 'fb-ex-2',
      exchangeNumber: '2024-002',
      name: 'Johnson Commercial Exchange',
      status: '180D',
      exchangeType: 'REVERSE',
      exchangeValue: 1250000,
      client: {
        id: 'fb-2',
        firstName: 'Sarah',
        lastName: 'Johnson'
      },
      identificationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      closingDeadline: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 60,
      assignedCoordinator: 'coordinator@peak1031.com',
      assignedAttorney: 'attorney@peak1031.com',
      createdAt: new Date().toISOString(),
      _isFallback: true
    }
  ],
  
  tasks: [
    {
      id: 'fb-task-1',
      title: 'Review Purchase Agreement',
      description: 'Review and approve purchase agreement for Smith exchange',
      status: 'pending',
      priority: 'high',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      assignedTo: 'coordinator@peak1031.com',
      exchange: {
        id: 'fb-ex-1',
        name: 'Smith 1031 Exchange'
      },
      createdAt: new Date().toISOString(),
      _isFallback: true
    },
    {
      id: 'fb-task-2',
      title: 'Prepare Closing Documents',
      description: 'Prepare closing documents for Johnson exchange',
      status: 'in_progress',
      priority: 'medium',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      assignedTo: 'attorney@peak1031.com',
      exchange: {
        id: 'fb-ex-2',
        name: 'Johnson Commercial Exchange'
      },
      createdAt: new Date().toISOString(),
      _isFallback: true
    }
  ],
  
  documents: [
    {
      id: 'fb-doc-1',
      fileName: 'Exchange_Agreement_Smith.pdf',
      fileSize: 2456789,
      category: 'contract',
      exchange: {
        id: 'fb-ex-1',
        name: 'Smith 1031 Exchange'
      },
      createdAt: new Date().toISOString(),
      _isFallback: true
    },
    {
      id: 'fb-doc-2',
      fileName: 'Property_Deed_Johnson.pdf',
      fileSize: 1234567,
      category: 'deed',
      exchange: {
        id: 'fb-ex-2',
        name: 'Johnson Commercial Exchange'
      },
      createdAt: new Date().toISOString(),
      _isFallback: true
    }
  ]
};