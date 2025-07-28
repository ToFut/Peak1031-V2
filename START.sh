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

echo "\nStarting backend (port 8001)..."
(cd "$SCRIPT_DIR/backend" && npm run dev > "$SCRIPT_DIR/backend.log" 2>&1 &)
BACKEND_PID=$!

echo "Starting frontend (port 8000)..."
(cd "$SCRIPT_DIR/frontend" && npm start > "$SCRIPT_DIR/frontend.log" 2>&1 &)
FRONTEND_PID=$!

echo "\nBackend running in background (logs: $SCRIPT_DIR/backend.log)"
echo "Frontend running in background (logs: $SCRIPT_DIR/frontend.log)"
echo "\nVisit: http://localhost:8000" 