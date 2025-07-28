put this in README.md and create the full arectuhirer as follow - # Peak 1031 V1 Platform - Complete Developer Documentation

## 🎯 Project Overview

A secure, modern web platform that syncs 1031 exchange data from PracticePanther and provides role-based dashboards, real-time messaging, document management, and task tracking.

**Timeline**: 5 weeks, 4 milestones  
**Tech Stack**: Node.js + Express + PostgreSQL + React + TypeScript + Tailwind CSS  
**Data Source**: PracticePanther API (one-way sync)

---

## 🏗️ **Project Architecture & Structure**

### **Philosophy: "Simple First, Scale Ready"**
- Use proven patterns, avoid custom abstractions
- Leverage existing tools and libraries
- Focus on composition over complexity
- Build reusable components for different user roles

### **Project Structure** (~35 files, ~3,000 lines)
```
peak-1031-v1/
├── 📋 README.md
├── 📋 .env.example
├── 🐳 docker-compose.yml
├── 📋 package.json
│
├── 🔧 backend/                       # 18 files total
│   ├── models/                       # 7 models (Sequelize ORM)
│   │   ├── User.js                   # Internal platform users + auth
│   │   ├── Contact.js                # PP contacts (clients/participants)  
│   │   ├── Exchange.js               # PP matters → exchanges + relationships
│   │   ├── Task.js                   # PP tasks + custom tasks
│   │   ├── Document.js               # File metadata + permissions + templates
│   │   ├── Message.js                # Real-time chat + file attachments
│   │   └── AuditLog.js               # Complete activity tracking
│   │
│   ├── routes/                       # 8 focused API routes
│   │   ├── auth.js                   # JWT + 2FA + Google OAuth
│   │   ├── contacts.js               # PP synced contacts (read-only)
│   │   ├── exchanges.js              # PP matters + manual management
│   │   ├── tasks.js                  # PP sync + custom task management
│   │   ├── documents.js              # Upload/download + PIN protection
│   │   ├── messages.js               # Real-time chat with Socket.IO
│   │   ├── sync.js                   # PP integration + manual triggers
│   │   └── admin.js                  # User mgmt + audit logs + exports
│   │
│   ├── services/                     # 5 core business logic services
│   │   ├── auth.js                   # JWT handling + role verification
│   │   ├── practicePanther.js        # Clean PP API wrapper + sync logic
│   │   ├── notifications.js          # SendGrid email + Twilio SMS
│   │   ├── documents.js              # File storage + template generation
│   │   └── audit.js                  # Consistent activity logging
│   │
│   ├── middleware/                   # 2 essential middleware
│   │   ├── auth.js                   # JWT token verification
│   │   └── rbac.js                   # Role-based access control
│   │
│   ├── config/                       # 3 configuration files
│   │   ├── database.js               # PostgreSQL connection + pooling
│   │   ├── integrations.js           # PP + SendGrid + Twilio config
│   │   └── security.js               # JWT secrets + rate limiting
│   │
│   ├── 📄 app.js                     # Express app setup + middleware
│   └── 📄 server.js                  # HTTP server + Socket.IO setup
│
├── 🖥️ frontend/                      # 15 files total
│   ├── src/
│   │   ├── components/               # 10 reusable UI components
│   │   │   ├── Layout.tsx            # Navigation + sidebar + role routing
│   │   │   ├── ContactCard.tsx       # Display PP contact data
│   │   │   ├── ExchangeCard.tsx      # Exchange status + actions
│   │   │   ├── TaskBoard.tsx         # Kanban-style task display
│   │   │   ├── DocumentManager.tsx   # Upload/download + PIN access
│   │   │   ├── ChatBox.tsx           # Real-time messaging + attachments
│   │   │   ├── UserManager.tsx       # Admin user controls
│   │   │   ├── SyncPanel.tsx         # PP sync controls + status
│   │   │   ├── AuditViewer.tsx       # Activity logs display
│   │   │   └── ExportTools.tsx       # Report generation + downloads
│   │   │
│   │   ├── pages/                    # 5 role-specific dashboards
│   │   │   ├── AdminDashboard.tsx    # Full system control + sync mgmt
│   │   │   ├── ClientDashboard.tsx   # Exchange-specific client view
│   │   │   ├── CoordinatorDashboard.tsx # Multi-exchange management
│   │   │   ├── ThirdPartyDashboard.tsx # Read-only participant view
│   │   │   └── AgencyDashboard.tsx   # Multi-client agency overview
│   │   │
│   │   ├── hooks/                    # 3 custom React hooks
│   │   │   ├── useAuth.ts            # Authentication state management
│   │   │   ├── useSocket.ts          # Real-time messaging connection
│   │   │   └── usePermissions.ts     # Role-based UI permissions
│   │   │
│   │   ├── 🔌 services/
│   │   │   └── api.ts                # Centralized API client + interceptors
│   │   │
│   │   ├── 📝 types/
│   │   │   └── index.ts              # TypeScript interfaces + enums
│   │   │
│   │   ├── 🎨 App.tsx                # Main app component + routing
│   │   └── 🎨 index.tsx              # React app entry point
│   │
│   ├── 📦 package.json               # Frontend dependencies
│   └── 🎨 tailwind.config.js         # Tailwind CSS configuration
│
├── 🗄️ database/                     # 8 files total
│   ├── migrations/                   # 8 database migrations
│   │   ├── 001-create-users.sql      # Internal platform users
│   │   ├── 002-create-contacts.sql   # PP synced contacts
│   │   ├── 003-create-exchanges.sql  # PP matters → exchanges
│   │   ├── 004-create-exchange-participants.sql # User/contact assignments
│   │   ├── 005-create-tasks.sql      # PP tasks + custom tasks
│   │   ├── 006-create-documents.sql  # File metadata + permissions
│   │   ├── 007-create-messages.sql   # Chat messages + attachments
│   │   └── 008-create-audit-logs.sql # Activity tracking + sync logs
│   │
│   ├── seeds/                        # 2 seed files
│   │   ├── admin-user.sql            # Default admin account
│   │   └── sample-data.sql           # Test data for development
│   │
│   └── 📄 schema.sql                 # Complete database schema
│
└── 🚀 deployment/                    # 4 deployment files
    ├── Dockerfile.backend            # Backend container
    ├── Dockerfile.frontend           # Frontend container  
    ├── docker-compose.prod.yml       # Production compose
    └── deploy.sh                     # Deployment automation script
```

