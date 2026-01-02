import { supabase } from './supabase';

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  message: string;
  created_at: string;
  is_admin: boolean;
}

export interface ChatRoom {
  id: string;
  lead_id?: string;
  name: string;
  created_at: string;
  last_message_at?: string;
}

export class RealtimeChat {
  private channelSubscriptions: Map<string, any> = new Map();

  async createRoom(name: string, leadId?: string): Promise<ChatRoom> {
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({ name, lead_id: leadId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getRooms(): Promise<ChatRoom[]> {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getMessages(roomId: string, limit: number = 100): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async sendMessage(
    roomId: string,
    userId: string,
    userName: string,
    message: string,
    isAdmin: boolean = false
  ): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        user_id: userId,
        user_name: userName,
        message,
        is_admin: isAdmin,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('chat_rooms')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', roomId);

    return data;
  }

  subscribeToRoom(
    roomId: string,
    onMessage: (message: ChatMessage) => void,
    onUserTyping?: (userId: string, userName: string) => void
  ): () => void {
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          onMessage(payload.new as ChatMessage);
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (onUserTyping) {
          onUserTyping(payload.userId, payload.userName);
        }
      })
      .subscribe();

    this.channelSubscriptions.set(roomId, channel);

    return () => {
      this.unsubscribeFromRoom(roomId);
    };
  }

  unsubscribeFromRoom(roomId: string): void {
    const channel = this.channelSubscriptions.get(roomId);
    if (channel) {
      supabase.removeChannel(channel);
      this.channelSubscriptions.delete(roomId);
    }
  }

  async broadcastTyping(roomId: string, userId: string, userName: string): Promise<void> {
    const channel = this.channelSubscriptions.get(roomId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, userName },
      });
    }
  }

  async markAsRead(roomId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_read_receipts')
      .upsert({
        room_id: roomId,
        user_id: userId,
        read_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  async getUnreadCount(roomId: string, userId: string): Promise<number> {
    const { data: receipt } = await supabase
      .from('chat_read_receipts')
      .select('read_at')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .maybeSingle();

    const readAt = receipt?.read_at || new Date(0).toISOString();

    const { count, error } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .gt('created_at', readAt);

    if (error) throw error;
    return count || 0;
  }

  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;
  }

  async searchMessages(roomId: string, query: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .ilike('message', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  cleanup(): void {
    this.channelSubscriptions.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channelSubscriptions.clear();
  }
}

export const chatManager = new RealtimeChat();
