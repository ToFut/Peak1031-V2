# 🗄️ DATABASE REORGANIZATION PLAN
## Peak 1031 V1 Platform - Feature-Ready Schema Design

Based on **FeaturesContract.md** requirements and current database analysis.

---

## 📊 CURRENT STATE ANALYSIS

### ✅ **EXISTING PRODUCTIVE TABLES**
- **EXCHANGES**: 1,000 records (30+ PP custom fields extracted)
- **CONTACTS**: 1,119 records (unified contacts + users, role-based)

### ❌ **MISSING FEATURE TABLES** 
- EXCHANGE_PARTICIPANTS: 0 records (needed for user assignments)
- MESSAGES: 0 records (needed for real-time messaging)
- DOCUMENTS: 0 records (needed for document management)  
- TASKS: 0 records (needed for task tracking)
- AUDIT_LOGS: Missing (needed for security auditing)

---

## 🎯 REQUIRED FEATURES vs DATABASE GAPS

| Feature | Requirement | Current Status | Action Needed |
|---------|-------------|----------------|---------------|
| **User Management** | Role-based views (Admin, Client, Third Party, Agency, Coordinator) | ✅ CONTACTS.role | Enhance with permissions |
| **Exchange Management** | Assign users to exchanges | ❌ No participant linking | Create EXCHANGE_PARTICIPANTS |
| **Messaging System** | Real-time messaging + file attachments | ❌ Empty MESSAGES table | Complete messaging schema |
| **Document Management** | Upload/download, PIN protection, templates | ❌ Empty DOCUMENTS table | Full document system |
| **Task Management** | PP sync, status tracking, due dates | ❌ Empty TASKS table | Task management schema |
| **Audit Logging** | Login, document, task, sync activities | ❌ Missing entirely | Create audit system |

---

## 🏗️ PROPOSED SCHEMA REORGANIZATION

### **1. USER & ACCESS MANAGEMENT**

#### **A. Enhance CONTACTS Table (Users)**
```sql
-- Add missing user management fields
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_login_ip INET;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferences JSONB;
```

#### **B. Create USER_SESSIONS Table**
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **2. EXCHANGE MANAGEMENT**

#### **A. Create EXCHANGE_PARTICIPANTS Table**
```sql
CREATE TABLE exchange_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'client', 'coordinator', 'third_party', 'agency'
    permissions TEXT[], -- ['view', 'message', 'upload', 'manage']
    assigned_by UUID REFERENCES contacts(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(exchange_id, contact_id, role)
);
```

#### **B. Enhance EXCHANGES Table**
```sql
-- Add workflow tracking
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMP;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS stage_changed_by UUID REFERENCES contacts(id);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;
```

### **3. MESSAGING SYSTEM**

#### **A. Complete MESSAGES Table**
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'file', 'system'
    attachments JSONB, -- Array of file references
    reply_to UUID REFERENCES messages(id),
    is_system_message BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    read_by JSONB, -- Array of {user_id, read_at}
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **B. Create MESSAGE_PARTICIPANTS Table**
```sql
CREATE TABLE message_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    read_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **4. DOCUMENT MANAGEMENT**

#### **A. Complete DOCUMENTS Table**
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES contacts(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT,
    file_path TEXT NOT NULL,
    storage_provider VARCHAR(50) DEFAULT 'local', -- 'local', 's3', 'gcp'
    document_type VARCHAR(100), -- 'contract', 'deed', 'financial', 'legal'
    description TEXT,
    is_template BOOLEAN DEFAULT false,
    template_variables JSONB, -- For auto-generation
    pin_protected BOOLEAN DEFAULT false,
    pin_hash VARCHAR(255),
    access_level VARCHAR(20) DEFAULT 'exchange', -- 'public', 'exchange', 'restricted'
    allowed_roles TEXT[], -- Who can access this document
    download_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **B. Create DOCUMENT_ACCESS_LOGS Table**
```sql
CREATE TABLE document_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL, -- 'view', 'download', 'upload', 'delete'
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **5. TASK MANAGEMENT**

