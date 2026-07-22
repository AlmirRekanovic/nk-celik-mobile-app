import { supabase } from './supabase';
import { Poll, PollVote, PollWithVotes } from '@/types/auth';
import { getAccessToken } from './session';

// Vote totals come from the poll_vote_counts view so raw per-member votes
// never leave the database; a member's own vote is the only row RLS lets
// them read from poll_votes.

interface VoteCountRow {
  poll_id: string;
  option_value: string;
  vote_count: number;
}

function buildPollWithVotes(
  poll: Poll,
  counts: VoteCountRow[],
  userVote?: PollVote
): PollWithVotes {
  const options = Array.isArray(poll.options) ? poll.options : [];
  const voteCounts: Record<string, number> = {};

  options.forEach(option => {
    voteCounts[option] = 0;
  });

  let totalVotes = 0;
  counts
    .filter(c => c.poll_id === poll.id)
    .forEach(c => {
      voteCounts[c.option_value] = c.vote_count;
      totalVotes += c.vote_count;
    });

  return {
    ...poll,
    options,
    votes: [],
    user_vote: userVote,
    vote_counts: voteCounts,
    total_votes: totalVotes,
  };
}

async function fetchVoteCounts(pollIds: string[]): Promise<VoteCountRow[]> {
  if (pollIds.length === 0) return [];
  const { data, error } = await supabase
    .from('poll_vote_counts')
    .select('*')
    .in('poll_id', pollIds);

  if (error) {
    console.error('Error fetching vote counts:', error);
    return [];
  }
  return data || [];
}

export async function getPoll(pollId: string): Promise<Poll | null> {
  try {
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('id', pollId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching poll:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      ...data,
      options: Array.isArray(data.options) ? data.options : [],
    };
  } catch (error) {
    console.error('Error getting poll:', error);
    return null;
  }
}

export async function getActivePolls(memberId?: string): Promise<PollWithVotes[]> {
  try {
    const { data: polls, error: pollsError } = await supabase
      .from('polls')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (pollsError) {
      console.error('Error fetching polls:', pollsError);
      return [];
    }

    if (!polls || polls.length === 0) {
      return [];
    }

    const pollIds = polls.map(p => p.id);
    const counts = await fetchVoteCounts(pollIds);

    let ownVotes: PollVote[] = [];
    if (memberId) {
      // RLS already restricts poll_votes to the caller's own rows, but scope
      // the query explicitly too so a future policy change can't surface
      // another member's vote as this user's.
      const { data } = await supabase
        .from('poll_votes')
        .select('*')
        .eq('member_id', memberId)
        .in('poll_id', pollIds);
      ownVotes = data || [];
    }

    return polls.map(poll =>
      buildPollWithVotes(poll, counts, ownVotes.find(v => v.poll_id === poll.id))
    );
  } catch (error) {
    console.error('Error getting active polls:', error);
    return [];
  }
}

export async function getAllPolls(): Promise<PollWithVotes[]> {
  try {
    const { data: polls, error: pollsError } = await supabase
      .from('polls')
      .select('*')
      .order('created_at', { ascending: false });

    if (pollsError) {
      console.error('Error fetching all polls:', pollsError);
      return [];
    }

    if (!polls || polls.length === 0) {
      return [];
    }

    const counts = await fetchVoteCounts(polls.map(p => p.id));
    return polls.map(poll => buildPollWithVotes(poll, counts));
  } catch (error) {
    console.error('Error getting all polls:', error);
    return [];
  }
}

export async function castVote(pollId: string, memberId: string, optionValue: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('poll_votes')
      .insert({
        poll_id: pollId,
        member_id: memberId,
        option_value: optionValue,
      });

    if (error) {
      // 23505 = unique violation: this member already voted on this poll.
      if (error.code !== '23505') {
        console.error('Error casting vote:', error);
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error casting vote:', error);
    return false;
  }
}

export interface CreatePollResult {
  poll: Poll | null;
  error?: string;
}

export async function createPoll(
  title: string,
  description: string,
  pollType: 'yes_no_neutral' | 'custom',
  options: string[],
  createdBy: string,
  endsAt?: string
): Promise<CreatePollResult> {
  try {
    const { data, error } = await supabase
      .from('polls')
      .insert({
        title,
        description,
        poll_type: pollType,
        options,
        created_by: createdBy,
        ends_at: endsAt,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating poll:', error);
      // 42501 = RLS violation → the caller isn't recognised as an admin,
      // usually a stale session from before the auth migration.
      const message =
        error.code === '42501'
          ? 'Nemate administratorska prava (pokušajte se ponovo prijaviti).'
          : error.message || 'Greška pri kreiranju ankete';
      return { poll: null, error: message };
    }

    if (data) {
      sendPollNotification(data.id, title, description).catch(err =>
        console.error('Failed to send poll notification:', err)
      );
    }

    return { poll: data };
  } catch (error: any) {
    console.error('Error creating poll:', error);
    return { poll: null, error: error?.message || 'Greška pri kreiranju ankete' };
  }
}

async function sendPollNotification(pollId: string, title: string, description: string): Promise<void> {
  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    // The endpoint only accepts admin member JWTs (or the service role);
    // the anon key alone is rejected.
    const accessToken = await getAccessToken();

    if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
      console.error('Cannot send poll notification: missing credentials');
      return;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        title: 'Nova anketa! 📊',
        body: title,
        type: 'poll',
        data: {
          poll_id: pollId,
          poll_title: title,
          poll_description: description,
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to send notification:', await response.text());
    }
  } catch (error) {
    console.error('Error sending poll notification:', error);
  }
}

export async function updatePoll(pollId: string, updates: Partial<Poll>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('polls')
      .update(updates)
      .eq('id', pollId);

    if (error) {
      console.error('Error updating poll:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating poll:', error);
    return false;
  }
}

export async function deletePoll(pollId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId);

    if (error) {
      console.error('Error deleting poll:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting poll:', error);
    return false;
  }
}
