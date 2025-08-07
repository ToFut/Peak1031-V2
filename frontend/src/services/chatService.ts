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
      // Use backend API to get exchanges
      const response = await fetch(`${this.baseURL}/exchanges`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        throw new Error(`Failed to fetch exchanges: ${response.statusText}`);
      }

      const data = await response.json();
      const exchanges = data.exchanges || data.data || data || [];

      // Transform to ChatExchange format with participants
      const chatExchanges: ChatExchange[] = exchanges.map((exchange: any) => {
        // Extract participants from exchangeParticipants if available
        const participants: User[] = [];
        
        // Try different field names for participants
        const participantsList = exchange.exchangeParticipants || 
                               exchange.exchange_participants || 
                               exchange.participants || 
                               [];
        
        if (participantsList && participantsList.length > 0) {
          participantsList.forEach((ep: any) => {
            if (ep.user) {
              participants.push({
                id: ep.user.id,
                email: ep.user.email,
                first_name: ep.user.first_name,
                last_name: ep.user.last_name,
                role: ep.user.role || 'third_party', // Use actual user role or default to third_party
                is_active: ep.user.is_active !== false,
                two_fa_enabled: ep.user.two_fa_enabled || false,
                created_at: ep.user.created_at || new Date().toISOString(),
                updated_at: ep.user.updated_at || new Date().toISOString()
              } as User);
            }
            if (ep.contact) {
              // For contacts, we'll use 'client' role since they're external participants
              participants.push({
                id: `contact_${ep.contact.id}`,
                email: ep.contact.email,
                first_name: ep.contact.first_name,
                last_name: ep.contact.last_name,
                role: 'client', // Contacts are typically clients or third parties
                is_active: true,
                two_fa_enabled: false,
                created_at: ep.contact.created_at || new Date().toISOString(),
                updated_at: ep.contact.updated_at || new Date().toISOString()
              } as User);
            }
          });
        }

        // Add coordinator if exists
        if (exchange.coordinator) {
          participants.push({
            id: exchange.coordinator.id,
            email: exchange.coordinator.email,
            first_name: exchange.coordinator.first_name,
            last_name: exchange.coordinator.last_name,
            role: 'coordinator',
            is_active: true,
            two_fa_enabled: false,
            created_at: exchange.coordinator.created_at || new Date().toISOString(),
            updated_at: exchange.coordinator.updated_at || new Date().toISOString()
          } as User);
        }

        // Add client if exists
        if (exchange.client) {
          participants.push({
            id: `contact_${exchange.client.id}`,
            email: exchange.client.email,
            first_name: exchange.client.first_name,
            last_name: exchange.client.last_name,
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
          last_message: undefined, // Will be loaded separately if needed
          unread_count: 0, // Will be calculated separately if needed
          participants: participants
        };
      });

      return chatExchanges;
    } catch (error) {
      console.error('Error fetching exchanges:', error);
      throw error;
    }
  }

  async getMessages(exchangeId: string): Promise<ChatMessage[]> {
    try {
      // Use backend API to get messages
      const response = await fetch(`${this.baseURL}/messages/exchange/${exchangeId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }

      const data = await response.json();
      const messages = data.data || data || [];

      // Transform to ChatMessage format
      const chatMessages: ChatMessage[] = messages.map((message: any) => ({
        id: message.id,
        content: message.content,
        exchange_id: message.exchangeId || message.exchange_id,
        sender_id: message.senderId || message.sender_id,
        attachment_id: message.attachmentId || message.attachment_id,
        message_type: message.messageType || message.message_type || 'text',
        read_by: message.readBy || message.read_by || [],
        created_at: message.createdAt || message.created_at,
        sender: message.sender,
        attachment: message.attachment
      }));

      return chatMessages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
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
      // Mark each message as read individually using the correct endpoint
      const promises = messageIds.map(messageId => 
        fetch(`${this.baseURL}/messages/${messageId}/read`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
      );

      const responses = await Promise.allSettled(promises);
      
      // Check if any requests failed
      const failedRequests = responses.filter(response => 
        response.status === 'rejected' || 
        (response.status === 'fulfilled' && !response.value.ok)
      );

      if (failedRequests.length > 0) {
        console.warn(`Failed to mark ${failedRequests.length} messages as read`);
        // Don't throw error for read receipts, just log warning
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
      // Don't throw error for read receipts to avoid blocking UI
    }
  }

  async uploadFile(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseURL}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to upload file: ${response.statusText}`);
      }

      const data = await response.json();
      return data.id || data.documentId || data.attachmentId;
    } catch (error) {
      console.error('Error uploading file:', error);
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