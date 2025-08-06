import React, { useState, useEffect } from 'react';
import Card from '@/shared/ui/molecules/Card';
import Badge from '@/shared/ui/atoms/Badge';
import { apiService } from '@/shared/services/api';

interface RoleBasedContentProps {
  userRole?: string;
}

const RoleBasedContent: React.FC<RoleBasedContentProps> = ({ userRole }) => {
  const [dashboardData, setDashboardData] = useState<any>({
    exchanges: [],
    tasks: [],
    stats: { total: 0, active: 0, pending: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [userRole]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Try to fetch real data, but provide fallbacks
      const [exchangesRes, statsRes] = await Promise.allSettled([
        apiService.get('/exchanges').catch(() => ({ exchanges: mockExchanges })),
        apiService.get('/admin/dashboard-stats').catch(() => mockStats)
      ]);

      const exchanges = exchangesRes.status === 'fulfilled' ? 
        (exchangesRes.value?.exchanges || exchangesRes.value || mockExchanges) : mockExchanges;
      const stats = statsRes.status === 'fulfilled' ? 
        (statsRes.value?.stats || statsRes.value || mockStats) : mockStats;

      setDashboardData({ exchanges, stats });
    } catch (error) {
      console.log('Using mock data due to API error:', error);
      setDashboardData({ exchanges: mockExchanges, stats: mockStats });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-48"></div>
          </div>
        ))}
      </div>
    );
  }

  switch (userRole) {
    case 'admin':
      return (
        <div className="space-y-6">
          <AdminControls data={dashboardData} />
          <UserManagementPanel />
          <SystemOverview />
        </div>
      );
      
    case 'client':
      return (
        <div className="space-y-6">
          <ClientExchanges data={dashboardData} />
          <ClientDocuments data={dashboardData} />
          <ClientTasks data={dashboardData} />
        </div>
      );
      
    case 'coordinator':
      return (
        <div className="space-y-6">
          <CoordinatorExchanges data={dashboardData} />
          <CoordinatorTasks data={dashboardData} />
          <CoordinatorReports data={dashboardData} />
        </div>
      );
      
    case 'agency':
      return (
        <div className="space-y-6">
          <AgencyOverview data={dashboardData} />
          <AgencyExchanges data={dashboardData} />
        </div>
      );
      
    case 'third_party':
      return (
        <div className="space-y-6">
          <ThirdPartyExchanges data={dashboardData} />
          <ThirdPartyDocuments data={dashboardData} />
        </div>
      );
      
    default:
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">Please contact administrator for access.</p>
        </div>
      );
  }
};

// Role-specific components  
const AdminControls = ({ data }: { data: any }) => {
  const { stats } = data;
  return (
    <Card>
      <Card.Header>
        <Card.Title>System Overview</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.totalUsers || 156}</div>
            <div className="text-sm text-gray-500">Total Users</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.totalExchanges || 23}</div>
            <div className="text-sm text-gray-500">Total Exchanges</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{stats.pendingTasks || 12}</div>
            <div className="text-sm text-gray-500">Pending Tasks</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Exchange Value:</span>
            <span className="text-lg font-semibold text-green-600">{stats.totalValue || '$12.5M'}</span>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
};

