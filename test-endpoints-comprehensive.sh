#!/bin/bash

# Comprehensive API Endpoint Testing Script
# This script gets a fresh admin token and tests all available API endpoints

BASE_URL="http://localhost:5001"
ADMIN_EMAIL="admin@peak1031.com"
ADMIN_PASSWORD="admin123"

echo "🔍 COMPREHENSIVE API ENDPOINT TESTING"
echo "====================================="
echo "Base URL: $BASE_URL"
echo "Admin Email: $ADMIN_EMAIL"
echo ""

# Function to get a fresh token
get_fresh_token() {
    echo "🔄 Getting fresh admin token..."
    local response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
    
    local token=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$token" ]; then
        echo "❌ Failed to get token"
        echo "Response: $response"
        return 1
    fi
    
    echo "✅ Token obtained successfully"
    echo "$token"
}

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    local token=$5
    
    echo "🧪 Testing: $description"
    echo "   $method $endpoint"
    
    local response
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $token" "$BASE_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $token" "$BASE_URL$endpoint")
    fi
    
    # Extract status code (last line)
    local status_code=$(echo "$response" | tail -n1)
    # Extract response body (all but last line)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
        echo "   ✅ SUCCESS ($status_code)"
        echo "   📄 Response: $(echo "$body" | head -c 100)..."
    else
        echo "   ❌ FAILED ($status_code)"
        echo "   📄 Response: $(echo "$body" | head -c 200)..."
    fi
    echo ""
}

# Get fresh token
TOKEN=$(get_fresh_token)
if [ $? -ne 0 ]; then
    echo "❌ Failed to get token. Exiting."
    exit 1
fi

echo "Token: ${TOKEN:0:50}..."
echo ""

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
test_endpoint "GET" "/api/auth/me" "" "Get Current User" "$TOKEN"

# Users endpoints
test_endpoint "GET" "/api/users" "" "Get All Users" "$TOKEN"

# Contacts endpoints
test_endpoint "GET" "/api/contacts" "" "Get All Contacts" "$TOKEN"

# Exchanges endpoints
test_endpoint "GET" "/api/exchanges" "" "Get All Exchanges" "$TOKEN"
test_endpoint "GET" "/api/exchanges/test" "" "Test Exchanges Connection" "$TOKEN"

# Tasks endpoints
test_endpoint "GET" "/api/tasks" "" "Get All Tasks" "$TOKEN"

# Documents endpoints
test_endpoint "GET" "/api/documents" "" "Get All Documents" "$TOKEN"
test_endpoint "GET" "/api/documents/templates" "" "Get Document Templates" "$TOKEN"

# Messages endpoints
test_endpoint "GET" "/api/messages" "" "Get All Messages" "$TOKEN"

# Notifications endpoints
test_endpoint "GET" "/api/notifications" "" "Get All Notifications" "$TOKEN"

# Sync endpoints
test_endpoint "GET" "/api/sync" "" "Get Sync Status" "$TOKEN"

# Admin endpoints
test_endpoint "GET" "/api/admin" "" "Get Admin Dashboard" "$TOKEN"

# Dashboard endpoints
test_endpoint "GET" "/api/dashboard" "" "Get Dashboard Data" "$TOKEN"

# Exchange Participants endpoints
test_endpoint "GET" "/api/exchange-participants" "" "Get Exchange Participants" "$TOKEN"

# Enterprise endpoints
test_endpoint "GET" "/api/enterprise/exchanges" "" "Get Enterprise Exchanges" "$TOKEN"
test_endpoint "GET" "/api/enterprise/exchanges/stats" "" "Get Enterprise Exchange Stats" "$TOKEN"

# Account Management endpoints
test_endpoint "GET" "/api/account/profile" "" "Get Account Profile" "$TOKEN"
test_endpoint "GET" "/api/account/preferences" "" "Get Account Preferences" "$TOKEN"
test_endpoint "GET" "/api/account/notifications" "" "Get Account Notifications" "$TOKEN"

# OAuth endpoints
test_endpoint "GET" "/api/oauth/providers" "" "Get OAuth Providers" "$TOKEN"

# Export endpoints
test_endpoint "GET" "/api/exports" "" "Get Export Options" "$TOKEN"

echo "🏁 ENDPOINT TESTING COMPLETED"
echo "=============================" 