### **Backend Architecture Patterns**

#### **1. Model Layer (Sequelize ORM)**
```javascript
// Clean data models with relationships
// models/Exchange.js
const Exchange = sequelize.define('Exchange', {
  ppMatterId: { type: DataTypes.STRING, unique: true },
  name: DataTypes.STRING,
  status: DataTypes.ENUM('PENDING', '45D', '180D', 'COMPLETED'),
  clientId: { type: DataTypes.UUID, references: { model: 'contacts' } }
});

// Automatic associations
Exchange.belongsTo(Contact, { as: 'client' });
Exchange.belongsToMany(Contact, { through: 'ExchangeParticipants' });
Exchange.belongsToMany(User, { through: 'ExchangeParticipants' });
Exchange.hasMany(Task);
Exchange.hasMany(Document);
Exchange.hasMany(Message);
```

#### **2. Service Layer (Business Logic)**
```javascript
// services/practicePanther.js - Clean PP integration
class PPService {
  async syncAll() {
    const [contacts, matters, tasks] = await Promise.all([
      this.fetchPPContacts(),
      this.fetchPPMatters(), 
      this.fetchPPTasks()
    ]);
    
    await this.syncContacts(contacts);
    await this.syncExchanges(matters, contacts);
    await this.syncTasks(tasks);
    
    await AuditService.log('PP_SYNC_COMPLETE', { 
      counts: { contacts: contacts.length, matters: matters.length, tasks: tasks.length }
    });
  }
}
```

