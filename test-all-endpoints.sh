#!/bin/bash

# API Endpoint Testing Script with Admin Credentials
# This script tests all available API endpoints

BASE_URL="http://localhost:5001"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlNzAyY2EwNC00NDA4LTRkYzItYTg1NC00N2RmZjA5MzZhZjAiLCJlbWFpbCI6ImFkbWluQHBlYWsxMDMxLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NDUwMjgyOCwiZXhwIjoxNzU0NTAzNzI4LCJhdWQiOiJwZWFrMTAzMS11c2VycyIsImlzcyI6InBlYWsxMDMxIn0.TgbO_pUeW1ZL8nKXtOmsZDr4-26jcVix3ZEwEMTZACY"

echo "🔍 TESTING ALL API ENDPOINTS WITH ADMIN CREDENTIALS"
echo "=================================================="
echo "Base URL: $BASE_URL"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo "🧪 Testing: $description"
    echo "   $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE_URL$endpoint")
    fi
    
    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n1)
    # Extract response body (all but last line)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
        echo "   ✅ SUCCESS ($status_code)"
        echo "   📄 Response: $(echo "$body" | head -c 100)..."
    else
        echo "   ❌ FAILED ($status_code)"
        echo "   📄 Response: $(echo "$body" | head -c 200)..."
    fi
    echo ""
}

# Test public endpoints (no auth required)
echo "🌐 PUBLIC ENDPOINTS (No Auth Required)"
echo "--------------------------------------"

echo "🧪 Testing: Health Check"
echo "   GET /api/health"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/health")
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)
if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
    echo "   ✅ SUCCESS ($status_code)"
    echo "   📄 Response: $(echo "$body" | head -c 100)..."
else
    echo "   ❌ FAILED ($status_code)"
    echo "   📄 Response: $(echo "$body" | head -c 200)..."
fi
echo ""

echo "🧪 Testing: API Documentation"
echo "   GET /api"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api")
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)
if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
    echo "   ✅ SUCCESS ($status_code)"
    echo "   📄 Response: $(echo "$body" | head -c 100)..."
else
    echo "   ❌ FAILED ($status_code)"
    echo "   📄 Response: $(echo "$body" | head -c 200)..."
fi
echo ""

# Test authenticated endpoints
echo "🔐 AUTHENTICATED ENDPOINTS (Admin Token Required)"
echo "------------------------------------------------"

# Auth endpoints
test_endpoint "GET" "/api/auth/me" "" "Get Current User"

# Users endpoints
test_endpoint "GET" "/api/users" "" "Get All Users"

# Contacts endpoints
test_endpoint "GET" "/api/contacts" "" "Get All Contacts"

# Exchanges endpoints
test_endpoint "GET" "/api/exchanges" "" "Get All Exchanges"
test_endpoint "GET" "/api/exchanges/test" "" "Test Exchanges Connection"

# Tasks endpoints
test_endpoint "GET" "/api/tasks" "" "Get All Tasks"

# Documents endpoints
test_endpoint "GET" "/api/documents" "" "Get All Documents"
test_endpoint "GET" "/api/documents/templates" "" "Get Document Templates"

# Messages endpoints
test_endpoint "GET" "/api/messages" "" "Get All Messages"

# Notifications endpoints
test_endpoint "GET" "/api/notifications" "" "Get All Notifications"

# Sync endpoints
test_endpoint "GET" "/api/sync" "" "Get Sync Status"

# Admin endpoints
test_endpoint "GET" "/api/admin" "" "Get Admin Dashboard"

# Dashboard endpoints
test_endpoint "GET" "/api/dashboard" "" "Get Dashboard Data"

# Exchange Participants endpoints
test_endpoint "GET" "/api/exchange-participants" "" "Get Exchange Participants"

# Enterprise endpoints
test_endpoint "GET" "/api/enterprise/exchanges" "" "Get Enterprise Exchanges"
test_endpoint "GET" "/api/enterprise/exchanges/stats" "" "Get Enterprise Exchange Stats"

# Account Management endpoints
test_endpoint "GET" "/api/account/profile" "" "Get Account Profile"
test_endpoint "GET" "/api/account/preferences" "" "Get Account Preferences"
test_endpoint "GET" "/api/account/notifications" "" "Get Account Notifications"

# OAuth endpoints
test_endpoint "GET" "/api/oauth/providers" "" "Get OAuth Providers"

# Export endpoints
test_endpoint "GET" "/api/exports" "" "Get Export Options"

echo "🏁 ENDPOINT TESTING COMPLETED"
echo "=============================" 