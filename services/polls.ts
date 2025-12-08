import { supabase } from './supabase';
import { Poll, PollVote, PollWithVotes } from '@/types/auth';

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

    const { data: allVotes, error: votesError } = await supabase
      .from('poll_votes')
      .select('*')
      .in('poll_id', polls.map(p => p.id));

    if (votesError) {
      console.error('Error fetching votes:', votesError);
    }

    const pollsWithVotes: PollWithVotes[] = polls.map(poll => {
      const pollVotes = allVotes?.filter(v => v.poll_id === poll.id) || [];
      const userVote = memberId ? pollVotes.find(v => v.member_id === memberId) : undefined;

      const voteCounts: Record<string, number> = {};
      const options = Array.isArray(poll.options) ? poll.options : [];

      options.forEach((option: string) => {
        voteCounts[option] = 0;
      });

      pollVotes.forEach(vote => {
        if (voteCounts[vote.option_value] !== undefined) {
          voteCounts[vote.option_value]++;
        } else {
          voteCounts[vote.option_value] = 1;
        }
      });

      return {
        ...poll,
        options,
        votes: pollVotes,
        user_vote: userVote,
        vote_counts: voteCounts,
        total_votes: pollVotes.length,
      };
    });

    return pollsWithVotes;
  } catch (error) {
    console.error('Error getting active polls:', error);
    return [];
  }
}

export async function getAllPolls(createdBy?: string): Promise<PollWithVotes[]> {
  try {
    let query = supabase
      .from('polls')
      .select('*')
      .order('created_at', { ascending: false });

    if (createdBy) {
      query = query.eq('created_by', createdBy);
    }

    const { data: polls, error: pollsError } = await query;

    if (pollsError) {
      console.error('Error fetching all polls:', pollsError);
      return [];
    }

    if (!polls || polls.length === 0) {
      return [];
    }

    const { data: allVotes, error: votesError } = await supabase
      .from('poll_votes')
      .select('*')
      .in('poll_id', polls.map(p => p.id));

    if (votesError) {
      console.error('Error fetching votes:', votesError);
    }

    const pollsWithVotes: PollWithVotes[] = polls.map(poll => {
      const pollVotes = allVotes?.filter(v => v.poll_id === poll.id) || [];

      const voteCounts: Record<string, number> = {};
      const options = Array.isArray(poll.options) ? poll.options : [];

      options.forEach((option: string) => {
        voteCounts[option] = 0;
      });

      pollVotes.forEach(vote => {
        if (voteCounts[vote.option_value] !== undefined) {
          voteCounts[vote.option_value]++;
        } else {
          voteCounts[vote.option_value] = 1;
        }
      });

      return {
        ...poll,
        options,
        votes: pollVotes,
        vote_counts: voteCounts,
        total_votes: pollVotes.length,
      };
    });

    return pollsWithVotes;
  } catch (error) {
    console.error('Error getting all polls:', error);
    return [];
  }
}

export async function castVote(pollId: string, memberId: string, optionValue: string): Promise<boolean> {
  try {
    const { data: existingVote } = await supabase
      .from('poll_votes')
      .select('*')
      .eq('poll_id', pollId)
      .eq('member_id', memberId)
      .maybeSingle();

    if (existingVote) {
      return false;
    }

    const { error } = await supabase
      .from('poll_votes')
      .insert({
        poll_id: pollId,
        member_id: memberId,
        option_value: optionValue,
      });

    if (error) {
      console.error('Error casting vote:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error casting vote:', error);
    return false;
  }
}

export async function createPoll(
  title: string,
  description: string,
  pollType: 'yes_no_neutral' | 'custom',
  options: string[],
  createdBy: string,
  endsAt?: string
): Promise<Poll | null> {
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
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating poll:', error);
    return null;
  }
}

export async function updatePoll(
  pollId: string,
  updates: Partial<Poll>
): Promise<boolean> {
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