#### **3. Route Layer (API Endpoints)**
```javascript
// routes/exchanges.js - RESTful with role-based filtering
router.get('/', authMiddleware, async (req, res) => {
  const exchanges = await ExchangeService.getForUser(req.user);
  res.json(exchanges);
});

router.put('/:id/status', authMiddleware, rbac('exchanges:write'), async (req, res) => {
  const exchange = await ExchangeService.updateStatus(req.params.id, req.body.status, req.user);
  await AuditService.log('EXCHANGE_STATUS_UPDATE', req.user.id, exchange);
  res.json(exchange);
});
```

#### **4. Middleware Layer (Cross-cutting Concerns)**
```javascript
// middleware/rbac.js - Role-based access control
const permissions = {
  admin: ['*'],
  coordinator: ['exchanges:read', 'exchanges:write', 'documents:read', 'tasks:write'],
  client: ['exchanges:read', 'documents:read', 'messages:write'],
  third_party: ['exchanges:read', 'documents:read'],
  agency: ['exchanges:read', 'documents:read', 'messages:write']
};

function checkPermission(resource, action) {
  return (req, res, next) => {
    const userPerms = permissions[req.user.role];
    if (userPerms.includes('*') || userPerms.includes(`${resource}:${action}`)) {
      next();
    } else {
      res.status(403).json({ error: 'Insufficient permissions' });
    }
  };
}
```

### **Frontend Architecture Patterns**

#### **1. Component Architecture (Composition)**
```tsx
// Reusable components that work across all role dashboards
<ExchangeDashboard userRole={user.role}>
  <DashboardHeader title="My Exchanges" />
  <FilterBar onFilter={handleFilter} />
  <ExchangeGrid>
    {exchanges.map(exchange => (
      <ExchangeCard 
        key={exchange.id}
        exchange={exchange}
        userRole={user.role}
        onStatusChange={canEdit ? handleStatusChange : undefined}
        onViewDetails={handleViewDetails}
      />
    ))}
  </ExchangeGrid>
  <Pagination />
</ExchangeDashboard>
```

#### **2. State Management (React Hooks + Context)**
```tsx
// hooks/useAuth.ts - Authentication state
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const login = async (credentials: LoginCredentials) => {
    const response = await api.post('/auth/login', credentials);
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
  };
  
  return { user, login, logout, loading };
}

// hooks/usePermissions.ts - Role-based UI control
export function usePermissions(user: User) {
  const can = (resource: string, action: string) => {
    return PermissionService.check(user.role, resource, action);
  };
  
  return { can };
}
```

#### **3. API Integration (Centralized Client)**
```typescript
// services/api.ts - Centralized API client
class ApiService {
  private client = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    timeout: 10000
  });
  
  constructor() {
    this.setupInterceptors();
  }
  
  // Exchanges
  async getExchanges(filters?: ExchangeFilters): Promise<Exchange[]> {
    const response = await this.client.get('/exchanges', { params: filters });
    return response.data;
  }
  
  async updateExchangeStatus(id: string, status: ExchangeStatus): Promise<Exchange> {
    const response = await this.client.put(`/exchanges/${id}/status`, { status });
    return response.data;
  }
}
```

### **Database Architecture Patterns**

#### **1. Normalized Schema with Flexibility**
```sql
-- Core entities with PP integration
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pp_contact_id VARCHAR(100) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  pp_data JSONB, -- Store full PP response for flexibility
  last_sync_at TIMESTAMP
);

-- Junction table for many-to-many relationships
CREATE TABLE exchange_participants (
  exchange_id UUID REFERENCES exchanges(id),
  contact_id UUID REFERENCES contacts(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(50),
  permissions JSONB,
  UNIQUE(exchange_id, contact_id),
  UNIQUE(exchange_id, user_id)
);
```

