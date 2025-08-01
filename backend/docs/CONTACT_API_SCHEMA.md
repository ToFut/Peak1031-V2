# Contact API Schema Documentation

## Overview
This document defines the complete Contact API schema for the Peak 1031 Platform, matching the comprehensive JSON schema requirements.

---

## 🏗️ Contact Data Model

### Core Contact Object
```typescript
interface Contact {
  id: string; // UUID
  userId: string; // UUID
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  contactType?: ContactType;
  address?: ContactAddress;
  source?: ContactSource;
  tags?: string[];
  preferredContactMethod?: PreferredContactMethod;
  isPrimary: boolean;
  notes?: string;
  relatedExchanges?: string[]; // Array of UUIDs
  createdAt: string; // ISO date-time
  updatedAt: string; // ISO date-time
}
```

### Contact Address Object
```typescript
interface ContactAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}
```

### Contact Type Enums
```typescript
type ContactType = 
  | 'Client' | 'Broker' | 'Attorney' | 'CPA' | 'Agent'
  | 'Escrow Officer' | 'Title Company' | 'Notary' | 'Lender' | 'Other';

type ContactSource = 
  | 'Referral' | 'Website' | 'Social Media' | 'Event' | 'Cold Call' | 'Other';

type PreferredContactMethod = 'Email' | 'Phone' | 'Text';
```

---

## 🔌 API Endpoints

### 1. Create Contact
```http
POST /api/contacts
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-123-4567",
  "company": "ABC Real Estate",
  "position": "Senior Broker",
  "contactType": "Broker",
  "address": {
    "street": "123 Main Street",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90210"
  },
  "source": "Referral",
  "tags": ["high-value", "commercial", "trusted"],
  "preferredContactMethod": "Email",
  "isPrimary": true,
  "notes": "Excellent broker for commercial properties",
  "relatedExchanges": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-123-4567",
    "company": "ABC Real Estate",
    "position": "Senior Broker",
    "contactType": "Broker",
    "address": {
      "street": "123 Main Street",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90210"
    },
    "source": "Referral",
    "tags": ["high-value", "commercial", "trusted"],
    "preferredContactMethod": "Email",
    "isPrimary": true,
    "notes": "Excellent broker for commercial properties",
    "relatedExchanges": [
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002"
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Get Contact by ID
```http
GET /api/contacts/{id}
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-123-4567",
    "company": "ABC Real Estate",
    "position": "Senior Broker",
    "contactType": "Broker",
    "address": {
      "street": "123 Main Street",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90210"
    },
    "source": "Referral",
    "tags": ["high-value", "commercial", "trusted"],
    "preferredContactMethod": "Email",
    "isPrimary": true,
    "notes": "Excellent broker for commercial properties",
    "relatedExchanges": [
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002"
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Update Contact
```http
PUT /api/contacts/{id}
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "position": "Managing Director",
  "tags": ["high-value", "commercial", "trusted", "senior"],
  "notes": "Promoted to Managing Director. Excellent track record.",
  "relatedExchanges": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002",
    "550e8400-e29b-41d4-a716-446655440003"
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "position": "Managing Director",
    "tags": ["high-value", "commercial", "trusted", "senior"],
    "notes": "Promoted to Managing Director. Excellent track record.",
    "relatedExchanges": [
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002",
      "550e8400-e29b-41d4-a716-446655440003"
    ],
    "updatedAt": "2024-01-15T15:45:00Z"
  }
}
```

### 4. List Contacts
```http
GET /api/contacts?page=1&limit=10&contactType=Broker&search=John
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `contactType` (string): Filter by contact type
- `source` (string): Filter by source
- `userId` (string): Filter by user ID
- `isPrimary` (boolean): Filter by primary status
- `tags` (string): Filter by tags (comma-separated)
- `search` (string): Search in name, email, company
- `sortBy` (string): Sort field (default: createdAt)
- `sortOrder` (string): asc or desc (default: desc)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "company": "ABC Real Estate",
      "position": "Managing Director",
      "contactType": "Broker",
      "isPrimary": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T15:45:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### 5. Delete Contact
```http
DELETE /api/contacts/{id}
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Contact deleted successfully"
}
```

### 6. Get Contact Statistics
```http
GET /api/contacts/stats
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "byType": {
      "Client": 85,
      "Broker": 25,
      "Attorney": 15,
      "CPA": 10,
      "Agent": 8,
      "Escrow Officer": 5,
      "Title Company": 2
    },
    "bySource": {
      "Referral": 60,
      "Website": 30,
      "Social Media": 20,
      "Event": 15,
      "Cold Call": 15,
      "Other": 10
    },
    "primaryContacts": 45,
    "recentContacts": 12,
    "withExchanges": 78
  }
}
```

### 7. Bulk Operations
```http
POST /api/contacts/bulk
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "operation": "tag",
  "contactIds": [
    "550e8400-e29b-41d4-a716-446655440003",
    "550e8400-e29b-41d4-a716-446655440004"
  ],
  "tags": ["high-value", "commercial"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "operation": "tag",
    "processed": 2,
    "successful": 2,
    "failed": 0,
    "errors": []
  }
}
```

### 8. Import Contacts
```http
POST /api/contacts/import
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Request Body:**
```
file: contacts.csv
mapping: {
  "firstName": "First Name",
  "lastName": "Last Name",
  "email": "Email",
  "company": "Company"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total": 50,
    "imported": 48,
    "skipped": 2,
    "errors": [
      {
        "row": 15,
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### 9. Export Contacts
```http
GET /api/contacts/export?format=csv&includeFields=firstName,lastName,email,company
Authorization: Bearer {token}
```

**Response (200 OK):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="contacts-2024-01-15.csv"

First Name,Last Name,Email,Company
John,Doe,john.doe@example.com,ABC Real Estate
Jane,Smith,jane.smith@example.com,XYZ Properties
```

