export interface Member {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  is_admin: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  poll_type: 'yes_no_neutral' | 'custom';
  options: string[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  ends_at?: string;
  updated_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  member_id: string;
  option_value: string;
  voted_at: string;
}

export interface PollWithVotes extends Poll {
  votes: PollVote[];
  user_vote?: PollVote;
  vote_counts: Record<string, number>;
  total_votes: number;
}

export interface AuthState {
  member: Member | null;
  isGuest: boolean;
  isAuthenticated: boolean;
}
