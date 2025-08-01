# Peak 1031 Platform - API Documentation

## 🔌 Base URL
```
Development: http://localhost:8001/api
Production: https://your-domain.com/api
```

## 🔐 Authentication

All API requests require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@peak1031.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "110e8400-e29b-41d4-a716-446655440001",
    "email": "admin@peak1031.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin",
    "isActive": true
  }
}
```

---

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'client',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    two_fa_enabled BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Contacts Table
```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    company VARCHAR(255),
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(50),
    address_zip_code VARCHAR(20),
    address_country VARCHAR(100) DEFAULT 'US',
    pp_client_id VARCHAR(255),
    pp_matter_id VARCHAR(255),
    source VARCHAR(50) DEFAULT 'manual',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Exchanges Table
```sql
CREATE TABLE exchanges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    type VARCHAR(50) DEFAULT '1031_exchange',
    pp_matter_id VARCHAR(255),
    pp_client_id VARCHAR(255),
    source VARCHAR(50) DEFAULT 'manual',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tasks Table
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    due_date DATE,
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Documents Table
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id),
    pp_document_id VARCHAR(255),
    pp_matter_id VARCHAR(255),
    source VARCHAR(50) DEFAULT 'manual',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 API Endpoints

### Authentication Endpoints

#### Login
```http
POST /api/auth/login
```
**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

#### Get Current User
```http
GET /api/auth/me
```

#### Logout
```http
POST /api/auth/logout
```

---

### User Management Endpoints

#### Get All Users (Admin Only)
```http
GET /api/users
```

#### Get User by ID
```http
GET /api/users/:id
```

#### Create User (Admin Only)
```http
POST /api/users
```
**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "admin|coordinator|client|third_party|agency"
}
```

#### Update User
```http
PUT /api/users/:id
```

#### Delete User
```http
DELETE /api/users/:id
```

---

### Contact Endpoints

#### Get All Contacts
```http
GET /api/contacts
```

#### Get Contact by ID
```http
GET /api/contacts/:id
```

#### Create Contact
```http
POST /api/contacts
```
**Request Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string",
  "company": "string",
  "addressStreet": "string",
  "addressCity": "string",
  "addressState": "string",
  "addressZipCode": "string",
  "addressCountry": "string"
}
```

#### Update Contact
```http
PUT /api/contacts/:id
```

#### Delete Contact
```http
DELETE /api/contacts/:id
```

---

### Exchange Endpoints

#### Get All Exchanges
```http
GET /api/exchanges
```

#### Get Exchange by ID
```http
GET /api/exchanges/:id
```

#### Create Exchange
```http
POST /api/exchanges
```
**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "status": "pending|in_progress|completed|cancelled",
  "type": "1031_exchange|reverse_exchange|delayed_exchange",
  "ppMatterId": "string",
  "ppClientId": "string"
}
```

#### Update Exchange
```http
PUT /api/exchanges/:id
```

#### Delete Exchange
```http
DELETE /api/exchanges/:id
```

#### Update Exchange Status
```http
PUT /api/exchanges/:id/status
```
**Request Body:**
```json
{
  "status": "pending|in_progress|completed|cancelled"
}
```

---

### Task Endpoints

#### Get All Tasks
```http
GET /api/tasks
```

#### Get Task by ID
```http
GET /api/tasks/:id
```

#### Create Task
```http
POST /api/tasks
```
**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "status": "pending|in_progress|completed",
  "priority": "low|medium|high",
  "dueDate": "2024-01-01",
  "exchangeId": "uuid",
  "assignedTo": "uuid"
}
```

#### Update Task
```http
PUT /api/tasks/:id
```

#### Delete Task
```http
DELETE /api/tasks/:id
```

#### Update Task Status
```http
PUT /api/tasks/:id/status
```
**Request Body:**
```json
{
  "status": "pending|in_progress|completed"
}
```

---

### Document Endpoints

#### Get All Documents
```http
GET /api/documents
```

#### Get Document by ID
```http
GET /api/documents/:id
```

#### Upload Document
```http
POST /api/documents
Content-Type: multipart/form-data

