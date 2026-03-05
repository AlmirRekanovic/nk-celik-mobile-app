import { supabase } from './supabase';
import { ChatMessage } from '@/types/chat';

export const chatService = {
  async getMessages(limit = 100): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        member:members(chat_nickname, first_name, last_name)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async sendMessage(message: string, memberId: string): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        member_id: memberId,
        message: message.trim(),
      })
      .select(`
        *,
        member:members(chat_nickname, first_name, last_name)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_deleted: true })
      .eq('id', messageId);

    if (error) throw error;
  },

  async updateMessage(messageId: string, newMessage: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .update({
        message: newMessage.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) throw error;
  },

  subscribeToMessages(callback: (message: ChatMessage) => void) {
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const { data } = await supabase
            .from('chat_messages')
            .select(`
              *,
              member:members(chat_nickname, first_name, last_name)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
