#!/bin/bash

echo "🚀 Installing Next-Generation Task Management Dependencies..."

# Navigate to frontend directory
cd frontend

# Install calendar and UI libraries
echo "📅 Installing Calendar Libraries..."
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction

# Install drag & drop and performance libraries
echo "🔄 Installing Drag & Drop Libraries..."
npm install react-beautiful-dnd react-window

# Install real-time collaboration
echo "🔗 Installing Real-time Libraries..."
npm install socket.io-client

# Install UI enhancement libraries
echo "🎨 Installing UI Enhancement Libraries..."
npm install framer-motion recharts date-fns

# Install data management
echo "📊 Installing Data Management Libraries..."
npm install react-query

# Create next-gen components directory
echo "📁 Creating Next-Generation Components Directory..."
mkdir -p src/features/tasks/components/next-gen

# Create component files
echo "📝 Creating Component Files..."
touch src/features/tasks/components/next-gen/CalendarView.tsx
touch src/features/tasks/components/next-gen/EnhancedKanban.tsx
touch src/features/tasks/components/next-gen/SmartListView.tsx
touch src/features/tasks/components/next-gen/AITaskService.tsx
touch src/features/tasks/components/next-gen/CollaborationService.tsx
touch src/features/tasks/components/next-gen/AnalyticsDashboard.tsx

echo "✅ Installation Complete!"
echo ""
echo "🎯 Next Steps:"
echo "1. Review the NEXT_GEN_TASK_VIEWS_PLAN.md file"
echo "2. Check out the CalendarView.tsx example"
echo "3. Start implementing the enhanced views"
echo "4. Test the calendar view with: npm start"
echo ""
echo "📚 Available Components:"
echo "- CalendarView.tsx (Real calendar with drag & drop)"
echo "- EnhancedKanban.tsx (Smart kanban with AI)"
echo "- SmartListView.tsx (Advanced data grid)"
echo "- AITaskService.tsx (AI-powered features)"
echo "- CollaborationService.tsx (Real-time collaboration)"
echo "- AnalyticsDashboard.tsx (Performance metrics)"
