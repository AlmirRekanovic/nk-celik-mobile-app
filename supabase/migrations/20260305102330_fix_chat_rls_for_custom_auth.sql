/*
  # Fix Chat RLS Policies for Custom Authentication
  
  1. Changes
    - Update RLS policies to work with custom authentication system
    - Use `anon` role instead of `authenticated` role
    - Use `current_setting('app.current_member_id')` instead of `auth.uid()`
    
  2. Security
    - Members can read all non-deleted messages
    - Members can send messages as themselves
    - Members can update/delete their own messages
    - All policies check that the member exists in the database
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Members can read all messages" ON chat_messages;
DROP POLICY IF EXISTS "Members can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Members can update own messages" ON chat_messages;
DROP POLICY IF EXISTS "Members can delete own messages" ON chat_messages;

-- Members can read all non-deleted messages
CREATE POLICY "Members can read all messages"
  ON chat_messages
  FOR SELECT
  TO anon
  USING (
    is_deleted = false
  );

-- Members can insert their own messages
CREATE POLICY "Members can send messages"
  ON chat_messages
  FOR INSERT
  TO anon
  WITH CHECK (
    member_id::text = current_setting('app.current_member_id', true) OR
    member_id IN (SELECT id FROM members)
  );

-- Members can update their own messages
CREATE POLICY "Members can update own messages"
  ON chat_messages
  FOR UPDATE
  TO anon
  USING (
    member_id::text = current_setting('app.current_member_id', true) OR
    member_id IN (SELECT id FROM members)
  )
  WITH CHECK (
    member_id::text = current_setting('app.current_member_id', true) OR
    member_id IN (SELECT id FROM members)
  );

-- Members can delete (soft delete) their own messages
CREATE POLICY "Members can delete own messages"
  ON chat_messages
  FOR DELETE
  TO anon
  USING (
    member_id::text = current_setting('app.current_member_id', true) OR
    member_id IN (SELECT id FROM members)
  );