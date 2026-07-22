import { supabase } from './supabase';
import { getAccessToken } from './session';
import { ChatMessage } from '@/types/chat';

// Sender names come from the member_profiles view (safe columns only) — the
// members table itself is not readable by clients. We fetch profiles in a
// separate query and merge, rather than a PostgREST embed, so this does not
// depend on PostgREST being able to infer a relationship to the view.
type MemberProfile = { id: string; chat_nickname: string; first_name: string; last_name: string };

async function fetchProfiles(memberIds: string[]): Promise<Map<string, MemberProfile>> {
  const map = new Map<string, MemberProfile>();
  const unique = [...new Set(memberIds)].filter(Boolean);
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from('member_profiles')
    .select('id, chat_nickname, first_name, last_name')
    .in('id', unique);

  if (error) {
    console.error('Failed to load member profiles:', error);
    return map;
  }
  (data || []).forEach(p => map.set(p.id, p));
  return map;
}

function attachProfile(message: ChatMessage, profiles: Map<string, MemberProfile>): ChatMessage {
  const p = profiles.get(message.member_id);
  return p
    ? { ...message, member: { chat_nickname: p.chat_nickname, first_name: p.first_name, last_name: p.last_name } }
    : message;
}

async function fetchMessageById(id: string): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Failed to hydrate chat message:', error);
    return null;
  }
  if (!data) return null;

  const profiles = await fetchProfiles([data.member_id]);
  return attachProfile(data, profiles);
}

export const chatService = {
  async getMessages(limit = 100): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const messages = (data || []).reverse();
    const profiles = await fetchProfiles(messages.map(m => m.member_id));
    return messages.map(m => attachProfile(m, profiles));
  },

  async sendMessage(message: string, memberId: string): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        member_id: memberId,
        message: message.trim(),
      })
      .select('*')
      .single();

    if (error) throw error;

    const profiles = await fetchProfiles([data.member_id]);
    return attachProfile(data, profiles);
  },

  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_deleted: true })
      .eq('id', messageId);

    if (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  },

  subscribeToMessages(
    onInsert: (message: ChatMessage) => void,
    onUpdate: (message: ChatMessage) => void,
    onDelete: (messageId: string) => void
  ) {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      // Realtime postgres_changes respects RLS. The chat SELECT policy is
      // TO authenticated, so the realtime socket must carry the member JWT or
      // this client silently receives no events. The custom accessToken setup
      // doesn't guarantee the socket is authenticated, so set it explicitly
      // before subscribing.
      const token = await getAccessToken();
      if (token) {
        try {
          await supabase.realtime.setAuth(token);
        } catch (e) {
          console.error('Failed to authenticate realtime socket:', e);
        }
      }
      if (cancelled) return;

      channel = supabase
        .channel('chat_messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages' },
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
          { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
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
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  },
};
