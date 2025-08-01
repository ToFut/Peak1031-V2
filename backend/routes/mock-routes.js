const express = require('express');
const router = express.Router();

// Mock data
const mockExchanges = [
  {
    id: '1',
    exchange_name: 'Smith Commercial Exchange',
    status: 'In Progress',
    exchange_type: 'Delayed',
    relinquished_property_address: '123 Main St, Anytown, ST 12345',
    relinquished_sale_price: 2500000,
    identification_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    exchange_deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    exchange_coordinator: 'Sarah Johnson',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    exchange_name: 'Johnson Residential Exchange',
    status: 'Completed',
    exchange_type: 'Reverse',
    relinquished_property_address: '456 Oak Ave, Somewhere, ST 67890',
    relinquished_sale_price: 850000,
    identification_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    exchange_deadline: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    exchange_coordinator: 'Mike Wilson',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

const mockContacts = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Smith',
    full_name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+1-555-0123',
    company: 'Smith Holdings LLC',
    contact_type: 'Client',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    first_name: 'Jane',
    last_name: 'Johnson',
    full_name: 'Jane Johnson',
    email: 'jane.johnson@example.com',
    phone: '+1-555-0456',
    company: 'Johnson Realty',
    contact_type: 'Broker',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const mockTasks = [
  {
    id: '1',
    title: 'Complete Property Appraisal',
    description: 'Get professional appraisal for relinquished property',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    exchange_id: '1',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Review Purchase Agreement',
    description: 'Legal review of replacement property purchase agreement',
    status: 'PENDING',
    priority: 'MEDIUM',
    exchange_id: '1',
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Routes
router.get('/exchanges', (req, res) => {
  console.log('📊 Mock: Serving exchanges data');
  res.json(mockExchanges);
});

router.get('/exchanges/:id', (req, res) => {
  const exchange = mockExchanges.find(e => e.id === req.params.id);
  if (!exchange) {
    return res.status(404).json({ error: 'Exchange not found' });
  }
  console.log('📊 Mock: Serving exchange:', req.params.id);
  res.json(exchange);
});

router.get('/contacts', (req, res) => {
  console.log('📊 Mock: Serving contacts data');
  res.json(mockContacts);
});

router.get('/contacts/:id', (req, res) => {
  const contact = mockContacts.find(c => c.id === req.params.id);
  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }
  console.log('📊 Mock: Serving contact:', req.params.id);
  res.json(contact);
});

router.get('/tasks', (req, res) => {
  console.log('📊 Mock: Serving tasks data');
  res.json(mockTasks);
});

router.get('/exchanges/:id/tasks', (req, res) => {
  const exchangeTasks = mockTasks.filter(t => t.exchange_id === req.params.id);
  console.log('📊 Mock: Serving tasks for exchange:', req.params.id);
  res.json(exchangeTasks);
});

router.get('/exchanges/:id/messages', (req, res) => {
  const mockMessages = [
    {
      id: '1',
      content: 'Welcome to the secure chat for this exchange. All authorized participants can communicate here.',
      exchange_id: req.params.id,
      sender_id: 'system',
      message_type: 'system',
      read_by: [],
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      sender: {
        id: 'system',
        email: 'system@peak1031.com',
        first_name: 'System',
        last_name: '',
        role: 'admin'
      }
    }
  ];
  console.log('📊 Mock: Serving messages for exchange:', req.params.id);
  res.json(mockMessages);
});

router.get('/admin/dashboard-stats', (req, res) => {
  const stats = {
    totalExchanges: mockExchanges.length,
    activeExchanges: mockExchanges.filter(e => e.status === 'In Progress').length,
    totalTasks: mockTasks.length,
    overdueTasks: mockTasks.filter(t => new Date(t.due_date) < new Date()).length,
    pendingExchanges: mockExchanges.filter(e => e.status === 'Pending').length,
    completedExchanges: mockExchanges.filter(e => e.status === 'Completed').length
  };
  console.log('📊 Mock: Serving dashboard stats');
  res.json(stats);
});

router.get('/documents', (req, res) => {
  console.log('📊 Mock: Serving documents data');
  res.json([]);
});

router.get('/admin/audit-logs', (req, res) => {
  console.log('📊 Mock: Serving audit logs');
  res.json([]);
});

router.get('/sync/logs', (req, res) => {
  console.log('📊 Mock: Serving sync logs');
  res.json([]);
});

module.exports = router;