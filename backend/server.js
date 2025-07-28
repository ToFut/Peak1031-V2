const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const { sequelize } = require('./models');
const config = require('./config/database');
const { authenticateToken } = require('./middleware/auth');
const auditMiddleware = require('./middleware/audit');

// Import routes
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contacts');
const exchangeRoutes = require('./routes/exchanges');
const taskRoutes = require('./routes/tasks');
const documentRoutes = require('./routes/documents');
const messageRoutes = require('./routes/messages');
const syncRoutes = require('./routes/sync');
const adminRoutes = require('./routes/admin');

// Import services
const MessageService = require('./services/messages');
const AuditService = require('./services/audit');

class PeakServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:8000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });
    
    this.messageService = new MessageService(this.io);
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeSocketHandlers();
    this.initializeErrorHandling();
  }

  initializeMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "wss:", "ws:"]
        }
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || "http://localhost:8000",
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000, // requests per window
      message: {
        error: 'Too many requests from this IP, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use(limiter);

    // Stricter rate limiting for auth endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: {
        error: 'Too many authentication attempts, please try again later'
      }
    });
    this.app.use('/api/auth', authLimiter);

    // Body parsing middleware
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging middleware
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined'));
    }

    // Audit logging middleware
    this.app.use(auditMiddleware);

    // Health check endpoint (before auth)
    this.app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });
  }

  initializeRoutes() {
    // API documentation endpoint (must be first)
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Peak 1031 Exchange Platform API',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
          auth: '/api/auth',
          contacts: '/api/contacts',
          exchanges: '/api/exchanges',
          tasks: '/api/tasks',
          documents: '/api/documents',
          messages: '/api/messages',
          sync: '/api/sync',
          admin: '/api/admin'
        }
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/contacts', authenticateToken, contactRoutes);
    this.app.use('/api/exchanges', authenticateToken, exchangeRoutes);
    this.app.use('/api/tasks', authenticateToken, taskRoutes);
    this.app.use('/api/documents', authenticateToken, documentRoutes);
    this.app.use('/api/messages', authenticateToken, messageRoutes);
    this.app.use('/api/sync', authenticateToken, syncRoutes);
    this.app.use('/api/admin', authenticateToken, adminRoutes);

    // Serve uploaded files with authentication
    this.app.use('/api/files', authenticateToken, express.static(
      path.join(__dirname, '../uploads'),
      {
        setHeaders: (res, path) => {
          res.setHeader('Cache-Control', 'private, no-cache');
        }
      }
    ));

    // 404 handler for API routes (must be last)
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({
        error: 'API endpoint not found',
        path: req.path,
        method: req.method
      });
    });
  }

  initializeSocketHandlers() {
    // Socket.IO authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const authService = require('./services/auth');
        const user = await authService.verifyToken(token);
        socket.user = user;
        
        // Log socket connection
        await AuditService.log({
          action: 'SOCKET_CONNECT',
          userId: user.id,
          ipAddress: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent'],
          details: { socketId: socket.id }
        });

        next();
      } catch (error) {
        console.error('Socket authentication failed:', error.message);
        next(new Error('Authentication failed'));
      }
    });

    // Socket connection handler
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.user.email} connected with socket ${socket.id}`);

      // Join user to their personal room
      socket.join(`user_${socket.user.id}`);

      // Handle joining exchange rooms
      socket.on('join_exchange', async (exchangeId) => {
        try {
          const hasAccess = await this.messageService.canAccessExchange(socket.user.id, exchangeId);
          if (hasAccess) {
            socket.join(`exchange_${exchangeId}`);
            socket.emit('joined_exchange', { exchangeId, status: 'success' });
            
            // Notify others in the exchange that user is online
            socket.to(`exchange_${exchangeId}`).emit('user_online', {
              userId: socket.user.id,
              name: `${socket.user.firstName} ${socket.user.lastName}`,
              timestamp: new Date().toISOString()
            });
          } else {
            socket.emit('join_error', { exchangeId, error: 'Access denied' });
          }
        } catch (error) {
          console.error('Error joining exchange:', error);
          socket.emit('join_error', { exchangeId, error: 'Internal error' });
        }
      });

      // Handle leaving exchange rooms
      socket.on('leave_exchange', (exchangeId) => {
        socket.leave(`exchange_${exchangeId}`);
        socket.to(`exchange_${exchangeId}`).emit('user_offline', {
          userId: socket.user.id,
          timestamp: new Date().toISOString()
        });
      });

      // Handle sending messages
      socket.on('send_message', async (data) => {
        try {
          const message = await this.messageService.createMessage({
            content: data.content,
            exchangeId: data.exchangeId,
            senderId: socket.user.id,
            messageType: data.messageType || 'text',
            attachmentId: data.attachmentId
          });

          // Emit to all users in the exchange
          this.io.to(`exchange_${data.exchangeId}`).emit('new_message', message);

          // Send notification to offline users
          await this.messageService.notifyOfflineUsers(data.exchangeId, message, socket.user.id);

        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('message_error', { error: error.message });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (data) => {
        socket.to(`exchange_${data.exchangeId}`).emit('user_typing', {
          userId: socket.user.id,
          name: `${socket.user.firstName} ${socket.user.lastName}`,
          exchangeId: data.exchangeId
        });
      });

      socket.on('typing_stop', (data) => {
        socket.to(`exchange_${data.exchangeId}`).emit('user_stopped_typing', {
          userId: socket.user.id,
          exchangeId: data.exchangeId
        });
      });

      // Handle message read receipts
      socket.on('mark_read', async (data) => {
        try {
          await this.messageService.markMessageRead(data.messageId, socket.user.id);
          socket.to(`exchange_${data.exchangeId}`).emit('message_read', {
            messageId: data.messageId,
            userId: socket.user.id,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', async (reason) => {
        console.log(`User ${socket.user.email} disconnected: ${reason}`);
        
        // Log socket disconnection
        await AuditService.log({
          action: 'SOCKET_DISCONNECT',
          userId: socket.user.id,
          details: { socketId: socket.id, reason }
        });

        // Notify exchanges that user went offline
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room.startsWith('exchange_')) {
            socket.to(room).emit('user_offline', {
              userId: socket.user.id,
              timestamp: new Date().toISOString()
            });
          }
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error('Socket error:', error);
        AuditService.log({
          action: 'SOCKET_ERROR',
          userId: socket.user.id,
          details: { error: error.message, socketId: socket.id }
        });
      });
    });
  }

  initializeErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Global error handler:', error);

      // Log error
      AuditService.log({
        action: 'APPLICATION_ERROR',
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          error: error.message,
          stack: error.stack,
          path: req.path,
          method: req.method,
          body: req.body
        }
      });

      // Handle specific error types
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details || error.message
        });
      }

      if (error.name === 'UnauthorizedError' || error.message === 'jwt malformed') {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }

      if (error.name === 'ForbiddenError') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to access this resource'
        });
      }

      if (error.name === 'NotFoundError') {
        return res.status(404).json({
          error: 'Resource not found',
          message: error.message
        });
      }

      // Default to 500 server error
      const isDevelopment = process.env.NODE_ENV === 'development';
      res.status(500).json({
        error: 'Internal server error',
        message: isDevelopment ? error.message : 'Something went wrong',
        ...(isDevelopment && { stack: error.stack })
      });
    });

    // 404 handler for non-API routes
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.path,
        method: req.method
      });
    });
  }

  async start() {
    try {
      // Test database connection
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully');

      // Sync database models (only in development)
      if (process.env.NODE_ENV === 'development') {
        await sequelize.sync({ alter: true });
        console.log('✅ Database models synchronized');
      }

      // Start server
      const PORT = process.env.PORT || 8001;
      this.server.listen(PORT, () => {
        console.log(`🚀 Peak 1031 Server running on port ${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
        console.log(`💬 Socket.IO enabled for real-time messaging`);
      });

      // Graceful shutdown handling
      process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  async gracefulShutdown(signal) {
    console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
    
    try {
      // Close HTTP server
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
      console.log('✅ HTTP server closed');

      // Close database connections
      await sequelize.close();
      console.log('✅ Database connections closed');

      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Export for testing
module.exports = PeakServer;

// Start server if this file is run directly
if (require.main === module) {
  const server = new PeakServer();
  server.start();
}