# Exchange API Schema Documentation

## Overview
This document defines the complete Exchange API schema for the Peak 1031 Platform, matching the comprehensive JSON schema requirements.

---

## 🏗️ Exchange Data Model

### Core Exchange Object
```typescript
interface Exchange {
  id: string; // UUID
  exchangeName: string;
  clientId: string; // UUID
  exchangeType: 'Delayed' | 'Reverse' | 'Improvement' | 'Other';
  relinquishedPropertyAddress?: string;
  relinquishedSalePrice?: number;
  relinquishedClosingDate?: string; // ISO date
  replacementProperties?: ReplacementProperty[];
  identificationDate?: string; // ISO date
  exchangeDeadline?: string; // ISO date
  exchangeCoordinator?: string;
  attorneyOrCPA?: string;
  bankAccountEscrow?: string;
  notes?: string;
  status: 'In Progress' | 'Completed' | 'Cancelled' | 'Draft';
  documents?: string[]; // Array of URIs
  createdAt: string; // ISO date-time
  updatedAt: string; // ISO date-time
}
```

### Replacement Property Object
```typescript
interface ReplacementProperty {
  address: string;
  purchasePrice: number;
  closingDate: string; // ISO date
}
```

---

## 🔌 API Endpoints

### 1. Create Exchange
```http
POST /api/exchanges
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "exchangeName": "1031 Exchange - Sunset Plaza Property",
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "exchangeType": "Delayed",
  "relinquishedPropertyAddress": "6767 Sunset Plaza, Los Angeles, CA 90210",
  "relinquishedSalePrice": 2500000.00,
  "relinquishedClosingDate": "2024-01-15",
  "replacementProperties": [
    {
      "address": "1234 Ocean Drive, Malibu, CA 90265",
      "purchasePrice": 2800000.00,
      "closingDate": "2024-03-15"
    }
  ],
  "identificationDate": "2024-03-01",
  "exchangeDeadline": "2024-07-15",
  "exchangeCoordinator": "John Smith",
  "attorneyOrCPA": "Jane Doe, Esq.",
  "bankAccountEscrow": "Wells Fargo Escrow #12345",
  "notes": "High-value commercial property exchange",
  "status": "In Progress",
  "documents": [
    "https://api.peak1031.com/documents/exchange-123/contract.pdf",
    "https://api.peak1031.com/documents/exchange-123/appraisal.pdf"
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "exchangeName": "1031 Exchange - Sunset Plaza Property",
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "exchangeType": "Delayed",
    "relinquishedPropertyAddress": "6767 Sunset Plaza, Los Angeles, CA 90210",
    "relinquishedSalePrice": 2500000.00,
    "relinquishedClosingDate": "2024-01-15",
    "replacementProperties": [
      {
        "address": "1234 Ocean Drive, Malibu, CA 90265",
        "purchasePrice": 2800000.00,
        "closingDate": "2024-03-15"
      }
    ],
    "identificationDate": "2024-03-01",
    "exchangeDeadline": "2024-07-15",
    "exchangeCoordinator": "John Smith",
    "attorneyOrCPA": "Jane Doe, Esq.",
    "bankAccountEscrow": "Wells Fargo Escrow #12345",
    "notes": "High-value commercial property exchange",
    "status": "In Progress",
    "documents": [
      "https://api.peak1031.com/documents/exchange-123/contract.pdf",
      "https://api.peak1031.com/documents/exchange-123/appraisal.pdf"
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Get Exchange by ID
```http
GET /api/exchanges/{id}
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "exchangeName": "1031 Exchange - Sunset Plaza Property",
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "exchangeType": "Delayed",
    "relinquishedPropertyAddress": "6767 Sunset Plaza, Los Angeles, CA 90210",
    "relinquishedSalePrice": 2500000.00,
    "relinquishedClosingDate": "2024-01-15",
    "replacementProperties": [
      {
        "address": "1234 Ocean Drive, Malibu, CA 90265",
        "purchasePrice": 2800000.00,
        "closingDate": "2024-03-15"
      }
    ],
    "identificationDate": "2024-03-01",
    "exchangeDeadline": "2024-07-15",
    "exchangeCoordinator": "John Smith",
    "attorneyOrCPA": "Jane Doe, Esq.",
    "bankAccountEscrow": "Wells Fargo Escrow #12345",
    "notes": "High-value commercial property exchange",
    "status": "In Progress",
    "documents": [
      "https://api.peak1031.com/documents/exchange-123/contract.pdf",
      "https://api.peak1031.com/documents/exchange-123/appraisal.pdf"
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Update Exchange
```http
PUT /api/exchanges/{id}
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "status": "Completed",
  "notes": "Exchange successfully completed on schedule",
  "documents": [
    "https://api.peak1031.com/documents/exchange-123/contract.pdf",
    "https://api.peak1031.com/documents/exchange-123/appraisal.pdf",
    "https://api.peak1031.com/documents/exchange-123/closing-statement.pdf"
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "exchangeName": "1031 Exchange - Sunset Plaza Property",
    "status": "Completed",
    "notes": "Exchange successfully completed on schedule",
    "documents": [
      "https://api.peak1031.com/documents/exchange-123/contract.pdf",
      "https://api.peak1031.com/documents/exchange-123/appraisal.pdf",
      "https://api.peak1031.com/documents/exchange-123/closing-statement.pdf"
    ],
    "updatedAt": "2024-07-15T15:45:00Z"
  }
}
```

### 4. List Exchanges
```http
GET /api/exchanges?page=1&limit=10&status=In Progress&exchangeType=Delayed
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `status` (string): Filter by status
- `exchangeType` (string): Filter by exchange type
- `clientId` (string): Filter by client ID
- `search` (string): Search in exchange name
- `sortBy` (string): Sort field (default: createdAt)
- `sortOrder` (string): asc or desc (default: desc)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "exchangeName": "1031 Exchange - Sunset Plaza Property",
      "clientId": "550e8400-e29b-41d4-a716-446655440000",
      "exchangeType": "Delayed",
      "relinquishedPropertyAddress": "6767 Sunset Plaza, Los Angeles, CA 90210",
      "relinquishedSalePrice": 2500000.00,
      "status": "In Progress",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
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

### 5. Delete Exchange
```http
DELETE /api/exchanges/{id}
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Exchange deleted successfully"
}
```

### 6. Get Exchange Statistics
```http
GET /api/exchanges/stats
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "byStatus": {
      "In Progress": 45,
      "Completed": 95,
      "Cancelled": 8,
      "Draft": 2
    },
    "byType": {
      "Delayed": 120,
      "Reverse": 15,
      "Improvement": 10,
      "Other": 5
    },
    "upcomingDeadlines": 12,
    "overdue": 3,
    "completedThisMonth": 8,
    "totalValue": 450000000.00
  }
}
```

---

## 🔒 Validation Rules

### Required Fields
- `exchangeName`: String, 1-255 characters
- `clientId`: Valid UUID
- `exchangeType`: Must be one of: 'Delayed', 'Reverse', 'Improvement', 'Other'
- `status`: Must be one of: 'In Progress', 'Completed', 'Cancelled', 'Draft'

### Optional Fields
- `relinquishedPropertyAddress`: String, max 500 characters
- `relinquishedSalePrice`: Number, positive value
- `relinquishedClosingDate`: Valid ISO date string
- `replacementProperties`: Array of ReplacementProperty objects
- `identificationDate`: Valid ISO date string
- `exchangeDeadline`: Valid ISO date string
- `exchangeCoordinator`: String, max 255 characters
- `attorneyOrCPA`: String, max 255 characters
- `bankAccountEscrow`: String, max 255 characters
- `notes`: String, max 1000 characters
- `documents`: Array of valid URIs

### Business Rules
1. **Date Validation**: `identificationDate` must be within 45 days of `relinquishedClosingDate`
2. **Exchange Deadline**: `exchangeDeadline` must be within 180 days of `relinquishedClosingDate`
3. **Status Transitions**: Only valid status transitions are allowed
4. **Client Access**: Users can only access exchanges for their assigned clients
5. **Document URIs**: All document URIs must be accessible and valid

---

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid exchange data",
  "details": {
    "exchangeName": "Exchange name is required",
    "exchangeType": "Invalid exchange type. Must be one of: Delayed, Reverse, Improvement, Other"
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
  "message": "You don't have permission to access this exchange"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "Exchange not found"
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
| 500 | Internal Server Error |

---

## 🔄 Status Transitions

### Valid Status Flow
```
Draft → In Progress → Completed
Draft → In Progress → Cancelled
Draft → Cancelled
```

### Status Descriptions
- **Draft**: Initial state, exchange being planned
- **In Progress**: Exchange is active and being processed
- **Completed**: Exchange successfully completed
- **Cancelled**: Exchange was cancelled

---

*Last Updated: January 2024*  
*Version: 1.0*  
*API Base URL: https://api.peak1031.com* 