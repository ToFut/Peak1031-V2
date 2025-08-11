# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

### Development Servers
- **Start all**: `npm run dev` (runs both backend and frontend concurrently)
- **Backend only**: `npm run dev:backend` (starts on port 5001 with nodemon)
- **Frontend only**: `npm run dev:frontend` (starts React app on port 3000)

### Database & Setup
- **Full setup**: `npm run setup` (installs dependencies, starts Docker, runs migrations and seeds)
- **Install all dependencies**: `npm run install:all`
- **Database migration**: `npm run db:migrate`
- **Database seed**: `npm run db:seed`

### Testing
- **Run all tests**: `npm test`
- **Backend tests**: `npm run test:backend` (Jest)
- **Frontend tests**: `npm run test:frontend` (React Testing Library)
- **API testing**: `cd backend && npm run test:api`
- **Working endpoints test**: `cd backend && npm run test:working`
- **Comprehensive fix test**: `cd backend && npm run test:fix`
- **Enhanced features test**: `npm run test:enhanced`

### Docker Commands
- **Start services**: `npm run docker:up`
- **Stop services**: `npm run docker:down`
- **Build and start**: `npm run docker:build`
- **View logs**: `npm run docker:logs`

### Build Commands
- **Production build**: `npm run build`

### Database Management
- **Migrate up**: `cd backend && npm run migrate` (or `sequelize-cli db:migrate`)
- **Migrate down**: `cd backend && npm run migrate:undo`
- **Seed database**: `cd backend && npm run seed` (or `sequelize-cli db:seed:all`) 
- **Undo seeds**: `cd backend && npm run seed:undo`

## Architecture Overview

This is a full-stack 1031 exchange management platform with PracticePanther integration, built as a modern SaaS application.

### Core Technology Stack
- **Backend**: Node.js + Express.js with Supabase (PostgreSQL)
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Real-time**: Socket.IO for messaging
- **Authentication**: JWT with role-based access control
- **File Storage**: AWS S3 (configured via environment)
- **External API**: PracticePanther OAuth integration

### Project Structure
- **Backend** (`/backend`): Express API server with routes, services, middleware
- **Frontend** (`/frontend`): React TypeScript application with feature-based organization
- **Database** (`/database`): SQL migrations and schema files
- **Development** (`/development`): Development utilities and test scripts

### Backend Architecture Patterns

#### Service Layer Pattern
- Services handle business logic (`/backend/services/`)
- Routes handle HTTP requests and delegate to services
- Middleware handles cross-cutting concerns (auth, audit, CORS)

#### Key Services
- **PracticePanther Integration**: `practicePartner/` (OAuth, data sync, field mapping)
- **Authentication**: `supabaseAuth.js` (JWT, user management)
- **Real-time Messaging**: `socketService.js`, `messageService.js`
- **Document Management**: `documentService.js` (file upload, PIN protection)
- **Dashboard Data**: `dashboardService.js` (aggregated views by role)

#### Database Integration
- **Primary**: Supabase (PostgreSQL) for all persistent data
- **Models**: Reference models in `/backend/models/` (not active ORM)
- **Direct SQL**: Uses Supabase client for database operations
- **Migrations**: SQL files in `/database/migrations/`

### Frontend Architecture Patterns

#### Feature-Based Organization
Components are organized by feature domains:
- `/features/auth/` - Authentication and login
- `/features/dashboard/` - Role-specific dashboards
- `/features/exchanges/` - Exchange management
- `/features/messages/` - Real-time messaging
- `/features/contacts/` - Contact management
- `/features/documents/` - Document management
- `/features/tasks/` - Task management
- `/features/users/` - User administration

#### Role-Based Access Control
Five distinct user roles with different permissions:
- **Admin**: Full system access, user management, sync controls
- **Coordinator**: Multi-exchange management, user assignments
- **Client**: View assigned exchanges, documents, messaging
- **Third Party**: Read-only access to assigned exchanges
- **Agency**: Multi-client agency overview

#### State Management
- **Authentication**: Custom React hook `useAuth`
- **Real-time**: Custom hook `useSocket` for Socket.IO integration
- **API Calls**: Centralized in `/services/api.ts`
- **No global state management** - uses React's built-in state and context

### Data Flow Patterns

#### PracticePanther Sync
- **One-way sync** from PracticePanther (read-only)
- **Entities synced**: Contacts, Matters (→ Exchanges), Tasks
- **Sync scheduling**: Configurable intervals via cron jobs
- **Conflict resolution**: PracticePanther is source of truth

#### Real-time Messaging
- **Socket.IO rooms** for exchange-specific messaging
- **Authentication middleware** on socket connections
- **Message persistence** with file attachment support
- **Notification integration** (email/SMS via SendGrid/Twilio)

## Development Guidelines

### Code Style
- **TypeScript**: Strict mode enabled for frontend
- **ESLint**: React and TypeScript rules configured
- **Formatting**: Use existing patterns (2-space indentation)
- **File naming**: camelCase for files, PascalCase for React components