#### **2. Performance Optimization**
```sql
-- Strategic indexes for query performance
CREATE INDEX idx_exchanges_status ON exchanges(status);
CREATE INDEX idx_exchanges_client ON exchanges(client_id);
CREATE INDEX idx_exchanges_pp_matter ON exchanges(pp_matter_id);
CREATE INDEX idx_tasks_exchange ON tasks(exchange_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_documents_exchange ON documents(exchange_id);
CREATE INDEX idx_messages_exchange ON messages(exchange_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

### **Integration Architecture Patterns**

#### **1. PracticePanther Sync Strategy**
```javascript
// Resilient sync with conflict resolution
class PPSyncService {
  async syncWithRetry(syncType: string, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.performSync(syncType);
        return;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        await this.wait(attempt * 1000); // Exponential backoff
      }
    }
  }
  
  async handleSyncConflicts(ppData: any[], localData: any[]) {
    // PP data is source of truth, but preserve local modifications
    for (const ppItem of ppData) {
      const existing = localData.find(local => local.ppId === ppItem.id);
      if (existing && existing.lastModified > ppItem.lastModified) {
        // Handle conflict - log for manual review
        await ConflictService.logConflict(ppItem, existing);
      }
    }
  }
}
```

#### **2. Real-time Communication Architecture**
```javascript
// Socket.IO with room-based messaging
class MessageService {
  setupSocketHandlers(io: SocketIO.Server) {
    io.on('connection', (socket) => {
      socket.on('join-exchange', async (exchangeId) => {
        if (await this.canAccessExchange(socket.user, exchangeId)) {
          socket.join(`exchange-${exchangeId}`);
        }
      });
      
      socket.on('send-message', async (data) => {
        const message = await Message.create({
          content: data.content,
          exchangeId: data.exchangeId,
          senderId: socket.user.id
        });
        
        io.to(`exchange-${data.exchangeId}`).emit('new-message', message);
        await NotificationService.sendMessageNotification(message);
      });
    });
  }
}
```

### **Security Architecture Patterns**

#### **1. Authentication & Authorization Flow**
```javascript
// JWT with role-based permissions
class AuthService {
  async authenticateRequest(req: Request) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(payload.userId);
    
    if (!user || !user.isActive) {
      throw new Error('Invalid user');
    }
    
