# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands
- Setup: `npm run setup` (installs all dependencies, starts Docker, runs migrations and seeds)
- Install all dependencies: `npm run install:all`
- Start development: `npm run dev` (runs backend and frontend concurrently)
- Start backend only: `npm run dev:backend` 
- Start frontend only: `npm run dev:frontend`
- Run tests: `npm test` (runs both backend and frontend tests)
- Build production: `npm run build`
- Docker commands: `npm run docker:up`, `npm run docker:down`, `npm run docker:build`
- Database migrations: `npm run db:migrate`
- Database seeding: `npm run db:seed`

## Architecture Overview
This is a full-stack 1031 exchange management platform with React TypeScript frontend and Node.js Express backend.

### Backend Architecture (Node.js + Express + PostgreSQL)
- **Entry Point**: `backend/app.js` - Express app configuration with middleware
- **Server**: `backend/server.js` - HTTP server with Socket.IO for real-time features
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT-based with role-based access control (RBAC)
- **Real-time**: Socket.IO for messaging and live updates
- **External Integration**: PracticePanther API sync (read-only)

### Frontend Architecture (React + TypeScript + Tailwind CSS)
- **Entry Point**: `frontend/src/index.tsx`
- **Main Component**: `frontend/src/App.tsx` with role-based routing
- **State Management**: React Context (AuthProvider, SocketProvider)
- **Styling**: Tailwind CSS with component-based architecture
- **Role-based Dashboards**: Admin, Client, Coordinator, ThirdParty, Agency

### Key Components
- `Layout.tsx` - Main layout with navigation and role-based sidebar
- `ContactCard.tsx` - Display PracticePanther synced contacts
- `ExchangeCard.tsx` - Exchange management and status display
- `TaskBoard.tsx` - Task management with Kanban-style board
- `ChatBox.tsx` - Real-time messaging between participants
- `PracticePartnerSync.tsx` - PracticePanther sync controls

### User Roles & Permissions
- **admin**: Full system access, user management, sync controls
- **client**: View assigned exchanges, documents, messaging
- **coordinator**: Manage multiple exchanges, assign users
- **third_party**: Read-only access to assigned exchanges
- **agency**: Multi-client view for agency users

## Development Workflow
1. **Initial Setup**: Run `npm run setup` to install dependencies and initialize database
2. **Development**: Use `npm run dev` to start both backend (port 5000) and frontend (port 8000)
3. **Database Changes**: Create migrations in `backend/migrations/` and run `npm run db:migrate`
4. **Frontend Port**: React app runs on port 8000 (configured in frontend/package.json)
5. **Backend Port**: API server runs on port 5000
6. **Docker**: PostgreSQL and other services run in Docker containers

## Code Style Guidelines
- **TypeScript**: Frontend uses TypeScript with React
- **JavaScript**: Backend uses Node.js with modern ES6+ features
- **Imports**: Order imports: 1) External packages 2) Internal modules
- **Naming**: camelCase for variables/functions, PascalCase for React components
- **Error Handling**: Use try/catch blocks with proper error logging
- **Authentication**: All API routes require JWT authentication except `/auth/login`
- **File Structure**: Group related functionality in service layers

## Key Integrations
- **PracticePanther API**: One-way sync for contacts, matters (exchanges), and tasks
- **Socket.IO**: Real-time messaging and live updates
- **JWT Authentication**: Role-based access control throughout the application
- **File Storage**: Document upload/download with role-based permissions
- **Email/SMS**: SendGrid and Twilio integration for notifications

## Testing
- Backend tests: Located in `backend/tests/` using Jest
- Frontend tests: React Testing Library and Jest
- Run all tests: `npm test`
- Run specific tests: `npm run test:backend` or `npm run test:frontend`

## Important Notes
- Frontend runs on port 8000 (not default 3000)
- All API routes are prefixed with `/api/`
- Database uses PostgreSQL (not MySQL or SQLite in production)
- PracticePanther integration is read-only (GET requests only)
- Real-time features require Socket.IO connection
- All routes except login require authentication
- Role-based access control is enforced on both frontend and backend