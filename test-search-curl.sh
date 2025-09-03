#!/bin/bash

echo "🔍 Testing search fix with curl..."

# Step 1: Get authentication token
echo "1. Getting authentication token..."
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@peak1031.com","password":"admin123"}' | \
  grep -o '"token":"[^"]*"' | \
  cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get authentication token"
  exit 1
fi

echo "✅ Got authentication token"

# Step 2: Test the search that was failing
echo "2. Testing search with 'segev'..."
RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  "http://localhost:5001/api/exchanges?search=segev&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_STATUS=$(echo $RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
HTTP_BODY=$(echo $RESPONSE | sed -e 's/HTTPSTATUS:.*//g')

echo "Search response status: $HTTP_STATUS"

if [ $HTTP_STATUS -eq 200 ]; then
  echo "✅ Search successful!"
  echo "Response: $HTTP_BODY" | head -20
else
  echo "❌ Search failed with status $HTTP_STATUS"
  echo "Response: $HTTP_BODY"
fi