{
  "file": "file",
  "exchangeId": "uuid",
  "category": "string",
  "tags": ["string"]
}
```

#### Download Document
```http
GET /api/documents/:id/download
```

#### Delete Document
```http
DELETE /api/documents/:id
```

---

### Message Endpoints

#### Get All Messages
```http
GET /api/messages
```

#### Get Messages by Exchange
```http
GET /api/exchanges/:id/messages
```

#### Send Message
```http
POST /api/messages
```
**Request Body:**
```json
{
  "content": "string",
  "exchangeId": "uuid",
  "messageType": "text|file|system"
}
```

#### Mark Message as Read
```http
PUT /api/messages/:id/read
```

---

### Sync Endpoints

#### Get Sync Status
```http
GET /api/sync/status
```

#### Trigger Sync
```http
POST /api/sync/trigger
```
**Request Body:**
```json
{
  "type": "contacts|matters|tasks|all"
}
```

#### Get Sync Logs
```http
GET /api/sync/logs
```

---

### Admin Endpoints

#### Get Dashboard Stats
```http
GET /api/admin/dashboard
```

#### Get Audit Logs
```http
GET /api/admin/audit-logs
```

#### Get System Health
```http
GET /api/admin/health
```

---

## 📝 TypeScript Interfaces

### User Interface
```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'coordinator' | 'client' | 'third_party' | 'agency';
  isActive: boolean;
  emailVerified: boolean;
  twoFaEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Contact Interface
```typescript
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZipCode?: string;
  addressCountry: string;
  ppClientId?: string;
  ppMatterId?: string;
  source: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}
```

### Exchange Interface
```typescript
interface Exchange {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  type: '1031_exchange' | 'reverse_exchange' | 'delayed_exchange';
  ppMatterId?: string;
  ppClientId?: string;
  source: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}
```

### Task Interface
```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  exchangeId: string;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### Document Interface
```typescript
interface Document {
  id: string;
  originalFilename: string;
  storedFilename: string;
  fileSize: number;
  mimeType?: string;
  exchangeId: string;
  uploadedBy?: string;
  ppDocumentId?: string;
  ppMatterId?: string;
  source: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}
```

---

## 🔒 Error Responses

### Standard Error Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

### Example Error Response
```json
{
  "error": "Exchange not found",
  "code": "EXCHANGE_NOT_FOUND",
  "details": {
    "exchangeId": "invalid-uuid"
  }
}
```

---

## 🚀 Testing the API

### Using curl

#### Login
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@peak1031.com","password":"admin123"}'
```

#### Get Exchanges
```bash
curl -X GET http://localhost:8001/api/exchanges \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Create Exchange
```bash
curl -X POST http://localhost:8001/api/exchanges \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Exchange",
    "description": "Test description",
    "status": "pending",
    "type": "1031_exchange"
  }'
```

### Using Postman

1. **Set Base URL:** `http://localhost:8001/api`
2. **Add Authorization Header:** `Authorization: Bearer <token>`
3. **Set Content-Type:** `application/json` for POST/PUT requests

---

## 📊 Sample Data

The database comes pre-seeded with sample data:

### Sample Users
- **Admin:** admin@peak1031.com / admin123
- **Coordinator:** coordinator@peak1031.com / coord123
- **Client:** client@peak1031.com / client123

### Sample Exchanges
- Smith Commercial Exchange (EX-2024-001)
- Johnson Residential Portfolio (EX-2024-002)
- Davis Industrial Complex (EX-2024-003)

### Sample Tasks
- Property Appraisal Review
- 45-Day Identification Letter
- Document Collection

### Sample Documents
- Property Appraisal Report
- 45-Day Identification Letter

---

## 🔧 Development Notes

### Case Transformation
The API automatically transforms between:
- **Database:** snake_case (e.g., `first_name`)
- **API Response:** camelCase (e.g., `firstName`)

### Real-time Features
- Socket.IO is available at `ws://localhost:8001`
- Join exchange rooms: `socket.emit('join-exchange', exchangeId)`
- Listen for messages: `socket.on('new-message', callback)`

### File Upload
- Files are stored in `/uploads/documents/`
- Maximum file size: 10MB
- Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG 