import { apiService } from './api';
import { Message, User, Exchange } from '../types';

export interface ChatMessage {
  id: string;
  content: string;
  exchange_id: string;
  sender_id: string;
  attachment_id?: string;
  message_type: 'text' | 'file' | 'system';
  read_by: string[];
  created_at: string;
  sender?: User;
  attachment?: any;
}

export interface ChatExchange {
  id: string;
  exchange_name: string;
  status: string;
  last_message?: ChatMessage;
  unread_count: number;
  participants: User[];
}

class ChatService {
  private baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  private messageListeners = new Map<string, (message: ChatMessage) => void>();
  private readReceiptListeners = new Map<string, (data: { messageId: string; userId: string }) => void>();
  private typingListeners = new Map<string, (data: { userId: string; name: string; isTyping: boolean }) => void>();
  private socket: any = null; // Socket.IO instance

  initializeSocket(token: string) {
    // Initialize socket connection
    console.log('Initializing socket connection...');
  }

  disconnect() {
    // Disconnect socket
    console.log('Disconnecting socket...');
  }

  private async joinExchange(exchangeId: string): Promise<void> {
    // Join exchange room via socket
    console.log(`Joining exchange room: ${exchangeId}`);
  }

  private leaveExchange(exchangeId: string): void {
    // Leave exchange room via socket
    console.log(`Leaving exchange room: ${exchangeId}`);
  }

  startTyping(exchangeId: string) {
    // Handled by useSocket hook
  }

  stopTyping(exchangeId: string) {
    // Handled by useSocket hook
  }

