/*
  # Fix Push Tokens Schema

  1. Changes
    - Drop existing push_tokens table if exists
    - Recreate with correct member_id reference type (uuid instead of text)
    - Add proper foreign key constraint
    - Enable RLS and add policies
    - Add indexes for performance

  2. Security
    - Enable RLS on push_tokens table
    - Add policies for members to manage their own tokens
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS push_tokens CASCADE;

-- Create push_tokens table with correct types
CREATE TABLE push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_push_tokens_member_id ON push_tokens(member_id);
CREATE INDEX idx_push_tokens_token ON push_tokens(token);
CREATE INDEX idx_push_tokens_enabled ON push_tokens(enabled) WHERE enabled = true;

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Members can view own tokens"
  ON push_tokens
  FOR SELECT
  TO authenticated
  USING (member_id::text = current_setting('app.current_member_id', true));

CREATE POLICY "Members can insert own tokens"
  ON push_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id::text = current_setting('app.current_member_id', true));

CREATE POLICY "Members can update own tokens"
  ON push_tokens
  FOR UPDATE
  TO authenticated
  USING (member_id::text = current_setting('app.current_member_id', true))
  WITH CHECK (member_id::text = current_setting('app.current_member_id', true));

CREATE POLICY "Members can delete own tokens"
  ON push_tokens
  FOR DELETE
  TO authenticated
  USING (member_id::text = current_setting('app.current_member_id', true));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_push_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_token_timestamp();
