/**
 * Socket Room Management Middleware
 * 
 * This middleware ensures that socket connections are properly managed
 * and that users are automatically joined to their relevant rooms.
 */

class SocketRoomManager {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map(); // userId -> Set of socket IDs
    this.socketUsers = new Map(); // socket ID -> user data
    this.exchangeRooms = new Map(); // exchangeId -> Set of user IDs
  }

  /**
   * Initialize socket connection handling
   */
  initialize() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 New socket connection: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (data) => {
        try {
          const { token, userId, userEmail } = data;
          
          if (!userId) {
            console.warn('⚠️ Socket authentication missing userId');
            socket.emit('auth_error', { error: 'User ID required' });
            return;
          }

          // Store user-socket mapping
          if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
          }
          this.userSockets.get(userId).add(socket.id);
          
          this.socketUsers.set(socket.id, {
            userId,
            email: userEmail,
            authenticatedAt: new Date()
          });

          // Join user-specific room
          await socket.join(`user_${userId}`);
          console.log(`👤 User ${userId} joined personal room via ${socket.id}`);

          socket.emit('authenticated', { 
            status: 'success',
            userId,
            rooms: [`user_${userId}`]
          });

        } catch (error) {
          console.error('❌ Socket authentication error:', error);
          socket.emit('auth_error', { error: error.message });
        }
      });

      // Handle joining exchange rooms
      socket.on('join_exchange', async (exchangeId) => {
        try {
          const userData = this.socketUsers.get(socket.id);
          if (!userData) {
            socket.emit('join_error', { 
              exchangeId, 
              error: 'Not authenticated' 
            });
            return;
          }

          // Join exchange room with multiple patterns for compatibility
          const rooms = [
            `exchange_${exchangeId}`,
            `exchange-${exchangeId}`
          ];

          for (const room of rooms) {
            await socket.join(room);
          }

          // Track exchange membership
          if (!this.exchangeRooms.has(exchangeId)) {
            this.exchangeRooms.set(exchangeId, new Set());
          }
          this.exchangeRooms.get(exchangeId).add(userData.userId);

          console.log(`🏢 User ${userData.userId} joined exchange ${exchangeId} via ${socket.id}`);
          
          socket.emit('joined_exchange', { 
            exchangeId, 
            status: 'success',
            rooms
          });

          // Notify other users in the exchange
          socket.to(`exchange_${exchangeId}`).emit('user_joined', {
            userId: userData.userId,
            exchangeId
          });

        } catch (error) {
          console.error('❌ Error joining exchange room:', error);
          socket.emit('join_error', { 
            exchangeId, 
            error: error.message 
          });
        }
      });

      // Handle leaving exchange rooms
      socket.on('leave_exchange', async (exchangeId) => {
        try {
          const userData = this.socketUsers.get(socket.id);
          if (!userData) return;

          // Leave exchange rooms
          const rooms = [
            `exchange_${exchangeId}`,
            `exchange-${exchangeId}`
          ];

          for (const room of rooms) {
            await socket.leave(room);
          }

          // Update exchange membership
          if (this.exchangeRooms.has(exchangeId)) {
            this.exchangeRooms.get(exchangeId).delete(userData.userId);
            if (this.exchangeRooms.get(exchangeId).size === 0) {
              this.exchangeRooms.delete(exchangeId);
            }
          }

          console.log(`🚪 User ${userData.userId} left exchange ${exchangeId}`);

          // Notify other users in the exchange
          socket.to(`exchange_${exchangeId}`).emit('user_left', {
            userId: userData.userId,
            exchangeId
          });

        } catch (error) {
          console.error('❌ Error leaving exchange room:', error);
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (data) => {
        const userData = this.socketUsers.get(socket.id);
        if (!userData || !data.exchangeId) return;

        socket.to(`exchange_${data.exchangeId}`).emit('user_typing', {
          userId: userData.userId,
          name: userData.email.split('@')[0],
          exchangeId: data.exchangeId
        });
      });

      socket.on('typing_stop', (data) => {
        const userData = this.socketUsers.get(socket.id);
        if (!userData || !data.exchangeId) return;

        socket.to(`exchange_${data.exchangeId}`).emit('user_stopped_typing', {
          userId: userData.userId,
          name: userData.email.split('@')[0],
          exchangeId: data.exchangeId
        });
      });

      // Handle message read receipts
      socket.on('mark_read', (data) => {
        const userData = this.socketUsers.get(socket.id);
        if (!userData || !data.exchangeId) return;

        socket.to(`exchange_${data.exchangeId}`).emit('message_read', {
          messageId: data.messageId,
          userId: userData.userId,
          timestamp: new Date().toISOString()
        });
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Socket disconnected: ${socket.id}, reason: ${reason}`);

        const userData = this.socketUsers.get(socket.id);
        if (userData) {
          // Clean up user-socket mapping
          const userSocketSet = this.userSockets.get(userData.userId);
          if (userSocketSet) {
            userSocketSet.delete(socket.id);
            if (userSocketSet.size === 0) {
              this.userSockets.delete(userData.userId);
            }
          }

          // Clean up exchange memberships for this socket
          this.exchangeRooms.forEach((users, exchangeId) => {
            if (users.has(userData.userId)) {
              // Check if user has other active connections
              const hasOtherConnections = this.userSockets.has(userData.userId) && 
                                        this.userSockets.get(userData.userId).size > 0;
              
              if (!hasOtherConnections) {
                users.delete(userData.userId);
                if (users.size === 0) {
                  this.exchangeRooms.delete(exchangeId);
                }

                // Notify exchange about user going offline
                socket.to(`exchange_${exchangeId}`).emit('user_offline', {
                  userId: userData.userId,
                  timestamp: new Date().toISOString()
                });
              }
            }
          });

          this.socketUsers.delete(socket.id);
        }
      });

      // Send initial connection success
      socket.emit('connected', { 
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
    });

    console.log('✅ Socket Room Manager initialized');
  }

  /**
   * Get statistics about current connections
   */
  getStats() {
    return {
      totalSockets: this.socketUsers.size,
      connectedUsers: this.userSockets.size,
      activeExchanges: this.exchangeRooms.size,
      rooms: {
        users: Array.from(this.userSockets.keys()),
        exchanges: Array.from(this.exchangeRooms.keys())
      }
    };
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId, event, data) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets && userSockets.size > 0) {
      userSockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
      return true;
    }
    return false;
  }

  /**
   * Send message to exchange room
   */
  sendToExchange(exchangeId, event, data) {
    this.io.to(`exchange_${exchangeId}`).emit(event, data);
    this.io.to(`exchange-${exchangeId}`).emit(event, data); // Compatibility
  }

  /**
   * Get users currently in an exchange
   */
  getExchangeUsers(exchangeId) {
    const users = this.exchangeRooms.get(exchangeId);
    return users ? Array.from(users) : [];
  }

  /**
   * Force disconnect a user (admin function)
   */
  disconnectUser(userId, reason = 'Admin disconnect') {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('force_disconnect', { reason });
          socket.disconnect(true);
        }
      });
    }
  }
}

module.exports = SocketRoomManager;