/*
  # Push Notifications Schema

  1. New Tables
    - `push_tokens`
      - `id` (uuid, primary key)
      - `member_id` (text, references members)
      - `token` (text, unique push token)
      - `platform` (text, ios/android/web)
      - `enabled` (boolean, notification preference)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `push_tokens` table
    - Add policy for members to manage their own tokens

  3. Indexes
    - Index on member_id for fast lookups
    - Index on token for deduplication
*/

CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id text NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_member_id ON push_tokens(member_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_enabled ON push_tokens(enabled) WHERE enabled = true;

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own tokens"
  ON push_tokens
  FOR SELECT
  USING (member_id = current_setting('app.current_member_id', true));

CREATE POLICY "Members can insert own tokens"
  ON push_tokens
  FOR INSERT
  WITH CHECK (member_id = current_setting('app.current_member_id', true));

CREATE POLICY "Members can update own tokens"
  ON push_tokens
  FOR UPDATE
  USING (member_id = current_setting('app.current_member_id', true))
  WITH CHECK (member_id = current_setting('app.current_member_id', true));

CREATE POLICY "Members can delete own tokens"
  ON push_tokens
  FOR DELETE
  USING (member_id = current_setting('app.current_member_id', true));

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
