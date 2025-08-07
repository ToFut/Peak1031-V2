// Load environment variables from .env file in the backend directory
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

// const { sequelize } = require('./models'); // Not needed - using Supabase
const config = require('./config/database');
const { authenticateToken } = require('./middleware/auth');
const { authenticateSupabaseToken } = require('./middleware/supabase-auth');
const { authenticateHybridToken } = require('./middleware/hybrid-auth');
const auditMiddleware = require('./middleware/audit');

// Import routes
const authRoutes = require('./routes/auth');
const supabaseAuthRoutes = require('./routes/supabase-auth');
const workingAuthRoutes = require('./routes/working-auth');
const contactRoutes = require('./routes/contacts');
const exchangeRoutes = require('./routes/supabase-exchanges');
const taskRoutes = require('./routes/tasks');
const documentRoutes = require('./routes/documents');
const messageRoutes = require('./routes/messages');
const testMessageRoutes = require('./routes/test-message');
const syncRoutes = require('./routes/sync');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const oauthRoutes = require('./routes/oauth');
const exportRoutes = require('./routes/exports');
const { router: exchangeParticipantsRoutes } = require('./routes/exchange-participants');
const templateRoutes = require('./routes/templates');
const adminGPTRoutes = require('./routes/admin-gpt');
const reportsRoutes = require('./routes/reports');
const enhancedQueryRoutes = require('./routes/enhanced-query');
const ppTokenAdminRoutes = require('./routes/pp-token-admin');
const ppDataRoutes = require('./routes/pp-data-api');
const unifiedDataRoutes = require('./routes/unified-data');

// New routes
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard-new');
const settingsRoutes = require('./routes/settings');
const userProfileRoutes = require('./routes/user-profile');

// Enterprise routes
const enterpriseExchangesRoutes = require('./routes/enterprise-exchanges');
const accountManagementRoutes = require('./routes/account-management');

// Import services
const MessageService = require('./services/messages');
const AuditService = require('./services/audit');

class PeakServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
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
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3001", // Allow port 3001 for development
      "http://localhost:3002", // Allow port 3002 for development
      "http://localhost:3003", // Allow port 3003 for development
      "http://localhost:8000", // Allow port 8000 for development
      "http://localhost:9000", // Allow port 9000 for development
      "http://localhost:9001"  // Allow port 9001 for development
    ];
    
    this.app.use(cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          console.log('🚫 CORS blocked origin:', origin);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Rate limiting
    if (process.env.DISABLE_RATE_LIMIT !== 'true') {
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
    }

    // Stricter rate limiting for auth endpoints
    if (process.env.DISABLE_RATE_LIMIT !== 'true') {
      const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: process.env.NODE_ENV === 'production' ? 10 : 100, // Higher limit for development
        message: {
          error: 'Too many authentication attempts, please try again later'
        }
      });
      this.app.use('/api/auth', authLimiter);
    }

    // Body parsing middleware
    this.app.use(compression());
    this.app.use(express.json({ 
      limit: '10mb',
      strict: false,
      reviver: (key, value) => {
        // Handle escaped characters in strings
        if (typeof value === 'string') {
          return value.replace(/\\\\/g, '\\').replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        }
        return value;
      }
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging middleware
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined'));
    }

    // NO audit middleware here - will apply per route later
    // Health check endpoint (before auth)
    this.app.get('/health', (req, res) => {
      console.log('🏥 Simple health check');
      res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });
    
    // API health check endpoint (before auth)
    this.app.get('/api/health', (req, res) => {
      console.log('🏥 API health check');
      res.status(200).json({ 
        status: 'healthy',
        api: 'online',
        timestamp: new Date().toISOString()
      });
    });
  }

  initializeRoutes() {
    // Health check endpoint (no auth required)
    this.app.get('/api/health', (req, res) => {
      console.log('🏥 Health check requested - ROUTE HANDLER REACHED');
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Peak 1031 Backend API',
        version: '1.0.0'
      });
      console.log('🏥 Health response sent');
    });

    // API documentation endpoint (must be first)
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Peak 1031 Exchange Platform API',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
          auth: '/api/auth',
          'legacy-auth': '/api/auth/legacy',
          contacts: '/api/contacts',
          exchanges: '/api/exchanges',
          tasks: '/api/tasks',
          documents: '/api/documents',
          messages: '/api/messages',
          notifications: '/api/notifications',
          exports: '/api/exports',
          sync: '/api/sync',
          admin: '/api/admin'
        }
      });
    });

    // Debug routes (no auth required)
    this.app.get('/api/debug/users', async (req, res) => {
      try {
        const databaseService = require('./services/database');
        const users = await databaseService.getUsers();
        res.json({
          success: true,
          users: users.map(user => ({
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            is_active: user.is_active || user.isActive
          }))
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.get('/api/debug/token', (req, res) => {
      try {
        const jwt = require('jsonwebtoken');
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        
        if (!token) {
          return res.json({ success: false, error: 'No token provided' });
        }
        
        const decoded = jwt.decode(token);
        let verified = null;
        try {
          verified = jwt.verify(token, process.env.JWT_SECRET);
        } catch (verifyError) {
          console.log('Token verification failed:', verifyError.message);
        }
        
        res.json({
          success: true,
          decoded,
          verified,
          isExpired: decoded && decoded.exp && decoded.exp < Date.now() / 1000
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Health check endpoint (no authentication required)
    this.app.get('/api/health', (req, res) => {
      res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        database: config.useSupabase ? 'supabase' : 'sqlite'
      });
    });

    // API routes - Use working auth for now
    this.app.use('/api/auth', workingAuthRoutes);
    this.app.use('/api/auth/supabase', supabaseAuthRoutes); // Keep Supabase auth available
    this.app.use('/api/auth/legacy', authRoutes); // Keep old auth for reference
    this.app.use('/api/oauth', oauthRoutes);
    this.app.use('/api/contacts', authenticateToken, contactRoutes);
    this.app.use('/api/exchanges', authenticateToken, exchangeRoutes);
    this.app.use('/api/tasks', authenticateToken, taskRoutes);
    this.app.use('/api/documents/templates', authenticateToken, templateRoutes);
    this.app.use('/api/documents', authenticateToken, documentRoutes);
    this.app.use('/api/messages', authenticateToken, messageRoutes);
    this.app.use('/api/test-messages', authenticateToken, testMessageRoutes);
    this.app.use('/api/notifications', authenticateToken, notificationRoutes);
    this.app.use('/api/exports', authenticateToken, exportRoutes);
    this.app.use('/api/sync', authenticateToken, syncRoutes);
    this.app.use('/api/admin', authenticateToken, adminRoutes);
    this.app.use('/api/admin/gpt', authenticateToken, adminGPTRoutes);
    this.app.use('/api/admin/pp-token', authenticateToken, ppTokenAdminRoutes);
    this.app.use('/api/pp-data', authenticateToken, ppDataRoutes);
    this.app.use('/api/unified', authenticateToken, unifiedDataRoutes);
    this.app.use('/api/reports', authenticateToken, reportsRoutes);
    this.app.use('/api/enhanced-query', enhancedQueryRoutes);
    this.app.use('/api/users', authenticateToken, userRoutes);
    this.app.use('/api/dashboard', authenticateToken, dashboardRoutes);
    this.app.use('/api/settings', authenticateToken, settingsRoutes);
    this.app.use('/api/user-profile', authenticateToken, userProfileRoutes);
    
    // Additional routes
    this.app.use('/api/exchange-participants', authenticateToken, exchangeParticipantsRoutes);
    
    // Enterprise routes
    this.app.use('/api/enterprise-exchanges', authenticateToken, enterpriseExchangesRoutes);
    this.app.use('/api/account', authenticateToken, accountManagementRoutes);

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
        console.log('🔌 Socket.IO authentication attempt');
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          console.log('❌ No token provided');
          return next(new Error('Authentication token required'));
        }

        console.log('🔍 Token received, verifying...');
        // Use same JWT verification as API routes
        const jwt = require('jsonwebtoken');
        const databaseService = require('./services/database');
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ Token verified, user ID:', decoded.userId);
        
        // Check if token is expired
        if (decoded.exp && decoded.exp < Date.now() / 1000) {
          console.log('❌ Token expired');
          return next(new Error('Token expired'));
        }

        // Find user and verify account status using database service
        console.log('🔍 Looking for user with ID:', decoded.userId);
        const user = await databaseService.getUserById(decoded.userId);
        
        if (!user) {
          console.log('❌ User not found');
          return next(new Error('User not found'));
        }

        console.log('✅ User found:', user.email, 'isActive:', user.is_active || user.isActive);
        const isActive = user.is_active !== undefined ? user.is_active : user.isActive;
        if (!isActive) {
          console.log('❌ Account disabled');
          return next(new Error('Account disabled'));
        }
        
        socket.user = user;
        
        // Log socket connection
        await AuditService.log({
          action: 'SOCKET_CONNECT',
          userId: user.id,
          ipAddress: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent'],
          details: { socketId: socket.id }
        });

        console.log('✅ Socket authentication successful');
        next();
      } catch (error) {
        console.error('❌ Socket authentication failed:', error.message);
        next(new Error('Authentication failed'));
      }
    });

    // Socket connection handler
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.user.email} connected with socket ${socket.id}`);

      // Join user to their personal room
      socket.join(`user_${socket.user.id}`);

      // Handle explicit join_user_room requests from frontend
      socket.on('join_user_room', (userId) => {
        // Only allow users to join their own room
        if (userId === socket.user.id) {
          socket.join(`user_${userId}`);
          socket.emit('joined_user_room', { userId, status: 'success' });
        } else {
          socket.emit('join_error', { userId, error: 'Access denied' });
        }
      });

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
        console.log(`User ${socket.user?.email || 'unknown'} disconnected: ${reason}`);
        
        // Log socket disconnection
        await AuditService.log({
          action: 'SOCKET_DISCONNECT',
          userId: socket.user?.id,
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
          userId: socket.user?.id,
          details: { error: error.message, socketId: socket.id }
        });
      });
    });
  }

  initializeErrorHandling() {
    // JSON parsing error handler (must come before global error handler)
    this.app.use((error, req, res, next) => {
      if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        console.error('JSON parsing error:', error.message);
        console.error('Request body:', req.body);
        
        return res.status(400).json({
          error: 'Invalid JSON format',
          message: 'The request body contains invalid JSON. Please check for unescaped characters.',
          details: error.message
        });
      }
      next(error);
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Global error handler:', error);

      // Log error
      AuditService.log({
        action: 'APPLICATION_ERROR',
        userId: req.user?.id || null,
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
      // Using Supabase - no need for Sequelize connection
      // await sequelize.authenticate(); // Removed - using Supabase
      console.log('✅ Using Supabase for database operations');

      // Database models are for reference only
      console.log('✅ Server ready (Supabase mode)');

      // Start server
      const PORT = process.env.PORT || 5001;
      this.server.listen(PORT, async () => {
        console.log(`🚀 Peak 1031 Server running on port ${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
        console.log(`💬 Socket.IO enabled for real-time messaging`);
        
        // Initialize scheduled sync service
        try {
          const scheduledSyncService = require('./services/scheduledSyncService');
          if (scheduledSyncService) {
            await scheduledSyncService.initialize();
            console.log('✅ Automatic PP sync scheduling started');
          }
        } catch (error) {
          console.error('⚠️ Failed to start scheduled sync:', error.message);
        }
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
      // await sequelize.close(); // Removed - using Supabase
      console.log('✅ Supabase connections managed automatically');

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