    return user;
  }
  
  checkPermission(user: User, resource: string, action: string) {
    const userPermissions = ROLE_PERMISSIONS[user.role];
    return userPermissions.includes('*') || 
           userPermissions.includes(`${resource}:${action}`);
  }
}
```

#### **2. Document Security**
```javascript
// PIN-protected document access
class DocumentSecurityService {
  async verifyDocumentAccess(user: User, documentId: string, pin?: string) {
    const document = await Document.findByPk(documentId);
    
    // Check role-based access
    if (!this.hasDocumentPermission(user, document)) {
      throw new ForbiddenError('No access to document');
    }
    
    // Check PIN if required
    if (document.pinRequired && !await bcrypt.compare(pin, document.pinHash)) {
      throw new ForbiddenError('Invalid PIN');
    }
    
    await AuditService.log('DOCUMENT_ACCESS', user.id, { documentId });
    return document;
  }
}
```

---

## 📋 Complete Feature Requirements

### 🔐 **AUTHENTICATION & USER MANAGEMENT**

#### Core Authentication
- [x] JWT-based login system
- [x] Password hashing with bcrypt
- [x] Session management with refresh tokens
- [x] 2FA via email/SMS for admin accounts
- [x] Google OAuth integration option
- [x] Logout functionality

#### User Roles & Permissions
- [x] **Admin**: Full system access, user management, sync controls
- [x] **Client**: View assigned exchanges, documents, messaging
- [x] **Third Party**: Read-only access to assigned exchanges
- [x] **Agency**: Multi-client view for agency users
- [x] **Exchange Coordinator**: Manage multiple exchanges, assign users

#### User Management Features
- [x] Create/edit internal platform users (not PP contacts)
- [x] Activate/deactivate user accounts
- [x] Role assignment and modification
- [x] User profile management
- [x] Password reset functionality

---

### 🔄 **PRACTICEPANTHER INTEGRATION**

#### Data Sync Requirements
- [x] One-way sync from PracticePanther (GET only, no POST)
- [x] Sync **Contacts** from PP (clients, intermediaries, participants)
- [x] Sync **Matters** from PP → display as **Exchanges**
- [x] Sync **Tasks** from PP → link to exchanges
- [x] Configurable sync frequency (hourly/daily)
- [x] Manual sync trigger from admin panel

#### Sync Implementation
```javascript
// Required PP API endpoints to integrate:
// GET /contacts - All PP contacts
// GET /matters - All PP matters (become exchanges)
// GET /tasks - All PP tasks (link to exchanges)
// GET /matters/{id}/contacts - Matter participants
```

#### Sync Data Storage
- [x] Store PP contact IDs for relationship mapping
- [x] Store PP matter IDs for exchange linking
- [x] Store PP task IDs for task tracking
- [x] Handle sync conflicts and updates
- [x] Track last sync timestamp per entity type

#### Admin Sync Controls
- [x] Sync status dashboard
- [x] Manual sync trigger buttons
- [x] Sync frequency configuration
- [x] Sync error logging and alerts
- [x] Data validation and conflict resolution

---

### 🏢 **EXCHANGE MANAGEMENT**

#### Exchange Display & Status
- [x] Display PP "matters" as exchanges
- [x] Exchange status tracking: `PENDING`, `45D`, `180D`, `COMPLETED`
- [x] Exchange details: name, client, participants, dates
- [x] Manual status updates by admins/coordinators
- [x] Exchange timeline and key milestones

#### Exchange Assignment
- [x] Auto-assign PP contacts to exchanges during sync
- [x] Manual user assignment to exchanges (admin approval)
- [x] Participant role management (client, intermediary, etc.)
- [x] Exchange coordinator assignment
- [x] Multi-client agency access

#### Search & Filtering
- [x] Filter exchanges by status
- [x] Filter by assigned user/coordinator
- [x] Search by exchange name or client name
- [x] Filter by date ranges
- [x] Sort by various fields (status, date, name)

---

### ✅ **TASK MANAGEMENT**

#### Task Display
- [x] Display tasks synced from PracticePanther
- [x] Task status indicators: `PENDING`, `IN_PROGRESS`, `COMPLETED`
- [x] Due date tracking and overdue alerts
- [x] Task assignment to exchanges
- [x] Task priority levels (if available from PP)

#### Task Management
- [x] View tasks by exchange
- [x] View tasks by assigned user
- [x] Task completion tracking
- [x] Task history and updates
- [x] Task filtering and search

---

### 💬 **MESSAGING SYSTEM**

#### Real-time Chat
- [x] Real-time messaging between exchange participants
- [x] Exchange-specific chat rooms
- [x] Message history and persistence
- [x] Online/offline status indicators
- [x] Typing indicators

#### File Attachments
- [x] Support for PDF, DOCX, JPG attachments in chat
- [x] File size limits and validation
- [x] Secure file storage and access
- [x] File preview capabilities
- [x] Download tracking

#### Notifications
- [x] Email notifications via SendGrid
- [x] SMS notifications via Twilio (optional)
- [x] In-app notification system
- [x] Notification preferences per user
- [x] Configurable notification triggers

---

### 📁 **DOCUMENT MANAGEMENT**

#### Document Upload/Download
- [x] Manual document upload per exchange
- [x] Secure document storage (AWS S3 or similar)
- [x] Document organization by exchange
- [x] Version control for document updates
- [x] Bulk document upload capabilities

#### Access Control
- [x] Role-based document access
- [x] PIN-protected access for sensitive files
- [x] Third-party users: view only, no upload
- [x] Document sharing permissions
- [x] Audit trail for document access

#### Document Features
- [x] Auto-generate documents from templates
- [x] Template system using exchange/member data
- [x] Document categories and tags
- [x] Document search and filtering
- [x] Document activity logging

---

### 📊 **AUDIT LOGGING & REPORTING**

#### Activity Logging
- [x] Login events (success/failure, 2FA attempts)
- [x] Document activity (upload, download, view, delete)
- [x] Task activity (assignment, completion, updates)
- [x] User actions (role changes, assignments)
- [x] PracticePanther sync logs
- [x] IP address logging for security

#### Admin Dashboard
- [x] System metrics and health monitoring
- [x] User activity overview
- [x] Sync status and error reporting
- [x] Security alerts and notifications
- [x] Performance monitoring

#### Export Capabilities
- [x] Export exchange reports (PDF/Excel)
- [x] Export user activity logs
- [x] Export task summaries
- [x] Export audit trails
- [x] Custom report generation

---

### 📱 **DASHBOARD VIEWS BY ROLE**

#### Admin Dashboard
- [x] Complete system overview
- [x] User management controls
- [x] Sync management and monitoring
- [x] System settings and configuration
- [x] Audit logs and reporting tools
- [x] Security monitoring

#### Client Dashboard
- [x] View assigned exchanges only
- [x] Exchange status and progress
- [x] Document access for their exchanges
- [x] Messaging with exchange team
- [x] Task visibility for their exchanges

#### Third Party Dashboard
- [x] Read-only view of assigned exchanges
- [x] Document viewing (no upload)
- [x] Limited messaging capabilities
- [x] Task visibility without editing
- [x] Basic reporting for their involvement

#### Agency Dashboard
- [x] Multi-client overview
- [x] Aggregated exchange status
- [x] Client-specific filtering
- [x] Bulk operations for multiple clients
- [x] Agency-level reporting

#### Exchange Coordinator Dashboard
- [x] Manage multiple exchanges
- [x] Assign users to exchanges
- [x] Task management and tracking
- [x] Document coordination
- [x] Progress reporting

---

## 🗄️ Database Schema Requirements

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL, -- admin, client, coordinator, third_party, agency
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  two_fa_enabled BOOLEAN DEFAULT false,
  two_fa_secret VARCHAR(255),
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Contacts Table (PP Synced)
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pp_contact_id VARCHAR(100) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  company VARCHAR(255),
  address TEXT,
  pp_data JSONB, -- Store full PP response
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Exchanges Table (PP Matters)
```sql
CREATE TABLE exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pp_matter_id VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, 45D, 180D, COMPLETED
  client_id UUID REFERENCES contacts(id),
  coordinator_id UUID REFERENCES users(id),
  start_date DATE,
  completion_date DATE,
  pp_data JSONB,
  metadata JSONB,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Exchange Participants Table