### Security Practices
- **JWT tokens** for authentication with role-based permissions
- **Environment variables** for all secrets (stored in backend/.env)
- **Input validation** on all API endpoints
- **File upload security** with type and size restrictions
- **Audit logging** for all significant user actions

### Database Operations
- **Use Supabase client** directly, not ORM
- **Transaction support** via Supabase
- **Row Level Security** configured for multi-tenant isolation
- **Migrations** should be added to `/database/migrations/`

### Testing Approach
- **API testing**: Comprehensive endpoint tests in `/backend/scripts/test/`
- **Unit tests**: Jest for backend, React Testing Library for frontend
- **Integration tests**: Full authentication and database flows
- **Manual testing**: UI flows for all user roles
- **Test data**: Sample data available in `/database/seeds/` and various test scripts
- **Endpoint testing**: Multiple test files including `test-all-endpoints.js`, `test-working-endpoints.js`

## Common Development Tasks

### Adding New Features
1. **Backend**: Add route → service → update database schema if needed
2. **Frontend**: Create feature component → add route to App.tsx → test with all user roles
3. **Security**: Verify role-based access control is implemented
4. **Testing**: Add API endpoint tests and frontend component tests

### PracticePanther Integration
- **OAuth setup**: Use existing token management in `practicePartner/tokenManager.js`
- **Data mapping**: Field mapping service handles PP→local data transformation
- **Sync monitoring**: Comprehensive logging and error handling built-in
- **Rate limiting**: Respects PracticePanther API limits

### Database Changes
- **Schema changes**: Create new migration file in `/database/migrations/`
- **Apply migrations**: Run `npm run db:migrate`
- **Seed data**: Add to `/database/seeds/` if needed
- **Test migrations**: Always test migration rollback capability

### Environment Configuration
- **Backend environment**: `/backend/.env` (copy from .env.example)
- **Required variables**: Database URL, JWT secret, PracticePanther OAuth, SendGrid, AWS S3
- **Frontend environment**: Uses REACT_APP_ prefixed variables
- **Docker environment**: Configured in docker-compose.yml

## Important File Locations

### Key Configuration Files
- **Main package.json**: Root level coordination of backend/frontend services
- **Backend package.json**: Express server with Sequelize, Socket.IO, JWT auth
- **Frontend package.json**: React 18 + TypeScript with Tailwind CSS
- **Docker compose**: `docker-compose.yml` for development environment
- **Database migrations**: `/database/migrations/` for schema management
- **Environment templates**: `env.example` and `/backend/.env.example`

### Migration Management
- **Latest comprehensive schema**: `/database/migrations/200_comprehensive_optimized_schema_fixed.sql`
- **Missing columns fix**: `/database/migrations/201_add_missing_columns.sql`
- **Migration scripts**: Various migration and data sync scripts in `/backend/scripts/`

## Important Implementation Notes

### Authentication Flow
- **Login**: POST `/api/auth/login` returns JWT token
- **Token verification**: All protected routes use `authenticateToken` middleware  
- **Role checking**: Additional role-based middleware for sensitive operations
- **Token refresh**: Automatic refresh handling in frontend API service

### Real-time Features
- **Socket connection**: Requires valid JWT token for authentication
- **Room management**: Users auto-join relevant exchange rooms based on assignments
- **Message delivery**: Persistent storage + real-time delivery + offline notifications
- **Typing indicators**: Implemented for better user experience

### File Management
- **Upload endpoint**: POST `/api/documents` with multipart form data
- **Storage**: AWS S3 integration with signed URL generation
- **Security**: PIN protection available for sensitive documents
- **File types**: PDF, DOCX, images supported with virus scanning

### Error Handling
- **Global error handler**: Comprehensive logging and user-friendly error messages
- **Audit trail**: All errors logged with user context and request details
- **Graceful degradation**: System continues to function if external services fail
- **User feedback**: Clear error messages displayed in UI

This architecture supports a scalable, secure, and maintainable 1031 exchange management platform with comprehensive PracticePanther integration and role-based access control.

## Development Notes

### Project State
- **Current branch**: Working on `main` (main development branch is `feature/project-updates`)
- **Recent focus**: TypeScript compilation fixes, layout improvements, OAuth integration
- **Database**: Uses Supabase PostgreSQL with comprehensive schema in latest migrations
- **Active development**: Frontend uses feature-based organization with role-specific components

### Common Issues and Solutions
- **Build issues**: Run `npm run install:all` to ensure all dependencies are installed
- **Database sync**: Use migration scripts in `/database/migrations/` for schema updates
- **Frontend compilation**: TypeScript strict mode enabled - check type definitions in `/frontend/src/types/`
- **Backend testing**: Multiple test suites available for different components and integration levels
- **PracticePanther integration**: OAuth flow and data sync handled by services in `/backend/services/`