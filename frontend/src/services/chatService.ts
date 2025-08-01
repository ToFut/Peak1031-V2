import { supabase } from './supabase';
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
  async getExchanges(userId: string): Promise<ChatExchange[]> {
    try {
      const { data: exchanges, error } = await supabase
        .from('exchanges')
        .select(`
          id,
          name,
          status,
          messages (
            id,
            content,
            sender_id,
            created_at,
            read_by
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform to ChatExchange format
      const chatExchanges: ChatExchange[] = exchanges?.map(exchange => {
        const messages = exchange.messages || [];
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
        const unreadCount = messages.filter(m => 
          !m.read_by?.includes(userId) && m.sender_id !== userId
        ).length;

        return {
          id: exchange.id,
          exchange_name: exchange.name,
          status: exchange.status,
          last_message: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            exchange_id: exchange.id,
            sender_id: lastMessage.sender_id,
            message_type: 'text',
            read_by: lastMessage.read_by || [],
            created_at: lastMessage.created_at,
          } : undefined,
          unread_count: unreadCount,
          participants: []
        };
      }) || [];

      return chatExchanges;
    } catch (error) {
      console.error('Error fetching exchanges:', error);
      throw error;
    }
  }

  async getMessages(exchangeId: string): Promise<ChatMessage[]> {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          exchange_id,
          sender_id,
          attachment_id,
          message_type,
          read_by,
          created_at,
          sender:users (
            id,
            first_name,
            last_name,
            email,
            role,
            is_active,
            two_fa_enabled,
            created_at,
            updated_at
          )
        `)
        .eq('exchange_id', exchangeId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform to ChatMessage format
      const chatMessages: ChatMessage[] = (messages || []).map(message => ({
        id: message.id,
        content: message.content,
        exchange_id: message.exchange_id,
        sender_id: message.sender_id,
        attachment_id: message.attachment_id,
        message_type: message.message_type || 'text',
        read_by: message.read_by || [],
        created_at: message.created_at,
        sender: message.sender ? (() => {
          const senderData = Array.isArray(message.sender) ? message.sender[0] : message.sender;
          return {
            id: (senderData as any)?.id,
            first_name: (senderData as any)?.first_name,
            last_name: (senderData as any)?.last_name,
            email: (senderData as any)?.email,
            role: (senderData as any)?.role,
            is_active: (senderData as any)?.is_active,
            two_fa_enabled: (senderData as any)?.two_fa_enabled,
            created_at: (senderData as any)?.created_at,
            updated_at: (senderData as any)?.updated_at
          };
        })() : undefined,
        attachment: undefined // Removed attachment property as it doesn't exist in the response
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
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content: messageData.content,
          exchange_id: messageData.exchange_id,
          sender_id: messageData.sender_id,
          attachment_id: messageData.attachment_id,
          message_type: messageData.message_type || 'text',
          read_by: [messageData.sender_id]
        })
        .select(`
          id,
          content,
          exchange_id,
          sender_id,
          attachment_id,
          message_type,
          read_by,
          created_at,
          sender:users (
            id,
            first_name,
            last_name,
            email,
            role,
            is_active,
            two_fa_enabled,
            created_at,
            updated_at
          )
        `)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        content: data.content,
        exchange_id: data.exchange_id,
        sender_id: data.sender_id,
        attachment_id: data.attachment_id,
        message_type: data.message_type || 'text',
        read_by: data.read_by || [],
        created_at: data.created_at,
        sender: data.sender ? (() => {
          const senderData = Array.isArray(data.sender) ? data.sender[0] : data.sender;
          return {
            id: (senderData as any)?.id,
            first_name: (senderData as any)?.first_name,
            last_name: (senderData as any)?.last_name,
            email: (senderData as any)?.email,
            role: (senderData as any)?.role,
            is_active: (senderData as any)?.is_active,
            two_fa_enabled: (senderData as any)?.two_fa_enabled,
            created_at: (senderData as any)?.created_at,
            updated_at: (senderData as any)?.updated_at
          };
        })() : undefined,
        attachment: undefined // Removed attachment property as it doesn't exist in the response
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async markAsRead(messageIds: string[], userId: string): Promise<void> {
    try {
      // Fetch current messages to get their read_by arrays
      const { data: messages, error: fetchError } = await supabase
        .from('messages')
        .select('id, read_by')
        .in('id', messageIds)
        .neq('sender_id', userId);

      if (fetchError) throw fetchError;

      // Update each message's read_by array
      for (const message of messages || []) {
        const currentReadBy = message.read_by || [];
        if (!currentReadBy.includes(userId)) {
          const updatedReadBy = [...currentReadBy, userId];
          
          const { error: updateError } = await supabase
            .from('messages')
            .update({ read_by: updatedReadBy })
            .eq('id', message.id);

          if (updateError) throw updateError;
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  subscribeToMessages(exchangeId: string, callback: (message: ChatMessage) => void) {
    return supabase
      .channel(`messages:${exchangeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `exchange_id=eq.${exchangeId}`
        },
        (payload) => {
          const message = payload.new as any;
          callback({
            id: message.id,
            content: message.content,
            exchange_id: message.exchange_id,
            sender_id: message.sender_id,
            attachment_id: message.attachment_id,
            message_type: message.message_type || 'text',
            read_by: message.read_by || [],
            created_at: message.created_at
          });
        }
      )
      .subscribe();
  }

  subscribeToExchanges(callback: (exchange: any) => void) {
    return supabase
      .channel('exchanges')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exchanges'
        },
        callback
      )
      .subscribe();
  }

  subscribeToExchange(exchangeId: string, callback: (exchange: any) => void) {
    return supabase
      .channel(`exchange:${exchangeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exchanges',
          filter: `id=eq.${exchangeId}`
        },
        callback
      )
      .subscribe();
  }

  unsubscribe(channel: string) {
    // Note: Supabase doesn't have a direct removeChannel method
    // The channel will be automatically cleaned up when the component unmounts
    // This method is kept for API compatibility but doesn't perform any action
  }

  unsubscribeAll() {
    // Note: Supabase doesn't have a direct removeAllChannels method
    // Channels will be automatically cleaned up when the component unmounts
  }

  async uploadAttachment(file: File, exchangeId: string): Promise<string> {
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `attachments/${exchangeId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (error) throw error;

      // Create attachment record in database
      const { data: attachmentData, error: attachmentError } = await supabase
        .from('attachments')
        .insert({
          filename: fileName,
          original_filename: file.name,
          file_path: data.path,
          file_size: file.size,
          mime_type: file.type,
          exchange_id: exchangeId
        })
        .select('id')
        .single();

      if (attachmentError) throw attachmentError;

      return attachmentData.id;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    }
  }

  async getExchangeParticipants(exchangeId: string): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('exchange_participants')
        .select(`
          users (
            id,
            first_name,
            last_name,
            email,
            role,
            is_active,
            two_fa_enabled,
            created_at,
            updated_at
          )
        `)
        .eq('exchange_id', exchangeId);

      if (error) throw error;

      // Transform to User format
      const participants: User[] = (data || [])
        .map(p => p.users)
        .filter(Boolean)
        .map(user => {
          const userData = Array.isArray(user) ? user[0] : user;
          return {
            id: userData?.id,
            first_name: userData?.first_name,
            last_name: userData?.last_name,
            email: userData?.email,
            role: userData?.role,
            is_active: userData?.is_active,
            two_fa_enabled: userData?.two_fa_enabled,
            created_at: userData?.created_at,
            updated_at: userData?.updated_at
          };
        });

      return participants;
    } catch (error) {
      console.error('Error fetching participants:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService(); 