# 🚀 Peak 1031 V1 - Quick Start Guide

## Prerequisites

- **Node.js** (v18 or higher)
- **Docker** and **Docker Compose**
- **PostgreSQL** (if running locally)
- **Git**

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
# Install all dependencies (backend, frontend, and root)
npm run install:all
```

### 2. Environment Configuration

```bash
# Copy environment template
cp env.example .env

# Edit .env file with your configuration
# See env.example for all required variables
```

### 3. Start Development Environment

```bash
# Option A: Using Docker (Recommended)
npm run docker:up

# Option B: Manual setup
npm run dev
```

### 4. Database Setup

```bash
# Run migrations
npm run db:migrate

# Seed with initial data
npm run db:seed
```

## 🎯 Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 👤 Default Admin Account

- **Email**: admin@peak1031.com
- **Password**: admin123

## 🔧 Development Commands

```bash
# Start development servers
npm run dev                    # Both frontend and backend
npm run dev:backend           # Backend only
npm run dev:frontend          # Frontend only

# Docker commands
npm run docker:up            # Start all services
npm run docker:down          # Stop all services
npm run docker:build         # Rebuild and start
npm run docker:logs          # View logs

# Database commands
npm run db:migrate           # Run migrations
npm run db:seed              # Seed database

# Testing
npm run test                 # Run all tests
npm run test:backend         # Backend tests only
npm run test:frontend        # Frontend tests only
```

## 📁 Project Structure

```
peak-1031-v1/
├── backend/                 # Node.js + Express API
├── frontend/               # React + TypeScript
├── database/               # Migrations and seeds
├── deployment/             # Docker and deployment files
├── README.md              # Complete documentation
└── QUICKSTART.md          # This file
```

## 🔗 Key Integrations

- **PracticePanther API**: Sync contacts, matters, and tasks
- **SendGrid**: Email notifications
- **Twilio**: SMS notifications and 2FA
- **AWS S3**: Document storage
- **PostgreSQL**: Primary database
- **Redis**: Session storage

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 5000, 5432, and 6379 are available
2. **Database connection**: Check PostgreSQL is running and credentials are correct
3. **Docker issues**: Ensure Docker and Docker Compose are installed and running

### Reset Everything

```bash
# Stop all services
npm run docker:down

# Remove volumes (WARNING: This deletes all data)
docker-compose down -v

# Rebuild and start
npm run docker:build
```

## 📞 Support

For issues or questions:
1. Check the main README.md for detailed documentation
2. Review the API documentation at `/api/health`
3. Check Docker logs: `npm run docker:logs`

## 🎉 Next Steps

1. Configure your PracticePanther API credentials
2. Set up SendGrid and Twilio for notifications
3. Configure AWS S3 for document storage
4. Customize the application for your specific needs
5. Deploy to production using the deployment scripts

---

**Happy coding! 🎯** 