```sql
CREATE TABLE exchange_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID REFERENCES exchanges(id),
  contact_id UUID REFERENCES contacts(id),
  user_id UUID REFERENCES users(id), -- For internal users
  role VARCHAR(50), -- client, intermediary, qualified_intermediary, etc.
  permissions JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(exchange_id, contact_id),
  UNIQUE(exchange_id, user_id)
);
```

### Tasks Table (PP Synced)
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pp_task_id VARCHAR(100) UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED
  priority VARCHAR(10) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH
  exchange_id UUID REFERENCES exchanges(id),
  assigned_to UUID REFERENCES users(id),
  due_date DATE,
  completed_at TIMESTAMP,
  pp_data JSONB,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Documents Table
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  exchange_id UUID REFERENCES exchanges(id),
  uploaded_by UUID REFERENCES users(id),
  category VARCHAR(50),
  tags JSONB,
  pin_required BOOLEAN DEFAULT false,
  pin_hash VARCHAR(255),
  is_template BOOLEAN DEFAULT false,
  template_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  exchange_id UUID REFERENCES exchanges(id),
  sender_id UUID REFERENCES users(id),
  attachment_id UUID REFERENCES documents(id),
  message_type VARCHAR(20) DEFAULT 'text', -- text, file, system
  read_by JSONB, -- Array of user IDs who read the message
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Audit Logs Table
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50), -- user, exchange, document, task, etc.
  entity_id UUID,
  user_id UUID REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Sync Logs Table