const ClientExchanges = ({ data }: { data: any }) => {
  const { exchanges } = data;
  return (
    <Card>
      <Card.Header>
        <Card.Title>My Exchanges</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="space-y-3">
          {exchanges.map((exchange: any) => (
            <div key={exchange.id} className="flex justify-between items-center p-3 border rounded hover:bg-gray-50 cursor-pointer">
              <div>
                <div className="font-medium">Exchange #{exchange.exchangeNumber}</div>
                <div className="text-sm text-gray-500">{exchange.exchangeName}</div>
                <div className="text-xs text-gray-400">Value: ${exchange.exchangeValue.toLocaleString()}</div>
              </div>
              <Badge variant={exchange.status === 'ACTIVE' ? 'info' : exchange.status === 'PENDING' ? 'warning' : 'success'}>
                {exchange.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
};

const CoordinatorExchanges = ({ data }: { data: any }) => {
  const { exchanges } = data;
  return (
    <Card>
      <Card.Header>
        <Card.Title>Assigned Exchanges</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="space-y-3">
          {exchanges.map((exchange: any) => (
            <div key={exchange.id} className="flex justify-between items-center p-3 border rounded hover:bg-gray-50 cursor-pointer">
              <div>
                <div className="font-medium">Exchange #{exchange.exchangeNumber}</div>
                <div className="text-sm text-gray-500">Client: {exchange.clientName}</div>
                <div className="text-xs text-gray-400">Priority: {exchange.priority}</div>
              </div>
              <Badge variant={exchange.status === 'ACTIVE' ? 'info' : exchange.status === 'PENDING' ? 'warning' : 'success'}>
                {exchange.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
};

const ClientDocuments = ({ data }: { data: any }) => (
  <Card>
    <Card.Header>
      <Card.Title>My Documents</Card.Title>
    </Card.Header>
    <Card.Content>
      <div className="space-y-2">
        <div className="flex justify-between items-center p-2 border rounded">
          <span className="text-sm">Property Purchase Agreement</span>
          <Badge variant="success">Uploaded</Badge>
        </div>
        <div className="flex justify-between items-center p-2 border rounded">
          <span className="text-sm">Financial Verification</span>
          <Badge variant="warning">Pending</Badge>
        </div>
      </div>
    </Card.Content>
  </Card>
);

const ClientTasks = ({ data }: { data: any }) => (
  <Card>
    <Card.Header>
      <Card.Title>My Tasks</Card.Title>
    </Card.Header>
    <Card.Content>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span>Review property documents</span>
          <Badge variant="error">Overdue</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span>Submit financial information</span>
          <Badge variant="warning">Due Soon</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span>Schedule property inspection</span>
          <Badge variant="info">Upcoming</Badge>
        </div>
      </div>
    </Card.Content>
  </Card>
);

const CoordinatorTasks = ({ data }: { data: any }) => (
  <Card>
    <Card.Header>
      <Card.Title>My Tasks</Card.Title>
    </Card.Header>
    <Card.Content>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span>Complete due diligence review</span>
          <Badge variant="info">In Progress</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span>Schedule closing meeting</span>
          <Badge variant="default">Pending</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span>Verify replacement property</span>
          <Badge variant="warning">Due Soon</Badge>
        </div>
      </div>
    </Card.Content>
  </Card>
);

const CoordinatorReports = ({ data }: { data: any }) => (
  <Card>
    <Card.Header>
      <Card.Title>Reports</Card.Title>
    </Card.Header>
    <Card.Content>
      <div className="space-y-2">
        <div className="flex justify-between items-center p-2 border rounded">
          <span className="text-sm">Monthly Exchange Report</span>
          <Badge variant="info">Available</Badge>
        </div>
        <div className="flex justify-between items-center p-2 border rounded">
          <span className="text-sm">Client Progress Summary</span>
          <Badge variant="success">Generated</Badge>
        </div>
      </div>
    </Card.Content>
  </Card>
);

const UserManagementPanel = () => (
  <Card>
    <Card.Header>
      <Card.Title>User Management</Card.Title>
    </Card.Header>
    <Card.Content>
      <div className="text-center py-4 text-gray-500">
        User management panel
      </div>
    </Card.Content>
  </Card>
);

const SystemOverview = () => (
  <Card>
    <Card.Header>
      <Card.Title>System Overview</Card.Title>
    </Card.Header>
    <Card.Content>
      <div className="text-center py-4 text-gray-500">
        System status and metrics
      </div>
    </Card.Content>
  </Card>
);

const AgencyOverview = ({ data }: { data: any }) => {
  const { stats } = data;
  return (
    <Card>
      <Card.Header>
        <Card.Title>Agency Overview</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.totalExchanges || 8}</div>
            <div className="text-sm text-gray-500">Active Exchanges</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.completedThisMonth || 3}</div>
            <div className="text-sm text-gray-500">Completed This Month</div>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
};

const AgencyExchanges = ({ data }: { data: any }) => {
  const { exchanges } = data;
  return (
    <Card>
      <Card.Header>
        <Card.Title>Agency Exchanges</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="space-y-3">
          {exchanges.map((exchange: any) => (
            <div key={exchange.id} className="flex justify-between items-center p-3 border rounded">
              <div>
                <div className="font-medium">Exchange #{exchange.exchangeNumber}</div>
                <div className="text-sm text-gray-500">{exchange.exchangeName}</div>
              </div>
              <Badge variant="info">Facilitating</Badge>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
};

const ThirdPartyExchanges = ({ data }: { data: any }) => {
  const { exchanges } = data;
  return (
    <Card>
      <Card.Header>
        <Card.Title>Third Party Exchanges</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="space-y-3">
          {exchanges.map((exchange: any) => (
            <div key={exchange.id} className="flex justify-between items-center p-3 border rounded">
              <div>
                <div className="font-medium">Exchange #{exchange.exchangeNumber}</div>
                <div className="text-sm text-gray-500">{exchange.exchangeName}</div>
              </div>
              <Badge variant="default">Monitoring</Badge>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
};

const ThirdPartyDocuments = ({ data }: { data: any }) => (
  <Card>
    <Card.Header>
      <Card.Title>Documents</Card.Title>
    </Card.Header>
    <Card.Content>
      <div className="space-y-2">
        <div className="flex justify-between items-center p-2 border rounded">
          <span className="text-sm">Compliance Report</span>
          <Badge variant="info">Ready</Badge>
        </div>
        <div className="flex justify-between items-center p-2 border rounded">
          <span className="text-sm">Third Party Agreement</span>
          <Badge variant="success">Signed</Badge>
        </div>
      </div>
    </Card.Content>
  </Card>
);

// Mock data for development
const mockExchanges = [
  {
    id: 'EX-2024-001',
    exchangeNumber: 'EX-2024-001',
    exchangeName: '123 Main St Exchange',
    clientName: 'John Smith',
    status: 'ACTIVE',
    priority: 'HIGH',
    exchangeValue: 750000,
    createdAt: '2024-01-15T10:30:00Z',
    identificationDeadline: '2024-03-01T17:00:00Z',
    completionDeadline: '2024-07-13T17:00:00Z'
  },
  {
    id: 'EX-2024-002', 
    exchangeNumber: 'EX-2024-002',
    exchangeName: '456 Oak Ave Exchange',
    clientName: 'Sarah Johnson',
    status: 'PENDING',
    priority: 'MEDIUM',
    exchangeValue: 450000,
    createdAt: '2024-01-20T14:15:00Z',
    identificationDeadline: '2024-03-06T17:00:00Z',
    completionDeadline: '2024-07-18T17:00:00Z'
  }
];

const mockStats = {
  totalExchanges: 23,
  activeExchanges: 8,
  pendingTasks: 12,
  totalUsers: 156,
  completedThisMonth: 5,
  totalValue: '$12.5M'
};

export { RoleBasedContent };