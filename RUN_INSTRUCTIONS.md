# Peak 1031 - How to Run

## Quick Start

1. **One-command startup:**
   ```bash
   ./START.sh
   ```

2. **Access the application:**
   - Frontend: http://localhost:8000
   - Backend API: http://localhost:8001/api
   - Login: admin@peak1031.com / admin123

## Manual Startup

### Terminal 1 - Backend
```bash
cd backend
npm run dev
# or for production: npm start
```

### Terminal 2 - Frontend  
```bash
cd frontend
npm start
```

## Verification

```bash
# Check backend
curl http://localhost:8001/health

# Check frontend
curl http://localhost:8000
```

## Troubleshooting

### Kill existing processes:
```bash
pkill -f nodemon
pkill -f "react-scripts"
lsof -ti:8000 | xargs kill -9
lsof -ti:8001 | xargs kill -9
```

### Reset database:
```bash
cd backend
rm -f database.sqlite
node scripts/seed-exchange-chat.js
```

### Check logs:
```bash
tail -f backend.log
tail -f frontend.log
```

## Login Credentials

- **Admin:** admin@peak1031.com / admin123
- **Coordinator:** coordinator@peak1031.com / coord123  
- **Client:** client@peak1031.com / client123

## Features Available

✅ User Authentication (Real, not mocked)
✅ Role-based Dashboards (Admin, Coordinator, Client, Third-party)
✅ Exchange Management
✅ Task Management
✅ Document Management
✅ Real-time Messaging
✅ Audit Logging
✅ Database with Sample Data

## Architecture

- **Backend:** Node.js + Express + SQLite + Socket.IO (Port 8001)
- **Frontend:** React + TypeScript + Tailwind CSS (Port 8000)
- **Database:** SQLite with Sequelize ORM
- **Real-time:** Socket.IO for messaging