  async getExchanges(userId: string): Promise<ChatExchange[]> {
    try {
      console.log('📋 ChatService: Fetching exchanges for user:', userId);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Use backend API to get exchanges
      const response = await fetch(`${this.baseURL}/exchanges`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('📋 Response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = `Failed to fetch exchanges: ${response.status} ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          console.warn('Could not parse error response:', parseError);
        }
        
        if (response.status === 401) {
          localStorage.removeItem('token');
          throw new Error('Your session has expired. Please log in again.');
        } else if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        } else if (response.status === 500) {
          throw new Error(`Server error: ${errorMessage}`);
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('📋 Raw exchanges data:', data);
      
      if (!data.success && data.success !== undefined) {
        throw new Error(data.error || 'Failed to fetch exchanges');
      }
      
      const exchanges = data.exchanges || data.data || data || [];
      console.log('📋 Found', exchanges.length, 'exchanges');

      // Validate exchanges array
      if (!Array.isArray(exchanges)) {
        console.warn('⚠️ Exchanges data is not an array:', exchanges);
        return [];
      }

      // Transform to ChatExchange format with participants
      const chatExchanges: ChatExchange[] = exchanges.map((exchange: any, index: number) => {
        try {
          // Validate required fields
          if (!exchange.id) {
            console.warn(`⚠️ Exchange ${index} missing id:`, exchange);
            return null;
          }

          // Extract participants from exchangeParticipants if available
          const participants: User[] = [];
          
          // Try different field names for participants
          const participantsList = exchange.exchangeParticipants || 
                                 exchange.exchange_participants || 
                                 exchange.participants || 
                                 [];
          
          if (Array.isArray(participantsList) && participantsList.length > 0) {
            participantsList.forEach((ep: any) => {
              try {
                if (ep.user && ep.user.id && ep.user.email) {
                  participants.push({
                    id: ep.user.id,
                    email: ep.user.email,
                    first_name: ep.user.first_name || '',
                    last_name: ep.user.last_name || '',
                    role: ep.user.role || 'third_party',
                    is_active: ep.user.is_active !== false,
                    two_fa_enabled: ep.user.two_fa_enabled || false,
                    created_at: ep.user.created_at || new Date().toISOString(),
                    updated_at: ep.user.updated_at || new Date().toISOString()
                  } as User);
                }
                if (ep.contact && ep.contact.id && ep.contact.email) {
                  participants.push({
                    id: `contact_${ep.contact.id}`,
                    email: ep.contact.email,
                    first_name: ep.contact.first_name || '',
                    last_name: ep.contact.last_name || '',
                    role: 'client',
                    is_active: true,
                    two_fa_enabled: false,
                    created_at: ep.contact.created_at || new Date().toISOString(),
                    updated_at: ep.contact.updated_at || new Date().toISOString()
                  } as User);
                }
              } catch (participantError) {
                console.warn('Error processing participant:', participantError, ep);
              }
            });
          }

          // Add coordinator if exists
          if (exchange.coordinator && exchange.coordinator.id && exchange.coordinator.email) {
            participants.push({
              id: exchange.coordinator.id,
              email: exchange.coordinator.email,
              first_name: exchange.coordinator.first_name || '',
              last_name: exchange.coordinator.last_name || '',
              role: 'coordinator',
              is_active: true,
              two_fa_enabled: false,
              created_at: exchange.coordinator.created_at || new Date().toISOString(),
              updated_at: exchange.coordinator.updated_at || new Date().toISOString()
            } as User);
          }

          // Add client if exists
          if (exchange.client && exchange.client.id && exchange.client.email) {
            participants.push({
              id: `contact_${exchange.client.id}`,
              email: exchange.client.email,
              first_name: exchange.client.first_name || '',
              last_name: exchange.client.last_name || '',
              role: 'client',
              is_active: true,
              two_fa_enabled: false,
              created_at: exchange.client.created_at || new Date().toISOString(),
              updated_at: exchange.client.updated_at || new Date().toISOString()
            } as User);
          }

          return {
            id: exchange.id,
            exchange_name: exchange.name || exchange.exchange_name || exchange.title || 'Unnamed Exchange',
            status: exchange.status || 'PENDING',
            last_message: undefined,
            unread_count: 0,
            participants: participants
          };
        } catch (transformError) {
          console.error('Error transforming exchange:', transformError, exchange);
          return null;
        }
      }).filter(ex => ex !== null) as ChatExchange[];

      console.log('✅ Transformed', chatExchanges.length, 'valid exchanges');
      return chatExchanges;
      
    } catch (error) {
      console.error('❌ Error fetching exchanges:', error);
      
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Failed to load exchanges: ${error.message}`);
      } else {
        throw new Error('Failed to load exchanges: Unknown error occurred');
      }
    }
  }

  async getMessages(exchangeId: string): Promise<ChatMessage[]> {
    try {
      console.log('📥 ChatService: Fetching messages for exchange:', exchangeId);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Use backend API to get messages
      const response = await fetch(`${this.baseURL}/messages/exchange/${exchangeId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = `Failed to fetch messages: ${response.status} ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // If we can't parse the error response, use the status text
          console.warn('Could not parse error response:', parseError);
        }
        
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          throw new Error('Your session has expired. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to access this exchange.');
        } else if (response.status === 404) {
          throw new Error('Exchange not found or has been deleted.');
        } else if (response.status === 500) {
          throw new Error(`Server error: ${errorMessage}`);
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('📥 Raw response data:', data);
      
      if (!data.success && data.success !== undefined) {
        throw new Error(data.error || 'Failed to fetch messages');
      }
      
      const messages = data.data || data.messages || data || [];
      console.log('📥 Found', messages.length, 'messages');

      // Validate messages array
      if (!Array.isArray(messages)) {
        console.warn('⚠️ Messages data is not an array:', messages);
        return [];
      }

      // Transform to ChatMessage format with validation
      const chatMessages: ChatMessage[] = messages.map((message: any, index: number) => {
        try {
          // Validate required fields
          if (!message.id) {
            console.warn(`⚠️ Message ${index} missing id:`, message);
            return null;
          }
          
          return {
            id: message.id,
            content: message.content || '',
            exchange_id: message.exchangeId || message.exchange_id || exchangeId,
            sender_id: message.senderId || message.sender_id,
            attachment_id: message.attachmentId || message.attachment_id,
            message_type: (message.messageType || message.message_type || 'text') as 'text' | 'file' | 'system',
            read_by: Array.isArray(message.readBy || message.read_by) ? (message.readBy || message.read_by) : [],
            created_at: message.createdAt || message.created_at || new Date().toISOString(),
            sender: message.sender || message.users,
            attachment: message.attachment
          };
        } catch (transformError) {
          console.error('Error transforming message:', transformError, message);
          return null;
        }
      }).filter(msg => msg !== null) as ChatMessage[];

      console.log('✅ Transformed', chatMessages.length, 'valid messages');
      return chatMessages;
      
    } catch (error) {
      console.error('❌ Error fetching messages for exchange', exchangeId, ':', error);
      
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Failed to load messages: ${error.message}`);
      } else {
        throw new Error('Failed to load messages: Unknown error occurred');
      }
    }
  }