```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type VARCHAR(50) NOT NULL, -- contacts, matters, tasks, full
  status VARCHAR(20) NOT NULL, -- success, error, partial
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  records_processed INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB,
  triggered_by UUID REFERENCES users(id)
);
```

---

## 🔌 API Endpoints Requirements

### Authentication Endpoints
```
POST   /api/auth/login              # JWT login
POST   /api/auth/refresh            # Refresh JWT token
POST   /api/auth/logout             # Logout
POST   /api/auth/forgot-password    # Password reset request
POST   /api/auth/reset-password     # Password reset confirmation
POST   /api/auth/setup-2fa          # Setup 2FA
POST   /api/auth/verify-2fa         # Verify 2FA code
```

### User Management Endpoints
```
GET    /api/users                   # List users (admin only)
POST   /api/users                   # Create user (admin only)
GET    /api/users/:id               # Get user details
PUT    /api/users/:id               # Update user
DELETE /api/users/:id               # Deactivate user
PUT    /api/users/:id/activate      # Activate/deactivate
```

### Contact Endpoints (PP Synced - Read Only)
```
GET    /api/contacts                # List all contacts
GET    /api/contacts/:id            # Get contact details
GET    /api/contacts/search         # Search contacts
```

### Exchange Endpoints
```
GET    /api/exchanges               # List exchanges (role-filtered)
POST   /api/exchanges               # Create manual exchange
GET    /api/exchanges/:id           # Get exchange details
PUT    /api/exchanges/:id           # Update exchange
DELETE /api/exchanges/:id           # Archive exchange
PUT    /api/exchanges/:id/status    # Update exchange status
GET    /api/exchanges/:id/participants # Get participants
POST   /api/exchanges/:id/participants # Add participant
DELETE /api/exchanges/:id/participants/:userId # Remove participant
```

### Task Endpoints
```
GET    /api/tasks                   # List tasks (role-filtered)
GET    /api/tasks/:id               # Get task details
PUT    /api/tasks/:id               # Update task status
GET    /api/exchanges/:id/tasks     # Get exchange tasks
```

### Document Endpoints
```
GET    /api/documents               # List documents (role-filtered)
POST   /api/documents               # Upload document
GET    /api/documents/:id           # Download document
GET    /api/documents/:id/info      # Get document metadata
PUT    /api/documents/:id           # Update document metadata
DELETE /api/documents/:id           # Delete document
POST   /api/documents/:id/verify-pin # Verify PIN for protected document
GET    /api/exchanges/:id/documents # Get exchange documents
```

### Messaging Endpoints
```
GET    /api/messages                # List messages (role-filtered)
POST   /api/messages                # Send message
GET    /api/exchanges/:id/messages  # Get exchange messages
PUT    /api/messages/:id/read       # Mark message as read
```

### Sync Endpoints
```
POST   /api/sync/contacts           # Trigger contact sync
POST   /api/sync/matters            # Trigger matter sync
POST   /api/sync/tasks              # Trigger task sync
POST   /api/sync/all                # Trigger full sync
GET    /api/sync/status             # Get sync status
GET    /api/sync/logs               # Get sync logs
```

### Admin Endpoints
```
GET    /api/admin/dashboard         # Admin dashboard data
GET    /api/admin/audit-logs        # Get audit logs
GET    /api/admin/system-health     # System health metrics
POST   /api/admin/export            # Generate exports
GET    /api/admin/settings          # Get system settings
PUT    /api/admin/settings          # Update system settings
```

---

## 🔒 Security Requirements

### Authentication Security
- [x] JWT tokens with expiration
- [x] Refresh token rotation
- [x] Password strength requirements
- [x] Rate limiting on login attempts
- [x] Account lockout after failed attempts
- [x] 2FA for admin accounts

