#!/bin/bash

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Kill processes on ports 8000 and 8001
for port in 8000 8001; do
  pid=$(lsof -ti tcp:$port)
  if [ -n "$pid" ]; then
    echo "Killing process on port $port (PID $pid)"
    kill -9 $pid
  else
    echo "No process running on port $port"
  fi
done

echo "Starting backend (port 8001) with rate limiting disabled and CORS fixed..."
(cd "$SCRIPT_DIR/backend" && DISABLE_RATE_LIMIT=true npm run dev > "$SCRIPT_DIR/backend.log" 2>&1 &)
BACKEND_PID=$!

echo "Starting frontend (port 8000)..."
(cd "$SCRIPT_DIR/frontend" && PORT=8000 npm start > "$SCRIPT_DIR/frontend.log" 2>&1 &)
FRONTEND_PID=$!

echo "Backend running in background (logs: $SCRIPT_DIR/backend.log)"
echo "Frontend running in background (logs: $SCRIPT_DIR/frontend.log)"
echo "Visit: http://localhost:8000"
echo "Login: admin@peak1031.com / admin123"
echo ""
echo "✅ CORS fixed - Frontend can now communicate with backend!" 