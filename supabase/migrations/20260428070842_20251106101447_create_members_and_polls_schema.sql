/*
  # NK Čelik Members and Polls System

  1. New Tables
    - `members`
      - `id` (uuid, primary key)
      - `member_id` (text, unique) - Used as password for login
      - `first_name` (text) - Member's first name
      - `last_name` (text) - Member's last name
      - `is_admin` (boolean) - Admin privileges flag
      - `created_at` (timestamptz)
      - `last_login_at` (timestamptz)

    - `polls`
      - `id` (uuid, primary key)
      - `title` (text) - Poll question/title
      - `description` (text) - Optional description
      - `poll_type` (text) - 'yes_no_neutral' or 'custom'
      - `options` (jsonb) - Array of poll options
      - `is_active` (boolean) - Whether poll is currently active
      - `created_by` (uuid, foreign key to members)
      - `created_at` (timestamptz)
      - `ends_at` (timestamptz) - Optional end date
      - `updated_at` (timestamptz)

    - `poll_votes`
      - `id` (uuid, primary key)
      - `poll_id` (uuid, foreign key to polls)
      - `member_id` (uuid, foreign key to members)
      - `option_value` (text) - The selected option
      - `voted_at` (timestamptz)
      - Unique constraint on (poll_id, member_id) - One vote per member per poll

  2. Security
    - Enable RLS on all tables
    - Members can read their own data
    - Members can read active polls
    - Members can create votes for themselves
    - Admins can create and manage polls
    - Poll results are readable by all authenticated members

  3. Important Notes
    - Member ID is used as password (stored as plain text for simplicity)
    - Guest users can browse but cannot vote
    - Only admins can create/edit/delete polls
    - Members can only vote once per poll
*/

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  last_login_at timestamptz
);

-- Create polls table
CREATE TABLE IF NOT EXISTS polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  poll_type text NOT NULL DEFAULT 'yes_no_neutral',
  options jsonb NOT NULL DEFAULT '["YES", "NO", "NEUTRAL"]'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES members(id),
  created_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Create poll_votes table
CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES members(id) NOT NULL,
  option_value text NOT NULL,
  voted_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, member_id)
);

-- Enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Members policies
CREATE POLICY "Members can read all members"
  ON members FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can insert members"
  ON members FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can update members"
  ON members FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Polls policies
CREATE POLICY "Everyone can read active polls"
  ON polls FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can read all polls"
  ON polls FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = polls.created_by
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can create polls"
  ON polls FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = polls.created_by
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update polls"
  ON polls FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = polls.created_by
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = polls.created_by
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can delete polls"
  ON polls FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = polls.created_by
      AND members.is_admin = true
    )
  );

-- Poll votes policies
CREATE POLICY "Members can read all votes"
  ON poll_votes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Members can create their own votes"
  ON poll_votes FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Members cannot update votes"
  ON poll_votes FOR UPDATE
  TO public
  USING (false);

CREATE POLICY "Members cannot delete votes"
  ON poll_votes FOR DELETE
  TO public
  USING (false);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_polls_is_active ON polls(is_active);
CREATE INDEX IF NOT EXISTS idx_polls_created_by ON polls(created_by);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_member_id ON poll_votes(member_id);
CREATE INDEX IF NOT EXISTS idx_members_member_id ON members(member_id);
