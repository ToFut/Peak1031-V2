#\!/bin/bash

echo "🔐 Testing admin access to Demo Segev exchange..."

# Login as admin
echo "1. Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:5001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@peak1031.com","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$TOKEN" == "null" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"

# Get exchanges and find Demo Segev
echo -e "\n2. Looking for Demo Segev exchange..."
EXCHANGES=$(curl -s "http://localhost:5001/api/exchanges" \
  -H "Authorization: Bearer $TOKEN")

# Find Demo Segev exchange
DEMO_SEGEV_ID=$(echo $EXCHANGES | jq -r '.exchanges[] | select(.name | contains("Demo Segev")) | .id' | head -1)

if [ -z "$DEMO_SEGEV_ID" ]; then
  echo "❌ Demo Segev exchange not found"
  echo "Available exchanges:"
  echo $EXCHANGES | jq -r '.exchanges[0:5] | .[] | .name'
  exit 1
fi

echo "✅ Found Demo Segev exchange: $DEMO_SEGEV_ID"

# Get messages
echo -e "\n3. Fetching messages..."
MESSAGES=$(curl -s "http://localhost:5001/api/messages/exchange/$DEMO_SEGEV_ID" \
  -H "Authorization: Bearer $TOKEN")

MESSAGE_COUNT=$(echo $MESSAGES | jq '.data | length')
echo "✅ Found $MESSAGE_COUNT messages"

if [ "$MESSAGE_COUNT" -gt "0" ]; then
  echo -e "\nFirst 3 messages:"
  echo $MESSAGES | jq -r '.data[0:3] | .[] | "\n- Content: \(.content[0:80])...\n  Sender: \(.sender.email // "Unknown")\n  Date: \(.created_at)"'
fi
