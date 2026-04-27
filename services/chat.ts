import { supabase } from './supabase';
import { ChatMessage } from '@/types/chat';

const MESSAGE_SELECT = `
  *,
  member:members(chat_nickname, first_name, last_name)
`;

async function fetchMessageById(id: string): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(MESSAGE_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Failed to hydrate chat message:', error);
    return null;
  }
  return data;
}

export const chatService = {
  async getMessages(limit = 100): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(MESSAGE_SELECT)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).reverse();
  },

  async sendMessage(message: string, memberId: string): Promise<ChatMessage> {
    const { error: contextError } = await supabase.rpc('set_member_context', {
      member_id: memberId,
    });

    if (contextError) {
      console.error('Failed to set member context:', contextError);
      throw contextError;
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        member_id: memberId,
        message: message.trim(),
      })
      .select(MESSAGE_SELECT)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteMessage(messageId: string, memberId: string): Promise<void> {
    const { error: contextError } = await supabase.rpc('set_member_context', {
      member_id: memberId,
    });

    if (contextError) {
      console.error('Failed to set member context:', contextError);
      throw contextError;
    }

    const { error } = await supabase
      .from('chat_messages')
      .update({ is_deleted: true })
      .eq('id', messageId);

    if (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  },

  async updateMessage(messageId: string, newMessage: string, memberId: string): Promise<void> {
    const { error: contextError } = await supabase.rpc('set_member_context', {
      member_id: memberId,
    });

    if (contextError) {
      console.error('Failed to set member context:', contextError);
      throw contextError;
    }

    const { error } = await supabase
      .from('chat_messages')
      .update({
        message: newMessage.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) {
      console.error('Failed to update message:', error);
      throw error;
    }
  },

  subscribeToMessages(
    onInsert: (message: ChatMessage) => void,
    onUpdate: (message: ChatMessage) => void,
    onDelete: (messageId: string) => void
  ) {
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
          const id = (payload.new as { id?: string } | null)?.id;
          if (!id) return;
          const hydrated = await fetchMessageById(id);
          if (hydrated && !hydrated.is_deleted) {
            onInsert(hydrated);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const next = payload.new as { id?: string; is_deleted?: boolean } | null;
          if (!next?.id) return;

          if (next.is_deleted) {
            onDelete(next.id);
            return;
          }

          const hydrated = await fetchMessageById(next.id);
          if (hydrated) {
            onUpdate(hydrated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