  async sendMessage(messageData: {
    content: string;
    exchange_id: string;
    sender_id: string;
    attachment_id?: string;
    message_type?: 'text' | 'file' | 'system';
  }): Promise<ChatMessage> {
    
    
    try {
      // Use HTTP API for reliability
      return await this.sendMessageViaAPI(messageData);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  private async sendMessageViaAPI(messageData: {
    content: string;
    exchange_id: string;
    sender_id: string;
    attachment_id?: string;
    message_type?: 'text' | 'file' | 'system';
  }): Promise<ChatMessage> {
    const requestBody = {
      exchangeId: messageData.exchange_id,
      content: messageData.content,
      attachmentId: messageData.attachment_id,
      messageType: messageData.message_type || 'text'
    };

    

    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }
      
      throw new Error(errorData.message || `Failed to send message: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    
    
    const message = responseData.data || responseData;

    // Transform to ChatMessage format
    const chatMessage = {
      id: message.id,
      content: message.content,
      exchange_id: message.exchangeId || message.exchange_id,
      sender_id: message.senderId || message.sender_id,
      attachment_id: message.attachmentId || message.attachment_id,
      message_type: message.messageType || message.message_type || 'text',
      read_by: message.readBy || message.read_by || [],
      created_at: message.createdAt || message.created_at || new Date().toISOString(),
      sender: message.sender,
      attachment: message.attachment
    };

    
    return chatMessage;
  }

  async markAsRead(messageIds: string[], userId: string): Promise<void> {
    try {
      console.log(`🔍 useChat: Marking ${messageIds.length} messages as read`);
      
      // Mark each message as read individually using the correct endpoint
      const promises = messageIds.map(async (messageId) => {
        try {
          const response = await fetch(`${this.baseURL}/messages/${messageId}/read`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            const errorData = await response.text();
            if (response.status === 404) {
              console.warn(`⚠️ Message ${messageId} not found (may have been deleted)`);
              return { success: true, messageId, status: 'not_found' };
            } else if (response.status === 500) {
              console.error(`❌ Server error marking message ${messageId} as read:`, errorData);
              return { success: false, messageId, error: errorData, status: response.status };
            } else {
              console.error(`❌ Error marking message ${messageId} as read:`, response.status, errorData);
              return { success: false, messageId, error: errorData, status: response.status };
            }
          }

          return { success: true, messageId, status: 'marked' };
        } catch (error: any) {
          console.error(`❌ Network error marking message ${messageId} as read:`, error);
          return { success: false, messageId, error: error.message || 'Network error' };
        }
      });

      const results = await Promise.all(promises);
      
      // Log results summary
      const successful = results.filter(r => r.success).length;
      const notFound = results.filter(r => r.status === 'not_found').length;
      const failed = results.filter(r => !r.success).length;
      
      if (failed > 0 || notFound > 0) {
        console.warn(`📊 Mark as read summary: ${successful} successful, ${notFound} not found, ${failed} failed`);
        
        // Log specific failures (excluding not_found)
        results.filter(r => !r.success && r.status !== 'not_found').forEach(result => {
          console.error(`❌ Failed to mark message ${result.messageId}:`, result.error);
        });
      } else {
        console.log(`✅ Successfully marked ${successful} messages as read`);
      }
    } catch (error) {
      console.error('❌ Error in markAsRead:', error);
      // Don't throw error for read receipts to avoid blocking UI
    }
  }

  async uploadFile(file: File, exchangeId?: string, category: string = 'general', pinRequired: boolean = false, pin?: string): Promise<string> {
    // Import here to avoid circular dependency
    const { documentUploadService } = await import('./documentUploadService');
    
    if (!exchangeId) {
      throw new Error('Exchange ID is required for file upload');
    }

    try {
      console.log('📤 ChatService: Delegating upload to unified service', {
        fileName: file.name,
        exchangeId,
        category,
        pinRequired
      });

      const documentId = await documentUploadService.uploadForChat(
        file,
        exchangeId,
        pinRequired,
        pin
      );

      console.log('✅ ChatService: Upload successful via unified service', {
        documentId
      });

      return documentId;
    } catch (error: any) {
      console.error('❌ ChatService: Upload failed', error);
      throw error;
    }
  }

  // Real-time message subscription using Socket.IO
  subscribeToMessages(exchangeId: string, onNewMessage: (message: ChatMessage) => void) {
    // Store the listener for this exchange
    this.messageListeners.set(exchangeId, onNewMessage);
    
    // Join the exchange room if socket is connected
    if (this.socket?.connected) {
      this.joinExchange(exchangeId).catch(console.error);
    }

    return () => {
      this.unsubscribeFromMessages(exchangeId);
    };
  }

  unsubscribeFromMessages(exchangeId: string) {
    // Remove the listener
    this.messageListeners.delete(exchangeId);
    
    // Leave the exchange room
    this.leaveExchange(exchangeId);
  }

  // Subscribe to read receipts
  subscribeToReadReceipts(onReadReceipt: (data: { messageId: string; userId: string }) => void) {
    const listenerId = Math.random().toString(36);
    this.readReceiptListeners.set(listenerId, onReadReceipt);
    
    return () => {
      this.readReceiptListeners.delete(listenerId);
    };
  }

  // Subscribe to typing indicators
  subscribeToTyping(exchangeId: string, onTyping: (data: { userId: string; name: string; isTyping: boolean }) => void) {
    this.typingListeners.set(exchangeId, onTyping);
    
    return () => {
      this.typingListeners.delete(exchangeId);
    };
  }
}

export const chatService = new ChatService();