### Authorization Security
- [x] Role-based access control (RBAC)
- [x] Resource-level permissions
- [x] Server-side permission enforcement
- [x] API endpoint protection
- [x] Database row-level security

### Data Security
- [x] HTTPS enforcement
- [x] Password hashing with bcrypt
- [x] File encryption for sensitive documents
- [x] PIN protection for documents
- [x] Input validation and sanitization
- [x] SQL injection prevention

### Audit Security
- [x] IP address logging
- [x] User agent tracking
- [x] Failed login attempt logging
- [x] Sensitive action auditing
- [x] File access logging

---

## 🚀 Deployment Requirements

### Infrastructure
- [x] Docker containerization
- [x] PostgreSQL database
- [x] Redis for session storage
- [x] File storage (AWS S3 or equivalent)
- [x] Load balancer configuration
- [x] SSL certificate setup

### Environment Configuration
- [x] Production environment variables
- [x] Database connection pooling
- [x] Error logging and monitoring
- [x] Performance monitoring
- [x] Backup and recovery procedures

### CI/CD Pipeline
- [x] Automated testing
- [x] Database migrations
- [x] Zero-downtime deployments
- [x] Rollback procedures
- [x] Health checks

---

## 📦 Required Integrations

### PracticePanther API
- [x] API authentication setup
- [x] Rate limiting compliance
- [x] Error handling and retries
- [x] Data mapping and transformation
- [x] Sync scheduling and monitoring

### Email Service (SendGrid)
- [x] Email template configuration
- [x] Notification triggers
- [x] Delivery tracking
- [x] Bounce handling
- [x] Unsubscribe management

### SMS Service (Twilio)
- [x] SMS notification setup
- [x] 2FA code delivery
- [x] International number support
- [x] Delivery status tracking
- [x] Cost monitoring

---

## 📋 Milestone Acceptance Criteria

### Milestone 1 (Week 1): Foundation & Sync
- [ ] All user roles can login with JWT
- [ ] PP contact sync working and displaying data
- [ ] PP matter sync working and creating exchanges
- [ ] Admin can manually trigger syncs
- [ ] Basic role-based dashboard routing

### Milestone 2 (Weeks 2-3): Exchange & Task Management
- [ ] Exchanges display with correct status tracking
- [ ] User assignment to exchanges working
- [ ] PP task sync and display functional
- [ ] Search and filtering operational
- [ ] All role dashboards showing appropriate data

### Milestone 3 (Week 4): Documents & Messaging
- [ ] Document upload/download with role permissions
- [ ] PIN-protected document access working
- [ ] Real-time messaging between exchange participants
- [ ] File attachments in chat functional
- [ ] Email/SMS notifications sending

### Milestone 4 (Week 5): Audit & Deployment
- [ ] Complete audit logging for all actions
- [ ] Export functionality for reports and logs
- [ ] Admin dashboard with full system visibility
- [ ] Production deployment with SSL
- [ ] All security measures implemented

---

## 🛠️ Development Commands for Claude Code

### Initial Setup
```bash
# Create project structure
npx create-react-app frontend --template typescript
mkdir backend database deployment

# Install backend dependencies
cd backend && npm init -y
npm install express postgres sequelize bcrypt jsonwebtoken
npm install socket.io multer aws-sdk nodemailer twilio

# Install frontend dependencies  
cd ../frontend
npm install @types/react @types/node tailwindcss
npm install axios socket.io-client react-router-dom

# Setup database
createdb peak1031_dev
```

### Development Workflow
```bash
# Start development servers
npm run dev:backend    # Backend on port 5000
npm run dev:frontend   # Frontend on port 3000
npm run dev:db         # PostgreSQL

# Run migrations
npm run migrate:up
npm run seed:dev

# Run tests
npm run test:backend
npm run test:frontend
npm run test:e2e
```

---

This comprehensive documentation serves as the complete specification for building the Peak 1031 V1 platform. Each feature is detailed with specific requirements, database schemas, API endpoints, and acceptance criteria for Claude Code to implement systematically across the 5-week timeline.