---

## 🔒 Validation Rules

### Required Fields
- `userId`: Valid UUID
- `firstName`: String, 1-100 characters
- `lastName`: String, 1-100 characters
- `email`: Valid email format

### Optional Fields
- `phone`: String, max 20 characters
- `company`: String, max 255 characters
- `position`: String, max 255 characters
- `contactType`: Must be one of the defined enum values
- `address`: Valid address object with street, city, state, zip
- `source`: Must be one of the defined enum values
- `tags`: Array of strings
- `preferredContactMethod`: Must be one of: 'Email', 'Phone', 'Text'
- `isPrimary`: Boolean (default: false)
- `notes`: String, max 1000 characters
- `relatedExchanges`: Array of valid UUIDs

### Business Rules
1. **Email Uniqueness**: Email must be unique per user
2. **Contact Type Validation**: Contact type must be valid enum value
3. **Address Validation**: If address is provided, all fields should be present
4. **Tag Validation**: Tags should be alphanumeric and max 50 characters each
5. **Exchange References**: Related exchanges must exist in the system
6. **User Access**: Users can only access contacts they own or are shared with

---

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid contact data",
  "details": {
    "email": "Email is required and must be valid",
    "contactType": "Invalid contact type. Must be one of: Client, Broker, Attorney, CPA, Agent, Escrow Officer, Title Company, Notary, Lender, Other"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "You don't have permission to access this contact"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "Contact not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "DUPLICATE_EMAIL",
  "message": "A contact with this email already exists for this user"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

---

## 📊 Status Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (duplicate email) |
| 500 | Internal Server Error |

---

## 🔄 Contact Types and Sources

### Contact Types
- **Client**: Primary exchange clients
- **Broker**: Real estate brokers
- **Attorney**: Legal professionals
- **CPA**: Certified Public Accountants
- **Agent**: Real estate agents
- **Escrow Officer**: Escrow professionals
- **Title Company**: Title company representatives
- **Notary**: Notary publics
- **Lender**: Lending institutions
- **Other**: Miscellaneous contacts

### Contact Sources
- **Referral**: Referred by existing contact
- **Website**: Found through website
- **Social Media**: Found through social media
- **Event**: Met at an event
- **Cold Call**: Cold outreach
- **Other**: Other sources

---

*Last Updated: January 2024*  
*Version: 1.0*  
*API Base URL: https://api.peak1031.com* 