#### **A. Complete TASKS Table**
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES contacts(id) ON DELETE SET NULL,
    created_by UUID REFERENCES contacts(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50), -- 'pp_sync', 'manual', 'system'
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'COMPLETE', 'CANCELLED'
    priority VARCHAR(10) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    pp_task_id VARCHAR(255), -- Reference to PracticePanther task
    pp_data JSONB, -- Raw PP task data
    metadata JSONB, -- Additional task data
    is_synced_from_pp BOOLEAN DEFAULT false,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **6. AUDIT LOGGING SYSTEM**

#### **A. Create AUDIT_LOGS Table**
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    exchange_id UUID REFERENCES exchanges(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'login', 'logout', 'document_upload', 'task_complete'
    resource_type VARCHAR(50), -- 'user', 'exchange', 'document', 'task', 'message'
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    session_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **7. SYNC & INTEGRATION TRACKING**

#### **A. Create PP_SYNC_LOGS Table**  
```sql
CREATE TABLE pp_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type VARCHAR(50) NOT NULL, -- 'contacts', 'matters', 'tasks'
    status VARCHAR(20) DEFAULT 'RUNNING', -- 'RUNNING', 'SUCCESS', 'FAILED'
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_details JSONB,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    triggered_by VARCHAR(20) DEFAULT 'scheduled' -- 'manual', 'scheduled'
);
```

---

## 🔐 SECURITY & PERMISSIONS

### **Role-Based Access Matrix**
| Role | Exchange View | Messaging | Document Upload | Document View | Task Management | User Management |
|------|---------------|-----------|-----------------|---------------|-----------------|-----------------|
| **Admin** | All | All | Yes | All | All | Yes |
| **Coordinator** | Assigned | Assigned | Yes | Assigned | Assigned | No |
| **Client** | Own | Own | Yes | Own | Own | No |
| **Third Party** | Assigned | Assigned | No | Assigned | View Only | No |
| **Agency** | Assigned | Assigned | Yes | Assigned | Assigned | No |

---

## 📈 INDEXES FOR PERFORMANCE

```sql
-- Exchange lookups
CREATE INDEX idx_exchanges_status ON exchanges(status);
CREATE INDEX idx_exchanges_client_id ON exchanges(client_id);
CREATE INDEX idx_exchanges_coordinator_id ON exchanges(coordinator_id);

-- User sessions
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_expires ON user_sessions(user_id, expires_at);

-- Exchange participants
CREATE INDEX idx_exchange_participants_exchange ON exchange_participants(exchange_id);
CREATE INDEX idx_exchange_participants_contact ON exchange_participants(contact_id);

-- Messages
CREATE INDEX idx_messages_exchange_created ON messages(exchange_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- Documents
CREATE INDEX idx_documents_exchange ON documents(exchange_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);

-- Tasks
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_exchange_status ON tasks(exchange_id, status);

-- Audit logs
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

---

## 🚀 IMPLEMENTATION PRIORITY

### **Phase 1: Core Access Control**
1. Enhance user management in CONTACTS
2. Create EXCHANGE_PARTICIPANTS for role-based access
3. Create USER_SESSIONS for JWT management

### **Phase 2: Core Features** 
1. Complete MESSAGES system
2. Complete DOCUMENTS system with security
3. Complete TASKS system with PP sync

### **Phase 3: Security & Monitoring**
1. Implement AUDIT_LOGS system
2. Add PP_SYNC_LOGS tracking
3. Create performance indexes

---

## 💾 ESTIMATED IMPACT

- **New Tables**: 7 tables (vs 2 productive tables currently)
- **Enhanced Security**: Role-based access, audit logging, PIN protection
- **Real-time Features**: Messaging, task tracking, document collaboration
- **PracticePanther Integration**: Full sync tracking and task management
- **Performance**: Proper indexing for 1000+ exchanges and users

**Result**: Production-ready platform supporting all FeaturesContract.md requirements!